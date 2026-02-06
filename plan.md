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

## Testing Strategy

### Test Framework

Use **Vitest** (or Jest) for unit and integration tests. Vitest is faster and works well with modern Node.js.

```bash
npm install -D vitest
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Directory Structure

```
scripts/
├── __tests__/
│   ├── download.test.js
│   ├── parse.test.js
│   ├── embed.test.js
│   └── fixtures/
│       ├── sample.mbox           # Small mbox with 5-10 messages
│       ├── malformed.mbox        # Edge cases: missing headers, bad encoding
│       ├── empty.mbox            # Empty file
│       └── single-message.mbox   # One valid message
├── download.js
├── parse.js
└── embed.js
```

### Test Fixtures

Create small, representative mbox files for testing:

**`fixtures/sample.mbox`** — A valid mbox with 5-10 real messages from pgsql-hackers covering:
- Simple plain-text message
- Message with replies (in-reply-to header)
- Message with CC recipients
- Message with attachments
- Message with non-ASCII characters (UTF-8, ISO-8859-1)

**`fixtures/malformed.mbox`** — Edge cases:
- Message missing `Message-ID` header (should be skipped)
- Message with malformed date
- Message with invalid encoding declaration
- Message with extremely long lines
- Truncated message

**`fixtures/empty.mbox`** — Empty file (0 bytes)

**`fixtures/single-message.mbox`** — One complete, valid message for simple assertions

### Unit Tests

#### `download.test.js`

```js
import { describe, it, expect, vi } from 'vitest'
import { buildMboxUrl, shouldDownload, parseListPage } from '../download.js'

describe('buildMboxUrl', () => {
  it('constructs correct URL for list and date', () => {
    expect(buildMboxUrl('pgsql-hackers', 2024, 1))
      .toBe('https://www.postgresql.org/list/pgsql-hackers/mbox/pgsql-hackers.202401')
  })
})

describe('shouldDownload', () => {
  it('returns true when local file does not exist', async () => {
    expect(await shouldDownload('/nonexistent/file', 1000)).toBe(true)
  })

  it('returns false when local file size matches remote', async () => {
    // Create temp file, mock HEAD request
  })
})

describe('parseListPage', () => {
  it('extracts mbox links from HTML', () => {
    const html = '<a href="/list/pgsql-hackers/mbox/pgsql-hackers.202401">mbox</a>'
    expect(parseListPage(html)).toContain('pgsql-hackers.202401')
  })
})
```

#### `parse.test.js`

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseMessage, extractMailboxId, parseMboxFile } from '../parse.js'
import { readFileSync } from 'fs'
import path from 'path'

const fixturesDir = path.join(__dirname, 'fixtures')

describe('extractMailboxId', () => {
  it('extracts list name from filepath', () => {
    expect(extractMailboxId('archives/pgsql-hackers/pgsql-hackers.202401'))
      .toBe('pgsql-hackers')
  })
})

describe('parseMessage', () => {
  it('handles message with all fields', async () => {
    const raw = readFileSync(path.join(fixturesDir, 'single-message.mbox'))
    const msg = await parseMessage(raw)
    expect(msg.id).toBeDefined()
    expect(msg.subject).toBeDefined()
    expect(msg.from_email).toBeDefined()
  })

  it('handles missing cc field gracefully', async () => {
    // Message without CC header should have cc_addresses: null
  })

  it('handles non-UTF8 encoding', async () => {
    // ISO-8859-1 message should be converted to UTF-8
  })
})

describe('parseMboxFile', () => {
  it('parses all messages from sample.mbox', async () => {
    const messages = await parseMboxFile(path.join(fixturesDir, 'sample.mbox'))
    expect(messages.length).toBeGreaterThan(0)
  })

  it('skips messages without message-id', async () => {
    const messages = await parseMboxFile(path.join(fixturesDir, 'malformed.mbox'))
    // Count should exclude messages missing Message-ID
  })

  it('returns empty array for empty file', async () => {
    const messages = await parseMboxFile(path.join(fixturesDir, 'empty.mbox'))
    expect(messages).toEqual([])
  })
})
```

#### `embed.test.js`

```js
import { describe, it, expect, vi } from 'vitest'
import { cleanseText, generateEmbedding } from '../embed.js'

describe('cleanseText', () => {
  it('removes quoted lines', () => {
    const input = 'Hello\n> quoted line\n> another quote\nWorld'
    expect(cleanseText(input)).toBe('Hello World')
  })

  it('handles empty input', () => {
    expect(cleanseText('')).toBe('')
  })

  it('handles text with only quotes', () => {
    expect(cleanseText('> all quoted\n> lines')).toBe('')
  })
})

describe('generateEmbedding', () => {
  it('calls OpenAI API with cleansed text', async () => {
    const mockOpenAI = {
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0) }]
        })
      }
    }
    const embedding = await generateEmbedding('test text', mockOpenAI)
    expect(embedding).toHaveLength(1536)
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({ input: 'test text' })
    )
  })
})
```

### Integration Tests

Integration tests run against a real (local) database. Use Supabase local dev environment.

```js
// __tests__/integration/parse.integration.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { parseMboxFile, insertMessages } from '../../parse.js'

describe('parse integration', () => {
  let supabase

  beforeAll(async () => {
    // Connect to local Supabase
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    // Clean test data
    await supabase.from('messages').delete().eq('mailbox_id', 'test-list')
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('messages').delete().eq('mailbox_id', 'test-list')
  })

  it('inserts parsed messages into database', async () => {
    const messages = await parseMboxFile('__tests__/fixtures/sample.mbox')
    await insertMessages(supabase, messages, 'test-list')

    const { data, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('mailbox_id', 'test-list')

    expect(count).toBe(messages.length)
  })

  it('handles duplicate message-ids via upsert', async () => {
    const messages = await parseMboxFile('__tests__/fixtures/single-message.mbox')

    // Insert twice
    await insertMessages(supabase, messages, 'test-list')
    await insertMessages(supabase, messages, 'test-list')

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('id', messages[0].id)

    expect(count).toBe(1) // Not duplicated
  })
})
```

### Mocking External Dependencies

#### HTTP Requests (download.js)

Use `msw` (Mock Service Worker) or `nock` to mock HTTP responses:

```js
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('https://www.postgresql.org/list/pgsql-hackers/mbox/*', () => {
    return new HttpResponse(readFileSync('fixtures/sample.mbox'), {
      headers: { 'Content-Length': '12345' }
    })
  }),
  http.head('https://www.postgresql.org/list/pgsql-hackers/mbox/*', () => {
    return new HttpResponse(null, {
      headers: { 'Content-Length': '12345' }
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

#### OpenAI API (embed.js)

Inject the OpenAI client as a dependency so it can be mocked:

```js
// embed.js
export async function processMessages(supabase, openai = defaultOpenAI) {
  // Use injected client
}

// In tests, pass a mock
const mockOpenAI = { embeddings: { create: vi.fn() } }
await processMessages(supabase, mockOpenAI)
```

#### Database (all scripts)

For unit tests, mock Supabase client. For integration tests, use local Supabase.

### Test Commands

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run --exclude '**/*.integration.test.js'",
    "test:integration": "vitest run --include '**/*.integration.test.js'"
  }
}
```

### CI Pipeline

Add GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 54322:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run migrations
        run: npx supabase db push --local
        env:
          SUPABASE_DB_URL: postgresql://postgres:postgres@localhost:54322/postgres

      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Coverage Goals

- **Unit tests**: 80%+ coverage on core parsing and transformation logic
- **Integration tests**: Cover happy path for each script
- **Edge cases**: Malformed input, network failures, database conflicts

---

## Operational Notes

- **Full backfill**: Some lists have archives going back to 1997. A full download of all lists will be many gigabytes. Start with recent years (2020+) and backfill older data incrementally.
- **Ongoing updates**: Run the pipeline monthly (or weekly) to pick up new messages. The download script's size-check skipping makes re-runs cheap.
- **Storage**: mbox files are text and compress well. Consider adding a `--compress` flag to gzip downloaded files after parsing.
- **Monitoring**: The pipeline scripts should exit with non-zero codes on fatal errors so they can be used in cron jobs or CI/CD with proper alerting.
