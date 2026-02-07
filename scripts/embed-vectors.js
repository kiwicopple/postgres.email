require('dotenv').config()

const { parseArgs, DEFAULT_LISTS } = require('./lib/config')
const { getPool, getSupabase, closePool } = require('./lib/db')
const { createLogger } = require('./lib/logger')

const BATCH_SIZE = 100
const UPSERT_BATCH_SIZE = 250
const EMBEDDING_MODEL = 'gte-small'

/**
 * Fetch chunks that haven't been embedded yet
 * @param {import('pg').Pool} pool
 * @param {string[]} lists
 * @param {number|null} limit
 * @returns {Promise<Array>}
 */
async function fetchUnembeddedChunks(pool, lists, limit) {
  const query = `
    SELECT mc.id, mc.message_id, mc.mailbox_id, mc.chunk_index, mc.chunk_text,
           m.subject, m.from_email, m.ts
    FROM message_chunks mc
    JOIN messages m ON m.id = mc.message_id
    WHERE mc.embedded_at IS NULL
      AND mc.mailbox_id = ANY($1)
    ORDER BY m.ts DESC
    ${limit ? `LIMIT ${parseInt(limit, 10)}` : ''}
  `
  const { rows } = await pool.query(query, [lists])
  return rows
}

/**
 * Mark chunks as embedded
 * @param {import('pg').Pool} pool
 * @param {string[]} chunkIds
 */
async function markChunksEmbedded(pool, chunkIds) {
  if (chunkIds.length === 0) return
  await pool.query(
    `UPDATE message_chunks SET embedded_at = now() WHERE id = ANY($1)`,
    [chunkIds]
  )
}

/**
 * Build vector objects from chunks and their embeddings
 * @param {Array} chunks - Chunks with metadata from DB
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
 * @param {import('pg').Pool} pool
 * @param {Object} logger
 * @returns {Promise<number>} Number of chunks embedded
 */
async function embedAndStoreBatch(chunks, embedFn, vectorIndex, pool, logger) {
  const texts = chunks.map(c => c.chunk_text)
  const embeddings = await embedFn(texts)

  const vectors = buildVectors(chunks, embeddings)

  // Upsert to vector bucket in batches
  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await vectorIndex.putVectors({ vectors: batch })
    if (error) throw new Error(`putVectors failed: ${error.message}`)
  }

  // Mark as embedded in DB
  const chunkIds = chunks.map(c => c.id)
  await markChunksEmbedded(pool, chunkIds)

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
  console.log(`Embedding chunks for ${lists.length} list(s)`)
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

    const chunks = await fetchUnembeddedChunks(pool, lists, options.limit)

    if (chunks.length === 0) {
      console.log('\nNo unembedded chunks found.')
      return
    }

    console.log(`\nFound ${chunks.length} chunks to embed`)

    let totalEmbedded = 0

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)

      const count = await embedAndStoreBatch(batch, embedFn, vectorIndex, pool, logger)
      totalEmbedded += count

      process.stdout.write(
        `\r  Batch ${batchNum}/${totalBatches}: embedded ${count} chunks`
          .padEnd(80)
      )
    }

    console.log(`\n\n${'='.repeat(60)}`)
    console.log(`Embedding complete!`)
    console.log(`  Chunks embedded: ${totalEmbedded}`)
    console.log(`${'='.repeat(60)}`)
  } finally {
    await closePool()
  }
}

// Export for testing
module.exports = {
  fetchUnembeddedChunks,
  markChunksEmbedded,
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
