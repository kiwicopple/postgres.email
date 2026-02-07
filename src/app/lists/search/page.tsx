import Link from "next/link"
import { getSupabase } from "@/lib/supabase"
import { getLists } from "@/models/list"
import { formatDate, stripMessageIdBrackets, getSnippet } from "@/lib/formatters"
import SearchFilter from "@/components/SearchFilter"

export const dynamic = "force-dynamic"

interface SearchResult {
  id: string
  mailbox_id: string
  subject: string | null
  from_email: string | null
  ts: string | null
  body_text: string | null
  score: number
  matched_chunk: number
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; list?: string }
}) {
  const query = searchParams.q?.trim()
  const listFilter = searchParams.list || null

  const { data: lists } = await getLists()

  if (!query) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <SearchFilter
            lists={lists || []}
            currentList={listFilter}
            currentQuery=""
          />
        </div>
        <p className="text-gray-500 text-sm">Enter a search query to find emails.</p>
      </div>
    )
  }

  const { data: results, error } = await getSupabase().functions.invoke(
    "search",
    {
      body: {
        query,
        ...(listFilter ? { mailbox_id: listFilter } : {}),
      },
    }
  )

  if (error) throw new Error(error.message)

  const searchResults: SearchResult[] = results || []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <SearchFilter
          lists={lists || []}
          currentList={listFilter}
          currentQuery={query}
        />
      </div>

      <p className="text-gray-500 text-xs mb-4">
        {searchResults.length === 0
          ? "No results found"
          : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}
        {listFilter && (
          <span>
            {" "}in <span className="text-gray-400">{listFilter}</span>
          </span>
        )}
      </p>

      {searchResults.length > 0 && (
        <ul className="space-y-1">
          {searchResults.map((result) => (
            <li key={result.id}>
              <Link
                href={`/lists/${result.mailbox_id}/${encodeURIComponent(stripMessageIdBrackets(result.id))}`}
                className="block border-b border-gray-800 hover:bg-gray-800 p-3 -mx-3 rounded transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm text-gray-200 truncate">
                    {result.subject || "(no subject)"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    <span className="text-blue-400">{result.from_email}</span>
                    {" in "}
                    <span className="text-gray-400">{result.mailbox_id}</span>
                    {result.ts && (
                      <span className="ml-2">{formatDate(result.ts)}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {getSnippet(result.body_text)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
