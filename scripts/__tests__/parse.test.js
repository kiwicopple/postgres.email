import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'

// Need to import with require since parse.js uses CommonJS
const { parseMessage, parseMboxFile, convertToUTF8 } = require('../parse.js')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, 'fixtures')

// Create a simple logger for tests
const testLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
}

describe('convertToUTF8', () => {
  it('handles null/undefined input', () => {
    expect(convertToUTF8(null)).toBe('')
    expect(convertToUTF8(undefined)).toBe('')
  })

  it('handles string input', () => {
    expect(convertToUTF8('Hello World')).toBe('Hello World')
  })

  it('handles Buffer input', () => {
    const buffer = Buffer.from('Hello World', 'utf-8')
    expect(convertToUTF8(buffer)).toBe('Hello World')
  })
})

describe('parseMboxFile', () => {
  it('parses all messages from sample.mbox', async () => {
    const samplePath = path.join(fixturesDir, 'sample.mbox')
    const messages = await parseMboxFile(samplePath, testLogger)

    expect(messages.length).toBe(5)
  })

  it('extracts message IDs correctly', async () => {
    const samplePath = path.join(fixturesDir, 'sample.mbox')
    const messages = await parseMboxFile(samplePath, testLogger)

    const ids = messages.map(m => m.id)
    expect(ids).toContain('<test-announce-001@postgresql.org>')
    expect(ids).toContain('<test-announce-002@postgresql.org>')
    expect(ids).toContain('<test-announce-003@postgresql.org>')
    expect(ids).toContain('<test-announce-004@postgresql.org>')
    expect(ids).toContain('<test-announce-005@postgresql.org>')
  })

  it('extracts subjects correctly', async () => {
    const samplePath = path.join(fixturesDir, 'sample.mbox')
    const messages = await parseMboxFile(samplePath, testLogger)

    const subjects = messages.map(m => m.subject)
    expect(subjects).toContain('PostgreSQL 17.2 Released!')
    expect(subjects).toContain('Call for Papers: PGConf 2026')
    expect(subjects).toContain('Security Update Advisory')
  })

  it('extracts from addresses correctly', async () => {
    const samplePath = path.join(fixturesDir, 'sample.mbox')
    const messages = await parseMboxFile(samplePath, testLogger)

    const firstMessage = messages.find(m => m.id === '<test-announce-001@postgresql.org>')
    expect(firstMessage.from_email).toBe('announcements@postgresql.org')
  })

  it('handles in-reply-to header', async () => {
    const samplePath = path.join(fixturesDir, 'sample.mbox')
    const messages = await parseMboxFile(samplePath, testLogger)

    const replyMessage = messages.find(m => m.id === '<test-announce-004@postgresql.org>')
    expect(replyMessage.in_reply_to).toBe('<test-announce-002@postgresql.org>')

    const nonReply = messages.find(m => m.id === '<test-announce-001@postgresql.org>')
    expect(nonReply.in_reply_to).toBeNull()
  })

  it('handles CC addresses', async () => {
    const samplePath = path.join(fixturesDir, 'sample.mbox')
    const messages = await parseMboxFile(samplePath, testLogger)

    const securityMessage = messages.find(m => m.id === '<test-announce-003@postgresql.org>')
    expect(securityMessage.cc_addresses).toBeDefined()
    expect(securityMessage.cc_addresses.length).toBeGreaterThan(0)
    expect(securityMessage.cc_addresses[0].address).toBe('security@postgresql.org')
  })

  it('extracts body text', async () => {
    const samplePath = path.join(fixturesDir, 'sample.mbox')
    const messages = await parseMboxFile(samplePath, testLogger)

    const firstMessage = messages.find(m => m.id === '<test-announce-001@postgresql.org>')
    expect(firstMessage.body_text).toContain('PostgreSQL Global Development Group')
    expect(firstMessage.body_text).toContain('PostgreSQL 17.2')
  })

  it('throws error for non-existent file', async () => {
    const badPath = path.join(fixturesDir, 'nonexistent.mbox')
    await expect(parseMboxFile(badPath, testLogger)).rejects.toThrow('File not found')
  })
})
