# PostgreSQL Mailing List Pipeline Plan

## Goal

Build a robust pipeline to download mbox archives from the PostgreSQL mailing lists, parse them, and load the emails into the Supabase PostgreSQL database. Replace the current fragile, single-file, hardcoded approach with something that handles all lists, runs incrementally, and recovers from errors.

---

## Current State

### What exists today

- **`scripts/parse.js`** — Reads a single hardcoded mbox file (`archives/pgsql-hackers.202404`), parses it with `mbox-reader` + `mailparser`, and inserts into the `messages` table. Problems:
  - Hardcoded to one file and one `mailbox_id` (`pgsql-hackers`)
  - No download step — assumes mbox files already exist in `archives/`
  - No progress tracking or resumability
  - Crashes on missing fields (e.g. `parsed.cc.value` throws if cc is null)
  - No batching — one INSERT per message
  - No logging beyond console.log
- **`scripts/embed.js`** — Fetches all messages, generates OpenAI embeddings, updates one at a time. No batching, no incremental processing (re-processes everything).
- **Database schema** — `mailboxes` and `messages` tables exist with the right structure. The `threads` recursive view works. Vector search function exists.
- **`archives/`** — Empty directory with `.gitkeep`.

### PostgreSQL mbox archive access

The PostgreSQL project hosts mbox archives at:
```
https://www.postgresql.org/list/{list-name}/mbox/{list-name}.{YYYY}{MM}
```
- Requires HTTP Basic Auth: username `archives`, password `antispam`
- Each mbox file covers one calendar month for one list
- The list index page at `https://www.postgresql.org/list/` links to all available lists
- Individual list pages contain links to all available mbox files

---

## Proposed Pipeline

Three scripts, each independently runnable, composable into a single pipeline:

```
download.js → parse.js → embed.js
```

### Script 1: `scripts/download.js`

**Purpose:** Download mbox files from postgresql.org into `archives/`.

**Behavior:**
1. Accept CLI args for which lists to download (default: all lists in the `mailboxes` table, or a hardcoded priority list)
2. Accept optional date range args (`--from 2020-01` `--to 2026-01`) to limit scope
3. For each list + month combination, construct the URL:
   ```
   https://www.postgresql.org/list/{list}/mbox/{list}.{YYYYMM}
   ```
4. Download with HTTP Basic Auth (`archives` / `antispam`)
5. Save to `archives/{list}/{list}.{YYYYMM}` (organize by list subdirectory)
6. **Skip if file already exists and size matches** (HEAD request to check Content-Length vs local file size)
7. Retry failed downloads up to 3 times with exponential backoff
8. Rate limit requests (1-2 seconds between downloads) to be polite to the server
9. Write a manifest file `archives/{list}/manifest.json` tracking downloaded files, sizes, and checksums

**Dependencies:** `node-fetch` (or built-in `fetch` in Node 18+), no new heavy deps needed.

**CLI examples:**
```bash
# Download all lists, all available months
npm run download

# Download specific list(s)
npm run download -- --lists pgsql-hackers,pgsql-general

# Download specific date range
npm run download -- --lists pgsql-hackers --from 2023-01 --to 2024-12
```

### Script 2: `scripts/parse.js` (rewrite)

**Purpose:** Parse downloaded mbox files and load into PostgreSQL.

**Changes from current version:**
1. Accept CLI args for which files to process (default: all files in `archives/`)
2. **Derive `mailbox_id` from the filename/directory** instead of hardcoding
3. **Auto-create mailbox records** — `INSERT INTO mailboxes ON CONFLICT DO NOTHING` before processing
4. **Fix null safety** — guard against missing `cc`, `to`, `from` fields:
   ```js
   cc_addresses: parsed.cc?.value ?? null,
   to_addresses: parsed.to?.value ?? null,
   ```
5. **Batch inserts** — collect messages in batches of 100, use a single multi-row INSERT or COPY for performance
6. **Track progress** — write a state file (`archives/{list}/parse-state.json`) recording the last successfully processed file and message offset, so re-runs skip already-loaded data
7. **Better error handling** — log failed messages to a `parse-errors.log` file with the message-id and error, don't crash the whole run
8. **Update mailbox message counts** after each file:
   ```sql
   UPDATE mailboxes SET message_count = (
     SELECT count(*) FROM messages WHERE mailbox_id = $1
   ) WHERE id = $1;
   ```

**CLI examples:**
```bash
# Parse all downloaded archives
npm run parse

# Parse specific list
npm run parse -- --lists pgsql-hackers

# Force re-parse (ignore state file)
npm run parse -- --force
```

### Script 3: `scripts/embed.js` (rewrite)

**Purpose:** Generate embeddings for messages that don't have one yet.

**Changes from current version:**
1. **Incremental** — only fetch messages where `embedding IS NULL`
2. **Batch processing** — process in pages of 100 messages
3. **Rate limiting** — respect OpenAI rate limits
4. **Parallel requests** — send up to 5 embedding requests concurrently using `Promise.all` with a concurrency limiter
5. **Progress logging** — log count of processed/remaining

**CLI examples:**
```bash
# Embed all messages missing embeddings
npm run embed

# Embed specific list only
npm run embed -- --lists pgsql-hackers

# Limit batch size (useful for testing)
npm run embed -- --limit 100
```

### Script 4: `scripts/pipeline.js` (new, optional orchestrator)

**Purpose:** Run all three steps in sequence.

```bash
npm run pipeline -- --lists pgsql-hackers --from 2023-01
```

This just calls download → parse → embed in order, forwarding CLI args.

---

## Database Changes

### New migration: Add tracking columns

```sql
-- Track when each message was inserted/updated
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Index for finding messages without embeddings
CREATE INDEX IF NOT EXISTS idx_messages_embedding_null
  ON messages (mailbox_id) WHERE embedding IS NULL;

-- Add more mailboxes to the seed data
INSERT INTO mailboxes (id, message_count) VALUES
  ('pgsql-general', 0),
  ('pgsql-bugs', 0),
  ('pgsql-performance', 0),
  ('pgsql-novice', 0),
  ('pgsql-sql', 0),
  ('pgsql-admin', 0),
  ('pgsql-committers', 0)
ON CONFLICT (id) DO NOTHING;
```

### Consider for future: partitioning

If the dataset grows large (millions of messages across all lists), consider partitioning the `messages` table by `mailbox_id` or by year. Not needed immediately.

---

## Package.json Scripts

```json
{
  "scripts": {
    "download": "node -r dotenv/config scripts/download.js",
    "download:prod": "node -r dotenv/config scripts/download.js dotenv_config_path=.env.prod",
    "parse": "node -r dotenv/config scripts/parse.js",
    "parse:prod": "node -r dotenv/config scripts/parse.js dotenv_config_path=.env.prod",
    "embed": "node -r dotenv/config scripts/embed.js",
    "embed:prod": "node -r dotenv/config scripts/embed.js dotenv_config_path=.env.prod",
    "pipeline": "node -r dotenv/config scripts/pipeline.js",
    "pipeline:prod": "node -r dotenv/config scripts/pipeline.js dotenv_config_path=.env.prod"
  }
}
```

---

## Directory Structure After Implementation

```
scripts/
├── download.js      # Step 1: Download mbox files
├── parse.js         # Step 2: Parse mbox → database
├── embed.js         # Step 3: Generate embeddings
├── pipeline.js      # Orchestrator: runs all 3 steps
└── lib/
    ├── db.js        # Shared database pool/connection
    ├── config.js    # Shared config (lists, URLs, CLI arg parsing)
    └── logger.js    # Simple logger (console + file)

archives/
├── .gitkeep
├── pgsql-hackers/
│   ├── manifest.json
│   ├── parse-state.json
│   ├── pgsql-hackers.202301
│   ├── pgsql-hackers.202302
│   └── ...
├── pgsql-general/
│   └── ...
└── ...
```

The `archives/` directory should be in `.gitignore` (except `.gitkeep`).

---

## Implementation Order

1. **`scripts/lib/config.js`** — CLI arg parsing, list definitions, shared constants
2. **`scripts/lib/db.js`** — Database pool setup, shared query helpers
3. **`scripts/download.js`** — Download logic (can be tested independently)
4. **`scripts/parse.js`** — Rewrite parser (can be tested with manually placed mbox files)
5. **`scripts/embed.js`** — Rewrite embedder
6. **`scripts/pipeline.js`** — Orchestrator
7. **Database migration** — Add tracking columns and new mailbox seeds
8. **Update `.gitignore`** — Ensure `archives/` contents (except `.gitkeep`) are ignored

---

## Priority Lists to Ingest

Start with the highest-traffic and most useful lists:

| List | Description | Priority |
|------|-------------|----------|
| `pgsql-hackers` | Development discussion | High |
| `pgsql-general` | General usage | High |
| `pgsql-bugs` | Bug reports | High |
| `pgsql-performance` | Performance tuning | Medium |
| `pgsql-announce` | Announcements | Medium |
| `pgsql-novice` | Beginner questions | Medium |
| `pgsql-sql` | SQL questions | Medium |
| `pgsql-admin` | Administration | Medium |
| `pgsql-committers` | Commit notifications | Low |

---

## Error Handling Strategy

- **Download failures** — Retry 3x with backoff, log failures, continue with next file. A failed download doesn't block parsing of already-downloaded files.
- **Parse failures** — Log bad messages to error file with message-id, skip and continue. A single malformed email shouldn't halt the pipeline.
- **Database failures** — Retry transient errors (connection reset, deadlock). On persistent failure, save unprocessed message-ids to a retry file.
- **Embedding failures** — Log and skip. Messages without embeddings still appear in the UI, they just aren't searchable via semantic search.

---

## Operational Notes

- **Full backfill**: Some lists have archives going back to 1997. A full download of all lists will be many gigabytes. Start with recent years (2020+) and backfill older data incrementally.
- **Ongoing updates**: Run the pipeline monthly (or weekly) to pick up new messages. The download script's size-check skipping makes re-runs cheap.
- **Storage**: mbox files are text and compress well. Consider adding a `--compress` flag to gzip downloaded files after parsing.
- **Monitoring**: The pipeline scripts should exit with non-zero codes on fatal errors so they can be used in cron jobs or CI/CD with proper alerting.
