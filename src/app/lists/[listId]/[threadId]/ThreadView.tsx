"use client"

import type { TreeItem } from "performant-array-to-tree"
import ThreadItem from "@/components/ThreadItem"

export default function ThreadView({ tree }: { tree: TreeItem }) {
  return (
    <ul className="flex flex-row whitespace-pre-wrap">
      {tree.data && (
        <ThreadItem tree={tree} level={0} markdown={false} />
      )}
    </ul>
  )
}
