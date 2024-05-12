import type { TreeItem } from "performant-array-to-tree"
import type { Thread } from "~/models/thread.server"
import { useState } from "react"

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

  const isRoot = level == 0
  const colors = isRoot
    ? "border-none"
    : ["border-gray-800 hover:border-orange-500"]

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
              <span className="text-orange-500 font-bold pr-4">
                {`${message.from_email}`}
              </span>
              <span className="text-gray-500" title={message.ts || ""}>
                {message.ts}
              </span>
            </div>
          </summary>
          <div
            className={`prose text-gray-200 text-sm ${
              isRoot ? "pl-3" : "pl-6"
            }`}
          >
            {markdown ? message.body_text : message.body_text}
          </div>
          <div className="thread-footer py-4 border-b border-gray-700">
            {/* Not yet used */}
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
