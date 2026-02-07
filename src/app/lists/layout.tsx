import { getLists } from "@/models/list"
import QuickSearch from "@/components/QuickSearch"
import MobileNav from "@/components/MobileNav"
import ListNav from "@/components/ListNav"

// Revalidate every 60 seconds - this is a read-only archive
export const revalidate = 60

export default async function ListsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: lists, error } = await getLists()

  if (error) throw new Error(error.message)
  if (!lists) throw new Error("Lists not found")

  return (
    <div className="h-full ">
      <MobileNav lists={lists} />
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r pt-5 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 text-lg text-blue-400">
            postgres.email
          </div>
          <div className="m-3 flex flex-col my-10">
            <QuickSearch />
          </div>
          <div className="px-5 text-sm">
            <h4>Lists</h4>
          </div>
          <div className="mt-3 flex-grow flex flex-col">
            <ListNav lists={lists} />
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
