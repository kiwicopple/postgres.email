# Vector Bucket Search — validation & rollout plan

## Context

The vector-bucket search stack from PR #10 (merged Feb 2026) is fully in `main`:

- `scripts/setup-vector-bucket.js` — creates `email-embeddings` bucket + `email-chunks` index (gte-small, 384-dim, cosine), idempotent
- `scripts/embed-vectors.js` — fetches messages in batches, chunks via `scripts/lib/chunker.js`, embeds with `@xenova/transformers` (`Supabase/gte-small`), writes vectors with metadata (`message_id`, `chunk_index`, `mailbox_id`, `embedding_model`), marks `messages.embedded_at`. Supports `--dry-run`, `--limit`, `--lists`, `--verbose`.
- `supabase/functions/search/index.ts` — embeds queries via `Supabase.ai.Session("gte-small")`, queries the bucket, dedupes by `message_id`, fetches rows, returns ranked results
- `src/app/lists/search/page.tsx` + `src/components/SearchFilter.tsx` — search UI calling the edge function via `supabase.functions.invoke('search', ...)`
- 266 tests pass (mocked SDK, no live integration)

What **hasn't** been done: nobody has run any of this against a real Supabase project. Vector Buckets was alpha when PR #10 landed; the SDK surface, edge-function runtime, and required env vars all need verification against current reality.

## Gaps to close

### 1. Verify Vector Bucket SDK surface against installed `@supabase/supabase-js`

Confirm `supabase.storage.vectors.createBucket()`, `.from(bucket).createIndex()`, `.index(name).queryVectors()` still match the API in `@supabase/supabase-js@^2.95.3` (and whatever the edge runtime ships with). If the API has shifted (e.g. `s3_vectors`, renamed methods, different filter syntax), update the three callsites:

- `scripts/setup-vector-bucket.js:16,32-33`
- `scripts/embed-vectors.js` (write path)
- `supabase/functions/search/index.ts:90-101`

### 2. Run setup against the local Supabase

```bash
supabase start
npm run setup:vectors
```

Confirm the bucket and index appear via `supabase` CLI / dashboard. Re-run to verify idempotency.

### 3. Smoke-test the embed pipeline end-to-end

```bash
npm run parse:sample              # populate messages from sample.mbox
npm run embed:vectors:test        # dry-run, 10 messages, JSON to stdout
npm run embed:vectors -- --limit 50
```

Confirm: vectors land in the bucket, `messages.embedded_at` updates, second run skips already-embedded rows. Check metadata shape by querying the bucket directly.

### 4. Deploy & invoke the search edge function locally

```bash
supabase functions serve search
curl -X POST http://localhost:54321/functions/v1/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"connection pooling","limit":5}'
```

Confirm: `Supabase.ai.Session("gte-small")` loads in the edge runtime (it's been moved/renamed before), the bucket query returns hits, the response shape matches what `src/app/lists/search/page.tsx` expects.

### 5. Browser test the search UI

`npm run dev`, exercise `/lists/search?q=...&list=...`, confirm result list renders, links go to the right thread, list filter scopes correctly. Check network tab for the edge-function call shape.

### 6. Document `SUPABASE_SERVICE_ROLE_KEY`

`.env.example` lists `SUPABASE_SECRET_KEY` but the search edge function reads `SUPABASE_SERVICE_ROLE_KEY` (`supabase/functions/search/index.ts:11`). Either align the env var name in the function with what the rest of the project uses, or add `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` with a note that it's auto-injected by the Supabase platform in deployed functions.

### 7. Production rollout

1. `npm run setup:vectors:prod`
2. `supabase functions deploy search`
3. `npm run embed:vectors:prod` — full backfill across all mailing lists (1M+ messages; budget time, run in screen/tmux, watch logs)
4. Verify search on the live site

## Out of scope for this PR

- Hybrid search (lexical + vector) — keep it pure-vector for now
- RAG / answer generation
- Re-embedding when chunker config changes — handle ad-hoc by clearing `embedded_at`
- Search analytics / query logging
