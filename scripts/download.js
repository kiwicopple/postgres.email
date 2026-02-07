require('dotenv').config()

const fs = require('fs')
const path = require('path')
const https = require('https')
const { parseArgs, buildMboxUrl, DEFAULT_LISTS, ARCHIVES_DIR, AUTH } = require('./lib/config')
const { createLogger } = require('./lib/logger')

const logger = createLogger({ verbose: process.argv.includes('--verbose') })

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Make an HTTP request with basic auth
 * @param {string} url
 * @param {string} method
 * @returns {Promise<{statusCode: number, headers: Object, body: Buffer}>}
 */
function httpRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const auth = Buffer.from(`${AUTH.username}:${AUTH.password}`).toString('base64')

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'postgres.email-pipeline/1.0',
      },
    }

    const req = https.request(options, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      })
    })

    req.on('error', reject)
    req.setTimeout(60000, () => {
      req.destroy(new Error('Request timeout'))
    })
    req.end()
  })
}

/**
 * Check if a file should be downloaded by comparing sizes
 * @param {string} localPath
 * @param {string} url
 * @returns {Promise<{shouldDownload: boolean, remoteSize: number|null}>}
 */
async function shouldDownload(localPath, url) {
  // If file doesn't exist, download it
  if (!fs.existsSync(localPath)) {
    return { shouldDownload: true, remoteSize: null }
  }

  // Check remote size with HEAD request
  try {
    const response = await httpRequest(url, 'HEAD')
    if (response.statusCode === 404) {
      return { shouldDownload: false, remoteSize: null }
    }
    if (response.statusCode !== 200) {
      logger.warn(`HEAD request failed for ${url}: ${response.statusCode}`)
      return { shouldDownload: true, remoteSize: null }
    }

    const remoteSize = parseInt(response.headers['content-length'], 10)
    const localSize = fs.statSync(localPath).size

    if (remoteSize && localSize === remoteSize) {
      return { shouldDownload: false, remoteSize }
    }

    return { shouldDownload: true, remoteSize }
  } catch (err) {
    logger.warn(`Failed to check remote size for ${url}: ${err.message}`)
    return { shouldDownload: true, remoteSize: null }
  }
}

/**
 * Download a file with retries
 * @param {string} url
 * @param {string} destPath
 * @param {number} maxRetries
 * @returns {Promise<boolean>}
 */
async function downloadFile(url, destPath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await httpRequest(url, 'GET')

      if (response.statusCode === 404) {
        logger.debug(`File not found (404): ${url}`)
        return false
      }

      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}`)
      }

      // Ensure directory exists
      const dir = path.dirname(destPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(destPath, response.body)
      console.log(`     ✅ Downloaded ${formatBytes(response.body.length)}`)
      return true
    } catch (err) {
      logger.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}: ${err.message}`)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await sleep(delay)
      }
    }
  }

  logger.error(`Failed to download after ${maxRetries} attempts: ${url}`)
  return false
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Download mbox files for a list
 * @param {string} list
 * @param {Array<{year: number, month: number}>} months
 */
async function downloadList(list, months) {
  const listDir = path.join(ARCHIVES_DIR, list)
  if (!fs.existsSync(listDir)) {
    fs.mkdirSync(listDir, { recursive: true })
  }

  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < months.length; i++) {
    const { year, month } = months[i]
    const url = buildMboxUrl(list, year, month)
    const monthStr = String(month).padStart(2, '0')
    const filename = `${list}.${year}${monthStr}`
    const destPath = path.join(listDir, filename)

    const progress = `[${i + 1}/${months.length}]`
    const { shouldDownload: needsDownload } = await shouldDownload(destPath, url)

    if (!needsDownload) {
      console.log(`  ${progress} ⏭️  Skipping ${filename} (already exists)`)
      skipped++
      continue
    }

    console.log(`  ${progress} ⬇️  Downloading ${filename}...`)
    const success = await downloadFile(url, destPath)
    if (success) {
      downloaded++
    } else {
      failed++
    }

    // Rate limiting - be polite to the server
    await sleep(1000)
  }

  return { downloaded, skipped, failed }
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs()

  // Determine which lists to download
  const lists = options.lists || DEFAULT_LISTS

  // Determine date range
  const now = new Date()
  const defaultFrom = '2024-01'
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const fromStr = options.from || defaultFrom
  const toStr = options.to || defaultTo

  // Generate month range
  const fromParts = fromStr.split('-').map(Number)
  const toParts = toStr.split('-').map(Number)

  const months = []
  let year = fromParts[0]
  let month = fromParts[1]

  while (year < toParts[0] || (year === toParts[0] && month <= toParts[1])) {
    months.push({ year, month })
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  logger.info(`Downloading ${lists.length} list(s) for ${months.length} month(s)`)
  logger.info(`Date range: ${fromStr} to ${toStr}`)
  logger.info(`Lists: ${lists.join(', ')}`)

  // Ensure archives directory exists
  if (!fs.existsSync(ARCHIVES_DIR)) {
    fs.mkdirSync(ARCHIVES_DIR, { recursive: true })
  }

  let totalDownloaded = 0
  let totalSkipped = 0
  let totalFailed = 0

  console.log(`\n${'='.repeat(60)}`)
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i]
    console.log(`\n📧 Processing list ${i + 1}/${lists.length}: ${list}`)
    const result = await downloadList(list, months)
    console.log(`   Downloaded: ${result.downloaded} | Skipped: ${result.skipped} | Failed: ${result.failed}`)
    totalDownloaded += result.downloaded
    totalSkipped += result.skipped
    totalFailed += result.failed
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✨ Download complete!`)
  console.log(`   Downloaded: ${totalDownloaded}`)
  console.log(`   Skipped: ${totalSkipped}`)
  console.log(`   Failed: ${totalFailed}`)
  console.log(`${'='.repeat(60)}`)

  if (totalFailed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  logger.error('Fatal error:', err)
  process.exit(1)
})
