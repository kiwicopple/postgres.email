require('dotenv').config()

const { parseArgs, DEFAULT_LISTS } = require('./lib/config')
const { getPool, getSupabase, closePool } = require('./lib/db')
const { createLogger } = require('./lib/logger')
const { chunkText } = require('./lib/chunker')

const BATCH_SIZE = 100
const UPSERT_BATCH_SIZE = 250
const EMBEDDING_MODEL = 'gte-small'

/**
 * Fetch messages that haven't been embedded yet
 * @param {import('pg').Pool} pool
 * @param {string[]} lists
 * @param {number|null} limit
 * @returns {Promise<Array>}
 */
async function fetchUnembeddedMessages(pool, lists, limit) {
  const query = `
    SELECT id, mailbox_id, subject, from_email, ts, body_text
    FROM messages
    WHERE body_text IS NOT NULL
      AND embedded_at IS NULL
      AND mailbox_id = ANY($1)
    ORDER BY ts DESC
    ${limit ? `LIMIT ${parseInt(limit, 10)}` : ''}
  `
  const { rows } = await pool.query(query, [lists])
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

    const messages = await fetchUnembeddedMessages(pool, lists, options.limit)

    if (messages.length === 0) {
      console.log('\nNo unembedded messages found.')
      return
    }

    console.log(`\nFound ${messages.length} messages to embed`)

    let totalChunks = 0
    let totalSkipped = 0

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(messages.length / BATCH_SIZE)

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

      totalChunks += chunks.length
      totalSkipped += skipped

      process.stdout.write(
        `\r  Batch ${batchNum}/${totalBatches}: ${chunks.length} chunks from ${batch.length} messages`
          .padEnd(80)
      )
    }

    console.log(`\n\n${'='.repeat(60)}`)
    console.log(`Embedding complete!`)
    console.log(`  Messages processed: ${messages.length}`)
    console.log(`  Chunks embedded: ${totalChunks}`)
    console.log(`  Messages skipped (too short): ${totalSkipped}`)
    console.log(`${'='.repeat(60)}`)
  } finally {
    await closePool()
  }
}

// Export for testing
module.exports = {
  fetchUnembeddedMessages,
  markMessagesEmbedded,
  chunkMessages,
  buildVectors,
  embedAndStoreBatch,
  EMBEDDING_MODEL,
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
