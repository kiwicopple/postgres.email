import { getLists } from "@/models/list"
import QuickSearch from "@/components/QuickSearch"
import MobileNav from "@/components/MobileNav"
import ListNav from "@/components/ListNav"
import GoToMessage from "@/components/GoToMessage"
import { FormattingProvider } from "@/components/FormattingProvider"
import FormattingToggle from "@/components/FormattingToggle"
import { REVALIDATE_INTERVAL } from "@/lib/constants"

// Revalidate - this is a read-only archive
export const revalidate = REVALIDATE_INTERVAL

export default async function ListsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: lists, error } = await getLists()

  if (error) throw new Error(error.message)
  if (!lists) throw new Error("Lists not found")

  return (
    <FormattingProvider>
      <div className="h-full ">
        <MobileNav lists={lists} />
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex flex-col flex-grow border-r pt-5 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 text-lg text-blue-400">
              postgres.email
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <ListNav lists={lists} />
            </div>
            <div className="border-t border-gray-800 px-2 py-3">
              <GoToMessage />
            </div>
            <div className="border-t border-gray-800 px-2 py-3">
              <QuickSearch />
            </div>
            <div className="border-t border-gray-800 px-2 py-2">
              <FormattingToggle />
            </div>
          </div>
        </div>
        <div className="md:pl-64 flex flex-col flex-1 h-full">
          <main>{children}</main>
        </div>
      </div>
    </FormattingProvider>
  )
}
