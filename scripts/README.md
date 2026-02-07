# Scripts

Utility scripts for managing PostgreSQL email archives and test fixtures.

## Email Fixture Management

### fetch-email-fixture.js

Fetches emails directly from the database and creates test fixtures for regression testing.

#### Usage

**Preview fixture before adding:**
```bash
pnpm fetch-fixture "https://postgres.email/lists/pgsql-hackers/<message-id>"
```

**Add/update fixture:**
```bash
pnpm fetch-fixture "https://postgres.email/lists/pgsql-hackers/<message-id>" --add
```

#### Examples

```bash
# Preview the email fixture
pnpm fetch-fixture "https://postgres.email/lists/pgsql-hackers/%3CCACJufxHu0sXO8791FDcNXp2bFnE89jyuGkJbLCQkhgWq6XuNLg@mail.gmail.com%3E"

# Add it to the fixtures file
pnpm fetch-fixture "https://postgres.email/lists/pgsql-hackers/%3CCACJufxHu0sXO8791FDcNXp2bFnE89jyuGkJbLCQkhgWq6XuNLg@mail.gmail.com%3E" --add

# Run tests to verify
pnpm test tests/integration/components/email-formatting.test.ts
```

#### What it does

1. Extracts the message ID from the postgres.email URL
2. Queries the database directly to get email content
3. Formats the email as a test fixture with:
   - Auto-generated fixture name (from email subject)
   - Message ID
   - Subject as description
   - Full body text
4. Optionally adds/updates the fixture in `tests/integration/fixtures/email-formatting.json`

#### When to use

Use this script whenever you find an email with formatting issues:

1. **Found a bug?** Add the problematic email as a fixture
2. **Testing new features?** Add representative emails
3. **Building regression suite?** Add diverse email examples

The fixture will serve as a permanent regression test to ensure the formatting never breaks again.

## Data Management Scripts

### download.js

Downloads mbox archives from PostgreSQL mailing lists.

```bash
pnpm download
```

### parse.js

Parses mbox files and imports messages into the database.

```bash
pnpm parse
```

Production:
```bash
pnpm parse:prod
```

### embed.js

> **Removed.** Replaced by `embed-vectors.js` (see below).

### embed-vectors.js

Chunks email bodies in memory and embeds them into a Supabase Vector Bucket using `gte-small` (via `@xenova/transformers`). Progress is tracked via `messages.embedded_at`.

```bash
npm run embed:vectors
```

Production:
```bash
npm run embed:vectors:prod
```

Flags:
- `--lists pgsql-hackers,pgsql-general` — process specific lists
- `--limit 100` — cap the number of messages to process
- `--dry-run` — output vectors as JSON to stdout, skip bucket writes and DB updates
- `--verbose` — verbose logging

```bash
# Test the pipeline without writing anything
npm run embed:vectors -- --dry-run --limit 5

# Pipe to jq for inspection
npm run embed:vectors -- --dry-run --limit 1 | jq '.metadata'
```

### setup-vector-bucket.js

One-time setup: creates the `email-embeddings` vector bucket and `email-chunks` index in Supabase. Safe to re-run (skips if already exists).

```bash
npm run setup:vectors
```

Production:
```bash
npm run setup:vectors:prod
```

### lib/chunker.js

Pure chunking logic used by `embed-vectors.js`. Splits email bodies into token-bounded, paragraph-aware chunks with overlap. Strips quoted replies and signatures.

No CLI — imported as a library.

## Environment Variables

Required environment variables (in `.env`):

```env
# Database connection
DATABASE_URL=postgresql://...

# Supabase (for vector bucket and setup scripts)
SUPABASE_URL=https://...
SUPABASE_SECRET_KEY=...
```

## Adding New Scripts

When adding new scripts:

1. Create the script in `scripts/`
2. Add npm script to `package.json`
3. Document it in this README
4. Add tests if applicable
