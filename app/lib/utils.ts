import { useRouter } from "next/router"
import { useMemo } from "react"

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}

export class NotFoundError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "NotFoundError"
  }
}
export class NotImplementedError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "NotImplementedError"
  }
}

export const DEFAULT_PAGE_SIZE = 20

export function getPagination(page?: number, size: number = DEFAULT_PAGE_SIZE) {
  const limit = size
  const from = page ? page * limit : 0
  const to = page ? from + size - 1 : size - 1

  return { from, to }
}

export function useParams() {
  const { query } = useRouter()

  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(query).map(([key, value]) => {
          if (Array.isArray(value)) {
            return [key, value[0]]
          } else {
            return [key, value]
          }
        })
      ),
    [query]
  )
}
