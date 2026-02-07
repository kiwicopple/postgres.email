#!/usr/bin/env node

/**
 * Fetch Email Fixture
 *
 * Fetches an email directly from the database and formats it as a test fixture.
 *
 * Usage:
 *   node scripts/fetch-email-fixture.js <url>
 *   node scripts/fetch-email-fixture.js <url> --add
 *
 * Examples:
 *   node scripts/fetch-email-fixture.js "https://postgres.email/lists/pgsql-hackers/%3CCACJufxHu0sXO8791FDcNXp2bFnE89jyuGkJbLCQkhgWq6XuNLg@mail.gmail.com%3E"
 *   node scripts/fetch-email-fixture.js "https://postgres.email/lists/pgsql-hackers/%3C1127261.1769649624@sss.pgh.pa.us%3E" --add
 */

const fs = require('fs')
const path = require('path')
const postgres = require('postgres')

// Parse command line arguments
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node scripts/fetch-email-fixture.js <url> [--add]')
  console.error('Example: node scripts/fetch-email-fixture.js "https://postgres.email/lists/pgsql-hackers/%3CmessageId%3E"')
  process.exit(1)
}

const url = args[0]
const shouldAdd = args.includes('--add')

// Extract message ID from URL
function extractMessageId(url) {
  try {
    // URL format: https://postgres.email/lists/{listId}/{messageId}
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const messageId = pathParts[pathParts.length - 1]
    return decodeURIComponent(messageId)
  } catch (e) {
    console.error('Failed to parse URL:', e.message)
    process.exit(1)
  }
}

// Generate a fixture name from subject
function generateFixtureName(subject, messageId) {
  if (!subject) {
    // Use a shortened message ID
    const shortId = messageId.replace(/[<>@]/g, '').substring(0, 20)
    return `email_${shortId}`
  }

  // Clean up subject to create a valid fixture name
  return subject
    .toLowerCase()
    .replace(/^(re:|fwd?:)\s*/gi, '') // Remove Re: and Fwd:
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim()
    .split(/\s+/)
    .slice(0, 5) // Take first 5 words
    .join('_')
}

async function fetchEmail(messageId) {
  // Connect to database
  const sql = postgres(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : 'prefer'
  })

  try {
    console.log(`Fetching email: ${messageId}`)

    // Query the database
    const results = await sql`
      SELECT id, subject, body_text, from_email
      FROM messages
      WHERE id = ${messageId}
    `

    if (results.length === 0) {
      console.error(`No email found with ID: ${messageId}`)
      process.exit(1)
    }

    const email = results[0]

    // Create fixture object
    const fixtureName = generateFixtureName(email.subject, email.id)
    const fixture = {
      name: fixtureName,
      id: email.id,
      description: email.subject || 'Email fixture',
      body_text: email.body_text
    }

    return fixture
  } finally {
    await sql.end()
  }
}

function addToFixturesFile(fixture) {
  const fixturesPath = path.join(__dirname, '../tests/integration/fixtures/email-formatting.json')

  // Read existing fixtures
  const fixturesData = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'))

  // Check if fixture with this ID already exists
  const existingIndex = fixturesData.fixtures.findIndex(f => f.id === fixture.id)

  if (existingIndex !== -1) {
    console.log(`\nFixture with ID ${fixture.id} already exists. Updating...`)
    fixturesData.fixtures[existingIndex] = fixture
  } else {
    console.log(`\nAdding new fixture...`)
    fixturesData.fixtures.push(fixture)
  }

  // Write back to file
  fs.writeFileSync(fixturesPath, JSON.stringify(fixturesData, null, 2) + '\n')

  console.log(`✅ Fixture ${existingIndex !== -1 ? 'updated' : 'added'} to ${fixturesPath}`)
}

function displayFixture(fixture) {
  console.log('\n' + '='.repeat(80))
  console.log('FIXTURE DATA')
  console.log('='.repeat(80))
  console.log(JSON.stringify(fixture, null, 2))
  console.log('='.repeat(80))

  if (!shouldAdd) {
    console.log('\nTo add this fixture to the test file, run:')
    console.log(`  node scripts/fetch-email-fixture.js "${url}" --add`)
  }
}

// Main execution
async function main() {
  try {
    const messageId = extractMessageId(url)
    console.log(`Message ID: ${messageId}`)

    const fixture = await fetchEmail(messageId)

    displayFixture(fixture)

    if (shouldAdd) {
      addToFixturesFile(fixture)
      console.log('\n✅ Done! Run tests to verify:')
      console.log('  pnpm test tests/integration/components/email-formatting.test.ts')
    }
  } catch (error) {
    console.error('Error:', error.message)
    if (process.env.DEBUG) {
      console.error(error)
    }
    process.exit(1)
  }
}

main()
