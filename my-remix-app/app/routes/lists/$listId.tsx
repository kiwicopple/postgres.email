import invariant from "tiny-invariant"
import { json } from "@remix-run/node"
import {
  NavLink,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
} from "@remix-run/react"
import { getListDetail } from "~/models/list.server"
import type { LoaderFunction } from "@remix-run/node"

import type {
  ListDetailData,
  ListDetailDataSuccess,
  ListDetailDataError,
} from "~/models/list.server"

type LoaderData = {
  data: NonNullable<ListDetailDataSuccess>
  listId: string
  threadId: string | undefined
}
type Message = LoaderData["data"]["messages"][0]

export const loader: LoaderFunction = async ({ params }) => {
  const { listId, threadId } = params

  invariant(listId, `params.listId is required`)

  const { data, error } = await getListDetail(listId!)

  invariant(!error, `Error: ${error?.message}`)
  invariant(data, `List not found: ${listId}`)

  // ignore next line
  // @ts-ignore
  return json<ListDetailDataSuccess>({ data, listId, threadId })
}

export default function List() {
  const { data: list, listId, threadId } = useLoaderData() as LoaderData
  console.log("threadId", threadId)
  return (
    <div>
      <div className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0">
        <nav className="bg-white z-50 flex flex-col flex-grow border-r border-slate-100 bg-white overflow-y-auto">
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
        <Outlet />
      </div>
    </div>
  )
}

const MessageThread = ({
  message,
  href,
}: {
  message: Message
  href: string
}) => {
  const from = message.from_addresses!
  // @ts-ignore
  const sender: { Name?: string; Address: string } = from[0]
  const timestamp = new Date(message.ts!).toLocaleDateString()

  // PMC:
  // For some reason Remix's built-in "isActive" deosn't work.
  // I suspect it's because it's not decoding the URL?
  const location = useLocation()
  const isActive = decodeURI(location.pathname) === href
  const activeClass = "text-red"
  const inactiveClass = "text-gray-500"

  return (
    <NavLink
      to={href}
      className={isActive ? activeClass : inactiveClass}
      prefetch="intent"
    >
      <li
        key={message.id}
        className="flex flex-col p-2 py-4 border-b hover:bg-gray-100 text-sm"
      >
        <div className="flex flex-row">
          <span className="font-bold flex-grow whitespace-nowrap text-ellipsis overflow-hidden">
            {sender.Name || sender.Address}
          </span>
          <span className="text-xs">{timestamp}</span>
        </div>
        <div className="whitespace-nowrap text-ellipsis overflow-hidden">
          {message.subject}
        </div>
      </li>
    </NavLink>
  )
}
