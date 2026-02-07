import { getListDetail } from "@/models/list"
import MessageList from "./MessageList"

// Revalidate every 60 seconds - this is a read-only archive
export const revalidate = 60

export default async function ListDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { listId: string }
}) {
  const { listId } = params

  const { data: list, error } = await getListDetail(listId)

  if (error) throw new Error(error.message)
  if (!list) throw new Error(`List not found: ${listId}`)

  return (
    <div>
      <MessageList list={list} listId={listId}>
        {children}
      </MessageList>
    </div>
  )
}
