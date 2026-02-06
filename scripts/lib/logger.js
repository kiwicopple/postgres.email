const fs = require('fs')
const path = require('path')

/**
 * Simple logger that writes to console and optionally to a file
 */
class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false
    this.logFile = options.logFile || null
    this.errorFile = options.errorFile || null
  }

  _timestamp() {
    return new Date().toISOString()
  }

  _write(level, message, ...args) {
    const timestamp = this._timestamp()
    const formattedMessage = `[${timestamp}] [${level}] ${message}`

    // Console output
    if (level === 'ERROR') {
      console.error(formattedMessage, ...args)
    } else if (level === 'DEBUG' && !this.verbose) {
      // Skip debug in non-verbose mode
      return
    } else {
      console.log(formattedMessage, ...args)
    }

    // File output
    if (this.logFile) {
      const logLine = args.length > 0
        ? `${formattedMessage} ${JSON.stringify(args)}\n`
        : `${formattedMessage}\n`
      fs.appendFileSync(this.logFile, logLine)
    }

    // Error file output
    if (level === 'ERROR' && this.errorFile) {
      const errorLine = args.length > 0
        ? `${formattedMessage} ${JSON.stringify(args)}\n`
        : `${formattedMessage}\n`
      fs.appendFileSync(this.errorFile, errorLine)
    }
  }

  info(message, ...args) {
    this._write('INFO', message, ...args)
  }

  debug(message, ...args) {
    this._write('DEBUG', message, ...args)
  }

  warn(message, ...args) {
    this._write('WARN', message, ...args)
  }

  error(message, ...args) {
    this._write('ERROR', message, ...args)
  }

  /**
   * Log progress in a compact format
   * @param {number} current
   * @param {number} total
   * @param {string} item
   */
  progress(current, total, item) {
    const pct = Math.round((current / total) * 100)
    process.stdout.write(`\r[${pct}%] ${current}/${total} - ${item}`.padEnd(80))
    if (current === total) {
      process.stdout.write('\n')
    }
  }
}

/**
 * Create a logger instance
 * @param {Object} options
 * @returns {Logger}
 */
function createLogger(options = {}) {
  return new Logger(options)
}

module.exports = { Logger, createLogger }
