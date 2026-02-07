/**
 * Application-wide constants
 */

// Cache revalidation interval in seconds
export const REVALIDATE_INTERVAL = 60

// SQL keywords for code block detection
export const SQL_KEYWORDS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
  'TRUNCATE', 'GRANT', 'REVOKE', 'WITH', 'EXPLAIN', 'ANALYZE',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'FROM', 'WHERE', 'ORDER', 'GROUP',
  'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
  'OUTER', 'ON', 'UNION', 'INTERSECT', 'EXCEPT', 'SET', 'VALUES',
  'INTO', 'AS', 'AND', 'OR'
] as const

// Date formatting options
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
}

// Regex patterns for markdown formatting
export const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
export const URL_PATTERN = /<?(https?:\/\/[^\s<>]+)>?/g
export const BOLD_PATTERN = /(\*\*|__)([^\*_]+)\1/g
export const ITALIC_PATTERN = /(?<!\*)\*(?!\*)([^\*]+?)\*(?!\*)|(?<!_)_(?!_)([^_]+?)_(?!_)/g

// Code block patterns
export const INDENT_PATTERN = /^(\t|    | {2,}(?=\S))/
export const FENCE_MARKER_PATTERN = /^```/
export const TABLE_LINE_PATTERN = /^[-+]+$|(\w.*\|.*\w)/
