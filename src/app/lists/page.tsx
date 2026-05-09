import Link from "next/link"
import { getLists } from "@/models/list"
import { REVALIDATE_INTERVAL } from "@/lib/constants"

export const revalidate = REVALIDATE_INTERVAL

export default async function ListsPage() {
  const { data: lists, error } = await getLists()

  if (error) throw new Error(error.message)

  return (
    <div className="flex items-center justify-center h-full p-10">
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-400 mb-4">
            postgres.email
          </h1>
          <p className="text-xl text-gray-300">
            PostgreSQL mailing lists, with a more readable interface
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">
              Better Formatting
            </h2>
            <p className="text-gray-400">
              Syntax-highlighted code blocks, properly rendered tables, and
              clean typography that makes technical discussions easier to
              follow.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">
              Fast Search
            </h2>
            <p className="text-gray-400">
              Quickly find messages across all mailing lists with semantic
              search and message ID lookup.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">
              Threaded Conversations
            </h2>
            <p className="text-gray-400">
              See the full context of discussions with proper reply hierarchies.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">
              Mobile Friendly
            </h2>
            <p className="text-gray-400">
              Read PostgreSQL discussions on any devices.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-blue-300 mb-2">
              Shareable Links
            </h2>
            <p className="text-gray-400">
              Every message has a permanent URL. Easily reference specific
              discussions in documentation or conversations.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h2 className="text-lg font-semibold text-blue-300 mb-3">
            Mailing Lists
          </h2>
          <nav className="space-y-1">
            {lists?.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                {list.id}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
