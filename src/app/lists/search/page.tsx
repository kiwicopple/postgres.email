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
    <div>
      <div>
        <div className="md:hidden bg-orange-900 shadow-md p-4 border-b sticky top-0 space-y-2 z-40">
          <div className="flex flex-row">
            <p className="flex whitespace-nowrap text-ellipsis overflow-hidden order-last">
              Search: {query}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col flex-1 h-full">
        <ul>
          {results &&
            results.map((message: any) => (
              <div key={message.id} className={`w-full`}>
                <div className={`relative overflow-hidden `}>
                  <div className={`cursor-pointer list-none text-sm`}>
                    <div className={`border-b py-2 "px-3 border-gray-900"`}>
                      <span className="text-orange-500 font-bold pr-4">
                        {`${message.from_email}`}
                      </span>
                      <span className="text-gray-500" title={message.ts || ""}>
                        {message.ts}
                      </span>
                    </div>
                  </div>
                  <div className={`prose text-gray-200 text-sm`}>
                    {message.body_text}
                  </div>
                  <div className="thread-footer py-4 border-b border-gray-700">
                    {/* Not yet used */}
                  </div>
                </div>
              </div>
            ))}
        </ul>
      </div>
    </div>
  )
}
