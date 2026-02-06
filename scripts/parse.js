require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { mboxReader } = require('mbox-reader')
const { simpleParser } = require('mailparser')
const iconv = require('iconv-lite')
const { parseArgs, extractMailboxId, ARCHIVES_DIR, DEFAULT_LISTS } = require('./lib/config')
const { getPool, ensureMailbox, updateMailboxCount, insertMessagesBatch, closePool } = require('./lib/db')
const { createLogger } = require('./lib/logger')

const BATCH_SIZE = 100

/**
 * Convert text to UTF-8 safely
 * @param {string|Buffer} text
 * @returns {string}
 */
function convertToUTF8(text) {
  if (!text) return ''
  if (Buffer.isBuffer(text)) {
    return iconv.decode(text, 'utf-8')
  }
  return iconv.decode(Buffer.from(text), 'utf-8')
}

/**
 * Parse a single message from mbox format
 * @param {Object} message - Raw mbox message
 * @returns {Promise<Object|null>}
 */
async function parseMessage(message) {
  const id = message.headers.get('message-id')?.[0]
  if (!id) {
    return null
  }

  try {
    const parsed = await simpleParser(message.content)

    // Safely extract from address
    let fromEmail = null
    let fromAddresses = null
    if (parsed.from) {
      fromAddresses = parsed.from.value || null
      if (Array.isArray(parsed.from.value) && parsed.from.value.length > 0) {
        fromEmail = parsed.from.value[0].address || parsed.from.value[0].name || null
      } else if (parsed.from.text) {
        fromEmail = parsed.from.text
      }
    }

    return {
      id,
      in_reply_to: message.headers.get('in-reply-to')?.[0] || null,
      ts: message.time ? new Date(message.time) : null,
      subject: parsed.subject || null,
      from_email: fromEmail,
      from_addresses: fromAddresses,
      to_addresses: parsed.to?.value || null,
      cc_addresses: parsed.cc?.value || null,
      bcc_addresses: parsed.bcc?.value || null,
      size: message.readSize || 0,
      attachments: parsed.attachments?.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
      })) || [],
      body_text: convertToUTF8(parsed.text),
      embedded_files: [],
      headers: Object.fromEntries(parsed.headers),
    }
  } catch (err) {
    throw new Error(`Failed to parse message ${id}: ${err.message}`)
  }
}

/**
 * Parse an mbox file and return all messages
 * @param {string} filePath
 * @param {Object} logger
 * @returns {Promise<Array>}
 */
async function parseMboxFile(filePath, logger) {
  const messages = []
  const errors = []

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const stream = fs.createReadStream(filePath)

  for await (const rawMessage of mboxReader(stream)) {
    try {
      const message = await parseMessage(rawMessage)
      if (message) {
        messages.push(message)
      }
    } catch (err) {
      errors.push({
        id: rawMessage.headers.get('message-id')?.[0] || 'unknown',
        error: err.message,
      })
      logger.debug(`Parse error: ${err.message}`)
    }
  }

  if (errors.length > 0) {
    logger.warn(`${errors.length} messages failed to parse in ${path.basename(filePath)}`)
  }

  return messages
}

/**
 * Get list of mbox files for a mailbox
 * @param {string} list
 * @returns {string[]}
 */
function getMboxFiles(list) {
  const listDir = path.join(ARCHIVES_DIR, list)
  if (!fs.existsSync(listDir)) {
    return []
  }

  return fs.readdirSync(listDir)
    .filter(f => /^\w[\w-]*\.\d{6}$/.test(f))
    .map(f => path.join(listDir, f))
    .sort()
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs()
  const logger = createLogger({
    verbose: options.verbose,
    errorFile: path.join(ARCHIVES_DIR, 'parse-errors.log'),
  })

  const lists = options.lists || DEFAULT_LISTS
  const pool = getPool()

  logger.info(`Parsing ${lists.length} list(s)`)

  let totalMessages = 0
  let totalFiles = 0

  try {
    for (const list of lists) {
      const files = getMboxFiles(list)
      if (files.length === 0) {
        logger.info(`No mbox files found for ${list}`)
        continue
      }

      logger.info(`\nProcessing ${list}: ${files.length} file(s)`)

      // Ensure mailbox exists
      await ensureMailbox(pool, list)

      for (const filePath of files) {
        const filename = path.basename(filePath)
        logger.info(`  Parsing: ${filename}`)

        try {
          const messages = await parseMboxFile(filePath, logger)

          if (messages.length === 0) {
            logger.debug(`    No messages in ${filename}`)
            continue
          }

          // Insert in batches
          for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            const batch = messages.slice(i, i + BATCH_SIZE)
            await insertMessagesBatch(pool, batch, list)
            logger.debug(`    Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}`)
          }

          logger.info(`    Loaded ${messages.length} messages`)
          totalMessages += messages.length
          totalFiles++
        } catch (err) {
          logger.error(`    Failed to process ${filename}: ${err.message}`)
        }
      }

      // Update message count for this mailbox
      await updateMailboxCount(pool, list)
    }

    logger.info(`\nParse complete:`)
    logger.info(`  Files processed: ${totalFiles}`)
    logger.info(`  Messages loaded: ${totalMessages}`)
  } finally {
    await closePool()
  }
}

// Export functions for testing
module.exports = {
  parseMessage,
  parseMboxFile,
  convertToUTF8,
  getMboxFiles,
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
