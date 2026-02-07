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
│   ├── embed.js             # Generate vector embeddings
│   └── lib/
│       ├── config.js        # Shared configuration
│       ├── db.js            # Database utilities
│       └── logger.js        # Logging utilities
├── tests/                   # Integration tests
│   └── integration/
│       ├── scripts/         # Script tests
│       └── site/            # Web app tests
└── supabase/
    └── migrations/          # Database migrations

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
- `embedding` (vector(1536)): OpenAI text embedding for semantic search

### Views

**threads** (Recursive CTE)
- Flattens message threads into a single view
- Adds `thread_id` to each message (ID of root message)
- Allows fetching entire thread with single query: `WHERE thread_id = ?`

### Indexes

- `messages_mailbox_id_idx`: Foreign key index for joins
- `messages_ts_idx`: For ordering by timestamp
- `messages(in_reply_to)`: For threading queries
- Vector index on `embedding`: For semantic search

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

**IMPORTANT:** All database changes MUST be made through migrations, not by directly modifying the database.

#### Create a new migration:
```bash
# Create a new migration file
supabase migration new <descriptive_name>

# Example:
supabase migration new add_reply_count_to_messages
```

This creates a new file in `supabase/migrations/` with a timestamp prefix.

#### Write your SQL:
Edit the migration file and add your SQL:
```sql
-- supabase/migrations/20240101000000_add_reply_count_to_messages.sql
ALTER TABLE messages ADD COLUMN reply_count INTEGER DEFAULT 0;

CREATE INDEX messages_reply_count_idx ON messages(reply_count);
```

#### Apply migration locally:
```bash
# Apply to local database
supabase db reset

# Or just apply new migrations
supabase migration up
```

#### Apply to production:
```bash
# Link to production project (one time)
# Project ref is at the top of .env.prod
supabase link --project-ref <project-ref>

# Push migrations to production
supabase db push
```

**Why migrations?**
- Version controlled schema changes
- Reproducible across environments
- Safe rollback capability
- Team coordination
- Automatic deployment to production

**Never do this:**
❌ Direct SQL via Supabase Studio
❌ Manual ALTER TABLE in production
❌ Schema changes without migration files

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

### 5. Generating Embeddings

```bash
node scripts/embed.js --lists pgsql-hackers --limit 100
```

Requires `OPENAI_API_KEY` in environment.

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
  - `getThread(id)`: Fetch entire thread from threads view
  - Uses recursive CTE view for performance

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

### 3. Mbox File Format

- Files use mbox format (Unix mailbox)
- Requires `mbox-reader` and `mailparser` packages
- Character encoding can be tricky (use `iconv-lite`)

### 4. Email Threading

- Threading is based on `in_reply_to` header
- Some emails have broken threading (missing or incorrect headers)
- The `threads` view handles this with recursive CTE

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
