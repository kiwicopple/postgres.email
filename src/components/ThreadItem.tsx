"use client"

import type { TreeItem } from "performant-array-to-tree"
import type { Thread } from "@/types"
import { useState } from "react"
import { useFormatting } from "./FormattingProvider"
import { formatDate, getSenderName, stripMessageIdBrackets } from "@/lib/formatters"
import FormattedBody from "./FormattedBody"

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
          <div className={`thread-footer py-2 border-b border-gray-700 ${isRoot ? "pl-3 pr-3" : "pl-6 pr-3"}`}>
            <a
              href={`https://www.postgresql.org/message-id/${encodeURIComponent(stripMessageIdBrackets(message.id))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-blue-400"
            >
              View in PostgreSQL Archives →
            </a>
          </div>

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
