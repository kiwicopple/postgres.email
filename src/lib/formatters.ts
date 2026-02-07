import type { Thread } from "@/models/thread"
import { DATE_FORMAT_OPTIONS } from "./constants"

/**
 * Formats a timestamp string into a human-readable date
 */
export function formatDate(ts: string | null): string {
  if (!ts) return ""
  try {
    const date = new Date(ts)
    return date.toLocaleDateString("en-US", DATE_FORMAT_OPTIONS)
  } catch {
    return ts
  }
}

/**
 * Extracts the sender name from a message's from_addresses field
 */
export function getSenderName(message: Thread): string {
  try {
    const addrs = message.from_addresses as any
    if (Array.isArray(addrs) && addrs[0]?.name) return addrs[0].name
    if (addrs?.name) return addrs.name
  } catch {}
  return message.from_email || ""
}

/**
 * Formats sender information from various from_addresses formats
 */
export interface SenderInfo {
  name: string
  address: string
}

export function formatSenderInfo(from_addresses: unknown, from_email?: string): SenderInfo {
  try {
    const addrs = from_addresses as any
    if (Array.isArray(addrs) && addrs[0]) {
      return {
        name: addrs[0].name || addrs[0].address || String(addrs[0]),
        address: addrs[0].address || from_email || ""
      }
    }
    if (addrs && typeof addrs === 'object') {
      return {
        name: addrs.name || addrs.address || String(addrs),
        address: addrs.address || from_email || ""
      }
    }
  } catch {}

  return {
    name: from_email || String(from_addresses),
    address: from_email || ""
  }
}

/**
 * Strips angle brackets from a message ID for use in URLs
 * Example: "<123@example.com>" -> "123@example.com"
 */
export function stripMessageIdBrackets(messageId: string): string {
  return messageId.replace(/^<|>$/g, '')
}

/**
 * Ensures a message ID has angle brackets for database queries
 * Example: "123@example.com" -> "<123@example.com>"
 */
export function normalizeMessageId(messageId: string): string {
  if (messageId.startsWith('<') && messageId.endsWith('>')) {
    return messageId
  }
  return `<${messageId}>`
}

/**
 * Creates a clean text snippet from email body text.
 * Strips quoted lines and signatures, collapses whitespace.
 */
export function getSnippet(bodyText: string | null, maxLength = 200): string {
  if (!bodyText) return ""
  let lines = bodyText.split("\n")
  // Cut off at signature delimiter ("-- " or "--")
  const sigIdx = lines.findIndex((line) => /^--\s?$/.test(line))
  if (sigIdx !== -1) lines = lines.slice(0, sigIdx)
  // Strip quoted lines
  const cleaned = lines
    .filter((line) => !line.startsWith(">"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength).trimEnd() + "..."
}
