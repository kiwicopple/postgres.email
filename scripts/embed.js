require('dotenv').config()

const OpenAI = require('openai')
const { parseArgs, DEFAULT_LISTS } = require('./lib/config')
const { getSupabase } = require('./lib/db')
const { createLogger } = require('./lib/logger')

const BATCH_SIZE = 100
const CONCURRENCY = 5
const EMBEDDING_MODEL = 'text-embedding-ada-002'

/**
 * Cleanse text by removing quoted lines (email replies)
 * @param {string} text
 * @returns {string}
 */
function cleanseText(text) {
  if (!text) return ''
  return text
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join(' ')
    .trim()
}

/**
 * Generate embedding for text
 * @param {string} text
 * @param {OpenAI} openai
 * @returns {Promise<number[]|null>}
 */
async function generateEmbedding(text, openai) {
  const cleansed = cleanseText(text)
  if (!cleansed) return null

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleansed,
      encoding_format: 'float',
    })
    return response.data[0].embedding
  } catch (err) {
    throw new Error(`Embedding failed: ${err.message}`)
  }
}

/**
 * Process a batch of messages with concurrency limit
 * @param {Array} messages
 * @param {OpenAI} openai
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Object} logger
 * @returns {Promise<number>}
 */
async function processBatch(messages, openai, supabase, logger) {
  let processed = 0

  // Process in chunks of CONCURRENCY
  for (let i = 0; i < messages.length; i += CONCURRENCY) {
    const chunk = messages.slice(i, i + CONCURRENCY)

    const results = await Promise.allSettled(
      chunk.map(async msg => {
        const embedding = await generateEmbedding(msg.body_text, openai)
        if (embedding) {
          const { error } = await supabase
            .from('messages')
            .update({ embedding })
            .eq('id', msg.id)

          if (error) {
            throw new Error(`DB update failed for ${msg.id}: ${error.message}`)
          }
          return true
        }
        return false
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        processed++
      } else if (result.status === 'rejected') {
        logger.debug(`Embedding failed: ${result.reason}`)
      }
    }
  }

  return processed
}

/**
 * Fetch messages that need embeddings
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} lists
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array>}
 */
async function fetchMessagesWithoutEmbeddings(supabase, lists, limit, offset = 0) {
  let query = supabase
    .from('messages')
    .select('id, body_text, mailbox_id')
    .is('embedding', null)
    .not('body_text', 'is', null)
    .order('ts', { ascending: false })
    .range(offset, offset + limit - 1)

  if (lists && lists.length > 0) {
    query = query.in('mailbox_id', lists)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }

  return data || []
}

/**
 * Count messages that need embeddings
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} lists
 * @returns {Promise<number>}
 */
async function countMessagesWithoutEmbeddings(supabase, lists) {
  let query = supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
    .not('body_text', 'is', null)

  if (lists && lists.length > 0) {
    query = query.in('mailbox_id', lists)
  }

  const { count, error } = await query

  if (error) {
    throw new Error(`Failed to count messages: ${error.message}`)
  }

  return count || 0
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs()
  const logger = createLogger({ verbose: options.verbose })

  const lists = options.lists || null // null means all lists
  const limit = options.limit || Infinity

  const supabase = getSupabase()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Count total messages needing embeddings
  const totalCount = await countMessagesWithoutEmbeddings(supabase, lists)
  logger.info(`Found ${totalCount} messages without embeddings`)

  if (totalCount === 0) {
    logger.info('Nothing to do')
    return
  }

  const toProcess = Math.min(totalCount, limit)
  logger.info(`Processing ${toProcess} messages`)

  let processed = 0
  let offset = 0

  while (processed < toProcess) {
    const batchSize = Math.min(BATCH_SIZE, toProcess - processed)
    const messages = await fetchMessagesWithoutEmbeddings(supabase, lists, batchSize, 0)

    if (messages.length === 0) {
      break
    }

    const batchProcessed = await processBatch(messages, openai, supabase, logger)
    processed += batchProcessed

    logger.progress(processed, toProcess, `${batchProcessed} embeddings generated`)

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  logger.info(`\nEmbed complete: ${processed} messages processed`)
}

// Export functions for testing
module.exports = {
  cleanseText,
  generateEmbedding,
  processBatch,
  fetchMessagesWithoutEmbeddings,
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
