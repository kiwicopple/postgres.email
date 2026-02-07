import React from "react"
import { parseTable, type ParsedTable } from "@/lib/code-detector"

interface TableBlockProps {
  tableLines: string[]
  keyPrefix: string
}

export function TableBlock({ tableLines, keyPrefix }: TableBlockProps) {
  const table = parseTable(tableLines)

  if (!table) {
    // If we can't parse it as a table, render as code
    return (
      <pre className="my-2 p-3 bg-gray-800 rounded text-xs text-gray-300 overflow-x-auto">
        <code>{tableLines.join("\n")}</code>
      </pre>
    )
  }

  // Check if this is a diff-style table
  const hasDiffMarkers = table.rows.some(row => row.diffType !== null)

  return (
    <div key={keyPrefix} className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-gray-600">
            {hasDiffMarkers && (
              <th className="px-2 py-2 text-left font-semibold text-gray-300 bg-gray-800 w-8"></th>
            )}
            {table.headers.map((header, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold text-gray-300 bg-gray-800"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => {
            const rowClass = row.diffType === 'added'
              ? 'border-b border-gray-700 bg-green-900/20'
              : row.diffType === 'removed'
              ? 'border-b border-gray-700 bg-red-900/20'
              : 'border-b border-gray-700 hover:bg-gray-800/50'

            return (
              <tr key={i} className={rowClass}>
                {hasDiffMarkers && (
                  <td className="px-2 py-2 text-center font-mono font-bold w-8">
                    {row.diffType === 'added' && (
                      <span className="text-green-400">+</span>
                    )}
                    {row.diffType === 'removed' && (
                      <span className="text-red-400">-</span>
                    )}
                  </td>
                )}
                {row.cells.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-300">
                    {cell}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
