# Tests

Integration tests for the postgres.email project.

## Structure

```
tests/
├── integration/
│   ├── scripts/          # CLI script tests
│   │   ├── config.test.js      # Configuration parsing & URL building
│   │   ├── embed.test.js       # Email embedding generation
│   │   └── parse.test.js       # Mbox file parsing
│   ├── site/             # Web application tests
│   │   └── list-queries.test.ts  # Data fetching optimization tests
│   └── fixtures/         # Shared test data
│       └── sample.mbox
└── README.md
```

## Test Categories

### Scripts Tests (`tests/integration/scripts/`)
Tests for CLI scripts used to download, parse, and process mailing list archives.

**config.test.js** - Configuration & Utilities (19 tests)
- Argument parsing (`--lists`, `--from`, `--to`, `--force`, `--verbose`)
- URL construction for mbox archives
- Date range generation
- Mailbox ID extraction

**embed.test.js** - Email Embeddings (10 tests)
- Text cleansing (removing quoted lines)
- Embedding generation with OpenAI
- Error handling

**parse.test.js** - Email Parsing (11 tests)
- Mbox file parsing
- Message ID extraction
- Subject/from/to extraction
- Reply threading (in_reply_to)
- Body text extraction

### Site Tests (`tests/integration/site/`)
Tests for the Next.js web application and data fetching patterns.

**list-queries.test.ts** - Query Optimization (5 tests)
- List view metadata fetching (excludes body_text)
- Thread view complete data fetching
- Performance optimization verification

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test tests/integration/scripts/parse.test.js

# Run tests in watch mode (development)
pnpm test -- --watch
```

## Test Philosophy

- **Integration over Unit**: Tests focus on real-world scenarios rather than isolated units
- **Performance Verification**: Tests document and verify query optimizations
- **Practical Examples**: Tests serve as documentation for how the system works

## Adding New Tests

1. Determine if test is for **scripts** or **site**
2. Create test file in appropriate directory
3. Follow existing patterns for imports and structure
4. Document what the test verifies

Example:
```typescript
// tests/integration/site/search.test.ts
import { describe, it, expect } from 'vitest'

describe('Search Functionality', () => {
  it('should search messages by content', () => {
    // Test implementation
  })
})
```
