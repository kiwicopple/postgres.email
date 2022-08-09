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

export function formatMeta(meta: Record<string, string>) {
  const descriptor: Record<string, string> = {
    title: "Postgres Email Lists",
    "og:site_name": "postgres-email",
    "og:type": "website",
  }

  for (const [key, value] of Object.entries(meta)) {
    if (!key || !value) {
      continue
    }

    switch (key) {
      case "title": {
        const title =
          value === descriptor["title"]
            ? descriptor["title"]
            : `${value} - ${descriptor["title"]}`

        descriptor["title"] = title
        descriptor["og:title"] = title
        descriptor["twitter:title"] = title
        break
      }
      case "description": {
        descriptor["description"] = value
        descriptor["og:description"] = value
        descriptor["twitter:description"] = value
        break
      }
      default: {
        descriptor[key] = value
        break
      }
    }
  }

  return descriptor
}
