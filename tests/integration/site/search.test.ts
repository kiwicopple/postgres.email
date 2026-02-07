import { describe, it, expect } from 'vitest'
import { getSnippet } from '../../../src/lib/formatters'

describe('getSnippet', () => {
  it('returns empty string for null input', () => {
    expect(getSnippet(null)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(getSnippet('')).toBe('')
  })

  it('returns short text unchanged', () => {
    expect(getSnippet('Hello world')).toBe('Hello world')
  })

  it('truncates long text with ellipsis', () => {
    const long = 'a'.repeat(300)
    const result = getSnippet(long)
    expect(result.length).toBeLessThanOrEqual(203) // 200 + "..."
    expect(result.endsWith('...')).toBe(true)
  })

  it('strips quoted lines (starting with >)', () => {
    const body = 'Original text\n> Quoted reply\n> Another quote\nMore original'
    expect(getSnippet(body)).toBe('Original text More original')
  })

  it('strips signature delimiter lines', () => {
    const body = 'Main content\n-- \nJohn Doe\njohn@example.com'
    const result = getSnippet(body)
    expect(result).toContain('Main content')
    expect(result).not.toContain('-- ')
  })

  it('collapses whitespace', () => {
    const body = 'Hello   world\n\n\nFoo   bar'
    expect(getSnippet(body)).toBe('Hello world Foo bar')
  })

  it('respects custom maxLength', () => {
    const body = 'a'.repeat(100)
    const result = getSnippet(body, 50)
    expect(result.length).toBeLessThanOrEqual(53) // 50 + "..."
    expect(result.endsWith('...')).toBe(true)
  })

  it('handles email with only quoted text', () => {
    const body = '> All quoted\n> Nothing original'
    expect(getSnippet(body)).toBe('')
  })

  it('handles realistic email body', () => {
    const body = [
      'I think we should improve the WAL performance.',
      '',
      '> On Jan 15, Tom Lane wrote:',
      '> The current implementation is slow.',
      '',
      'Here is my proposed patch for the buffer manager.',
      '',
      '-- ',
      'Best regards,',
      'Developer',
    ].join('\n')
    const result = getSnippet(body)
    expect(result).toContain('WAL performance')
    expect(result).toContain('proposed patch')
    expect(result).not.toContain('Tom Lane wrote')
    expect(result).not.toContain('Best regards')
  })
})
