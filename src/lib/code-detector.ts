import { SQL_KEYWORDS, INDENT_PATTERN, FENCE_MARKER_PATTERN, TABLE_LINE_PATTERN } from "./constants"

/**
 * Checks if a line is indented (tab, 4+ spaces, or 2+ spaces before content)
 */
export function isIndented(line: string): boolean {
  return INDENT_PATTERN.test(line) && line.trim().length > 0
}

/**
 * Strips leading indentation from a line
 */
export function stripIndent(line: string): string {
  return line.replace(/^(\t|    | {2,})/, "")
}

/**
 * Checks if a line is a markdown fenced code block marker (```)
 */
export function isFenceMarker(line: string): boolean {
  return line.trim().startsWith("```")
}

/**
 * Checks if a line is a SQL statement
 */
export function isSqlStatement(line: string): boolean {
  const trimmed = line.trim()
  return SQL_KEYWORDS.some(
    keyword =>
      trimmed.startsWith(keyword + ' ') ||
      trimmed === keyword ||
      trimmed.startsWith(keyword + '(')
  )
}

/**
 * Checks if a line is part of a PostgreSQL-style table
 */
export function isTableLine(line: string): boolean {
  const trimmed = line.trim()
  // Table separator line: ----+----+---- or ---------
  if (/^[-+]+$/.test(trimmed) && trimmed.length > 3) return true
  // Table content line: has pipes with content around them
  if (trimmed.includes("|") && /\w.*\|.*\w/.test(trimmed)) return true
  return false
}

/**
 * Checks if a line is a psql row count line like "(1 row)" or "(5 rows)"
 */
export function isPsqlRowCount(line: string): boolean {
  const trimmed = line.trim()
  return /^\(\d+\s+rows?\)$/.test(trimmed)
}

export interface TableRow {
  cells: string[]
  diffType: 'added' | 'removed' | null
}

export interface ParsedTable {
  headers: string[]
  rows: TableRow[]
}

/**
 * Parses table lines into a structured table format
 */
export function parseTable(tableLines: string[]): ParsedTable | null {
  if (tableLines.length < 2) return null

  // Remove empty lines and find separator line
  const nonEmptyLines = tableLines.filter(l => l.trim().length > 0)
  const separatorIndex = nonEmptyLines.findIndex(l => /^[-+]+$/.test(l.trim()))

  if (separatorIndex === -1 || separatorIndex === 0) return null

  // Header is before separator, rows are after
  const headerLine = nonEmptyLines[separatorIndex - 1]
  const rowLines = nonEmptyLines.slice(separatorIndex + 1)

  // Parse header
  const headers = headerLine
    .split("|")
    .map(h => h.trim())
    .filter(h => h.length > 0)

  // Parse rows and detect diff markers
  const rows: TableRow[] = rowLines.map(line => {
    const trimmed = line.trim()
    const diffType = trimmed.startsWith('+') ? 'added' :
                     trimmed.startsWith('-') ? 'removed' : null

    // If line starts with +/-, remove it before parsing
    const cleanLine = diffType ? trimmed.slice(1) : line

    const cells = cleanLine
      .split("|")
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)

    return { cells, diffType }
  })

  return { headers, rows }
}
