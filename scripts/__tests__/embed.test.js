import { describe, it, expect, vi } from 'vitest'

const { cleanseText, generateEmbedding } = require('../embed.js')

describe('cleanseText', () => {
  it('removes quoted lines starting with >', () => {
    const input = 'Hello\n> quoted line\n> another quote\nWorld'
    expect(cleanseText(input)).toBe('Hello World')
  })

  it('handles empty input', () => {
    expect(cleanseText('')).toBe('')
    expect(cleanseText(null)).toBe('')
    expect(cleanseText(undefined)).toBe('')
  })

  it('handles text with only quotes', () => {
    const input = '> all quoted\n> lines'
    expect(cleanseText(input)).toBe('')
  })

  it('preserves lines that do not start with >', () => {
    const input = 'This is normal text\nAnother line\nAnd more'
    expect(cleanseText(input)).toBe('This is normal text Another line And more')
  })

  it('handles mixed content', () => {
    const input = `On Monday, someone wrote:
> This is a quote
> Another quoted line

My response here.

> More quotes
But I also said this.`
    const result = cleanseText(input)
    expect(result).toContain('On Monday, someone wrote:')
    expect(result).toContain('My response here.')
    expect(result).toContain('But I also said this.')
    expect(result).not.toContain('This is a quote')
    expect(result).not.toContain('More quotes')
  })

  it('handles indented quotes', () => {
    const input = 'Normal\n  > indented quote\nMore normal'
    // The current implementation checks line.trim().startsWith('>')
    expect(cleanseText(input)).toBe('Normal More normal')
  })
})

describe('generateEmbedding', () => {
  it('calls OpenAI API with cleansed text', async () => {
    const mockEmbedding = new Array(1536).fill(0.1)
    const mockOpenAI = {
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: mockEmbedding }]
        })
      }
    }

    const embedding = await generateEmbedding('test text', mockOpenAI)

    expect(embedding).toEqual(mockEmbedding)
    expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'text-embedding-ada-002',
        input: 'test text',
        encoding_format: 'float'
      })
    )
  })

  it('returns null for empty text', async () => {
    const mockOpenAI = {
      embeddings: {
        create: vi.fn()
      }
    }

    const embedding = await generateEmbedding('', mockOpenAI)

    expect(embedding).toBeNull()
    expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled()
  })

  it('returns null for text that is all quotes', async () => {
    const mockOpenAI = {
      embeddings: {
        create: vi.fn()
      }
    }

    const embedding = await generateEmbedding('> quoted\n> only', mockOpenAI)

    expect(embedding).toBeNull()
    expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled()
  })

  it('throws on API error', async () => {
    const mockOpenAI = {
      embeddings: {
        create: vi.fn().mockRejectedValue(new Error('API rate limit'))
      }
    }

    await expect(generateEmbedding('test', mockOpenAI))
      .rejects.toThrow('Embedding failed: API rate limit')
  })
})
