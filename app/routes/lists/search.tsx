import invariant from "tiny-invariant"
import { json } from "@remix-run/node"
import { useLoaderData, useLocation } from "@remix-run/react"
import supabase from "~/lib/supabase"
import type { LoaderFunction } from "@remix-run/node"

import type { Database } from "~/lib/database.types"
type Message = Database["public"]["Tables"]["messages"]["Row"]

type LoaderData = {
  data: Message[] | undefined
  listId: string
  threadId: string | undefined
}

export const loader: LoaderFunction = async ({ request }) => {
  let { searchParams } = new URL(request.url)
  let query = searchParams.get("q")

  invariant(query, `"query" is required`)

  const { data, error } = await supabase.functions.invoke("search", {
    // headers: { "Content-Type": "application/json" },
    body: { query },
  })

  invariant(!error, `Error: ${error?.message}`)

  return json({ data })
}

export default function Search() {
  const location = useLocation()
  const { data: results, listId } = useLoaderData() as LoaderData
  const threadSelected = location.pathname != `/lists/${listId}`

  console.log("results", results)
  return (
    <div>
      <div>
        <div className="md:hidden bg-orange-900 shadow-md p-4 border-b sticky top-0 space-y-2 z-40">
          <div className="flex flex-row">
            <p className="flex whitespace-nowrap text-ellipsis overflow-hidden order-last">
              {listId}
            </p>
          </div>
          {/* <div>
          <Button
            size="xs"
            label="Markdown"
            isActive={showMarkdown}
            onClick={() => setShowMarkdown(!showMarkdown)}
          />
        </div> */}
        </div>
        {/* <nav className="z-50 flex flex-col flex-grow border-r overflow-y-auto">
          <ul>
            {list.messages.map((message) => (
              <MessageThread
                key={message.id}
                message={message}
                href={`/lists/${list.id}/${message.id}`}
              />
            ))}
          </ul>
        </nav> */}
      </div>
      <div className="flex flex-col flex-1 h-full">
        <ul>
          {results &&
            results.map((message: any) => (
              <div className={`w-full`}>
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
