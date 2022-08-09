import { redirect } from "@remix-run/node"
import { formatMeta } from "~/lib/utils"
import type { MetaFunction } from "@remix-run/node"

export let meta: MetaFunction = () => {
  return formatMeta({
    title: "Postgres.email",
    description: "PostgreSQL Email Lists, with a more readable interface",
    "og:url": "https://postgres.email",
  })
}

export const loader = async () => {
  throw redirect("/lists/pgsql-hackers")
}
