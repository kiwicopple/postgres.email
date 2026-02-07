# Vector Bucket Search Implementation Plan

## Overview

This plan describes how to migrate the search infrastructure of **postgres.email** from
pgvector (in-database embeddings on the `messages` table) to **Supabase Vector Buckets**
(S3-backed vector storage with built-in similarity search). The existing pgvector search
will remain operational until the new system is fully validated, at which point it will be
removed in a follow-up commit.

### Why Vector Buckets?

| Concern | pgvector (current) | Vector Buckets (target) |
|---|---|---|
| **Storage** | PostgreSQL rows — each message carries a 1536-float `embedding` column | S3-backed object storage — embeddings live outside Postgres |
| **Scale** | Practical limit ~1–5M vectors before table bloat and vacuum pressure become issues | Tens of millions of vectors per index with automatic indexing |
| **Cost** | Consumes database disk and RAM (especially with HNSW indexes) | S3 storage pricing; free during Public Alpha (fair-use) |
| **Latency** | Sub-50ms with tuned indexes | Sub-second (hundreds of ms) — sufficient for search UX |
| **Maintenance** | Requires manual index tuning, VACUUM management | Fully managed indexing and optimization |
| **Chunking** | One embedding per message (no chunking) — long emails lose precision | Chunk-level embeddings with metadata back-references to source messages |
| **Embedding** | Requires OpenAI API key and external API calls | Built-in `gte-small` model runs natively inside Edge Functions — no API key, no external calls, no cost per token |

Vector Buckets and pgvector are **complementary**. The recommended architecture is:
keep pgvector for small, latency-critical hot paths (if any), and use Vector Buckets
for the bulk archive search across all mailing lists.

---

## Current Architecture

```
Download (mbox) ──► Parse (messages table) ──► Embed (OpenAI ada-002 → embedding column)
                                                         │
                                         search() SQL function (cosine distance)
                                                         │
                                         Edge Function (embed query → RPC → results)
                                                         │
                                         Next.js /lists/search page
```

### Key files

| File | Role |
|---|---|
| `scripts/embed.js` | Generates embeddings with OpenAI `text-embedding-ada-002`, stores in `messages.embedding` |
| `supabase/functions/search/index.ts` | Edge Function: embeds user query, calls `search()` RPC |
| `supabase/migrations/20240512154843_search.sql` | `search()` function using `<#>` cosine distance |
| `supabase/migrations/20240511220613_init.sql` | `messages` table with `embedding vector(1536)` column |
| `src/app/lists/search/page.tsx` | Search results UI |
| `src/components/QuickSearch.tsx` | Search input |

### Current limitations

1. **No chunking** — each email gets a single embedding regardless of length. Long emails
   (common on pgsql-hackers) dilute the semantic signal.
2. **OpenAI dependency** — requires an API key, costs money per token, and sends email
   content to a third-party API. Uses the older `text-embedding-ada-002` model.
3. **No metadata filtering** — search returns all lists; no way to scope by mailing list,
   date range, or author.
4. **No RAG/AI answer layer** — results are raw message rows, not synthesized answers.
5. **Embedding column bloat** — 1536 floats × 4 bytes × N messages adds significant
   database size.

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
│                    ┌─────────────────┼─────────────────┐             │
│                    ▼                 ▼                  ▼             │
│             Vector Bucket      (optional)          (optional)        │
│             queryVectors()     pgvector fallback   full-text search  │
│                    │                                                  │
│                    ▼                                                  │
│              Chunk results with metadata                             │
│                    │                                                  │
│                    ▼                                                  │
│              Fetch full messages from Postgres                       │
│                    │                                                  │
│                    ▼                                                  │
│              (Optional) LLM summarize/RAG answer                     │
│                    │                                                  │
│                    ▼                                                  │
│              Return to frontend                                      │
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
| Dimension | `384` | Matches `gte-small` — Supabase's built-in model. 4x smaller than ada-002 → faster search, less storage |
| Distance metric | `cosine` | Standard for text similarity; consistent with current pgvector search |

---

### Phase 2: Chunking Pipeline

**Goal:** Split email bodies into semantically meaningful chunks before embedding.

#### 2.1 Chunking strategy: Hybrid paragraph + token-bounded

Emails have natural structure: paragraphs, code blocks, quoted replies, signatures.
The recommended approach for email content:

1. **Strip quoted replies** — lines starting with `>` (already done in `cleanseText`)
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
| Target chunk size | **400 tokens** | Sweet spot for embedding precision; `text-embedding-3-small` handles up to 8191 tokens but smaller chunks retrieve better |
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
    created_at timestamptz default now()
);

create index on message_chunks (message_id);
create index on message_chunks (mailbox_id);

alter table message_chunks enable row level security;

create policy "Public read access" on message_chunks
  for select using (true);
```

The `chunk.js` script:
- Reads messages that have `body_text IS NOT NULL` and no corresponding chunks
- Applies the chunking algorithm above
- Inserts rows into `message_chunks`
- Tracks progress with the same batch/logging infrastructure as `embed.js`
- Supports `--lists`, `--limit`, `--verbose` flags

#### 2.4 Short emails (< 50 tokens after cleansing)

Skip these — they don't carry enough semantic content to be useful for search. The original
message is still searchable via the existing full-text/pgvector path if needed.

---

### Phase 3: Embedding Pipeline (Vector Bucket Target)

**Goal:** Embed chunks and store them in the vector bucket instead of the `messages` table.

#### 3.1 Embedding model: `gte-small` (no OpenAI dependency)

Supabase Edge Functions ship with a **built-in embedding model** — `gte-small` — that runs
natively via a Rust ONNX integration. No API key, no external network calls, no per-token
cost.

| Model | Dimensions | MTEB Score | Cost | API Key Required |
|---|---|---|---|---|
| `text-embedding-ada-002` (current) | 1536 | 61.0 | $0.10/1M tokens | Yes (OpenAI) |
| `text-embedding-3-small` | 1536 | 62.3 | $0.02/1M tokens | Yes (OpenAI) |
| **`gte-small` (recommended)** | **384** | **61.4** | **Free** (Edge Function compute only) | **No** |

**Why `gte-small`:**
- Quality is within 1 point of OpenAI models on MTEB benchmarks — negligible for search
- **384 dimensions** = 4x less storage, 4x faster similarity computation
- **Zero cost** per embedding — only Edge Function compute time
- **No external dependency** — data never leaves Supabase infrastructure
- **No API key management** — simpler deployment, no secrets to rotate
- Supabase maintains the ONNX weights at [Supabase/gte-small](https://huggingface.co/Supabase/gte-small)

#### 3.2 Embedding in Edge Functions (query-time)

For query-time embedding in the search Edge Function, use the built-in `Supabase.ai.Session`:

```ts
// No imports needed — Supabase.ai is a global in Edge Runtime
const session = new Supabase.ai.Session('gte-small')

const embedding = await session.run(queryText, {
  mean_pool: true,   // Average pooling for sentence embeddings
  normalize: true,   // Normalize for cosine similarity
})
// Returns Float32Array of 384 dimensions
```

The session is initialized once and reused across requests within the same Edge Function
instance. No cold-start overhead after the first request.

#### 3.3 Embedding in batch script (ingestion-time)

For the batch embedding pipeline (`scripts/embed-vectors.js`), we run `gte-small` locally
using `@xenova/transformers` (Transformers.js — ONNX runtime for Node.js):

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
- **Local inference** — no OpenAI API calls, no rate limits, no per-token costs.
  Embedding 3M chunks costs $0 in API fees.
- **Batch upserts** — `putVectors` supports up to 500 vectors per call. We use 250 for
  safety margin.
- **Upsert semantics** — if a vector with the same key exists, it gets overwritten. This
  makes re-runs idempotent.
- **Rich metadata** — each vector carries enough metadata to render a search result
  without a second database query.

#### 3.4 Tracking embedded status

Add an `embedded_at` column to `message_chunks`:

```sql
alter table message_chunks add column embedded_at timestamptz;
```

The pipeline fetches chunks where `embedded_at IS NULL`, and sets it after successful
upsert. This makes the pipeline incremental and resumable.

#### 3.5 Upgrading to a larger model later

If search quality needs improvement in the future, options include:
- `Supabase/bge-small-en` (384-dim) — another model Supabase publishes ONNX weights for
- Any Hugging Face model with ONNX weights via `@xenova/transformers`
- OpenAI `text-embedding-3-small` (1536-dim) if API cost is acceptable

Changing models requires re-embedding all chunks and recreating the vector bucket index
with the new dimension. Store the model name in chunk metadata to detect stale embeddings.

#### 3.4 npm scripts

```json
"chunk": "node -r dotenv/config scripts/chunk.js",
"chunk:prod": "DOTENV_CONFIG_PATH=.env.prod node -r dotenv/config scripts/chunk.js",
"embed:vectors": "node -r dotenv/config scripts/embed-vectors.js",
"embed:vectors:prod": "DOTENV_CONFIG_PATH=.env.prod node -r dotenv/config scripts/embed-vectors.js",
"pipeline:vectors": "npm run chunk && npm run embed:vectors",
"pipeline:vectors:prod": "npm run chunk:prod && npm run embed:vectors:prod"
```

---

### Phase 4: Search Edge Function (Vector Bucket Query)

**Goal:** New search endpoint that queries the vector bucket.

#### 4.1 Create `supabase/functions/search-v2/index.ts`

```ts
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Built-in gte-small model — no imports or API keys needed
const session = new Supabase.ai.Session('gte-small')

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const { query, mailbox_id, limit = 20 } = await req.json()

  // 1. Embed the user query locally with gte-small (no API call)
  const queryVector = await session.run(query, {
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
})
```

#### 4.2 Register in `supabase/config.toml`

```toml
[functions.search-v2]
verify_jwt = false
```

#### 4.3 Key query features

- **Metadata filtering** — scope search to a specific mailing list via `mailbox_id`
- **Deduplication** — multiple chunks from the same email may match; we return the
  email once, ranked by its best-matching chunk
- **Full message fetch** — vector metadata is lightweight; we fetch the full message
  body from Postgres for display
- **Configurable limit** — caller can request more/fewer results (default 20)

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
                    LLM call (GPT-4o-mini or Claude)
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

This function extends `search-v2` by adding an LLM synthesis step:

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
| LLM synthesis (GPT-4o-mini or Claude) | ~1-3s | ~$0.001-0.005 depending on context size |
| **Total** | **~1.5-4s** | **~$0.005** |

This is acceptable for a search feature where users expect a brief wait for AI answers.

---

### Phase 6: Frontend Updates

**Goal:** Update the search UI to support the new search features.

#### 6.1 Update search page to call `search-v2`

In `src/app/lists/search/page.tsx`:
- Switch from `functions.invoke("search")` to `functions.invoke("search-v2")`
- Add optional `mailbox_id` filter parameter from query string
- Display relevance scores
- Show which chunk matched (highlight relevant section)

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
| Full re-embed (1M messages, ~3M chunks) | ~3M | ~4-6 hours | **$0** |
| Monthly incremental (~5K messages, ~15K chunks) | ~15K | ~2-3 minutes | **$0** |

This is a major advantage over OpenAI — the entire 1M+ message archive can be embedded
without any API fees.

### Query performance

- Vector Bucket similarity search: **200-500ms** for sub-second results
- Acceptable for search UX; if latency becomes critical, consider keeping a pgvector
  hot cache for the most recent N months of data

### Storage

- 384-dim float32 vectors × 3M chunks = ~4.5 GB of vector data (4x smaller than 1536-dim)
- Stored on S3 (cheap), not in PostgreSQL (expensive database disk)
- Metadata per vector is lightweight (~200 bytes) = ~600 MB total metadata

---

## Migration Strategy

### Step 1: Build in parallel (this plan)
- Create all new scripts and the new Edge Function alongside the existing system
- The old `embed.js` and `search` Edge Function continue to work unchanged

### Step 2: Backfill
- Run `chunk.js` against all existing messages
- Run `embed-vectors.js` to populate the vector bucket with all historical data
- Validate search quality by comparing results from both systems

### Step 3: Switch over
- Update the frontend to use `search-v2` (or `search-rag`)
- Monitor for quality and latency

### Step 4: Cleanup (separate commit)
- Drop the `embedding` column from `messages` table
- Remove `scripts/embed.js`
- Remove `supabase/functions/search/` (old Edge Function)
- Remove the `search()` SQL function
- Reclaim significant database disk space

---

## File Changes Summary

### New files

| File | Purpose |
|---|---|
| `scripts/setup-vector-bucket.js` | One-time setup: create bucket and index |
| `scripts/chunk.js` | Chunk messages into `message_chunks` |
| `scripts/embed-vectors.js` | Embed chunks with `gte-small` (local) → vector bucket |
| `scripts/pipeline.js` | Orchestrate full ingestion pipeline |
| `supabase/functions/search-v2/index.ts` | New search Edge Function (vector bucket) |
| `supabase/functions/search-rag/index.ts` | (Optional) RAG-powered search |
| `supabase/migrations/XXXXXX_message_chunks.sql` | `message_chunks` table |

### Modified files

| File | Change |
|---|---|
| `package.json` | Add npm scripts, add `@xenova/transformers`, update `@supabase/supabase-js` |
| `supabase/config.toml` | Register new Edge Functions |
| `src/app/lists/search/page.tsx` | Switch to `search-v2`, add filters |
| `src/components/QuickSearch.tsx` | Add list filter support |

### Unchanged (until cleanup commit)

| File | Status |
|---|---|
| `scripts/embed.js` | Kept for backward compatibility |
| `supabase/functions/search/index.ts` | Kept as fallback |
| `supabase/migrations/20240512154843_search.sql` | Kept — `search()` function still works |

---

## Testing Plan

1. **Unit tests for chunking** — test paragraph splitting, overlap, edge cases (empty body,
   all-quoted email, very long emails, code-heavy emails)
2. **Unit tests for embedding pipeline** — mock `@xenova/transformers`, verify 384-dim vector format and metadata
3. **Integration test: round-trip** — chunk → embed → query → verify the original message
   appears in results
4. **Search quality comparison** — run a set of known queries against both the old pgvector
   search and the new vector bucket search, compare relevance
5. **Load test** — verify the pipeline handles 1M+ messages without failures or memory issues
6. **Edge Function tests** — verify metadata filtering, deduplication, error handling

---

## Open Questions

1. **Vector Buckets is in Public Alpha** — monitor for breaking changes and limit updates.
   Have a fallback plan (pgvector stays operational).
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
