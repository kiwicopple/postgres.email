import { PostgrestError } from "@supabase/supabase-js"
import { useCallback } from "react"
import { useQuery, useQueryClient, UseQueryOptions } from "react-query"
import supabase from "../supabase"
import { NotFoundError, NotImplementedError } from "../utils"
import { definitions } from "../definitions"

export type Message = definitions["messages"]
export type Thread = Message & {
  thread_id: string
}

export async function getThread(
  id: string | undefined,
  signal?: AbortSignal
): Promise<{
  thread: Thread[]
}> {
  if (typeof id === "undefined") {
    throw new Error("Invalid ID")
  }

  let query = supabase.from<Thread>("threads").select(`*`).eq("thread_id", id)

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Message not found")
  }

  return { thread: data }
}

export type ThreadData = Awaited<ReturnType<typeof getThread>>
export type ThreadError = PostgrestError | NotFoundError | NotImplementedError

export const useThreadQuery = (
  id: string | undefined,
  { enabled = true, ...options }: UseQueryOptions<ThreadData, ThreadError> = {}
) => {
  const _enabled = enabled && typeof id !== "undefined"

  const { isLoading, isIdle, ...rest } = useQuery<ThreadData, ThreadError>(
    ["thread", id],
    ({ signal }) => getThread(id, signal),
    {
      enabled: _enabled,
      // we're increasing the staleTime to 5 minutes here as we're the data doesn't change often
      staleTime: 300000,
      ...options,
    }
  )

  // fake the loading state if we're not enabled
  return {
    isLoading: (!_enabled && isIdle) || isLoading,
    isIdle,
    ...rest,
  }
}

export const useThreadPrefetch = (id: string | undefined) => {
  const client = useQueryClient()
  return useCallback(() => {
    if (id) {
      client.prefetchQuery(["thread", id], ({ signal }) =>
        getThread(id, signal)
      )
    }
  }, [id])
}
