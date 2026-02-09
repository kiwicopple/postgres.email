# Tests

Integration tests for the postgres.email project.

## Structure

```
tests/
├── integration/
│   ├── scripts/          # CLI script tests
│   │   ├── config.test.js              # Configuration parsing & URL building
│   │   ├── parse.test.js              # Mbox file parsing
│   │   ├── chunker.test.js            # Email text chunking logic
│   │   ├── chunk.test.js              # chunkMessages (message → chunks)
│   │   ├── embed-vectors.test.js      # buildVectors (chunks → vector objects)
│   │   └── setup-vector-bucket.test.js # Vector bucket setup
│   ├── functions/        # Edge Function tests
│   │   └── search.test.ts             # Search deduplication & ranking
│   ├── components/       # React component tests
│   │   ├── email-formatting.test.ts   # Email formatting logic tests
│   │   ├── go-to-message.test.ts      # Go-to-message navigation
│   │   └── message-highlight.test.ts  # Message highlighting
│   ├── site/             # Web application tests
│   │   ├── list-queries.test.ts       # Data fetching optimization
│   │   ├── search.test.ts             # Search snippet formatting
│   │   └── thread-navigation.test.ts  # Thread navigation
│   └── fixtures/         # Shared test data
│       ├── sample.mbox
│       └── email-formatting.json      # Email formatting test cases
└── README.md
```

## Test Categories

### Scripts Tests (`tests/integration/scripts/`)
Tests for CLI scripts used to download, parse, and process mailing list archives.

**config.test.js** - Configuration & Utilities (20 tests)
- Argument parsing (`--lists`, `--from`, `--to`, `--force`, `--dry-run`, `--verbose`)
- URL construction for mbox archives
- Date range generation
- Mailbox ID extraction

**parse.test.js** - Email Parsing (11 tests)
- Mbox file parsing
- Message ID extraction
- Subject/from/to extraction
- Reply threading (in_reply_to)
- Body text extraction

**chunker.test.js** - Chunking Logic (25 tests)
- Quoted reply stripping
- Signature stripping
- Paragraph splitting
- Token estimation
- Chunk text: overlap, min/max bounds, edge cases

**chunk.test.js** - Message Chunking (6 tests)
- Single and multi-message chunking
- Short message skipping
- Quoted reply stripping in chunks

**embed-vectors.test.js** - Vector Building (6 tests)
- Vector object structure (key, data, metadata)
- Float32Array → Array conversion
- Embedding model in metadata
- Null field handling, ISO timestamp formatting

**setup-vector-bucket.test.js** - Vector Bucket Setup (11 tests)
- Config constants (bucket name, index name, dimension, distance metric)
- Bucket creation (success, already exists, error)
- Index creation (success, already exists, error)
- Setup orchestration (bucket then index)

### Functions Tests (`tests/integration/functions/`)
Tests for Supabase Edge Function logic.

**search.test.ts** - Search Deduplication & Ranking (12 tests)
- Deduplication by message_id (keeps highest-scoring chunk)
- Missing metadata handling
- Result order preservation
- Ranking: merge vector scores with message data
- Missing message handling (partial DB results)
- Empty input handling

### Components Tests (`tests/integration/components/`)
Tests for React component logic and email formatting.

**email-formatting.test.ts** - Email Formatting & Parsing (127 tests)
- Code block detection (tab, 2-space, 4-space indentation)
- URL linkification (with/without angle brackets, http/https)
- Quoted text parsing (single and nested quotes)
- PostgreSQL table formatting (with/without separators, in quotes)
- Mixed content handling (code + quotes + links)
- Edge cases (null, whitespace, multiple paragraphs)
- Real-world email regression tests

### Site Tests (`tests/integration/site/`)
Tests for the Next.js web application and data fetching patterns.

**list-queries.test.ts** - Query Optimization (5 tests)
- List view metadata fetching (excludes body_text)
- Thread view complete data fetching
- Performance optimization verification

**search.test.ts** - Search Snippets (10 tests)
- Null and empty input handling
- Short text passthrough, long text truncation with ellipsis
- Quoted line stripping, signature delimiter removal
- Whitespace collapsing
- Custom max length, realistic email body processing

**thread-navigation.test.ts** - Thread Navigation (14 tests)
- Thread navigation logic

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/integration/scripts/chunker.test.js

# Run tests in watch mode (development)
npm run test:watch
```

## Test Philosophy

- **Integration over Unit**: Tests focus on real-world scenarios rather than isolated units
- **Performance Verification**: Tests document and verify query optimizations
- **Practical Examples**: Tests serve as documentation for how the system works

## Adding New Tests

1. Determine if test is for **scripts**, **functions**, or **site**
2. Create test file in appropriate directory
3. Follow existing patterns for imports and structure
4. Document what the test verifies
