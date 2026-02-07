import { getSupabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"

export const dynamic = "force-dynamic"

type Message = Database["public"]["Tables"]["messages"]["Row"]

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const query = searchParams.q

  if (!query) {
    return <div className="p-10">Enter a search query</div>
  }

  const { data: results, error } = await getSupabase().functions.invoke("search", {
    body: { query },
  })

  if (error) throw new Error(error.message)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-200 mb-2">Search coming soon</h1>
        <p className="text-gray-400">
          Search functionality is currently in development. Below is the embedding for your query.
        </p>
      </div>

      {results && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-2">Query</h2>
            <p className="text-gray-300">{results.query}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-2">
              Embedding ({results.embedding?.length || 0} dimensions)
            </h2>
            <div className="bg-gray-950 rounded p-3 overflow-auto max-h-60">
              <code className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                {JSON.stringify(results.embedding, null, 2)}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
