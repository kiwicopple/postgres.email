"use client"

import type { TreeItem } from "performant-array-to-tree"
import type { Thread } from "@/models/thread"
import { useState } from "react"
import { useFormatting } from "./FormattingProvider"

function formatDate(ts: string | null): string {
  if (!ts) return ""
  try {
    const date = new Date(ts)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    })
  } catch {
    return ts
  }
}

function getSenderName(message: Thread): string {
  try {
    const addrs = message.from_addresses as any
    if (Array.isArray(addrs) && addrs[0]?.name) return addrs[0].name
    if (addrs?.name) return addrs.name
  } catch {}
  return message.from_email || ""
}

// Turns URLs in a string into clickable <a> tags.
// Handles bare URLs and angle-bracket-wrapped URLs like <https://...>
const urlPattern = /<?(https?:\/\/[^\s<>]+)>?/g

function linkify(text: string, key: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  urlPattern.lastIndex = 0
  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const url = match[1]
    parts.push(
      <a
        key={`${key}-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline break-all"
      >
        {url}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex === 0) return text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return <>{parts}</>
}

function FormattedBody({ text }: { text: string | null }) {
  if (!text) return null

  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let currentQuote: string[] = []
  let quoteDepth = 0
  let currentCode: string[] = []
  let currentTable: string[] = []

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      elements.push(
        <blockquote
          key={`q-${elements.length}`}
          className="border-l-2 border-gray-600 pl-3 my-2 text-gray-400 text-xs"
        >
          {currentQuote.map((line, i) => (
            <span key={i}>
              {linkify(line, `q-${elements.length}-${i}`)}
              {i < currentQuote.length - 1 && <br />}
            </span>
          ))}
        </blockquote>
      )
      currentQuote = []
      quoteDepth = 0
    }
  }

  const flushCode = () => {
    if (currentCode.length > 0) {
      const code = currentCode.join("\n")
      elements.push(
        <pre
          key={`c-${elements.length}`}
          className="my-2 p-3 bg-gray-800 rounded text-xs text-gray-300 overflow-x-auto"
        >
          <code>{code}</code>
        </pre>
      )
      currentCode = []
    }
  }

  const parseTable = (tableLines: string[]) => {
    if (tableLines.length < 2) return null

    // Remove empty lines and find separator line
    const nonEmptyLines = tableLines.filter(l => l.trim().length > 0)
    const separatorIndex = nonEmptyLines.findIndex(l => /^[-+]+$/.test(l.trim()))

    if (separatorIndex === -1 || separatorIndex === 0) return null

    // Header is before separator, rows are after
    const headerLine = nonEmptyLines[separatorIndex - 1]
    const rowLines = nonEmptyLines.slice(separatorIndex + 1)

    // Parse header
    const headers = headerLine
      .split("|")
      .map(h => h.trim())
      .filter(h => h.length > 0)

    // Parse rows
    const rows = rowLines.map(line =>
      line
        .split("|")
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0)
    )

    return { headers, rows }
  }

  const flushTable = (tableLines: string[]) => {
    const table = parseTable(tableLines)
    if (!table) {
      // If we can't parse it as a table, treat it as code
      currentCode.push(...tableLines)
      flushCode()
      return
    }

    elements.push(
      <div key={`t-${elements.length}`} className="my-2 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-600">
              {table.headers.map((header, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold text-gray-300 bg-gray-800"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-700 hover:bg-gray-800/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-300">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Matches lines indented with a tab, or 4+ spaces, or 2+ spaces followed
  // by content that looks code-like. We strip the leading whitespace.
  const indentPattern = /^(\t|    | {2,}(?=\S))/
  const isIndented = (l: string) => indentPattern.test(l) && l.trim().length > 0
  const stripIndent = (l: string) => l.replace(/^(\t|    | {2,})/, "")

  // Detect PostgreSQL-style table lines (with pipes and optional leading space)
  const isTableLine = (l: string) => {
    const trimmed = l.trim()
    // Table separator line: ----+----+---- or ---------
    if (/^[-+]+$/.test(trimmed) && trimmed.length > 3) return true
    // Table content line: has pipes with content around them
    if (trimmed.includes("|") && /\w.*\|.*\w/.test(trimmed)) return true
    return false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const quoteMatch = line.match(/^(>[\s>]*)/)

    if (quoteMatch) {
      if (currentTable.length > 0) {
        flushTable(currentTable)
        currentTable = []
      }
      flushCode()
      const depth = (line.match(/>/g) || []).length
      if (currentQuote.length > 0 && depth !== quoteDepth) {
        flushQuote()
      }
      quoteDepth = depth
      currentQuote.push(line.replace(/^[>\s]+/, ""))
    } else if (isTableLine(line)) {
      flushQuote()
      flushCode()
      currentTable.push(line)
    } else if (isIndented(line)) {
      flushQuote()
      if (currentTable.length > 0) {
        flushTable(currentTable)
        currentTable = []
      }
      currentCode.push(stripIndent(line))
    } else {
      flushQuote()
      // If we're in a table and hit a blank line, check if more table follows
      if (line.trim() === "" && currentTable.length > 0) {
        let hasMoreTable = false
        for (let j = i + 1; j < lines.length; j++) {
          if (isTableLine(lines[j])) {
            hasMoreTable = true
            break
          }
          if (lines[j].trim() !== "") break
        }
        if (hasMoreTable) {
          currentTable.push("")
          continue
        }
      }
      // If we're in a code block and hit a blank line, check if more code follows
      if (line.trim() === "" && currentCode.length > 0) {
        let hasMoreCode = false
        for (let j = i + 1; j < lines.length; j++) {
          if (isIndented(lines[j])) {
            hasMoreCode = true
            break
          }
          if (lines[j].trim() !== "") break
        }
        if (hasMoreCode) {
          currentCode.push("")
          continue
        }
      }
      if (currentTable.length > 0) {
        flushTable(currentTable)
        currentTable = []
      }
      flushCode()
      if (line.trim() === "") {
        elements.push(<div key={`br-${i}`} className="h-3" />)
      } else {
        elements.push(
          <span key={`l-${i}`}>
            {linkify(line, `l-${i}`)}
            <br />
          </span>
        )
      }
    }
  }
  flushQuote()
  if (currentTable.length > 0) {
    flushTable(currentTable)
  }
  flushCode()

  return <>{elements}</>
}

function PlainBody({ text }: { text: string | null }) {
  if (!text) return null
  return <pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>
}

export default function ThreadItem({
  tree,
  level,
  markdown,
}: {
  tree: TreeItem
  level: number
  markdown: boolean
}) {
  const [showDetails, setShowDetails] = useState(true)
  const { formatted } = useFormatting()
  const message: Thread = tree.data
  const children: { data: Thread; children: any }[] = tree.children

  if (!message) return null

  const senderName = getSenderName(message)
  const isRoot = level == 0
  const colors = isRoot
    ? "border-none"
    : ["border-gray-800 hover:border-blue-400"]

  return (
    <li
      key={message.id}
      id={`message-${message.id}`}
      className={`w-full overflow-hidden border-l ${
        isRoot ? "" : "border-gray-900"
      }`}
    >
      <div className={`w-full`}>
        <details className={`relative overflow-hidden `} open={showDetails}>
          <a
            href={`#message-${message.id}`}
            onClick={(e) => {
              e.preventDefault()
              setShowDetails(!showDetails)
              return true
            }}
            className={`comment-border-link cursor-pointer block absolute top-0 left-0 w-2 h-full border-l-12 ${colors}`}
          >
            <span className="sr-only">Jump to comment-1</span>
          </a>
          <summary
            className={`cursor-pointer list-none text-sm ${
              showDetails ? "" : colors + " border-l-12"
            }`}
            onClick={(e) => {
              e.preventDefault()
              setShowDetails(!showDetails)
            }}
          >
            <div
              className={`border-b py-2 ${
                isRoot
                  ? "px-3 border-gray-900"
                  : !showDetails
                  ? "border-gray-700 px-3"
                  : "border-gray-900 px-6"
              }`}
            >
              <div className="truncate">
                <span className="text-blue-400 font-bold">
                  {senderName}
                </span>
                {senderName !== message.from_email && (
                  <span className="text-gray-500 ml-2 text-xs">
                    &lt;{message.from_email}&gt;
                  </span>
                )}
              </div>
              <div className="truncate text-gray-500 text-xs">
                {formatDate(message.ts)}
              </div>
            </div>
          </summary>
          <div
            className={`text-gray-200 text-sm leading-relaxed ${
              isRoot ? "pl-3 pr-3" : "pl-6 pr-3"
            } py-3`}
          >
            {formatted ? (
              <FormattedBody text={message.body_text} />
            ) : (
              <PlainBody text={message.body_text} />
            )}
          </div>
          <div className="thread-footer py-2 border-b border-gray-700" />

          {children && children.length > 0 && (
            <ul className={`replies ${isRoot ? "" : "ml-3"}`}>
              {children.map((node, idx) => (
                <ThreadItem
                  tree={node}
                  key={idx}
                  level={level + 1}
                  markdown={markdown}
                />
              ))}
            </ul>
          )}
        </details>
      </div>
    </li>
  )
}
