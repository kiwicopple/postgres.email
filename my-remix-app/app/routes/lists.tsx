import invariant from "tiny-invariant"
import { json } from "@remix-run/node"
import { Link, Outlet, useLoaderData } from "@remix-run/react"
import { getLists } from "~/models/list.server"

import type { LoaderFunction } from "@remix-run/node"
import type {
  ListsData,
  ListsDataSuccess,
  ListsDataError,
} from "~/models/list.server"

type LoaderData = ListsDataSuccess

export const loader: LoaderFunction = async () => {
  const { data, error } = await getLists()

  invariant(!error, `Error: ${error?.message}`)
  invariant(data, `List not found`)

  return json<ListsDataSuccess>(data)
}

export default function Index() {
  const lists = useLoaderData() as LoaderData

  return (
    <div>
      <nav>
        <h1>Lists</h1>
        <ul>
          {lists?.map((list) => (
            <li key={list.id}>
              <Link
                to={`/lists/${list.id}`}
                className="text-blue-600 underline"
              >
                {list.id}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
