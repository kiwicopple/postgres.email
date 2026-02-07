# Vector Bucket Search Implementation Plan

## Overview

Implement search for **postgres.email** using **Supabase Vector Buckets** — S3-backed
vector storage with built-in similarity search. The `search` Edge Function already uses
`gte-small` to generate embeddings but returns them raw. This plan covers everything needed
to make search actually work.

### Why Vector Buckets?

| Concern | Value |
|---|---|
| **Storage** | S3-backed — embeddings live outside Postgres, no table bloat |
| **Scale** | Tens of millions of vectors per index, automatic indexing |
| **Cost** | Free during Public Alpha (fair-use); S3 pricing after |
| **Latency** | Sub-second (~200-500ms) — sufficient for search UX |
| **Maintenance** | Fully managed — no manual index tuning |

---

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      INGESTION PIPELINE                              │
│                                                                      │
│  messages table ──► chunk.js ──► embed-vectors.js ──► Vector Bucket  │
│  (body_text)        (split)      (gte-small local)    (S3-backed)    │
│                                                                      │
│  Each chunk stored with metadata:                                    │
│  { message_id, mailbox_id, subject, from_email, ts, chunk_index }    │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       SEARCH LAYER                                   │
│                                                                      │
│  User query ──► Edge Function ──► embed query (gte-small built-in)   │
│                                      │                               │
│                                      ▼                               │
│                               Vector Bucket                          │
│                               queryVectors()                         │
│                                      │                               │
│                                      ▼                               │
│                        Chunk results with metadata                   │
│                                      │                               │
│                                      ▼                               │
│                        Fetch full messages from Postgres              │
│                                      │                               │
│                                      ▼                               │
│                        (Optional) LLM summarize/RAG answer           │
│                                      │                               │
│                                      ▼                               │
│                        Return to frontend                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Vector Bucket Infrastructure Setup

**Goal:** Create the vector bucket and index, update SDK.

### 1.1 Update `@supabase/supabase-js`

The vector storage API requires `@supabase/storage-js` v2.76+:

```bash
npm install @supabase/supabase-js@latest
```

### 1.2 Create vector bucket and index

Create `scripts/setup-vector-bucket.js`:

```js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function setup() {
  const { error: bucketError } = await supabase.storage.vectors.createBucket('email-embeddings')
  if (bucketError && !bucketError.message.includes('already exists')) {
    throw bucketError
  }

  const bucket = supabase.storage.vectors.from('email-embeddings')
  const { error: indexError } = await bucket.createIndex({
    indexName: 'email-chunks',
    dimension: 384,
    distanceMetric: 'cosine',
  })
  if (indexError && !indexError.message.includes('already exists')) {
    throw indexError
  }

  console.log('Vector bucket and index created successfully')
}

setup().catch(console.error)
```

### 1.3 Configuration

| Setting | Value | Rationale |
|---|---|---|
| Bucket name | `email-embeddings` | Descriptive, single-purpose |
| Index name | `email-chunks` | Chunk-level vectors, not whole emails |
| Dimension | `384` | Matches `gte-small` already in the search Edge Function |
| Distance metric | `cosine` | Standard for text similarity |

---

## Phase 2: Chunking Pipeline

**Goal:** Split email bodies into semantically meaningful chunks before embedding.

### 2.1 Chunking strategy: Hybrid paragraph + token-bounded

1. **Strip quoted replies** — lines starting with `>`
2. **Strip signatures** — detect `-- \n` delimiter
3. **Split on paragraph boundaries** — double newlines (`\n\n`)
4. **Merge small paragraphs** — combine until hitting the token limit
5. **Split oversized paragraphs** — on sentence boundaries
6. **Overlap** — 10–15% token overlap between chunks

### 2.2 Chunk size parameters

| Parameter | Value | Rationale |
|---|---|---|
| Target chunk size | **400 tokens** | Sweet spot for embedding precision with `gte-small` |
| Max chunk size | **512 tokens** | Hard ceiling to avoid diluting embeddings |
| Min chunk size | **50 tokens** | Skip trivially short chunks (e.g., "Thanks, John") |
| Overlap | **50 tokens** (~12%) | Preserves context at boundaries |

### 2.3 Create `scripts/chunk.js`

New migration for `message_chunks` table:

```sql
create table message_chunks (
    id text primary key,                    -- {message_id}#chunk{index}
    message_id text references messages(id),
    mailbox_id text,
    chunk_index integer,
    chunk_text text,
    token_count integer,
    embedded_at timestamptz,                -- set after vector bucket upsert
    created_at timestamptz default now()
);

create index on message_chunks (message_id);
create index on message_chunks (mailbox_id);
create index on message_chunks (embedded_at) where embedded_at is null;

alter table message_chunks enable row level security;

create policy "Public read access" on message_chunks
  for select using (true);
```

The `chunk.js` script:
- Reads messages where `body_text IS NOT NULL` with no corresponding chunks
- Applies the chunking algorithm
- Inserts rows into `message_chunks`
- Supports `--lists`, `--limit`, `--verbose` flags

---

## Phase 3: Embedding Pipeline

**Goal:** Embed chunks and store them in the vector bucket.

### 3.1 Embedding model: `gte-small`

Already in use in the search Edge Function. The batch pipeline must use the **same model**
so query and document embeddings are compatible.

| Model | Dimensions | MTEB Score | Cost | API Key |
|---|---|---|---|---|
| **`gte-small` (in use)** | **384** | **61.4** | **Free** | **No** |

### 3.2 Create `scripts/embed-vectors.js`

Uses `@xenova/transformers` (ONNX runtime for Node.js) to run `gte-small` locally:

```js
const { pipeline } = require('@xenova/transformers')

const extractor = await pipeline('feature-extraction', 'Supabase/gte-small')

const BATCH_SIZE = 100
const UPSERT_BATCH_SIZE = 250

async function embedAndStore(chunks, extractor, vectorIndex) {
  const texts = chunks.map(c => c.chunk_text)
  const output = await extractor(texts, { pooling: 'mean', normalize: true })

  const embeddings = output.tolist()
  const vectors = chunks.map((chunk, i) => ({
    key: chunk.id,
    data: { float32: embeddings[i] },
    metadata: {
      message_id: chunk.message_id,
      mailbox_id: chunk.mailbox_id,
      subject: chunk.subject,
      from_email: chunk.from_email,
      ts: chunk.ts,
      chunk_index: chunk.chunk_index,
    },
  }))

  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await vectorIndex.putVectors({ vectors: batch })
    if (error) throw error
  }
}
```

```bash
npm install @xenova/transformers
```

Key decisions:
- **Same model everywhere** — `gte-small` for both ingestion and query. Critical.
- **Local inference** — no API calls, no rate limits, $0 cost for 3M chunks.
- **Batch upserts** — 250 vectors per `putVectors` call (max 500).
- **Upsert semantics** — same key overwrites, so re-runs are idempotent.
- **Rich metadata** — enough to render a search result without a second DB query.

### 3.3 Tracking embedded status

The `embedded_at` column on `message_chunks` is set after successful upsert. Pipeline
fetches `WHERE embedded_at IS NULL` — incremental and resumable.

### 3.4 Model upgrades

If search quality needs improvement later:
- `Supabase/bge-small-en` (384-dim) — another Supabase ONNX model
- Any Hugging Face model with ONNX weights via `@xenova/transformers`

Changing models requires re-embedding all chunks and recreating the index. Store model
name in chunk metadata to detect stale embeddings.

### 3.5 npm scripts

```json
"chunk": "node -r dotenv/config scripts/chunk.js",
"chunk:prod": "DOTENV_CONFIG_PATH=.env.prod node -r dotenv/config scripts/chunk.js",
"embed:vectors": "node -r dotenv/config scripts/embed-vectors.js",
"embed:vectors:prod": "DOTENV_CONFIG_PATH=.env.prod node -r dotenv/config scripts/embed-vectors.js",
"pipeline:vectors": "npm run chunk && npm run embed:vectors",
"pipeline:vectors:prod": "npm run chunk:prod && npm run embed:vectors:prod"
```

---

## Phase 4: Update Search Edge Function

**Goal:** Extend `supabase/functions/search/index.ts` to query the vector bucket and
return real results. It already generates the embedding — just needs to use it.

### 4.1 Updated `supabase/functions/search/index.ts`

```ts
/// <reference lib="deno.ns" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const model = new Supabase.ai.Session("gte-small")

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { query, mailbox_id, limit = 20 } = await req.json()

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // 1. Embed the user query locally with gte-small
    const queryVector = await model.run(query, {
      mean_pool: true,
      normalize: true,
    })

    // 2. Query vector bucket with optional metadata filter
    const index = supabase.storage.vectors
      .from('email-embeddings')
      .index('email-chunks')

    const filter: Record<string, string> = {}
    if (mailbox_id) filter.mailbox_id = mailbox_id

    const { data: vectorResults, error } = await index.queryVectors({
      queryVector: { float32: queryVector },
      topK: limit,
      ...(Object.keys(filter).length > 0 ? { filter } : {}),
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 3. Deduplicate by message_id (multiple chunks may match from same email)
    const seen = new Set<string>()
    const uniqueResults = []
    for (const result of vectorResults ?? []) {
      const msgId = result.metadata?.message_id
      if (msgId && !seen.has(msgId)) {
        seen.add(msgId)
        uniqueResults.push(result)
      }
    }

    // 4. Fetch full messages from Postgres
    const messageIds = uniqueResults.map(r => r.metadata?.message_id).filter(Boolean)
    const { data: messages } = await supabase
      .from('messages')
      .select('id, mailbox_id, subject, from_email, ts, body_text')
      .in('id', messageIds)

    // 5. Merge scores with messages and preserve ranking order
    const messageMap = new Map((messages ?? []).map(m => [m.id, m]))
    const ranked = uniqueResults
      .map(r => ({
        ...messageMap.get(r.metadata?.message_id),
        score: r.distance,
        matched_chunk: r.metadata?.chunk_index,
      }))
      .filter(r => r.id)

    return new Response(JSON.stringify(ranked), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
```

### 4.2 Key features

- **Metadata filtering** — scope search to a mailing list via `mailbox_id`
- **Deduplication** — multiple chunks from the same email → return email once
- **Full message fetch** — pull full message from Postgres for display
- **Configurable limit** — default 20 results

---

## Phase 5: RAG / AI-Powered Search (Optional)

**Goal:** Use retrieved chunks as context for an LLM to synthesize an answer.

### 5.1 Architecture

```
User query ──► Embed ──► Vector Bucket (top-K chunks)
                              │
                              ▼
                    Assemble context window
                              │
                              ▼
                    LLM call (Claude or GPT-4o-mini)
                              │
                              ▼
                    { answer, sources[], results[] }
```

### 5.2 Create `supabase/functions/search-rag/index.ts`

1. Retrieve top-20 chunks from vector bucket
2. Deduplicate and rank
3. Build context string from top chunks
4. Call LLM with system prompt:
   - Answer based only on provided excerpts
   - Cite sources by subject and author
   - Say "I don't have enough information" when appropriate
5. Return AI answer + raw search results

### 5.3 Prompt template

```
You are a PostgreSQL expert assistant. You have access to excerpts from the PostgreSQL
mailing lists. Answer the user's question based ONLY on the provided excerpts.

Rules:
- Cite your sources by referencing the email subject and author
- If the excerpts don't contain enough information, say so clearly
- Be concise and technical
- Format code examples in markdown code blocks

Excerpts:
---
{chunks with metadata}
---

Question: {user_query}
```

### 5.4 Cost and latency

| Component | Latency | Cost per query |
|---|---|---|
| Query embedding (gte-small) | ~10-50ms | **Free** |
| Vector bucket search | ~200-500ms | Free (alpha) |
| LLM synthesis | ~1-3s | ~$0.001-0.005 |
| **Total** | **~1.5-4s** | **~$0.005** |

---

## Phase 6: Frontend Updates

**Goal:** Replace the "Search coming soon" placeholder with real search results.

### 6.1 Update search page

Replace `src/app/lists/search/page.tsx`:
- Render ranked message results (subject, author, date, snippet)
- Link each result to the thread view
- Add optional `mailbox_id` filter from query string

### 6.2 Add mailing list filter

Dropdown/selector to scope search:
```
/lists/search?q=toast+table&list=pgsql-hackers
```

### 6.3 (Optional) AI answer display

If RAG is enabled, show synthesized answer above results:
```
┌─────────────────────────────────────┐
│ AI Answer                           │
│ Based on the mailing list archives: │
│ ...synthesized answer...            │
│ Sources: [linked message subjects]  │
└─────────────────────────────────────┘

── Search Results ──────────────────────
1. [Message from Tom Lane] ...
2. [Message from Robert Haas] ...
```

---

## Phase 7: Full Pipeline Orchestration

**Goal:** Single command to run the entire ingestion pipeline.

### 7.1 Create `scripts/pipeline.js`

Orchestrates: download → parse → chunk → embed. All steps incremental.

```json
"pipeline": "npm run download && npm run parse && npm run chunk && npm run embed:vectors",
"pipeline:prod": "npm run download -- --from $(date +%Y-%m) && npm run parse:prod && npm run chunk:prod && npm run embed:vectors:prod"
```

### 7.2 Cron / scheduled execution

Set up a scheduled job (Supabase cron, GitHub Actions) to run the pipeline daily or weekly.

---

## Scalability

### Email volume

| List | Emails/month | Total archive |
|---|---|---|
| pgsql-hackers | ~2,000-3,000 | ~500K+ |
| pgsql-general | ~500-1,000 | ~200K+ |
| pgsql-bugs | ~200-500 | ~100K+ |
| Other 5 lists | ~100-500 each | ~150K+ |
| **Total** | **~4,000-6,000/month** | **~1M+ messages** |

~3 chunks per email = **~3M chunks** in the vector bucket.

### Capacity

- Vector Buckets support **tens of millions** per index — 3M is well within range
- Batch upsert: 3M chunks ÷ 250 per call = ~12,000 calls ≈ 40 minutes
- Monthly incremental: ~12K-18K new chunks

### Embedding cost

| Scenario | Chunks | Time | Cost |
|---|---|---|---|
| Full embed (1M messages) | ~3M | ~4-6 hours | **$0** |
| Monthly incremental | ~15K | ~2-3 minutes | **$0** |

### Storage

- 384-dim float32 x 3M chunks = **~4.5 GB** vector data on S3
- Metadata: ~600 MB total

---

## File Changes Summary

### New files

| File | Purpose |
|---|---|
| `scripts/setup-vector-bucket.js` | One-time setup: create bucket and index |
| `scripts/chunk.js` | Chunk messages into `message_chunks` |
| `scripts/embed-vectors.js` | Embed chunks with `gte-small` → vector bucket |
| `scripts/pipeline.js` | Orchestrate full ingestion pipeline |
| `supabase/functions/search-rag/index.ts` | (Optional) RAG-powered search |
| `supabase/migrations/XXXXXX_message_chunks.sql` | `message_chunks` table |

### Modified files

| File | Change |
|---|---|
| `package.json` | Add npm scripts, add `@xenova/transformers`, update `@supabase/supabase-js` |
| `supabase/functions/search/index.ts` | Add vector bucket query, deduplication, message fetch |
| `src/app/lists/search/page.tsx` | Replace placeholder with search results UI |
| `src/components/QuickSearch.tsx` | Add list filter support |

---

## Testing Plan

1. **Chunking** — paragraph splitting, overlap, edge cases (empty body, all-quoted, very long, code-heavy)
2. **Embedding pipeline** — mock `@xenova/transformers`, verify 384-dim vectors and metadata
3. **Round-trip** — chunk → embed → query → verify original message appears
4. **Search quality** — known queries, verify relevance
5. **Load test** — 1M+ messages without failures or memory issues
6. **Edge Function** — metadata filtering, deduplication, error handling

---

## Open Questions

1. **Vector Buckets is in Public Alpha** — monitor for breaking changes.
2. **FDW access** — `s3_vectors` wrapper lets you query vector buckets from SQL with
   `<===>` operator. Could avoid the two-step fetch in the Edge Function.
3. **Embedding model versioning** — store model name in chunk metadata to detect stale
   embeddings after model upgrades.
4. **Hybrid search** — combine vector similarity with `tsvector` full-text search for
   keyword-precise queries. A hybrid ranker could merge both result sets.

---

## References

### Vector Buckets
- [Supabase Vector Buckets Introduction](https://supabase.com/docs/guides/storage/vector/introduction)
- [Creating Vector Buckets](https://supabase.com/docs/guides/storage/vector/creating-vector-buckets)
- [Storing Vectors](https://supabase.com/docs/guides/storage/vector/storing-vectors)
- [Querying Vectors](https://supabase.com/docs/guides/storage/vector/querying-vectors)
- [Vector Bucket Limits](https://supabase.com/docs/guides/storage/vector/limits)
- [JavaScript SDK: Vector Buckets](https://supabase.com/docs/reference/javascript/vector-buckets)
- [Blog: Introducing Vector Buckets](https://supabase.com/blog/vector-buckets)
- [AWS S3 Vectors FDW](https://supabase.com/docs/guides/database/extensions/wrappers/s3_vectors)

### Embedding (gte-small)
- [Running AI Models in Edge Functions](https://supabase.com/docs/guides/functions/ai-models)
- [Supabase/gte-small on Hugging Face](https://huggingface.co/Supabase/gte-small)
- [Transformers.js (ONNX runtime for Node/Deno)](https://huggingface.co/docs/transformers.js)

### Chunking & RAG
- [Chunking Strategies for RAG (Pinecone)](https://www.pinecone.io/learn/chunking-strategies/)
- [Chunking Strategies for RAG (Weaviate)](https://weaviate.io/blog/chunking-strategies-for-rag)
