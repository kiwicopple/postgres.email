import { json } from "@remix-run/node"
import { Link, Outlet, useLoaderData } from "@remix-run/react"

import { getLists } from "~/models/list.server"

type LoaderData = {
  lists: Awaited<ReturnType<typeof getLists>>
}

export const loader = async () => {
  return json<LoaderData>({
    lists: await getLists(),
  })
}

export default function Index() {
  const { lists } = useLoaderData() as LoaderData
  console.log(lists)
  return <div>Index</div>
}
