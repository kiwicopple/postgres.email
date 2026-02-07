import { getListDetail } from "@/models/list"
import { DEFAULT_PAGE_SIZE } from "@/lib/utils"
import MessageList from "./MessageList"

export default async function ListDetailLayout({
  children,
  params,
  searchParams,
}: {
  children: React.ReactNode
  params: { listId: string }
  searchParams: { page?: string }
}) {
  const { listId } = params
  const page = Number(searchParams.page) || 0

  const { data: list, error } = await getListDetail(listId, page)

  if (error) throw new Error(error.message)
  if (!list) throw new Error(`List not found: ${listId}`)

  const totalPages = Math.ceil((list.message_count || 0) / DEFAULT_PAGE_SIZE)

  return (
    <div>
      <MessageList list={list} listId={listId} page={page} totalPages={totalPages}>
        {children}
      </MessageList>
    </div>
  )
}
