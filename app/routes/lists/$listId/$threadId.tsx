import invariant from "tiny-invariant"
// import Markdown from "react-markdown" // Not working!
import { json } from "@remix-run/node"
import {
  NavLink,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
} from "@remix-run/react"
import { arrayToTree } from "performant-array-to-tree"
import { getThread } from "~/models/thread.server"
import type { LoaderFunction } from "@remix-run/node"
import type { TreeItem } from "performant-array-to-tree"
import Button from "~/components/Button"

import type {
  ThreadData,
  ThreadDataSuccess,
  ThreadDataError,
  Thread,
} from "~/models/thread.server"
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

export default function Thread() {
  const [showMarkdown, setShowMarkdown] = useState(false)
  const { data: thread, listId, threadId } = useLoaderData() as LoaderData
  //   console.log("data", thread)
  const tree = arrayToTree(thread, { parentId: "in_reply_to" })[0]
  return (
    <div className="relative">
      <div className="bg-gray-900 shadow-md p-4 border-b sticky top-0 space-y-2 z-40">
        <div className="whitespace-nowrap text-ellipsis overflow-hidden">
          {thread[0].subject}
        </div>
        <div>
          <Button
            size="xs"
            label="Markdown"
            isActive={showMarkdown}
            onClick={() => setShowMarkdown(!showMarkdown)}
          />
        </div>
      </div>
      <ul className="flex flex-row whitespace-pre-wrap p-4">
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

  const isOdd = level % 2 === 0
  const colors = isOdd
    ? ["bg-gray-900 border-gray-700 hover:border-blue-300"]
    : ["bg-gray-800 border-gray-700 hover:border-blue-300"]

  return (
    <li
      key={message.id}
      className={`border w-full border rounded-lg overflow-hidden`}
    >
      <div className={`w-full pr-2 ${colors}`}>
        <details className="relative overflow-hidden pb-4" open={showDetails}>
          <a
            href="#"
            onClick={() => setShowDetails(!showDetails)}
            className={`comment-border-link cursor-pointer block absolute top-0 left-0 w-2 h-full border-l-8 ${colors}`}
          >
            <span className="sr-only">Jump to comment-1</span>
          </a>
          <summary className="pl-6 mb-4 cursor-pointer list-none text-sm p-2">
            <div className="font-bold">
              <p>
                {`<${message.from_email}>`} {message.ts}
              </p>
            </div>
          </summary>
          <div className="pl-6 prose text-gray-200">
            {markdown ? message.body_text : message.body_text}
          </div>
          <div className="thread-footer ml-4 py-4">FOOTER</div>

          {children && children.length > 0 && (
            <ul className={"replies ml-4 pt-2 space-y-5"}>
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
