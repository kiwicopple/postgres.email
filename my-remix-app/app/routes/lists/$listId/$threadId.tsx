import invariant from "tiny-invariant"
import { json } from "@remix-run/node"
import { Link, Outlet, useLoaderData } from "@remix-run/react"
import { getListDetail } from "~/models/list.server"
import type { LoaderFunction } from "@remix-run/node"

import type {
  ListDetailData,
  ListDetailDataSuccess,
  ListDetailDataError,
} from "~/models/list.server"

type LoaderData = {
  threadId: string
}

export const loader: LoaderFunction = async ({ params }) => {
  const { threadId } = params
  invariant(threadId, `params.threadId is required`)

  // ignore next line
  // @ts-ignore
  return json<ListDetailDataSuccess>({ threadId })
}

export default function Thread() {
  const { threadId } = useLoaderData() as LoaderData
  return <div>Selected {threadId}</div>
}
