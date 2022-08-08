import invariant from "tiny-invariant"
import { json } from "@remix-run/node"
import { Link, Outlet, useLoaderData } from "@remix-run/react"
import { getListDetail } from "~/models/list.server"
import type { LoaderFunction } from "@remix-run/node"

import type {
  ListDetailData,
  ListDetailDataSuccess,
  ListDetailDataError,
} from "~/models/list.server"

type LoaderData = NonNullable<ListDetailDataSuccess>
type Message = LoaderData["messages"][0]

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.id, `params.id is required`)

  const { data, error } = await getListDetail(params.id!)

  invariant(!error, `Error: ${error?.message}`)
  invariant(data, `List not found: ${params.id}`)

  // ignore next line
  // @ts-ignore
  return json<ListDetailDataSuccess>(data)
}

export default function ListId() {
  const list = useLoaderData() as LoaderData
  console.log("id", list)
  return (
    <nav className="flex flex-col flex-grow border-r border-slate-100 bg-white overflow-y-auto">
      <ul>
        {list.messages.map((message) => (
          <MessageThread
            key={message.id}
            message={message}
            href={`/list/${list.id}/${message.id}`}
            isActive={false}
          />
        ))}
      </ul>
    </nav>
  )
}

const MessageThread = ({
  message,
  href,
  isActive,
}: {
  message: Message
  href: string
  isActive: boolean
}) => {
  const from = message.from_addresses!
  // @ts-ignore
  const sender: { Name?: string; Address: string } = from[0]
  const timestamp = new Date(message.ts!).toLocaleDateString()
  return (
    <Link to={href} className={isActive ? "text-black" : "text-gray-500"}>
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
    </Link>
  )
}
