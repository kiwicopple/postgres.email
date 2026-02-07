import type { Database } from "@/lib/database.types"

// Base message type from database
type Message = Database["public"]["Tables"]["messages"]["Row"]

// Thread message with thread_id
export type Thread = Message & {
  thread_id: string
}

// Thread data response types
export type ThreadData = {
  data: Thread[] | null
  error: Error | null
}

export type ThreadDataSuccess = NonNullable<Thread[]>
export type ThreadDataError = Error
