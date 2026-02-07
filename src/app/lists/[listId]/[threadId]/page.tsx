import Link from "next/link"
import { arrayToTree } from "performant-array-to-tree"
import { getThread } from "@/models/thread"
import ThreadView from "./ThreadView"

// Revalidate every 60 seconds - this is a read-only archive
export const revalidate = 60

export default async function ThreadPage({
  params,
}: {
  params: { listId: string; threadId: string }
}) {
  const { listId, threadId: rawThreadId } = params
  const threadId = decodeURIComponent(rawThreadId)

  const { data: thread, error } = await getThread(threadId)

  if (error) throw new Error(error.message)
  if (!thread || thread.length === 0) throw new Error(`Thread not found: ${threadId}`)

  const tree = arrayToTree(thread, { parentId: "in_reply_to" })[0]

  return (
    <div className="relative">
      <div className="bg-blue-900 shadow-md p-4 border-b sticky top-0 space-y-2 z-40">
        <div className="flex flex-row">
          <Link href={`/lists/${listId}`} className="md:hidden flex mr-4">
            <div className="inline-flex items-center border bg-blue-800 border-blue-700 hover:border-blue-400 rounded px-2 text-sm font-sans font-medium text-gray-400">
              ❮
            </div>
          </Link>
          <p className="flex whitespace-nowrap text-ellipsis overflow-hidden order-last">
            {thread[0].subject}
          </p>
        </div>
      </div>
      <ThreadView tree={tree} />
    </div>
  )
}
