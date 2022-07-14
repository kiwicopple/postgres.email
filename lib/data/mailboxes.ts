import { PostgrestError } from "@supabase/supabase-js"
import { useCallback } from "react"
import { useQuery, useQueryClient, UseQueryOptions } from "react-query"
import supabase from "../supabase"
import { NotFoundError, NotImplementedError } from "../utils"
import { definitions } from "../definitions"

export type Mailbox = definitions["mailboxes"]
export type Messages = definitions["messages"]
export type MailboxWithMessages = Mailbox & {
  messages: Messages[]
}

/* Get Mailboxes */

export async function getMailboxes(signal?: AbortSignal): Promise<{
  mailboxes: Mailbox[]
}> {
  let query = supabase.from<Mailbox>("mailboxes").select(`*`)

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Mailboxes not found")
  }

  return { mailboxes: data }
}

export type MailboxesData = Awaited<ReturnType<typeof getMailboxes>>
export type MailboxesError =
  | PostgrestError
  | NotFoundError
  | NotImplementedError

export const useMailboxesQuery = (
  options?: UseQueryOptions<MailboxesData, MailboxesError>
) =>
  useQuery<MailboxesData, MailboxesError>(
    ["mailboxes"],
    ({ signal }) => getMailboxes(signal),
    options
  )

export const useMailboxesPrefetch = () => {
  const client = useQueryClient()
  return useCallback(() => {
    client.prefetchQuery(["mailboxes"], ({ signal }) => getMailboxes(signal))
  }, [])
}

/* Get Mailbox */

export async function getMailbox(
  id: string | undefined,
  signal?: AbortSignal
): Promise<{
  mailbox: MailboxWithMessages
}> {
  if (typeof id === "undefined") {
    throw new Error("Invalid ID")
  }

  let query = supabase
    .from<MailboxWithMessages>("mailboxes")
    .select(`*,messages(*)`)
    .eq("id", id)

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new NotFoundError("Mailbox not found")
  }

  return { mailbox: data }
}

export type MailboxData = Awaited<ReturnType<typeof getMailbox>>
export type MailboxError = PostgrestError | NotFoundError | NotImplementedError

export const useMailboxQuery = (
  id: string | undefined,
  {
    enabled = true,
    ...options
  }: UseQueryOptions<MailboxData, MailboxError> = {}
) => {
  const _enabled = enabled && typeof id !== "undefined"

  const { isLoading, isIdle, ...rest } = useQuery<MailboxData, MailboxError>(
    ["mailbox", id],
    ({ signal }) => getMailbox(id, signal),
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

export const useMailboxPrefetch = (id: string | undefined) => {
  const client = useQueryClient()
  return useCallback(() => {
    if (id) {
      client.prefetchQuery(["mailbox", id], ({ signal }) =>
        getMailbox(id, signal)
      )
    }
  }, [id])
}
