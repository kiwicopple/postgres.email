import Link from "next/link"
import clsx from "clsx"
import { getLists } from "@/models/list"
import QuickSearch from "@/components/QuickSearch"

export const dynamic = "force-dynamic"

export default async function ListsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: lists, error } = await getLists()

  if (error) throw new Error(error.message)
  if (!lists) throw new Error("Lists not found")

  const baseClass =
    "group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer"
  const inactiveClass =
    baseClass + "text-gray-400 hover:text-gray-200 hover:bg-gray-800"

  return (
    <div className="h-full ">
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
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
                  href={`/lists/${item.id}`}
                  className={clsx(
                    "px-3 py-1.5 flex items-center gap-4 transition-colors rounded-lg group",
                    inactiveClass
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
          {children}
        </main>
      </div>
    </div>
  )
}
