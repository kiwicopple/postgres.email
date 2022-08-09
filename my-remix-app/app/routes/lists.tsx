import invariant from "tiny-invariant"
import { json } from "@remix-run/node"
import { Link, Outlet, useLoaderData } from "@remix-run/react"
import { getLists } from "~/models/list.server"
import { classNames } from "~/lib/utils"

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
    <div className="h-full ">
      <div className="hidden md:flex md:w-48 md:flex-col md:fixed md:inset-y-0">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 bg-white overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <img
              className="h-8 w-auto"
              src="https://tailwindui.com/img/logos/workflow-logo-indigo-600-mark-gray-800-text.svg"
              alt="Workflow"
            />
          </div>
          <div className="m-3 flex flex-col">{/* <QuickSearch /> */}</div>
          <div className="mt-3 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {lists?.map((item) => (
                <Link
                  key={item.id}
                  to={`/lists/${item.id}`}
                  className={
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer"
                  }
                >
                  {item.id}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="md:pl-48 flex flex-col flex-1 h-full">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
