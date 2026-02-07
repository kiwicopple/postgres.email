import type { Database } from "@/lib/database.types"

type Messages = Database["public"]["Tables"]["messages"]["Row"]
type Mailboxes = Database["public"]["Tables"]["mailboxes"]["Row"]

// Metadata-only type for list view (excludes body_text for performance)
export type MessageListMetadata = Pick<
  Messages,
  "id" | "subject" | "ts" | "from_email" | "from_addresses" | "in_reply_to"
>

// Lists response types
export type ListsData = {
  data: Array<Pick<Mailboxes, "id" | "message_count">> | null
  error: Error | null
}

export type ListsDataSuccess = NonNullable<ListsData["data"]>
export type ListsDataError = ListsData["error"]

// List detail response types
export type ListDetail = Pick<Mailboxes, "id" | "message_count"> & {
  messages: MessageListMetadata[]
}

export type ListDetailData = {
  data: ListDetail | null
  error: Error | null
}

export type ListDetailDataSuccess = NonNullable<ListDetailData["data"]>
export type ListDetailDataError = ListDetailData["error"]
