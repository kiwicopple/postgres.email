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
│  messages table ──► embed-vectors.js ──────────────► Vector Bucket   │
│  (body_text)        chunk in memory + embed           (S3-backed)    │
│                     (gte-small local)                                │
│                                                                      │
│  Each chunk stored with metadata:                                    │
│  { message_id, mailbox_id, subject, from_email, ts, chunk_index,     │
│    embedding_model }                                                 │
│                                                                      │
│  Progress tracked via messages.embedded_at column                    │
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
│                        Return to frontend                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Vector Bucket Infrastructure Setup ✅

**Goal:** Create the vector bucket and index, update SDK.

### 1.1 Update `@supabase/supabase-js`

The vector storage API requires `@supabase/storage-js` v2.76+:

```bash
npm install @supabase/supabase-js@latest
```

### 1.2 `scripts/setup-vector-bucket.js`

One-time setup script. Creates bucket and index, safe to re-run (skips if already exists).

```bash
npm run setup:vectors       # local
npm run setup:vectors:prod  # production
```

### 1.3 Configuration

| Setting | Value | Rationale |
|---|---|---|
| Bucket name | `email-embeddings` | Descriptive, single-purpose |
| Index name | `email-chunks` | Chunk-level vectors, not whole emails |
| Dimension | `384` | Matches `gte-small` already in the search Edge Function |
| Distance metric | `cosine` | Standard for text similarity |

---

## Phase 2: Chunking & Embedding Pipeline ✅

**Goal:** Chunk email bodies and embed them into the vector bucket. Chunks are transient
(in-memory only) — no intermediate tables in prod. Progress tracked via
`messages.embedded_at`.

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

### 2.3 Tracking embedded status

Migration adds `embedded_at` column to the existing `messages` table:

```sql
alter table messages add column embedded_at timestamptz;
create index on messages (embedded_at) where embedded_at is null;
```

Pipeline fetches `WHERE embedded_at IS NULL AND body_text IS NOT NULL` — incremental
and resumable. After successful upsert to the vector bucket, `embedded_at` is set.
Messages with body text too short to chunk are also marked (they don't need re-processing).

### 2.4 Embedding model: `gte-small`

Already in use in the search Edge Function. The batch pipeline must use the **same model**
so query and document embeddings are compatible.

| Model | Dimensions | MTEB Score | Cost | API Key |
|---|---|---|---|---|
| **`gte-small` (in use)** | **384** | **61.4** | **Free** | **No** |

### 2.5 `scripts/embed-vectors.js`

Single script that does everything: fetch → chunk → embed → store → mark done.

Uses `@xenova/transformers` (ONNX runtime for Node.js) to run `gte-small` locally.

```bash
npm install @xenova/transformers
```

Key decisions:
- **Same model everywhere** — `gte-small` for both ingestion and query. Critical.
- **Local inference** — no API calls, no rate limits, $0 cost for 3M chunks.
- **Chunks are in-memory only** — no intermediate table in prod.
- **Batch upserts** — 250 vectors per `putVectors` call (max 500).
- **Upsert semantics** — same key overwrites, so re-runs are idempotent.
- **Rich metadata** — enough to render a search result without a second DB query.

### 2.6 Model upgrades

If search quality needs improvement later:
- `Supabase/bge-small-en` (384-dim) — another Supabase ONNX model
- Any Hugging Face model with ONNX weights via `@xenova/transformers`

Changing models requires re-embedding all messages (`UPDATE messages SET embedded_at = NULL`)
and recreating the vector index. Model name stored in vector metadata to detect stale embeddings.

### 2.7 npm scripts

```json
"embed:vectors": "node -r dotenv/config scripts/embed-vectors.js",
"embed:vectors:prod": "DOTENV_CONFIG_PATH=.env.prod node -r dotenv/config scripts/embed-vectors.js"
```

---

## Phase 3: Update Search Edge Function ✅

**Goal:** Extend `supabase/functions/search/index.ts` to query the vector bucket and
return real results. It already generates the embedding — just needs to use it.

### 3.1 `supabase/functions/search/index.ts`

The Edge Function now:
1. Embeds the user query with `gte-small` (on-device in the edge runtime)
2. Queries the vector bucket with optional `mailbox_id` metadata filter
3. Deduplicates results by `message_id` (multiple chunks may match from same email)
4. Fetches full messages from Postgres
5. Merges scores with messages and returns ranked results

### 3.2 Key features

- **Metadata filtering** — scope search to a mailing list via `mailbox_id`
- **Deduplication** — multiple chunks from the same email → return email once (keeps best score)
- **Full message fetch** — pull full message from Postgres for display
- **Configurable limit** — default 20 results

### 3.3 Request / response

```bash
# Request
curl -X POST https://<project>.supabase.co/functions/v1/search \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"query": "WAL improvements", "mailbox_id": "pgsql-hackers", "limit": 10}'

# Response
[
  {
    "id": "<msg-id>",
    "mailbox_id": "pgsql-hackers",
    "subject": "WAL improvements proposal",
    "from_email": "dev@example.org",
    "ts": "2026-01-15T10:00:00Z",
    "body_text": "...",
    "score": 0.95,
    "matched_chunk": 0
  }
]
```

---

## Phase 4: Frontend Updates ✅

**Goal:** Replace the "Search coming soon" placeholder with real search results.

### 4.1 `src/app/lists/search/page.tsx`

Server component that:
- Reads `q` and `list` from URL search params
- Calls the search Edge Function with query and optional `mailbox_id`
- Renders ranked results: subject, sender (blue), list name, date, body snippet
- Each result links to the thread view
- Shows result count and active list filter

### 4.2 `src/components/SearchFilter.tsx`

Client component with:
- Search input (pre-filled with current query)
- List filter dropdown (populated from `mailboxes` table)
- Form submission updates URL params

```
/lists/search?q=toast+table&list=pgsql-hackers
```

### 4.3 `src/lib/formatters.ts`

Added `getSnippet()` — creates clean text snippets from email bodies by stripping
quoted lines and signatures, collapsing whitespace, and truncating with ellipsis.

### 4.4 Dependencies

Installed:
- `@xenova/transformers` — ONNX runtime for local `gte-small` inference
- `@supabase/supabase-js@latest` — vector storage API support

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

| File | Purpose |
|---|---|
| `scripts/lib/chunker.js` | Pure chunking logic — split, clean, overlap |
| `scripts/embed-vectors.js` | Fetch messages → chunk in memory → embed → store in vector bucket |
| `scripts/setup-vector-bucket.js` | One-time setup: create bucket and index |
| `supabase/migrations/20260207160000_embedded_at.sql` | Add `embedded_at` column to messages |
| `supabase/functions/search/index.ts` | Vector bucket query, deduplication, message fetch, ranking |
| `src/app/lists/search/page.tsx` | Search results page with ranked results and list filter |
| `src/components/SearchFilter.tsx` | Client component: search input + list filter dropdown |
| `src/lib/formatters.ts` | Added `getSnippet()` for clean body text snippets |
| `tests/integration/scripts/chunker.test.js` | 25 tests for chunking logic |
| `tests/integration/scripts/chunk.test.js` | 6 tests for chunkMessages |
| `tests/integration/scripts/embed-vectors.test.js` | 6 tests for buildVectors |
| `tests/integration/scripts/setup-vector-bucket.test.js` | 11 tests for bucket/index setup |
| `tests/integration/functions/search.test.ts` | 12 tests for deduplication & ranking |
| `tests/integration/site/search.test.ts` | 10 tests for getSnippet |
| `package.json` | Added scripts, `@xenova/transformers`, updated `@supabase/supabase-js` |

---

## Testing Plan

1. ✅ **Chunking logic** — paragraph splitting, overlap, edge cases (empty body, all-quoted, very long, code-heavy) — 25 tests
2. ✅ **Message chunking** — chunkMessages: multi-message, quoted reply stripping, short skipping — 6 tests
3. ✅ **Vector building** — buildVectors: structure, metadata, Float32Array conversion, model versioning — 6 tests
4. ✅ **Vector bucket setup** — bucket/index creation, idempotency, error handling — 11 tests
5. ✅ **Search logic** — deduplication by message_id, ranking, score merging, edge cases — 12 tests
6. ✅ **Search snippets** — getSnippet: quote stripping, signature removal, truncation, edge cases — 10 tests

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

### Embedding (gte-small)
- [Running AI Models in Edge Functions](https://supabase.com/docs/guides/functions/ai-models)
- [Supabase/gte-small on Hugging Face](https://huggingface.co/Supabase/gte-small)
- [Transformers.js (ONNX runtime for Node/Deno)](https://huggingface.co/docs/transformers.js)

### Chunking
- [Chunking Strategies (Pinecone)](https://www.pinecone.io/learn/chunking-strategies/)
- [Chunking Strategies (Weaviate)](https://weaviate.io/blog/chunking-strategies-for-rag)
