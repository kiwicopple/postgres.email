"use client"

import type { TreeItem } from "performant-array-to-tree"
import type { Thread } from "@/models/thread"
import { useState } from "react"

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

  // Matches lines indented with a tab, or 4+ spaces, or 2+ spaces followed
  // by content that looks code-like. We strip the leading whitespace.
  const indentPattern = /^(\t|    | {2,}(?=\S))/
  const isIndented = (l: string) => indentPattern.test(l) && l.trim().length > 0
  const stripIndent = (l: string) => l.replace(/^(\t|    | {2,})/, "")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const quoteMatch = line.match(/^(>[\s>]*)/)

    if (quoteMatch) {
      flushCode()
      const depth = (line.match(/>/g) || []).length
      if (currentQuote.length > 0 && depth !== quoteDepth) {
        flushQuote()
      }
      quoteDepth = depth
      currentQuote.push(line.replace(/^[>\s]+/, ""))
    } else if (isIndented(line)) {
      flushQuote()
      currentCode.push(stripIndent(line))
    } else {
      flushQuote()
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
  flushCode()

  return <>{elements}</>
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
            } py-3 font-mono`}
          >
            <FormattedBody text={message.body_text} />
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
