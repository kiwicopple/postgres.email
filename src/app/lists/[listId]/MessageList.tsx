"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"
import type { ListDetailDataSuccess, MessageListMetadata } from "@/types"
import MessageThread from "@/components/MessageThread"
import { stripMessageIdBrackets } from "@/lib/formatters"

export default function MessageList({
  list,
  listId,
  children,
}: {
  list: NonNullable<ListDetailDataSuccess>
  listId: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const threadSelected = pathname !== `/lists/${listId}`

  const [messages, setMessages] = useState<MessageListMetadata[]>(list.messages)
  const [pagination, setPagination] = useState(list.pagination)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    if (!pagination || loading) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/lists/${listId}/messages?limit=${pagination.limit}&offset=${pagination.offset + pagination.limit}`
      )
      const data = await response.json()

      if (data.messages) {
        setMessages(prevMessages => [...prevMessages, ...data.messages])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to load more messages:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div
        className={`${
          threadSelected ? "hidden" : ""
        } md:flex md:w-80 md:flex-col md:fixed md:inset-y-0`}
      >
        <div className="md:hidden bg-blue-900 shadow-md p-4 border-b sticky top-0 space-y-2 z-40">
          <div className="flex flex-row">
            <p className="flex whitespace-nowrap text-ellipsis overflow-hidden order-last">
              {listId}
            </p>
          </div>
        </div>
        <nav className="z-50 flex flex-col flex-grow border-r overflow-y-auto">
          <ul>
            {messages.map((message) => (
              <MessageThread
                key={message.id}
                message={message}
                href={`/lists/${list.id}/${encodeURIComponent(stripMessageIdBrackets(message.id))}`}
              />
            ))}
          </ul>
          {pagination?.hasMore && (
            <div className="p-4 border-t">
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </nav>
      </div>
      <div className="md:pl-80 flex flex-col flex-1 h-full">
        {children}
      </div>
    </div>
  )
}
