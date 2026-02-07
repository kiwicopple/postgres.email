import React from "react"

interface CodeBlockProps {
  code: string[]
  keyPrefix: string
}

export function CodeBlock({ code, keyPrefix }: CodeBlockProps) {
  const codeText = code.join("\n")

  return (
    <pre
      key={keyPrefix}
      className="my-2 p-3 bg-gray-800 rounded text-xs text-gray-300 overflow-x-auto"
    >
      <code>{codeText}</code>
    </pre>
  )
}
