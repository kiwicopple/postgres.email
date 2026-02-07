import React from "react"
import { MARKDOWN_LINK_PATTERN, URL_PATTERN, BOLD_PATTERN, ITALIC_PATTERN } from "./constants"

type FormatMatch = {
  index: number
  length: number
  type: 'link' | 'bold' | 'italic' | 'url'
  url?: string
  text?: string
}

/**
 * Parses and renders inline markdown formatting including links, bold, italic, and URLs
 *
 * Supports:
 * - Markdown links: [text](url)
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - URLs: bare https://... or <https://...>
 */
export function linkify(text: string, key: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  // Find all markdown formatting in order
  const matches: FormatMatch[] = []

  // Find markdown links [text](url)
  MARKDOWN_LINK_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = MARKDOWN_LINK_PATTERN.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'link',
      url: match[2],
      text: match[1]
    })
  }

  // Find bare URLs and angle-bracket URLs, but skip those inside markdown links
  URL_PATTERN.lastIndex = 0
  while ((match = URL_PATTERN.exec(text)) !== null) {
    const isInsideOther = matches.some(m =>
      match!.index >= m.index && match!.index < m.index + m.length
    )
    if (!isInsideOther) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'url',
        url: match[1]
      })
    }
  }

  // Find bold text **text** or __text__
  BOLD_PATTERN.lastIndex = 0
  while ((match = BOLD_PATTERN.exec(text)) !== null) {
    const isInsideOther = matches.some(m =>
      match!.index >= m.index && match!.index < m.index + m.length
    )
    if (!isInsideOther) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'bold',
        text: match[2]
      })
    }
  }

  // Find italic text *text* or _text_ (but not bold)
  ITALIC_PATTERN.lastIndex = 0
  while ((match = ITALIC_PATTERN.exec(text)) !== null) {
    // Skip if this italic match is inside another match (bold, link, etc)
    const isInsideOther = matches.some(m =>
      match!.index >= m.index && match!.index < m.index + m.length
    )
    if (!isInsideOther) {
      // The pattern has two alternations, so text is in group 1 or 2
      const italicText = match[1] || match[2]
      matches.push({
        index: match.index,
        length: match[0].length,
        type: 'italic',
        text: italicText
      })
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index)

  // Build the output
  matches.forEach((m) => {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index))
    }

    if (m.type === 'link' || m.type === 'url') {
      parts.push(
        <a
          key={`${key}-${m.index}`}
          href={m.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline break-all"
        >
          {m.text || m.url}
        </a>
      )
    } else if (m.type === 'bold') {
      parts.push(
        <strong key={`${key}-${m.index}`} className="font-bold">
          {m.text}
        </strong>
      )
    } else if (m.type === 'italic') {
      parts.push(
        <em key={`${key}-${m.index}`} className="italic">
          {m.text}
        </em>
      )
    }

    lastIndex = m.index + m.length
  })

  if (lastIndex === 0) return text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return <>{parts}</>
}
