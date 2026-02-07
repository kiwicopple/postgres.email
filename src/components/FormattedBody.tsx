"use client"

import React from "react"
import { linkify } from "@/lib/markdown-parser"
import {
  isIndented,
  stripIndent,
  isFenceMarker,
  isSqlStatement,
  isTableLine,
  isPsqlRowCount
} from "@/lib/code-detector"
import { QuoteBlock, CodeBlock, TableBlock } from "./FormattedBody/"

interface FormattedBodyProps {
  text: string | null
}

export default function FormattedBody({ text }: FormattedBodyProps) {
  if (!text) return null

  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let currentQuote: string[] = []
  let quoteDepth = 0
  let currentCode: string[] = []
  let currentTable: string[] = []
  let inFencedCode = false
  let inSqlBlock = false

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      elements.push(
        <QuoteBlock
          key={`q-${elements.length}`}
          lines={currentQuote}
          keyPrefix={`q-${elements.length}`}
        />
      )
      currentQuote = []
      quoteDepth = 0
    }
  }

  const flushCode = () => {
    if (currentCode.length > 0) {
      elements.push(
        <CodeBlock
          key={`c-${elements.length}`}
          code={currentCode}
          keyPrefix={`c-${elements.length}`}
        />
      )
      currentCode = []
    }
  }

  const flushTable = (tableLines: string[]) => {
    elements.push(
      <TableBlock
        key={`t-${elements.length}`}
        tableLines={tableLines}
        keyPrefix={`t-${elements.length}`}
      />
    )
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const quoteMatch = line.match(/^(>[\s>]*)/)

    // Handle fenced code blocks
    if (isFenceMarker(line)) {
      if (!inFencedCode) {
        // Starting a fenced code block
        flushQuote()
        if (currentTable.length > 0) {
          flushTable(currentTable)
          currentTable = []
        }
        flushCode()
        inFencedCode = true
        inSqlBlock = false
      } else {
        // Ending a fenced code block
        inFencedCode = false
        flushCode()
      }
      continue
    }

    // If we're inside a fenced code block, collect all lines
    if (inFencedCode) {
      currentCode.push(line)
      continue
    }

    if (quoteMatch) {
      if (currentTable.length > 0) {
        flushTable(currentTable)
        currentTable = []
      }
      flushCode()
      inSqlBlock = false
      const depth = (line.match(/>/g) || []).length
      if (currentQuote.length > 0 && depth !== quoteDepth) {
        flushQuote()
      }
      quoteDepth = depth
      currentQuote.push(line.replace(/^[>\s]+/, ""))
    } else if (isTableLine(line) && !inSqlBlock) {
      flushQuote()
      flushCode()
      currentTable.push(line)
    } else if (
      isIndented(line) ||
      isSqlStatement(line) ||
      (inSqlBlock && (line.trim().length > 0 || isTableLine(line) || isPsqlRowCount(line)))
    ) {
      flushQuote()
      if (currentTable.length > 0) {
        flushTable(currentTable)
        currentTable = []
      }
      // Start SQL block if this line is a SQL statement
      if (isSqlStatement(line)) {
        inSqlBlock = true
      }
      // When in SQL block, include table lines and row counts as part of the code block
      if (inSqlBlock && (isTableLine(line) || isPsqlRowCount(line))) {
        currentCode.push(line)
      } else {
        currentCode.push(isIndented(line) ? stripIndent(line) : line)
      }
      // Don't immediately end SQL block at semicolon - let it continue for psql output
    } else {
      flushQuote()
      // End SQL block when we hit non-code content
      if (inSqlBlock) {
        inSqlBlock = false
      }
      // If we're in a table and hit a blank line, check if more table follows
      if (line.trim() === "" && currentTable.length > 0) {
        let hasMoreTable = false
        for (let j = i + 1; j < lines.length; j++) {
          if (isTableLine(lines[j])) {
            hasMoreTable = true
            break
          }
          if (lines[j].trim() !== "") break
        }
        if (hasMoreTable) {
          currentTable.push("")
          continue
        }
      }
      // If we're in a code block and hit a blank line, check if more code follows
      if (line.trim() === "" && currentCode.length > 0) {
        let hasMoreCode = false
        for (let j = i + 1; j < lines.length; j++) {
          if (isIndented(lines[j]) || isSqlStatement(lines[j])) {
            hasMoreCode = true
            break
          }
          if (lines[j].trim() !== "") break
        }
        if (hasMoreCode) {
          currentCode.push("")
          continue
        }
      }
      if (currentTable.length > 0) {
        flushTable(currentTable)
        currentTable = []
      }
      flushCode()
      if (line.trim() === "") {
        elements.push(<div key={`br-${i}`} className="h-3" />)
      } else {
        elements.push(
          <span key={`l-${i}`}>
            {linkify(line, `l-${i}`)}
            <br />
          </span>
        )
      }
    }
  }
  flushQuote()
  if (currentTable.length > 0) {
    flushTable(currentTable)
  }
  flushCode()

  return <>{elements}</>
}
