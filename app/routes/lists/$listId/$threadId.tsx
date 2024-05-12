import invariant from "tiny-invariant"
// import Markdown from "react-markdown" // Not working!
import { json } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import { arrayToTree } from "performant-array-to-tree"
import { getThread } from "~/models/thread.server"
import ThreadItem from "~/components/ThreadItem"
import type { LoaderFunction } from "@remix-run/node"

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
