import { describe, it, expect } from 'vitest'

const {
  chunkText,
  cleanEmailText,
  stripQuotedReplies,
  stripSignature,
  splitParagraphs,
  estimateTokens,
} = require('../../../scripts/lib/chunker.js')

describe('stripQuotedReplies', () => {
  it('removes lines starting with >', () => {
    const input = 'Hello\n> quoted line\n> another quote\nWorld'
    expect(stripQuotedReplies(input)).toBe('Hello\nWorld')
  })

  it('removes lines with leading whitespace before >', () => {
    const input = 'Hello\n  > indented quote\nWorld'
    expect(stripQuotedReplies(input)).toBe('Hello\nWorld')
  })

  it('returns text unchanged if no quotes', () => {
    const input = 'Hello\nWorld'
    expect(stripQuotedReplies(input)).toBe('Hello\nWorld')
  })

  it('handles empty string', () => {
    expect(stripQuotedReplies('')).toBe('')
  })
})

describe('stripSignature', () => {
  it('removes everything after -- delimiter', () => {
    const input = 'Hello World\n-- \nJohn Doe\njohn@example.com'
    expect(stripSignature(input)).toBe('Hello World')
  })

  it('returns text unchanged if no signature', () => {
    const input = 'Hello World\nNo signature here'
    expect(stripSignature(input)).toBe('Hello World\nNo signature here')
  })

  it('does not strip -- without trailing space', () => {
    const input = 'Hello\n--\nNot a signature'
    expect(stripSignature(input)).toBe('Hello\n--\nNot a signature')
  })
})

describe('cleanEmailText', () => {
  it('strips quotes, signatures, and normalizes whitespace', () => {
    const input = '> previous message\nMy reply here.\n\n\n\nAnother paragraph.\n-- \nSignature'
    const result = cleanEmailText(input)
    expect(result).toBe('My reply here.\n\nAnother paragraph.')
  })

  it('returns empty string for null/undefined', () => {
    expect(cleanEmailText(null)).toBe('')
    expect(cleanEmailText(undefined)).toBe('')
    expect(cleanEmailText('')).toBe('')
  })

  it('handles all-quoted email', () => {
    const input = '> line 1\n> line 2\n> line 3'
    expect(cleanEmailText(input)).toBe('')
  })
})

describe('splitParagraphs', () => {
  it('splits on double newlines', () => {
    const input = 'First paragraph.\n\nSecond paragraph.\n\nThird.'
    const result = splitParagraphs(input)
    expect(result).toEqual(['First paragraph.', 'Second paragraph.', 'Third.'])
  })

  it('handles triple+ newlines', () => {
    const input = 'First.\n\n\n\nSecond.'
    const result = splitParagraphs(input)
    expect(result).toEqual(['First.', 'Second.'])
  })

  it('filters empty paragraphs', () => {
    const input = '\n\nOnly paragraph.\n\n'
    const result = splitParagraphs(input)
    expect(result).toEqual(['Only paragraph.'])
  })
})

describe('estimateTokens', () => {
  it('estimates roughly 4 chars per token', () => {
    const text = 'a'.repeat(400) // 400 chars ≈ 100 tokens
    expect(estimateTokens(text)).toBe(100)
  })

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })
})

describe('chunkText', () => {
  it('returns empty array for null/empty text', () => {
    expect(chunkText(null)).toEqual([])
    expect(chunkText('')).toEqual([])
    expect(chunkText(undefined)).toEqual([])
  })

  it('returns empty array for text below min tokens', () => {
    const shortText = 'Thanks, John'
    expect(chunkText(shortText)).toEqual([])
  })

  it('returns single chunk for short email', () => {
    // ~75 tokens = 300 chars
    const text = 'The PostgreSQL Global Development Group announces the release of PostgreSQL 17.2, the latest version of the world\'s most advanced open source database. This release includes important security fixes and bug fixes. All users are encouraged to upgrade as soon as possible.'
    const chunks = chunkText(text)
    expect(chunks.length).toBe(1)
    expect(chunks[0].index).toBe(0)
    expect(chunks[0].text).toBe(text)
  })

  it('splits long email into multiple chunks', () => {
    // Create text that exceeds MAX_CHUNK_TOKENS
    const paragraphs = []
    for (let i = 0; i < 10; i++) {
      paragraphs.push(
        `Paragraph ${i + 1}: This is a detailed discussion about PostgreSQL internals ` +
        `that goes into significant detail about the query planner, executor, and storage ` +
        `engine. We need to consider how the optimizer chooses between sequential scans and ` +
        `index scans based on the statistics collected by ANALYZE.`
      )
    }
    const text = paragraphs.join('\n\n')

    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)

    // All chunks should have sequential indices
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i)
    })

    // All chunks should have token counts
    chunks.forEach(chunk => {
      expect(chunk.tokenCount).toBeGreaterThan(0)
    })
  })

  it('strips quoted replies before chunking', () => {
    const text = '> Original message here\n> with multiple lines\nMy reply is ' + 'a '.repeat(200) + 'here.'
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    chunks.forEach(chunk => {
      expect(chunk.text).not.toContain('Original message here')
    })
  })

  it('strips signatures before chunking', () => {
    const text = 'Important discussion about PostgreSQL ' + 'replication '.repeat(50) + '.\n-- \nJohn Doe\nSenior DBA'
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    chunks.forEach(chunk => {
      expect(chunk.text).not.toContain('John Doe')
      expect(chunk.text).not.toContain('Senior DBA')
    })
  })

  it('returns empty for all-quoted email', () => {
    const text = '> line 1\n> line 2\n> line 3'
    expect(chunkText(text)).toEqual([])
  })

  it('handles email with code blocks', () => {
    const text = 'Here is a SQL example:\n\nSELECT * FROM pg_catalog.pg_class\n' +
      'WHERE relkind = \'r\'\nAND relname NOT LIKE \'pg_%\'\nORDER BY relname;\n\n' +
      'This query lists all regular tables in the database excluding system tables. ' +
      'It is useful for getting an overview of the schema. ' +
      'You can modify the WHERE clause to filter by specific schemas or naming patterns.'
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThanOrEqual(1)
  })

  it('respects custom options', () => {
    // Create moderate-length text
    const text = 'A '.repeat(150) + '.\n\n' + 'B '.repeat(150) + '.'
    const chunks = chunkText(text, {
      targetTokens: 50,
      maxTokens: 100,
      minTokens: 10,
      overlapTokens: 10,
    })
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('handles very long single paragraph', () => {
    const text = 'word '.repeat(1000) // ~1000 tokens
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    // No chunk should exceed max tokens significantly
    chunks.forEach(chunk => {
      // Allow some tolerance for overlap
      expect(chunk.tokenCount).toBeLessThanOrEqual(600)
    })
  })
})
