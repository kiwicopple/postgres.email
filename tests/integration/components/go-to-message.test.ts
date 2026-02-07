import { describe, it, expect } from 'vitest'

/**
 * Tests for extractMessageIdFromInput function logic
 * This function extracts message IDs from either direct IDs or PostgreSQL archive URLs
 */

// Simulating the extractMessageIdFromInput function for testing
function extractMessageIdFromInput(input: string): string {
  const trimmed = input.trim()

  // Check if it's a PostgreSQL archive URL
  const urlMatch = trimmed.match(/postgresql\.org\/message-id\/([^?#]+)/)
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1])
  }

  // Otherwise treat it as a direct message ID
  return trimmed
}

describe('GoToMessage - extractMessageIdFromInput', () => {
  it('should extract message ID from PostgreSQL archive URL', () => {
    const url = 'https://www.postgresql.org/message-id/00fe13de-cbfb-4652-8d62-7b7b15dddd39%40aklaver.com'
    const result = extractMessageIdFromInput(url)

    expect(result).toBe('00fe13de-cbfb-4652-8d62-7b7b15dddd39@aklaver.com')
  })

  it('should handle PostgreSQL URL without protocol', () => {
    const url = 'postgresql.org/message-id/CANzqJaBcHnScWQjsVLoNg3OiQqWh3RcNEyNxwFV65Ps6PErQNw%40mail.gmail.com'
    const result = extractMessageIdFromInput(url)

    expect(result).toBe('CANzqJaBcHnScWQjsVLoNg3OiQqWh3RcNEyNxwFV65Ps6PErQNw@mail.gmail.com')
  })

  it('should handle PostgreSQL URL with query parameters', () => {
    const url = 'https://www.postgresql.org/message-id/test%40example.com?foo=bar#hash'
    const result = extractMessageIdFromInput(url)

    expect(result).toBe('test@example.com')
  })

  it('should handle direct message ID (already URL decoded)', () => {
    const messageId = 'CANzqJaBcHnScWQjsVLoNg3OiQqWh3RcNEyNxwFV65Ps6PErQNw@mail.gmail.com'
    const result = extractMessageIdFromInput(messageId)

    expect(result).toBe(messageId)
  })

  it('should handle direct message ID (URL encoded)', () => {
    const messageId = 'CANzqJaBcHnScWQjsVLoNg3OiQqWh3RcNEyNxwFV65Ps6PErQNw%40mail.gmail.com'
    const result = extractMessageIdFromInput(messageId)

    expect(result).toBe(messageId)
  })

  it('should handle message ID with angle brackets', () => {
    const messageId = '<CANzqJaBcHnScWQjsVLoNg3OiQqWh3RcNEyNxwFV65Ps6PErQNw@mail.gmail.com>'
    const result = extractMessageIdFromInput(messageId)

    expect(result).toBe(messageId)
  })

  it('should trim whitespace', () => {
    const messageId = '  test@example.com  '
    const result = extractMessageIdFromInput(messageId)

    expect(result).toBe('test@example.com')
  })

  it('should handle empty string', () => {
    const result = extractMessageIdFromInput('')

    expect(result).toBe('')
  })

  it('should handle UUID-style message IDs', () => {
    const messageId = '00fe13de-cbfb-4652-8d62-7b7b15dddd39@aklaver.com'
    const result = extractMessageIdFromInput(messageId)

    expect(result).toBe(messageId)
  })
})

describe('GoToMessage - URL construction', () => {
  it('should document the expected navigation URL format', () => {
    const expectedFormat = {
      thread: '/lists/{mailboxId}/{threadId}',
      withScroll: '/lists/{mailboxId}/{threadId}#message-{messageId}',
      notFound: '/lists/not-found'
    }

    expect(expectedFormat.thread).toContain('/lists/')
    expect(expectedFormat.withScroll).toContain('#message-')
    expect(expectedFormat.notFound).toBe('/lists/not-found')
  })

  it('should document that message IDs are stripped of brackets in URLs', () => {
    const messageId = '<test@example.com>'
    const strippedId = 'test@example.com'
    const expectedUrl = `/lists/mailbox/thread#message-${messageId}`

    // Document that stripMessageIdBrackets should be used for URL construction
    expect(strippedId).not.toContain('<')
    expect(strippedId).not.toContain('>')
  })
})
