# Agent Guide for postgres.email

This document provides comprehensive guidance for AI agents working on the postgres.email codebase.

## Project Overview

**postgres.email** is a searchable web archive of PostgreSQL mailing lists. It downloads, parses, and displays email archives from PostgreSQL mailing lists (pgsql-hackers, pgsql-general, pgsql-announce, etc.) in a threaded, searchable interface.

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Database:** PostgreSQL with pgvector for semantic search
- **CLI Scripts:** Node.js scripts for downloading, parsing, and embedding emails
- **Testing:** Vitest for integration tests

## Architecture

### Application Structure

```
postgres.email/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── lists/             # Main list and thread views
│   │   │   ├── [listId]/      # Individual list view
│   │   │   │   ├── [threadId]/ # Thread detail view
│   │   │   │   ├── layout.tsx  # List layout with message sidebar
│   │   │   │   └── MessageList.tsx # Message thread list component
│   │   │   ├── layout.tsx      # Main layout with list sidebar
│   │   │   └── search/        # Search functionality
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ListNav.tsx       # Desktop list navigation (client component)
│   │   ├── MobileNav.tsx     # Mobile navigation
│   │   └── QuickSearch.tsx   # Search component
│   ├── models/               # Data models and API functions
│   │   ├── list.ts          # List and mailbox queries
│   │   └── thread.ts        # Thread queries
│   └── lib/                  # Utilities
│       ├── database.types.ts # Generated Supabase types
│       └── supabase.ts      # Supabase client
├── scripts/                  # CLI tools for data pipeline
│   ├── download.js          # Download mbox archives
│   ├── parse.js             # Parse emails and insert to DB
│   ├── setup-vector-bucket.js # Create vector bucket + index (one-time)
│   ├── embed-vectors.js     # Chunk + embed (gte-small) into vector bucket
│   ├── smoke-search.js      # End-to-end prod smoke test for search
│   └── lib/
│       ├── config.js        # Shared configuration
│       ├── chunker.js       # Paragraph-aware text splitter
│       ├── db.js            # Database utilities
│       └── logger.js        # Logging utilities
├── tests/                   # Integration tests
│   └── integration/
│       ├── scripts/         # Script tests
│       └── site/            # Web app tests
└── supabase/
    ├── database/            # Declarative schema source of truth (SQL files)
    └── migrations/          # Generated migrations (do not edit directly)

```

## Database Schema

### Key Tables

**mailboxes**
- `id` (text, PK): Mailing list name (e.g., "pgsql-hackers")
- `message_count` (int): Total messages in list

**messages**
- `id` (text, PK): Message-ID from email header
- `mailbox_id` (text, FK): References mailboxes(id)
- `in_reply_to` (text): Parent message ID for threading
- `ts` (timestamptz): Message timestamp
- `subject` (text): Email subject
- `from_email` (text): Sender email
- `from_addresses` (jsonb): Parsed sender info
- `to_addresses` (jsonb): Recipients
- `cc_addresses` (jsonb): CC recipients
- `bcc_addresses` (jsonb): BCC recipients
- `body_text` (text): Email body content
- `attachments` (jsonb): Attachment metadata
- `headers` (jsonb): Full email headers
- `embedded_at` (timestamptz): Set when chunks have been embedded into the Vector Bucket. Embeddings themselves are *not* stored in this table — see Search architecture below.

### Views

**threads** (flat pass-through over `public.messages`)
- Thin alias — `thread_id` is materialized on `messages` and a `BEFORE INSERT/UPDATE` trigger on `messages` sets it (root → self, reply → parent's `thread_id`, missing parent → self).
- Backed by `messages_thread_id_ts_idx` on `(thread_id, ts)`, so `WHERE thread_id = ?` is an index scan.

### Indexes

- `messages_mailbox_id_idx`: Foreign key index for joins
- `messages_ts_idx`: For ordering by timestamp
- `messages(in_reply_to)`: For threading queries (used by the backfill's parent→child propagation)
- `idx_messages_mailbox_root_threads`: Partial index for root threads (WHERE in_reply_to IS NULL) per mailbox
- `idx_messages_mailbox_ts`: Composite index for all messages per mailbox ordered by timestamp
- `messages_thread_id_ts_idx`: Composite index for `WHERE thread_id = ? ORDER BY ts` (thread page) and the search id-batch lookup
- `messages_embedded_at_idx`: Partial index on `embedded_at IS NULL` for the embed pipeline's "what's left to process" query

## Critical Performance Patterns

### Next.js Caching Configuration

**Important:** This is a read-only archive with infrequent updates, so aggressive caching is enabled.

All main pages use **Incremental Static Regeneration (ISR)** with a 60-second revalidation period:

**Pages with caching:**
- `src/app/lists/layout.tsx` - List sidebar (mailbox list)
- `src/app/lists/[listId]/layout.tsx` - Message list for specific mailbox
- `src/app/lists/[listId]/[threadId]/page.tsx` - Individual thread view

```typescript
// Each page exports this constant
export const revalidate = 60 // Revalidate every 60 seconds
```

**Pages without caching:**
- `src/app/lists/search/page.tsx` - Search results (uses `force-dynamic`)

**What this means:**
- First request generates static page and caches it
- Subsequent requests serve cached version (very fast)
- After 60 seconds, next request triggers background regeneration
- User still gets fast cached response while page rebuilds
- New emails appear within 60 seconds of being added

**For debugging:**
- If content seems stale, wait 60+ seconds and refresh
- Check build logs for cache misses/hits
- Verify `revalidate` export exists in page files

### Query Optimization

**❌ BAD - Fetches all columns including large body_text:**
```typescript
.select('messages(*)')
```

**✅ GOOD - Fetch only metadata for list views:**
```typescript
.select(`
  id,
  message_count,
  messages(
    id,
    subject,
    ts,
    from_email,
    from_addresses,
    in_reply_to
  )
`)
```

**Performance Impact:** ~90% reduction in data transfer for list views.

### Data Fetching Patterns

1. **List View** (`/lists/[listId]`)
   - Query: `mailboxes` table with filtered `messages` join
   - Filter: `in_reply_to IS NULL` (only root messages/threads)
   - Order: `ts DESC` (newest first)
   - Columns: Metadata only (NO body_text)

2. **Thread View** (`/lists/[listId]/[threadId]`)
   - Query: `threads` view
   - Filter: `thread_id = ?`
   - Columns: ALL (`SELECT *`) - includes body_text
   - Returns: Root message + all nested replies

### Type Safety

Always use `NonNullable<>` for Supabase query results:

```typescript
export type ListDetailData = Awaited<ReturnType<typeof getListDetail>>
export type ListDetailDataSuccess = NonNullable<ListDetailData["data"]> & {
  messages: MessageListMetadata[]
}
```

## Common Tasks

### 1. Making Database Schema Changes

**IMPORTANT:** This project uses **declarative schemas**. The source of truth is the SQL files in `supabase/database/`. Do NOT write migrations by hand or use `supabase migration new`.

#### How it works

The experimental `pgdelta` feature is already enabled in `supabase/config.toml`:
```toml
[experimental.pgdelta]
enabled = true
```

The SQL files in `supabase/database/` describe what the schema *should* look like. You edit those files, then run sync — the CLI diffs against the current state, generates a migration, and applies it.

#### Workflow: edit schema files, then sync

**Step 1:** Edit the relevant SQL file(s) in `supabase/database/` to reflect the desired schema state (e.g. add a column, create a new table/index/view).

**Step 2:** Run sync:
```bash
supabase db schema declarative sync
```

The CLI will:
1. Diff your schema files against the local database
2. Generate the migration SQL
3. Prompt you for a migration name
4. Warn you if there are destructive statements (DROP, etc.)
5. Apply the migration to the local database

#### Non-interactive (for CI or agentic use):
```bash
supabase db schema declarative sync --apply --name <migration_name>
```

#### Apply to production:
```bash
# Link to production project (one time)
# Project ref is at the top of .env.prod
supabase link --project-ref <project-ref>

# Push migrations to production
supabase db push
```

**Never do this:**
❌ `supabase migration new` — don't write migrations by hand
❌ Direct SQL via Supabase Studio
❌ Manual ALTER TABLE in production
❌ Editing migration files in `supabase/migrations/` directly (they are generated)

### 2. Regenerating Database Types

After any migration:
```bash
supabase gen types typescript --local > src/lib/database.types.ts
```

### 3. Downloading Mailing List Archives

```bash
# Download specific lists for date range
node scripts/download.js --lists pgsql-hackers,pgsql-general --from 2026-01 --to 2026-01 --verbose

# Download all default lists
node scripts/download.js
```

Archives are saved to `archives/[list-name]/[list-name].YYYYMM`

### 4. Parsing and Ingesting Emails

```bash
# Parse to local database
node scripts/parse.js --lists pgsql-hackers --verbose

# Parse to production database
NODE_ENV=production node -r dotenv/config scripts/parse.js dotenv_config_path=.env.prod --lists pgsql-hackers
```

### 5. Search Pipeline (Vector Buckets + gte-small)

Search is built on Supabase **Vector Buckets** (S3-backed) — a hosted-only feature. There is no local equivalent, so all setup/embed/query work runs against the hosted prod project.

**Architecture:**
1. `scripts/setup-vector-bucket.js` — creates `email-embeddings` bucket + `email-chunks` index (gte-small, 384 dims, cosine, float32). Idempotent.
2. `scripts/embed-vectors.js` — fetches messages where `embedded_at IS NULL`, chunks `body_text` with `scripts/lib/chunker.js`, embeds each chunk with `Supabase/gte-small` via `@xenova/transformers`, writes vectors to the bucket, marks `embedded_at`. Crash-safe — second run picks up where the first left off.
3. `supabase/functions/search/index.ts` — embeds the user's query in the edge runtime via `Supabase.ai.Session("gte-small")`, queries the bucket, dedupes by `message_id`, joins to `messages` for full rows.
4. `src/app/lists/search/page.tsx` — calls the function via `supabase.functions.invoke("search", ...)`.

**One-time setup (per project):**
```bash
npm run setup:vectors:prod
```

**Run / resume the embed pipeline:**
```bash
# All unembedded messages
npm run embed:vectors:prod

# Test with dry-run (prints vectors as JSON, no writes, doesn't mark embedded_at)
npm run embed:vectors:test
```

**Deploy the edge function:**
```bash
supabase functions deploy search --project-ref <project-ref>
```

**Smoke-test end-to-end against prod:**
```bash
npm run smoke:search:prod
```
This embeds a query locally, queries the bucket directly, then calls the deployed function and reports any divergence.

**Vector Buckets API gotchas (learned the hard way):**
- `createIndex` requires `dataType: 'float32'`.
- All metadata values must be **strings** — numbers/booleans get rejected with a confusing "must be boolean … must match exactly one schema in oneOf" error. The chunk number is encoded in the vector key (`<msg_id>#chunk<N>`) instead of in metadata; the search function parses it from the key for `matched_chunk` in the response.
- Declare display-only metadata keys as `nonFilterableMetadataKeys` on the index. Only `mailbox_id` is filterable here.

### 6. Running Tests

```bash
# All tests
pnpm test

# Specific test group
pnpm test tests/integration/scripts/
pnpm test tests/integration/site/

# With coverage
pnpm test -- --coverage
```

### 7. Deploying

The app auto-deploys on push to `main` via Vercel. Manual steps:

```bash
# Build locally to verify
pnpm run build

# Push to trigger deployment
git push origin main
```

## Code Conventions

### Component Patterns

1. **Server Components (default)**
   - Use for data fetching
   - No `"use client"` directive
   - Can be async
   - Example: `src/app/lists/layout.tsx`

2. **Client Components**
   - Add `"use client"` directive
   - Required for interactivity, hooks, event handlers
   - Example: `src/components/ListNav.tsx`

### Active State Detection

Use `usePathname()` to detect active routes:

```typescript
"use client"
import { usePathname } from "next/navigation"

const pathname = usePathname()
const isActive = pathname.startsWith(`/lists/${item.id}`)
```

### Styling

- Use Tailwind CSS utility classes
- Active state: `bg-blue-900 text-white font-medium`
- Hover state: `hover:bg-gray-800 hover:text-gray-200`
- Mobile-first: Use `md:` prefix for desktop styles

## Important Files

### Configuration

- **`.env.prod`**: Production database credentials (DO NOT COMMIT)
- **`.env`**: Local development environment
- **`tailwind.config.ts`**: Tailwind configuration (NO deprecated colors)
- **`vitest.config.js`**: Test configuration

### Models

- **`src/models/list.ts`**
  - `getLists()`: Fetch all mailboxes
  - `getListDetail(id)`: Fetch mailbox with message metadata
  - `MessageListMetadata`: Type for optimized list queries

- **`src/models/thread.ts`**
  - `getThread(id)`: Fetch entire thread from threads view (filters by materialized `thread_id`)
  - `getThreadIdByMessageId(id)`: Resolve a message id to its thread root

### Scripts

- **`scripts/lib/config.js`**: Shared configuration (URLs, lists, paths)
- **`scripts/lib/db.js`**: Database operations (insert batches, etc.)
- **`scripts/lib/logger.js`**: Logging utilities

## Gotchas & Known Issues

### 1. Supabase Type Generation

**Problem:** Views aren't always included in generated types.

**Solution:** Manually add view types or use `@ts-ignore` with comments.

### 2. RLS Policies

Row Level Security is enabled but policies allow all reads:
```sql
create policy "Read only" on public.messages for select to anon, authenticated using (true);
```

### 2a. Table grants are explicit (new platform default)

This project was created after April 28 2026, with the new "tables not auto-exposed" default. `pg_default_acl` is configured so the `postgres` role grants only TRUNCATE/REFERENCES/TRIGGER to `anon`/`authenticated`/`service_role` — **not** SELECT/INSERT/UPDATE/DELETE.

Implication: `GRANT ALL ON public.foo TO anon, authenticated, service_role` does **not** make `foo` reachable via the Data API. You need an explicit `GRANT SELECT` (or whichever privileges the role actually needs) per table. This is enforced before RLS — without the grant, PostgREST returns `permission denied for table foo`, regardless of policies.

The Data API surface in this project is **read-only**: the frontend reads as `anon` and the search edge function reads as `service_role` via `@supabase/server`. All writes go through direct postgres connections from the data-pipeline scripts. So every public table/view ends with:

```sql
GRANT SELECT ON public.foo TO anon, authenticated, service_role;
```

Reference: https://github.com/orgs/supabase/discussions/45329

### 2b. Supabase API keys: new model only

**Use new keys, not legacy `service_role`/`anon` JWTs.** The platform is on the new key model:

- `sb_publishable_*` (env: `SUPABASE_PUBLISHABLE_KEY` for Node, `SUPABASE_PUBLISHABLE_KEYS` plural in deployed functions) — replaces anon JWT.
- `sb_secret_*` (env: `SUPABASE_SECRET_KEY` for Node, `SUPABASE_SECRET_KEYS` plural in deployed functions) — replaces service_role JWT.

For server-side code that needs an RLS-bypassing client (edge functions, admin scripts), use the **`@supabase/server`** package, not `@supabase/supabase-js` directly:

```ts
// supabase/functions/<name>/index.ts
import { withSupabase } from "npm:@supabase/server"

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    const { data } = await ctx.supabaseAdmin.from("messages").select("id").limit(5)
    return Response.json(data)
  }),
}
```

Auth options for `withSupabase`: `"user"` | `"publishable"` | `"secret"` | `"none"`, or an array. Pick `["publishable", "secret"]` for endpoints both the public site and admin scripts call.

`@supabase/supabase-js` constructed with an `sb_secret_*` key will **not** be recognized as service_role by PostgREST — you'll get "permission denied" on RLS-protected tables. Always go through `@supabase/server` for admin access.

### 3. Mbox File Format

- Files use mbox format (Unix mailbox)
- Requires `mbox-reader` and `mailparser` packages
- Character encoding can be tricky (use `iconv-lite`)

### 4. Email Threading

- Threading is based on `in_reply_to` header
- Some emails have broken threading (missing or incorrect headers) — these become their own thread (`thread_id = id`)
- `thread_id` is materialized on `messages` by a `BEFORE INSERT/UPDATE` trigger
- `scripts/parse.js` calls `repairThreadIds(pool)` (exported from `scripts/backfill-thread-id.js`) after each list, so previously-orphan replies inherit correctly when their parents arrive in a later load. The script is idempotent and can also be run standalone via `node -r dotenv/config scripts/backfill-thread-id.js dotenv_config_path=.env.prod`

### 5. Tailwind CSS Version

Project uses Tailwind CSS 3.1.8 (old version):
- Don't use deprecated color names (lightBlue, warmGray, etc.)
- Don't import `colors` from tailwindcss - causes warnings
- Simple config works best

## Test Philosophy

Tests are **integration-focused**, not unit tests:

- **scripts tests**: Test actual file parsing, URL building, data processing
- **site tests**: Verify query patterns and optimizations
- Tests document expected behavior and performance characteristics
- Located in `tests/integration/scripts/` and `tests/integration/site/`

## Debugging Tips

### Build Failures

1. Check TypeScript types match query results
2. Ensure `NonNullable<>` is used for Supabase data
3. Regenerate database types after migrations
4. Check that all imports use correct paths (`@/` alias)

### Query Issues

1. Use Supabase Studio to inspect actual data
2. Check RLS policies aren't blocking queries
3. Verify indexes exist for filtered/sorted columns
4. Use `.explain()` on queries to see execution plan

### Performance Issues

1. Check if `body_text` is being fetched unnecessarily
2. Verify proper indexes exist (especially on foreign keys)
3. Use `threads` view for thread queries (not N+1 queries)
4. Check bundle size if FE is slow

## Future Improvements

### Potential Optimizations

1. **Pagination**: Add cursor-based pagination for large lists
2. **Incremental Loading**: Fetch messages as user scrolls
3. **Search UI**: Better search results display
4. **Caching**: Add Redis for hot data
5. **Embeddings**: Batch embedding generation more efficiently

### Technical Debt

1. Upgrade Tailwind CSS to latest version
2. Add request deduplication for concurrent fetches
3. Improve error boundaries and error UI
4. Add loading states and skeleton screens
5. Implement proper session management

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL Mailing Lists**: https://www.postgresql.org/list/
- **Tailwind CSS**: https://tailwindcss.com/docs

## Getting Help

When stuck:
1. Check this file first
2. Read the test files (`tests/integration/`) for examples
3. Check git history for context on changes
4. Review Supabase schema in migrations folder
5. Use `pnpm run build` to catch type errors early
