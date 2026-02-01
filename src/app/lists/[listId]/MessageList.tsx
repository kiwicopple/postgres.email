"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ListDetailDataSuccess } from "@/models/list"

type Message = NonNullable<ListDetailDataSuccess>["messages"][0]

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
            <p className="flex whitespace-nowrap text-ellipsis overflow-hidden order-last font-mono">
              {listId}
            </p>
          </div>
        </div>
        <nav className="z-50 flex flex-col flex-grow border-r overflow-y-auto">
          <ul>
            {list.messages.map((message: Message) => (
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

function MessageThread({
  message,
  href,
}: {
  message: Message
  href: string
}) {
  const from = message.from_addresses!
  // @ts-ignore
  const sender: { name?: string; address: string } = from[0]
  const timestamp = new Date(message.ts!).toLocaleDateString()

  const pathname = usePathname()
  const isActive = decodeURI(pathname) === href
  const activeClass = "text-red"
  const inactiveClass = "text-gray-500"

  return (
    <Link
      href={href}
      className={isActive ? activeClass : inactiveClass}
    >
      <li
        key={message.id}
        className="flex flex-col p-2 py-4 border-b hover:bg-gray-800 text-sm"
      >
        <div className="flex flex-row">
          <span className="font-bold flex-grow whitespace-nowrap text-ellipsis overflow-hidden">
            {sender.name || sender.address || String(sender)}
          </span>
          <span className="text-xs">{timestamp}</span>
        </div>
        <div className="whitespace-nowrap text-ellipsis overflow-hidden">
          {message.subject}
        </div>
      </li>
    </Link>
  )
}
