require('dotenv').config()

const { parseArgs, DEFAULT_LISTS } = require('./lib/config')
const { getPool, closePool } = require('./lib/db')
const { createLogger } = require('./lib/logger')
const { chunkText } = require('./lib/chunker')

const BATCH_SIZE = 100

/**
 * Fetch messages that haven't been chunked yet
 * @param {import('pg').Pool} pool
 * @param {string[]} lists
 * @param {number|null} limit
 * @returns {Promise<Array>}
 */
async function fetchUnchunkedMessages(pool, lists, limit) {
  const query = `
    SELECT m.id, m.mailbox_id, m.subject, m.from_email, m.ts, m.body_text
    FROM messages m
    WHERE m.body_text IS NOT NULL
      AND m.mailbox_id = ANY($1)
      AND NOT EXISTS (
        SELECT 1 FROM pipeline.message_chunks mc WHERE mc.message_id = m.id
      )
    ORDER BY m.ts DESC
    ${limit ? `LIMIT ${parseInt(limit, 10)}` : ''}
  `
  const { rows } = await pool.query(query, [lists])
  return rows
}

/**
 * Insert chunk rows into message_chunks table
 * @param {import('pg').Pool} pool
 * @param {Array} chunks
 * @returns {Promise<number>}
 */
async function insertChunksBatch(pool, chunks) {
  if (chunks.length === 0) return 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO pipeline.message_chunks (id, message_id, mailbox_id, chunk_index, chunk_text, token_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           chunk_text = EXCLUDED.chunk_text,
           token_count = EXCLUDED.token_count`,
        [chunk.id, chunk.message_id, chunk.mailbox_id, chunk.chunk_index, chunk.chunk_text, chunk.token_count]
      )
    }

    await client.query('COMMIT')
    return chunks.length
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Process a batch of messages into chunks
 * @param {Array} messages
 * @returns {Array}
 */
function chunkMessages(messages) {
  const allChunks = []

  for (const msg of messages) {
    const chunks = chunkText(msg.body_text)

    for (const chunk of chunks) {
      allChunks.push({
        id: `${msg.id}#chunk${chunk.index}`,
        message_id: msg.id,
        mailbox_id: msg.mailbox_id,
        chunk_index: chunk.index,
        chunk_text: chunk.text,
        token_count: chunk.tokenCount,
      })
    }
  }

  return allChunks
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs()
  const logger = createLogger({ verbose: options.verbose })

  const lists = options.lists || DEFAULT_LISTS
  const pool = getPool()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Chunking messages for ${lists.length} list(s)`)
  console.log(`${'='.repeat(60)}`)

  try {
    const messages = await fetchUnchunkedMessages(pool, lists, options.limit)

    if (messages.length === 0) {
      console.log('\nNo unchunked messages found.')
      return
    }

    console.log(`\nFound ${messages.length} messages to chunk`)

    let totalChunks = 0
    let totalSkipped = 0

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(messages.length / BATCH_SIZE)

      const chunks = chunkMessages(batch)
      const skipped = batch.length - new Set(chunks.map(c => c.message_id)).size

      if (chunks.length > 0) {
        await insertChunksBatch(pool, chunks)
      }

      totalChunks += chunks.length
      totalSkipped += skipped

      process.stdout.write(
        `\r  Batch ${batchNum}/${totalBatches}: ${chunks.length} chunks from ${batch.length} messages`
          .padEnd(80)
      )
    }

    console.log(`\n\n${'='.repeat(60)}`)
    console.log(`Chunking complete!`)
    console.log(`  Messages processed: ${messages.length}`)
    console.log(`  Chunks created: ${totalChunks}`)
    console.log(`  Messages skipped (too short): ${totalSkipped}`)
    console.log(`${'='.repeat(60)}`)
  } finally {
    await closePool()
  }
}

// Export for testing
module.exports = {
  fetchUnchunkedMessages,
  insertChunksBatch,
  chunkMessages,
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
