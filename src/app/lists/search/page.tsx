import Link from "next/link"
import { getLists } from "@/models/list"
import { formatDate, stripMessageIdBrackets, getSnippet } from "@/lib/formatters"
import { retrieveThreads, type SearchHit } from "@/lib/retrieval"
import SearchFilter from "@/components/SearchFilter"
import ModeToggle, { type SearchMode } from "@/components/ModeToggle"
import AskView from "@/components/AskView"

export const dynamic = "force-dynamic"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; list?: string; mode?: string }
}) {
  const query = searchParams.q?.trim() ?? ""
  const listFilter = searchParams.list || null
  const mode: SearchMode = searchParams.mode === "ask" ? "ask" : "search"

  const { data: lists } = await getLists()

  // Only retrieve server-side in search mode. Ask mode triggers /api/ask
  // from the client, which does its own retrieval, so we'd just duplicate work.
  let hits: SearchHit[] = []
  let retrievalError: Error | null = null
  if (mode === "search" && query) {
    const result = await retrieveThreads(query, listFilter)
    hits = result.hits ?? []
    retrievalError = result.error
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <SearchFilter
          lists={lists || []}
          currentList={listFilter}
          currentQuery={query}
        />
      </div>

      <div className="mb-6">
        <ModeToggle mode={mode} />
      </div>

      {mode === "ask" ? (
        <AskView question={query} list={listFilter} />
      ) : !query ? (
        <p className="text-gray-500 text-sm">
          Enter a search query to find emails.
        </p>
      ) : retrievalError ? (
        <p className="text-red-400 text-sm">
          Search is temporarily unavailable. Please try again in a moment.
        </p>
      ) : (
        <>
          <p className="text-gray-500 text-xs mb-4">
            {hits.length === 0
              ? "No results found"
              : `${hits.length} result${hits.length === 1 ? "" : "s"}`}
            {listFilter && (
              <span>
                {" "}
                in <span className="text-gray-400">{listFilter}</span>
              </span>
            )}
          </p>

          {hits.length > 0 && (
            <ul className="space-y-1">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={`/lists/${hit.mailbox_id}/${encodeURIComponent(stripMessageIdBrackets(hit.thread_id ?? hit.id))}`}
                    className="block border-b border-gray-800 hover:bg-gray-800 p-3 -mx-3 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-200 truncate">
                        {hit.subject || "(no subject)"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        <span className="text-blue-400">{hit.from_email}</span>
                        {" in "}
                        <span className="text-gray-400">{hit.mailbox_id}</span>
                        {hit.ts && (
                          <span className="ml-2">{formatDate(hit.ts)}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {getSnippet(hit.body_text)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
