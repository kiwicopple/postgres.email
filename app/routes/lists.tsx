import clsx from "clsx"
import invariant from "tiny-invariant"
import { json } from "@remix-run/node"
import {
  NavLink,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
} from "@remix-run/react"
import { getLists } from "~/models/list.server"
import QuickSearch from "~/components/QuickSearch"

import type { LoaderFunction } from "@remix-run/node"
import type {
  ListsData,
  ListsDataSuccess,
  ListsDataError,
} from "~/models/list.server"

type LoaderData = {
  data: NonNullable<ListsDataSuccess>
  listId: string | undefined
}

export const loader: LoaderFunction = async ({ params }) => {
  const { data, error } = await getLists()
  console.log("params", params)

  invariant(!error, `Error: ${error?.message}`)
  invariant(data, `List not found`)

  return json<LoaderData>({ data, listId: params.listId })
}

export default function Index() {
  const location = useLocation()
  const { data: lists, listId } = useLoaderData() as LoaderData

  console.log("location", location)
  const baseClass =
    "group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer"
  const activeClass = baseClass + "text-gray-200 bg-gray-700"
  const inactiveClass =
    baseClass + "text-gray-400 hover:text-gray-200 hover:bg-gray-800"

  return (
    <div className="h-full ">
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex flex-col flex-grow border-r pt-5 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 font-mono text-lg text-orange-500">
            postgres.email
          </div>
          <div className="m-3 flex flex-col my-10">
            <QuickSearch />
          </div>
          <div className="px-5 text-sm">
            <h4>Lists</h4>
          </div>
          <div className="mt-3 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1 text-sm">
              {lists?.map((item) => (
                <Link
                  key={item.id}
                  to={`/lists/${item.id}`}
                  className={clsx(
                    "px-3 py-1.5 flex items-center gap-4 transition-colors rounded-lg group",
                    listId == item.id // Need an isActive flag for this
                      ? activeClass
                      : inactiveClass
                  )}
                >
                  <>
                    <div className="flex-1">{item.id}</div>
                    <span className="px-1 py-0.5 text-xs">
                      {String(item.message_count).padStart(3, " ")}
                    </span>
                  </>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="md:pl-64 flex flex-col flex-1 h-full">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
