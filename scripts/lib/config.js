const path = require('path')

// PostgreSQL mailing list archive configuration
const BASE_URL = 'https://www.postgresql.org'
const AUTH = { username: 'archives', password: 'antispam' }

// Default lists to process (in priority order)
const DEFAULT_LISTS = [
  'pgsql-announce',
  'pgsql-hackers',
  'pgsql-general',
  'pgsql-bugs',
  'pgsql-performance',
  'pgsql-novice',
  'pgsql-sql',
  'pgsql-admin',
]

// Paths
const ARCHIVES_DIR = path.resolve(__dirname, '../../archives')

/**
 * Parse CLI arguments
 * @returns {Object} Parsed options
 */
function parseArgs(args = process.argv.slice(2)) {
  const options = {
    lists: null,
    from: null,
    to: null,
    force: false,
    limit: null,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--lists' && args[i + 1]) {
      options.lists = args[++i].split(',').map(s => s.trim())
    } else if (arg === '--from' && args[i + 1]) {
      options.from = args[++i]
    } else if (arg === '--to' && args[i + 1]) {
      options.to = args[++i]
    } else if (arg === '--force') {
      options.force = true
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[++i], 10)
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    }
  }

  return options
}

/**
 * Parse a date string like "2024-01" into year and month
 * @param {string} dateStr
 * @returns {{year: number, month: number}}
 */
function parseYearMonth(dateStr) {
  const [year, month] = dateStr.split('-').map(Number)
  return { year, month }
}

/**
 * Generate list of year-month combinations between two dates
 * @param {string} fromStr - Start date "YYYY-MM"
 * @param {string} toStr - End date "YYYY-MM"
 * @returns {Array<{year: number, month: number}>}
 */
function getMonthRange(fromStr, toStr) {
  const from = parseYearMonth(fromStr)
  const to = parseYearMonth(toStr)
  const months = []

  let year = from.year
  let month = from.month

  while (year < to.year || (year === to.year && month <= to.month)) {
    months.push({ year, month })
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  return months
}

/**
 * Build mbox URL for a list and date
 * @param {string} list - List name (e.g., "pgsql-hackers")
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {string} URL
 */
function buildMboxUrl(list, year, month) {
  const monthStr = String(month).padStart(2, '0')
  return `${BASE_URL}/list/${list}/mbox/${list}.${year}${monthStr}`
}

/**
 * Extract mailbox ID from a file path
 * @param {string} filePath - e.g., "archives/pgsql-hackers/pgsql-hackers.202401"
 * @returns {string} - e.g., "pgsql-hackers"
 */
function extractMailboxId(filePath) {
  const basename = path.basename(filePath)
  // Format: pgsql-hackers.202401 -> pgsql-hackers
  const match = basename.match(/^(.+)\.\d{6}$/)
  return match ? match[1] : basename
}

module.exports = {
  BASE_URL,
  AUTH,
  DEFAULT_LISTS,
  ARCHIVES_DIR,
  parseArgs,
  parseYearMonth,
  getMonthRange,
  buildMboxUrl,
  extractMailboxId,
}
