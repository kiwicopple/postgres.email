import invariant from "tiny-invariant"
// import Markdown from "react-markdown" // Not working!
import { json } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import { arrayToTree } from "performant-array-to-tree"
import { getThread } from "~/models/thread.server"
import type { LoaderFunction } from "@remix-run/node"
import type { TreeItem } from "performant-array-to-tree"
// import Button from "~/components/Button"

import type { ThreadDataSuccess, Thread } from "~/models/thread.server"
import { useState } from "react"

type LoaderData = {
  data: NonNullable<ThreadDataSuccess>
  listId: string
  threadId: string | undefined
}

export const loader: LoaderFunction = async ({ params }) => {
  const { listId, threadId } = params

  invariant(threadId, `params.threadId is required`)

  const { data, error } = await getThread(threadId!)

  invariant(!error, `Error: ${error?.message}`)
  invariant(data, `Thread not found: ${threadId}`)

  return json({ data, listId, threadId })
}

export default function ThreadPage() {
  const [showMarkdown, setShowMarkdown] = useState(false)
  const { data: thread, listId, threadId } = useLoaderData() as LoaderData
  //   console.log("data", thread)
  const tree = arrayToTree(thread, { parentId: "in_reply_to" })[0]
  return (
    <div className="relative">
      <div className="bg-orange-900 shadow-md p-4 border-b sticky top-0 space-y-2 z-40">
        <div className="flex flex-row">
          <Link to={`/lists/${listId}`} className="md:hidden flex mr-4">
            <div className="inline-flex items-center border bg-orange-800 border-orange-700 hover:border-orange-400 rounded px-2 text-sm font-sans font-medium text-gray-400">
              ❮
            </div>
          </Link>
          <p className="flex whitespace-nowrap text-ellipsis overflow-hidden order-last">
            {thread[0].subject}
          </p>
        </div>
        {/* <div>
          <Button
            size="xs"
            label="Markdown"
            isActive={showMarkdown}
            onClick={() => setShowMarkdown(!showMarkdown)}
          />
        </div> */}
      </div>
      <ul className="flex flex-row whitespace-pre-wrap">
        {tree.data && (
          <ThreadItem tree={tree} level={0} markdown={showMarkdown} />
        )}
      </ul>
    </div>
  )
}

const ThreadItem = ({
  tree,
  level,
  markdown,
}: {
  tree: TreeItem
  level: number
  markdown: boolean
}) => {
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
