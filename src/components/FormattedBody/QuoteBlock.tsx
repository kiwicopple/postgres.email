import React from "react"
import { linkify } from "@/lib/markdown-parser"

interface QuoteBlockProps {
  lines: string[]
  keyPrefix: string
}

export function QuoteBlock({ lines, keyPrefix }: QuoteBlockProps) {
  return (
    <blockquote className="border-l-2 border-gray-600 pl-3 my-2 text-gray-400 text-xs">
      {lines.map((line, i) => (
        <span key={i}>
          {linkify(line, `${keyPrefix}-${i}`)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </blockquote>
  )
}
