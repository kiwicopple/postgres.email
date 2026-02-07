# Test Fixtures

This directory contains test fixtures for the postgres.email test suite.

## Email Formatting Fixtures

The [email-formatting.json](email-formatting.json) file contains test cases for email body text formatting, including:

- Code blocks (indented with tabs, 2 spaces, 4 spaces)
- Quoted text (single and nested quotes)
- URL detection and linkification
- Mixed content
- Edge cases

### Adding New Fixtures

To add a new test case to prevent regression:

1. Open `email-formatting.json`
2. Add a new object to the `fixtures` array:

```json
{
  "name": "descriptive_name",
  "id": "<optional-message-id@domain.com>",
  "description": "Brief description of what this tests",
  "body_text": "The actual email body text content..."
}
```

3. The tests in `tests/integration/components/email-formatting.test.ts` will automatically:
   - Load and parse the new fixture
   - Test for parsing errors
   - Extract and validate code blocks, quotes, and links

### Example: Adding a Real Email

If you encounter an email on postgres.email that has formatting issues:

1. Navigate to the email (e.g., `https://postgres.email/lists/pgsql-hackers/<message-id>`)
2. Copy the email body text
3. Add it to `email-formatting.json`:

```json
{
  "name": "regression_formatting_bug_2026_02_07",
  "id": "<actual-message-id@mail.gmail.com>",
  "description": "Email that had formatting issues with code blocks and links",
  "body_text": "Paste the actual body text here..."
}
```

4. Run tests: `pnpm test tests/integration/components/email-formatting.test.ts`
5. Fix any formatting issues in the code
6. The fixture now serves as a regression test

### Fixture Best Practices

- **Use descriptive names**: Make it clear what the fixture tests
- **Add descriptions**: Explain what specific aspect is being tested
- **Keep it focused**: Each fixture should test a specific formatting scenario
- **Include real emails**: When bugs occur, add the problematic email as a fixture
- **Test edge cases**: Include null, empty, and unusual formatting

### Available Fixtures

Current test fixtures cover:

- ✅ Code blocks with different indentation styles
- ✅ Quoted email replies
- ✅ Nested quotes
- ✅ URL linkification
- ✅ Mixed content (code + quotes + links)
- ✅ SQL queries
- ✅ Patch/diff format
- ✅ PostgreSQL table output (with separators, without separators, in quotes)
- ✅ Edge cases (null, whitespace, paragraphs)
- ✅ Real-world PostgreSQL mailing list emails

## Other Fixtures

### sample.mbox

A sample mbox file containing 5 test emails used by `tests/integration/scripts/parse.test.js` to test mbox file parsing functionality.
