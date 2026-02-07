# Vector Bucket Search Implementation Plan

## Overview

This plan describes how to implement search for **postgres.email** using **Supabase Vector
Buckets** (S3-backed vector storage with built-in similarity search). The old pgvector
infrastructure has already been removed — the `embedding` column, the `search()` SQL
function, the `vector` extension, and `scripts/embed.js` are all gone. The existing
`search` Edge Function already uses `gte-small` to generate query embeddings but does not
yet perform actual search — it returns the raw embedding as a placeholder.

### Why Vector Buckets?

| Concern | Value |
|---|---|
| **Storage** | S3-backed object storage — embeddings live outside Postgres, no table bloat |
| **Scale** | Tens of millions of vectors per index with automatic indexing |
| **Cost** | S3 storage pricing; free during Public Alpha (fair-use) |
| **Latency** | Sub-second (hundreds of ms) — sufficient for search UX |
| **Maintenance** | Fully managed indexing and optimization — no manual tuning |
| **Embedding** | Built-in `gte-small` model already running in Edge Functions — no API key, no external calls, no cost per token |

---

## Current State

```
Download (mbox) ──► Parse (messages table) ──► [no embedding pipeline yet]
                                                         │
                                         search Edge Function (gte-small)
                                         → generates embedding but returns it raw
                                         → "Search coming soon" placeholder UI
```

### What already exists

| File | Status |
|---|---|
| `supabase/functions/search/index.ts` | Uses `Supabase.ai.Session("gte-small")` — generates 384-dim embeddings, returns raw embedding (no search yet) |
| `src/app/lists/search/page.tsx` | Shows "Search coming soon" with raw embedding display |
| `src/components/QuickSearch.tsx` | Search input → navigates to `/lists/search?q=...` |
| `supabase/migrations/20260207145955_remove_pgvector.sql` | Already dropped: `embedding` column, `search()` function, `vector` extension |
| `scripts/download.js` | Downloads mbox archives from postgresql.org |
| `scripts/parse.js` | Parses mbox → `messages` table |

### What's been removed (no longer exists)

- `scripts/embed.js` — deleted
- `embedding` column on `messages` table — dropped
- `search()` SQL function — dropped
- `vector` extension — dropped
- `openai` npm dependency — removed
- `tests/integration/scripts/embed.test.js` — deleted

### What needs to be built

1. Chunking pipeline (split emails into embeddable chunks)
2. Embedding pipeline (embed chunks → vector bucket)
3. Vector bucket setup (create bucket and index)
4. Search implementation (query vector bucket, return results)
5. RAG layer (optional — LLM synthesis over search results)
6. Frontend search UI (display real results)

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

## Implementation Phases

### Phase 1: Vector Bucket Infrastructure Setup

**Goal:** Create the vector bucket and index, update SDK dependency.

#### 1.1 Update `@supabase/supabase-js` dependency

The vector storage API requires `@supabase/storage-js` v2.76+. Update the Supabase JS
client to the latest version:

```bash
npm install @supabase/supabase-js@latest
```

#### 1.2 Create vector bucket and index

Create a new script `scripts/setup-vector-bucket.js`:

```js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY  // service role key for admin operations
)

async function setup() {
  // Create the vector bucket
  const { error: bucketError } = await supabase.storage.vectors.createBucket('email-embeddings')
  if (bucketError && !bucketError.message.includes('already exists')) {
    throw bucketError
  }

  // Create index for email chunks (384-dim for gte-small)
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

Add npm script:
```json
"setup:vectors": "node -r dotenv/config scripts/setup-vector-bucket.js"
```

#### 1.3 Bucket configuration decisions

| Setting | Value | Rationale |
|---|---|---|
| Bucket name | `email-embeddings` | Descriptive, single-purpose |
| Index name | `email-chunks` | Reflects that we store chunk-level vectors, not whole emails |
| Dimension | `384` | Matches `gte-small` — already used in the search Edge Function. 4x smaller than the old ada-002 → faster search, less storage |
| Distance metric | `cosine` | Standard for text similarity |

---

### Phase 2: Chunking Pipeline

**Goal:** Split email bodies into semantically meaningful chunks before embedding.

#### 2.1 Chunking strategy: Hybrid paragraph + token-bounded

Emails have natural structure: paragraphs, code blocks, quoted replies, signatures.
The recommended approach for email content:

1. **Strip quoted replies** — lines starting with `>`
2. **Strip signatures** — detect `-- \n` delimiter common in email
3. **Split on paragraph boundaries** — double newlines (`\n\n`)
4. **Merge small paragraphs** — combine consecutive short paragraphs until hitting the
   token limit
5. **Split oversized paragraphs** — if a single paragraph exceeds the token limit, split
   on sentence boundaries
6. **Overlap** — 10–15% token overlap between adjacent chunks for context continuity

#### 2.2 Chunk size parameters

| Parameter | Value | Rationale |
|---|---|---|
| Target chunk size | **400 tokens** | Sweet spot for embedding precision with `gte-small`; smaller chunks retrieve better |
| Max chunk size | **512 tokens** | Hard ceiling to avoid diluting embeddings |
| Min chunk size | **50 tokens** | Skip trivially short chunks (e.g., "Thanks, John") |
| Overlap | **50 tokens** (~12%) | Preserves context at boundaries without excessive duplication |

#### 2.3 Create `scripts/chunk.js`

New script responsible for reading messages and producing chunks. Output is stored in a
new `message_chunks` table (lightweight — just text and references, no vectors):

```sql
-- New migration: create message_chunks table
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
- Reads messages that have `body_text IS NOT NULL` and no corresponding chunks
- Applies the chunking algorithm above
- Inserts rows into `message_chunks`
- Tracks progress with the same batch/logging infrastructure as existing scripts
- Supports `--lists`, `--limit`, `--verbose` flags

#### 2.4 Short emails (< 50 tokens after cleansing)

Skip these — they don't carry enough semantic content to be useful for search.

---

### Phase 3: Embedding Pipeline (Vector Bucket Target)

**Goal:** Embed chunks and store them in the vector bucket.

#### 3.1 Embedding model: `gte-small` (already in use)

The `search` Edge Function already uses `gte-small` via `Supabase.ai.Session`. The batch
pipeline must use the **same model** to ensure query and document embeddings are compatible.

| Model | Dimensions | MTEB Score | Cost | API Key Required |
|---|---|---|---|---|
| `text-embedding-ada-002` (removed) | 1536 | 61.0 | $0.10/1M tokens | Yes (OpenAI) |
| **`gte-small` (in use)** | **384** | **61.4** | **Free** (Edge Function / local ONNX) | **No** |

#### 3.2 Embedding in Edge Functions (query-time) — already implemented

The search Edge Function already does this:

```ts
// supabase/functions/search/index.ts (current)
const model = new Supabase.ai.Session("gte-small")

const embedding = await model.run(query, {
  mean_pool: true,
  normalize: true,
})
```

This will be extended in Phase 4 to query the vector bucket with the embedding.

#### 3.3 Embedding in batch script (ingestion-time)

Create `scripts/embed-vectors.js` using `@xenova/transformers` (Transformers.js — ONNX
runtime for Node.js) to run `gte-small` locally:

```js
const { pipeline } = require('@xenova/transformers')

// Initialize once — downloads and caches the ONNX model (~70MB)
const extractor = await pipeline('feature-extraction', 'Supabase/gte-small')

const BATCH_SIZE = 100       // chunks per DB fetch
const UPSERT_BATCH_SIZE = 250 // vectors per putVectors call (max 500)

async function embedAndStore(chunks, extractor, vectorIndex) {
  // 1. Batch embed locally with gte-small
  const texts = chunks.map(c => c.chunk_text)
  const output = await extractor(texts, { pooling: 'mean', normalize: true })
  // output.tolist() returns array of 384-dim arrays

  // 2. Build vector objects with metadata
  const embeddings = output.tolist()
  const vectors = chunks.map((chunk, i) => ({
    key: chunk.id,   // e.g., "<msg-id>#chunk0"
    data: { float32: embeddings[i] },
    metadata: {
      message_id: chunk.message_id,
      mailbox_id: chunk.mailbox_id,
      subject: chunk.subject,        // from parent message
      from_email: chunk.from_email,  // from parent message
      ts: chunk.ts,                  // from parent message
      chunk_index: chunk.chunk_index,
    },
  }))

  // 3. Upsert to vector bucket in batches of 250
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await vectorIndex.putVectors({ vectors: batch })
    if (error) throw error
  }
}
```

Install the dependency:
```bash
npm install @xenova/transformers
```

Key design decisions:
- **Same model everywhere** — `gte-small` for both ingestion and query-time embedding.
  This is critical: the query embedding model MUST match the document embedding model.
- **Local inference** — no API calls, no rate limits, no per-token costs.
  Embedding 3M chunks costs $0 in API fees.
- **Batch upserts** — `putVectors` supports up to 500 vectors per call. We use 250 for
  safety margin.
- **Upsert semantics** — if a vector with the same key exists, it gets overwritten. This
  makes re-runs idempotent.
- **Rich metadata** — each vector carries enough metadata to render a search result
  without a second database query.

#### 3.4 Tracking embedded status

The `embedded_at` column on `message_chunks` is set after successful upsert. The pipeline
fetches chunks where `embedded_at IS NULL`, making it incremental and resumable.

#### 3.5 Upgrading to a larger model later

If search quality needs improvement in the future, options include:
- `Supabase/bge-small-en` (384-dim) — another model Supabase publishes ONNX weights for
- Any Hugging Face model with ONNX weights via `@xenova/transformers`

Changing models requires re-embedding all chunks and recreating the vector bucket index
with the new dimension. Store the model name in chunk metadata to detect stale embeddings.

#### 3.6 npm scripts

```json
"chunk": "node -r dotenv/config scripts/chunk.js",
"chunk:prod": "DOTENV_CONFIG_PATH=.env.prod node -r dotenv/config scripts/chunk.js",
"embed:vectors": "node -r dotenv/config scripts/embed-vectors.js",
"embed:vectors:prod": "DOTENV_CONFIG_PATH=.env.prod node -r dotenv/config scripts/embed-vectors.js",
"pipeline:vectors": "npm run chunk && npm run embed:vectors",
"pipeline:vectors:prod": "npm run chunk:prod && npm run embed:vectors:prod"
```

---

### Phase 4: Update Search Edge Function

**Goal:** Extend the existing `search` Edge Function to query the vector bucket and return
real results.

The current Edge Function (`supabase/functions/search/index.ts`) already generates the
embedding with `gte-small`. It needs to be updated to:

1. Query the vector bucket with the embedding
2. Deduplicate results by message
3. Fetch full messages from Postgres
4. Return ranked results

#### 4.1 Updated `supabase/functions/search/index.ts`

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

    // 1. Embed the user query locally with gte-small (no API call)
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

#### 4.2 Key query features

- **Metadata filtering** — scope search to a specific mailing list via `mailbox_id`
- **Deduplication** — multiple chunks from the same email may match; we return the
  email once, ranked by its best-matching chunk
- **Full message fetch** — vector metadata is lightweight; we fetch the full message
  body from Postgres for display
- **Configurable limit** — caller can request more/fewer results (default 20)
- **No new Edge Function needed** — we update the existing `search` function in-place

---

### Phase 5: RAG / AI-Powered Search (Optional Enhancement)

**Goal:** Use the retrieved chunks as context for an LLM to generate a synthesized answer.

#### 5.1 Architecture

```
User query ──► Embed ──► Vector Bucket (top-K chunks)
                              │
                              ▼
                    Assemble context window
                    (top chunks + metadata)
                              │
                              ▼
                    LLM call (Claude or GPT-4o-mini)
                    System: "Answer based on these PostgreSQL mailing list excerpts"
                    User: original query
                    Context: retrieved chunks
                              │
                              ▼
                    Structured response:
                    {
                      answer: "synthesized answer",
                      sources: [{ message_id, subject, from, date, relevance }],
                      results: [full search results]
                    }
```

#### 5.2 Create `supabase/functions/search-rag/index.ts`

This function extends the search flow by adding an LLM synthesis step:

1. Retrieve top-K chunks from vector bucket (K=20 for context diversity)
2. Deduplicate and rank
3. Build a context string from the top chunks (fit within model context window)
4. Call the LLM with a system prompt that instructs it to:
   - Answer the question based only on the provided email excerpts
   - Cite sources by message subject and author
   - Say "I don't have enough information" if the excerpts don't answer the question
5. Return both the AI answer and the raw search results

#### 5.3 Prompt template

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

#### 5.4 Cost and latency considerations

| Component | Estimated latency | Estimated cost per query |
|---|---|---|
| Query embedding (gte-small, local) | ~10-50ms | **Free** (runs in Edge Function) |
| Vector bucket search | ~200-500ms | Free (alpha) / included in storage |
| LLM synthesis (Claude or GPT-4o-mini) | ~1-3s | ~$0.001-0.005 depending on context size |
| **Total** | **~1.5-4s** | **~$0.005** |

This is acceptable for a search feature where users expect a brief wait for AI answers.

---

### Phase 6: Frontend Updates

**Goal:** Update the search UI to show real search results.

#### 6.1 Update search page

The current `src/app/lists/search/page.tsx` shows a "Search coming soon" placeholder with
the raw embedding. Replace it with actual search results display:

- Render ranked message results (subject, author, date, snippet)
- Link each result to the thread view
- Add optional `mailbox_id` filter parameter from query string
- Display relevance scores

#### 6.2 Add mailing list filter

Add a dropdown/selector to scope search to a specific list:
```
/lists/search?q=toast+table&list=pgsql-hackers
```

#### 6.3 (Optional) AI answer display

If RAG is enabled, show the synthesized answer above the traditional results:
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

### Phase 7: Full Pipeline Orchestration

**Goal:** A single command to process the entire pipeline end-to-end.

#### 7.1 Create `scripts/pipeline.js`

Orchestrates all steps in order:
1. Download new mbox archives (`download.js`)
2. Parse emails into `messages` table (`parse.js`)
3. Chunk messages into `message_chunks` table (`chunk.js`)
4. Embed chunks and upsert to vector bucket (`embed-vectors.js`)

All steps are incremental — they only process new/unprocessed data.

```json
"pipeline": "npm run download && npm run parse && npm run chunk && npm run embed:vectors",
"pipeline:prod": "npm run download -- --from $(date +%Y-%m) && npm run parse:prod && npm run chunk:prod && npm run embed:vectors:prod"
```

#### 7.2 Cron / scheduled execution

For production, set up a scheduled job (Supabase cron, GitHub Actions, or external scheduler)
to run the pipeline daily or weekly to ingest new emails as they arrive on the mailing lists.

---

## Scalability Considerations

### Email volume estimates

| List | Emails/month (approx) | Total archive |
|---|---|---|
| pgsql-hackers | ~2,000-3,000 | ~500K+ messages |
| pgsql-general | ~500-1,000 | ~200K+ messages |
| pgsql-bugs | ~200-500 | ~100K+ messages |
| Other 5 lists | ~100-500 each | ~150K+ messages |
| **Total** | **~4,000-6,000/month** | **~1M+ messages** |

With an average of **3 chunks per email**, that's roughly **3M chunks** in the vector bucket.

### Vector bucket capacity

- Vector Buckets support **tens of millions of vectors per index** — 3M chunks is well
  within capacity.
- Batch upsert of 250 vectors per call means ingesting 3M chunks requires ~12,000 API
  calls, which at 5 concurrent requests takes approximately 40 minutes.
- Incremental processing means monthly updates only need to handle ~12K-18K new chunks.

### Embedding cost estimates

With `gte-small` running locally via `@xenova/transformers`, embedding is **free** (CPU only):

| Scenario | Chunks | Estimated time (single machine) | API cost |
|---|---|---|---|
| Full embed (1M messages, ~3M chunks) | ~3M | ~4-6 hours | **$0** |
| Monthly incremental (~5K messages, ~15K chunks) | ~15K | ~2-3 minutes | **$0** |

This is a major advantage — the entire 1M+ message archive can be embedded without any
API fees.

### Query performance

- Vector Bucket similarity search: **200-500ms** for sub-second results
- Acceptable for search UX

### Storage

- 384-dim float32 vectors x 3M chunks = ~4.5 GB of vector data
- Stored on S3 (cheap), not in PostgreSQL
- Metadata per vector is lightweight (~200 bytes) = ~600 MB total metadata

---

## File Changes Summary

### New files

| File | Purpose |
|---|---|
| `scripts/setup-vector-bucket.js` | One-time setup: create bucket and index |
| `scripts/chunk.js` | Chunk messages into `message_chunks` |
| `scripts/embed-vectors.js` | Embed chunks with `gte-small` (local) → vector bucket |
| `scripts/pipeline.js` | Orchestrate full ingestion pipeline |
| `supabase/functions/search-rag/index.ts` | (Optional) RAG-powered search |
| `supabase/migrations/XXXXXX_message_chunks.sql` | `message_chunks` table |

### Modified files

| File | Change |
|---|---|
| `package.json` | Add npm scripts, add `@xenova/transformers`, update `@supabase/supabase-js` |
| `supabase/functions/search/index.ts` | Add vector bucket query, deduplication, message fetch |
| `src/app/lists/search/page.tsx` | Replace placeholder with actual search results UI |
| `src/components/QuickSearch.tsx` | Add list filter support |

---

## Testing Plan

1. **Unit tests for chunking** — test paragraph splitting, overlap, edge cases (empty body,
   all-quoted email, very long emails, code-heavy emails)
2. **Unit tests for embedding pipeline** — mock `@xenova/transformers`, verify 384-dim vector format and metadata
3. **Integration test: round-trip** — chunk → embed → query → verify the original message
   appears in results
4. **Search quality evaluation** — run a set of known queries and verify relevance
5. **Load test** — verify the pipeline handles 1M+ messages without failures or memory issues
6. **Edge Function tests** — verify metadata filtering, deduplication, error handling

---

## Open Questions

1. **Vector Buckets is in Public Alpha** — monitor for breaking changes and limit updates.
2. **FDW access** — Supabase provides an S3 Vectors Foreign Data Wrapper (`s3_vectors`)
   that lets you query vector buckets directly from SQL with `<===>` operator. This could
   be useful for joins between vector results and the messages table, avoiding the two-step
   fetch in the Edge Function. Worth investigating.
3. **Embedding model versioning** — if we upgrade embedding models in the future, all
   vectors must be regenerated. Store the model name in chunk metadata to detect stale
   embeddings.
4. **Hybrid search** — combine vector similarity with PostgreSQL full-text search
   (`tsvector`) for keyword-precise queries. Vector Buckets handle semantic search; Postgres
   handles exact keyword matches. A hybrid ranker could merge both result sets.

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
- [Generate Text Embeddings (Supabase)](https://supabase.com/docs/guides/ai/quickstarts/generate-text-embeddings)
- [Blog: AI Inference in Edge Functions](https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions)
- [Supabase/gte-small on Hugging Face](https://huggingface.co/Supabase/gte-small)
- [Transformers.js (ONNX runtime for Node/Deno)](https://huggingface.co/docs/transformers.js)

### Chunking & RAG
- [Chunking Strategies for RAG (Pinecone)](https://www.pinecone.io/learn/chunking-strategies/)
- [Chunking Strategies for RAG (Weaviate)](https://weaviate.io/blog/chunking-strategies-for-rag)
- [Best Chunking Strategies for RAG 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
