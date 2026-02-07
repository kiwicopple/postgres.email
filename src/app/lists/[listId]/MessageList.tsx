"use client"

import { usePathname } from "next/navigation"
import type { ListDetailDataSuccess } from "@/types"
import MessageThread from "@/components/MessageThread"

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
            {list.messages.map((message) => (
              <MessageThread
                key={message.id}
                message={message}
                href={`/lists/${list.id}/${message.id}`}
              />
            ))}
          </ul>
        </nav>
      </div>
      <div className="md:pl-80 flex flex-col flex-1 h-full">
        {children}
      </div>
    </div>
  )
}
