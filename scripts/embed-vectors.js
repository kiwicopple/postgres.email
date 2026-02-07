require('dotenv').config()

const { parseArgs, DEFAULT_LISTS } = require('./lib/config')
const { getPool, getSupabase, closePool } = require('./lib/db')
const { createLogger } = require('./lib/logger')
const { chunkText } = require('./lib/chunker')

const BATCH_SIZE = 100
const UPSERT_BATCH_SIZE = 250
const EMBEDDING_MODEL = 'gte-small'

/**
 * Fetch a batch of messages that haven't been embedded yet.
 * Always returns at most BATCH_SIZE rows to bound memory usage.
 * @param {import('pg').Pool} pool
 * @param {string[]} lists
 * @param {number} batchSize
 * @returns {Promise<Array>}
 */
async function fetchUnembeddedBatch(pool, lists, batchSize) {
  const query = `
    SELECT id, mailbox_id, subject, from_email, ts, body_text
    FROM messages
    WHERE body_text IS NOT NULL
      AND embedded_at IS NULL
      AND mailbox_id = ANY($1)
    ORDER BY ts DESC
    LIMIT $2
  `
  const { rows } = await pool.query(query, [lists, batchSize])
  return rows
}

/**
 * Mark messages as embedded
 * @param {import('pg').Pool} pool
 * @param {string[]} messageIds
 */
async function markMessagesEmbedded(pool, messageIds) {
  if (messageIds.length === 0) return
  await pool.query(
    `UPDATE messages SET embedded_at = now() WHERE id = ANY($1)`,
    [messageIds]
  )
}

/**
 * Process messages into chunks (in memory, no DB)
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
        subject: msg.subject,
        from_email: msg.from_email,
        ts: msg.ts,
      })
    }
  }

  return allChunks
}

/**
 * Build vector objects from chunks and their embeddings
 * @param {Array} chunks - Chunks with metadata
 * @param {Array<Float32Array|number[]>} embeddings - Embedding arrays
 * @returns {Array} Vector objects for putVectors
 */
function buildVectors(chunks, embeddings) {
  return chunks.map((chunk, i) => ({
    key: chunk.id,
    data: { float32: Array.from(embeddings[i]) },
    metadata: {
      message_id: chunk.message_id,
      mailbox_id: chunk.mailbox_id,
      subject: chunk.subject || '',
      from_email: chunk.from_email || '',
      ts: chunk.ts ? new Date(chunk.ts).toISOString() : '',
      chunk_index: chunk.chunk_index,
      embedding_model: EMBEDDING_MODEL,
    },
  }))
}

/**
 * Embed and store a batch of chunks
 * @param {Array} chunks
 * @param {Function} embedFn - Function that takes array of texts, returns array of embeddings
 * @param {Object} vectorIndex - Supabase vector bucket index
 * @returns {Promise<number>} Number of chunks embedded
 */
async function embedAndStoreBatch(chunks, embedFn, vectorIndex) {
  const texts = chunks.map(c => c.chunk_text)
  const embeddings = await embedFn(texts)

  const vectors = buildVectors(chunks, embeddings)

  // Upsert to vector bucket in batches
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await vectorIndex.putVectors({ vectors: batch })
    if (error) throw new Error(`putVectors failed: ${error.message}`)
  }

  return chunks.length
}

/**
 * Create the embedding function using @xenova/transformers
 * @returns {Promise<Function>} Function that takes string[] and returns embedding[]
 */
async function createEmbedFn() {
  const { pipeline } = await import('@xenova/transformers')
  const extractor = await pipeline('feature-extraction', `Supabase/${EMBEDDING_MODEL}`)

  return async function embed(texts) {
    const output = await extractor(texts, { pooling: 'mean', normalize: true })
    return output.tolist()
  }
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs()
  const logger = createLogger({ verbose: options.verbose })

  const lists = options.lists || DEFAULT_LISTS
  const pool = getPool()
  const supabase = getSupabase()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Embedding messages for ${lists.length} list(s)`)
  console.log(`${'='.repeat(60)}`)

  try {
    // Initialize embedding model
    console.log('\nLoading embedding model...')
    const embedFn = await createEmbedFn()
    console.log('Model loaded.')

    // Get vector bucket index
    const vectorIndex = supabase.storage.vectors
      .from('email-embeddings')
      .index('email-chunks')

    const batchSize = options.limit
      ? Math.min(parseInt(options.limit, 10), BATCH_SIZE)
      : BATCH_SIZE

    let totalMessages = 0
    let totalChunks = 0
    let totalSkipped = 0
    let batchNum = 0
    let remaining = options.limit ? parseInt(options.limit, 10) : Infinity

    // Fetch and process in batches — each batch is a self-contained unit.
    // After marking embedded_at, the next fetch naturally skips processed rows.
    while (remaining > 0) {
      const fetchSize = Math.min(batchSize, remaining)
      const batch = await fetchUnembeddedBatch(pool, lists, fetchSize)

      if (batch.length === 0) break

      batchNum++

      // Chunk in memory
      const chunks = chunkMessages(batch)
      const skipped = batch.length - new Set(chunks.map(c => c.message_id)).size

      // Embed and store
      if (chunks.length > 0) {
        await embedAndStoreBatch(chunks, embedFn, vectorIndex)
      }

      // Mark all messages in batch as embedded (including skipped — they don't need re-processing)
      const batchIds = batch.map(m => m.id)
      await markMessagesEmbedded(pool, batchIds)

      totalMessages += batch.length
      totalChunks += chunks.length
      totalSkipped += skipped
      remaining -= batch.length

      process.stdout.write(
        `\r  Batch ${batchNum}: ${chunks.length} chunks from ${batch.length} messages (${totalMessages} total)`
          .padEnd(80)
      )
    }

    if (totalMessages === 0) {
      console.log('\nNo unembedded messages found.')
      return
    }

    console.log(`\n\n${'='.repeat(60)}`)
    console.log(`Embedding complete!`)
    console.log(`  Messages processed: ${totalMessages}`)
    console.log(`  Chunks embedded: ${totalChunks}`)
    console.log(`  Messages skipped (too short): ${totalSkipped}`)
    console.log(`${'='.repeat(60)}`)
  } finally {
    await closePool()
  }
}

// Export for testing
module.exports = {
  fetchUnembeddedBatch,
  markMessagesEmbedded,
  chunkMessages,
  buildVectors,
  embedAndStoreBatch,
  EMBEDDING_MODEL,
  BATCH_SIZE,
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
