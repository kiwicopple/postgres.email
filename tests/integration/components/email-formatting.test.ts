import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesPath = path.join(__dirname, '../fixtures/email-formatting.json')

// Import the fixtures
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8')).fixtures

// Copy the formatting logic from ThreadItem.tsx for testing
// This ensures we can test the logic independently of React rendering
const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
const urlPattern = /<?(https?:\/\/[^\s<>]+)>?/g
const boldPattern = /(\*\*|__)([^\*_]+)\1/g
// Italic: single * or _ not preceded/followed by another * or _
const italicPattern = /(?<!\*)\*(?!\*)([^\*]+?)\*(?!\*)|(?<!_)_(?!_)([^_]+?)_(?!_)/g

function extractLinks(text: string): string[] {
  const links: string[] = []
  const matches: Array<{ index: number; length: number; url: string }> = []

  // Find markdown links [text](url)
  markdownLinkPattern.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = markdownLinkPattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      url: match[2]
    })
  }

  // Find bare URLs and angle-bracket URLs, but skip those inside markdown links
  urlPattern.lastIndex = 0
  while ((match = urlPattern.exec(text)) !== null) {
    const isInMarkdownLink = matches.some(m =>
      match!.index >= m.index && match!.index < m.index + m.length
    )
    if (!isInMarkdownLink) {
      matches.push({
        index: match.index,
        length: match[0].length,
        url: match[1]
      })
    }
  }

  // Extract URLs in order
  matches.sort((a, b) => a.index - b.index)
  matches.forEach(m => links.push(m.url))

  return links
}

function extractBold(text: string): string[] {
  const bold: string[] = []
  boldPattern.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = boldPattern.exec(text)) !== null) {
    bold.push(match[2])
  }
  return bold
}

function extractItalic(text: string): string[] {
  const italic: string[] = []
  italicPattern.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = italicPattern.exec(text)) !== null) {
    // The pattern has two alternations, so text is in group 1 or 2
    const italicText = match[1] || match[2]
    if (italicText) {
      italic.push(italicText)
    }
  }
  return italic
}

interface ParsedContent {
  quotes: string[]
  codeBlocks: string[]
  links: string[]
  bold: string[]
  italic: string[]
  hasContent: boolean
}

function parseEmailContent(text: string | null): ParsedContent {
  if (!text) {
    return { quotes: [], codeBlocks: [], links: [], bold: [], italic: [], hasContent: false }
  }

  const lines = text.split('\n')
  const quotes: string[] = []
  const codeBlocks: string[] = []
  const links: string[] = []
  const bold: string[] = []
  const italic: string[] = []

  let currentQuote: string[] = []
  let currentCode: string[] = []
  let inFencedCode = false

  const indentPattern = /^(\t|    | {2,}(?=\S))/
  const isIndented = (l: string) => indentPattern.test(l) && l.trim().length > 0
  const stripIndent = (l: string) => l.replace(/^(\t|    | {2,})/, '')

  // Detect markdown fenced code blocks (```language or just ```)
  const isFenceMarker = (l: string) => l.trim().startsWith('```')

  // Detect PostgreSQL-style table lines (with pipes and optional leading space)
  const isTableLine = (l: string) => {
    const trimmed = l.trim()
    // Table separator line: ----+----+---- or ---------
    if (/^[-+]+$/.test(trimmed) && trimmed.length > 3) return true
    // Table content line: has pipes with content around them
    if (trimmed.includes('|') && /\w.*\|.*\w/.test(trimmed)) return true
    return false
  }

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      quotes.push(currentQuote.join('\n'))
      currentQuote = []
    }
  }

  const flushCode = () => {
    if (currentCode.length > 0) {
      codeBlocks.push(currentCode.join('\n'))
      currentCode = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const quoteMatch = line.match(/^(>[\s>]*)/)

    // Extract links, bold, and italic
    const lineLinks = extractLinks(line)
    links.push(...lineLinks)
    const lineBold = extractBold(line)
    bold.push(...lineBold)
    const lineItalic = extractItalic(line)
    italic.push(...lineItalic)

    // Handle fenced code blocks
    if (isFenceMarker(line)) {
      if (!inFencedCode) {
        // Starting a fenced code block
        flushQuote()
        flushCode()
        inFencedCode = true
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
      flushCode()
      currentQuote.push(line.replace(/^[>\s]+/, ''))
    } else if (isIndented(line) || isTableLine(line)) {
      flushQuote()
      // For table lines, keep original formatting (don't strip indent)
      currentCode.push(isTableLine(line) ? line : stripIndent(line))
    } else {
      flushQuote()
      if (line.trim() === '' && currentCode.length > 0) {
        let hasMoreCode = false
        for (let j = i + 1; j < lines.length; j++) {
          if (isIndented(lines[j]) || isTableLine(lines[j])) {
            hasMoreCode = true
            break
          }
          if (lines[j].trim() !== '') break
        }
        if (hasMoreCode) {
          currentCode.push('')
          continue
        }
      }
      flushCode()
    }
  }

  flushQuote()
  flushCode()

  return {
    quotes,
    codeBlocks,
    links,
    bold,
    italic,
    hasContent: text.trim().length > 0
  }
}

describe('Email Formatting - Fixtures', () => {
  describe('Regression Tests', () => {
    it('should load all fixtures', () => {
      expect(fixtures).toBeDefined()
      expect(fixtures.length).toBeGreaterThan(0)
    })

    fixtures.forEach((fixture: any) => {
      describe(`Fixture: ${fixture.name}`, () => {
        const parsed = parseEmailContent(fixture.body_text)

        it(`should parse without errors`, () => {
          expect(parsed).toBeDefined()
          expect(parsed).toHaveProperty('quotes')
          expect(parsed).toHaveProperty('codeBlocks')
          expect(parsed).toHaveProperty('links')
        })
      })
    })
  })

  describe('Code Block Detection', () => {
    it('should detect code block in codeblocks_and_links fixture', () => {
      const fixture = fixtures.find((f: any) => f.name === 'codeblocks_and_links')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBeGreaterThan(0)
      expect(parsed.codeBlocks[0]).toContain('case UNKNOWNOID:')
    })

    it('should detect tab-indented code', () => {
      const fixture = fixtures.find((f: any) => f.name === 'tab_indented_code')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('function test()')
    })

    it('should detect 4-space indented code', () => {
      const fixture = fixtures.find((f: any) => f.name === 'four_space_indented_code')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('if (condition)')
    })

    it('should detect 2-space indented code', () => {
      const fixture = fixtures.find((f: any) => f.name === 'two_space_indented_code')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('function add')
    })

    it('should preserve blank lines within code blocks', () => {
      const fixture = fixtures.find((f: any) => f.name === 'code_block_with_blank_lines')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('step_one()')
      expect(parsed.codeBlocks[0]).toContain('step_two()')
      // Should have blank lines preserved
      expect(parsed.codeBlocks[0].split('\n').length).toBeGreaterThan(3)
    })

    it('should detect SQL code blocks', () => {
      const fixture = fixtures.find((f: any) => f.name === 'sql_in_email')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('SELECT')
      expect(parsed.codeBlocks[0]).toContain('FROM users')
    })

    it('should detect patch/diff format', () => {
      const fixture = fixtures.find((f: any) => f.name === 'patch_diff_format')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('--- a/')
      expect(parsed.codeBlocks[0]).toContain('+++ b/')
    })

    it('should detect fenced code blocks with language', () => {
      const fixture = fixtures.find((f: any) => f.name === 'fenced_code_block')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('function calculateTotal')
      expect(parsed.codeBlocks[0]).toContain('reduce')
    })

    it('should detect fenced code blocks without language', () => {
      const fixture = fixtures.find((f: any) => f.name === 'fenced_code_block_no_language')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('SELECT * FROM users')
      expect(parsed.codeBlocks[0]).toContain('WHERE active = true')
    })

    it('should detect multiple fenced code blocks', () => {
      const fixture = fixtures.find((f: any) => f.name === 'multiple_fenced_code_blocks')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(2)
      expect(parsed.codeBlocks[0]).toContain('CREATE TABLE products')
      expect(parsed.codeBlocks[1]).toContain('SELECT * FROM products')
    })

    it('should handle both fenced and indented code blocks', () => {
      const fixture = fixtures.find((f: any) => f.name === 'mixed_fenced_and_indented')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.codeBlocks.length).toBe(2)
      expect(parsed.codeBlocks[0]).toContain('fenced')
      expect(parsed.codeBlocks[1]).toContain('indented')
    })
  })

  describe('Link Detection', () => {
    it('should detect links in codeblocks_and_links fixture', () => {
      const fixture = fixtures.find((f: any) => f.name === 'codeblocks_and_links')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBeGreaterThan(0)
      expect(parsed.links).toContain('https://www.postgresql.org/message-id/20070406175131.3FABF7FED85%40cvs.postgresql.org')
    })

    it('should detect simple URLs', () => {
      const fixture = fixtures.find((f: any) => f.name === 'simple_text_with_url')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBe(1)
      expect(parsed.links[0]).toBe('https://www.postgresql.org/docs/current/')
    })

    it('should detect URLs in angle brackets', () => {
      const fixture = fixtures.find((f: any) => f.name === 'url_in_angle_brackets')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBe(2)
      expect(parsed.links).toContain('https://github.com/postgres/postgres/pull/123')
      expect(parsed.links).toContain('https://www.example.com/docs')
    })

    it('should detect both http and https URLs', () => {
      const fixture = fixtures.find((f: any) => f.name === 'url_without_protocol')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBe(3)
      expect(parsed.links.some(l => l.startsWith('https://'))).toBe(true)
      expect(parsed.links.some(l => l.startsWith('http://'))).toBe(true)
    })

    it('should detect links in emails with fenced code blocks', () => {
      const fixture = fixtures.find((f: any) => f.name === 'fenced_with_markdown_links')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBeGreaterThan(0)
      expect(parsed.links.some(l => l.includes('example.com/docs'))).toBe(true)
      expect(parsed.codeBlocks.length).toBe(1)
      expect(parsed.codeBlocks[0]).toContain('pig repo set')
    })

    it('should detect simple markdown links', () => {
      const fixture = fixtures.find((f: any) => f.name === 'markdown_link_simple')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBe(1)
      expect(parsed.links[0]).toBe('https://www.postgresql.org/docs/')
    })

    it('should detect multiple markdown links', () => {
      const fixture = fixtures.find((f: any) => f.name === 'markdown_link_multiple')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBe(2)
      expect(parsed.links).toContain('https://api.example.com')
      expect(parsed.links).toContain('https://guide.example.com')
    })

    it('should detect both markdown links and bare URLs', () => {
      const fixture = fixtures.find((f: any) => f.name === 'markdown_mixed_with_bare_urls')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBe(3)
      expect(parsed.links).toContain('https://example.com')
      expect(parsed.links).toContain('https://blog.example.com')
      expect(parsed.links).toContain('https://docs.example.com')
    })

    it('should handle markdown links with special characters', () => {
      const fixture = fixtures.find((f: any) => f.name === 'markdown_link_with_special_chars')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.links.length).toBe(1)
      expect(parsed.links[0]).toContain('github.com/org/repo/commit/abc123')
      expect(parsed.links[0]).toContain('param=value')
    })

    it('should detect markdown links in quoted text', () => {
      const fixture = fixtures.find((f: any) => f.name === 'markdown_link_in_quoted_text')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.quotes.length).toBeGreaterThan(0)
      expect(parsed.links.length).toBe(1)
      expect(parsed.links[0]).toContain('lists.postgresql.org')
    })
  })

  describe('Markdown Text Formatting', () => {
    it('should detect bold text with double asterisks', () => {
      const fixture = fixtures.find((f: any) => f.name === 'bold_double_asterisk')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.bold.length).toBe(1)
      expect(parsed.bold[0]).toBe('PostgreSQL 13-18')
    })

    it('should detect bold text with double underscores', () => {
      const fixture = fixtures.find((f: any) => f.name === 'bold_double_underscore')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.bold.length).toBe(1)
      expect(parsed.bold[0]).toBe('important note')
    })

    it('should detect italic text with single asterisk', () => {
      const fixture = fixtures.find((f: any) => f.name === 'italic_single_asterisk')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.italic.length).toBe(1)
      expect(parsed.italic[0]).toBe('review carefully')
    })

    it('should detect italic text with single underscore', () => {
      const fixture = fixtures.find((f: any) => f.name === 'italic_single_underscore')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.italic.length).toBe(1)
      expect(parsed.italic[0]).toBe('emphasis')
    })

    it('should detect both bold and italic in same text', () => {
      const fixture = fixtures.find((f: any) => f.name === 'bold_and_italic')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.bold.length).toBe(1)
      expect(parsed.bold[0]).toBe('bold text')
      expect(parsed.italic.length).toBe(1)
      expect(parsed.italic[0]).toBe('italic text')
    })

    it('should detect multiple bold sections', () => {
      const fixture = fixtures.find((f: any) => f.name === 'multiple_bold')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.bold.length).toBe(2)
      expect(parsed.bold).toContain('First')
      expect(parsed.bold).toContain('second')
    })

    it('should detect bold, italic, and links together', () => {
      const fixture = fixtures.find((f: any) => f.name === 'bold_italic_links')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.bold.length).toBeGreaterThan(0)
      expect(parsed.bold[0]).toBe('PostgreSQL 13-18')
      expect(parsed.italic.length).toBeGreaterThan(0)
      expect(parsed.italic[0]).toBe('more details')
      expect(parsed.links.length).toBeGreaterThan(0)
      expect(parsed.links[0]).toBe('https://example.com')
    })

    it('should detect bold text in quoted sections', () => {
      const fixture = fixtures.find((f: any) => f.name === 'bold_in_quoted_text')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.quotes.length).toBeGreaterThan(0)
      expect(parsed.bold.length).toBeGreaterThan(0)
      expect(parsed.bold[0]).toBe('critical issue')
    })
  })

  describe('Quote Detection', () => {
    it('should detect quoted text', () => {
      const fixture = fixtures.find((f: any) => f.name === 'quoted_text')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.quotes.length).toBeGreaterThan(0)
      expect(parsed.quotes[0]).toContain('original message')
    })

    it('should handle nested quotes', () => {
      const fixture = fixtures.find((f: any) => f.name === 'nested_quotes')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.quotes.length).toBeGreaterThan(0)
      // Check that nested quote content is captured
      const allQuoteText = parsed.quotes.join(' ')
      expect(allQuoteText).toContain('good idea')
      expect(allQuoteText).toContain('this concern')
    })
  })

  describe('Mixed Content', () => {
    it('should handle emails with quotes, code, and links', () => {
      const fixture = fixtures.find((f: any) => f.name === 'mixed_content')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.quotes.length).toBeGreaterThan(0)
      expect(parsed.codeBlocks.length).toBeGreaterThan(0)
      expect(parsed.links.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null body text', () => {
      const fixture = fixtures.find((f: any) => f.name === 'empty_body')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.hasContent).toBe(false)
      expect(parsed.quotes.length).toBe(0)
      expect(parsed.codeBlocks.length).toBe(0)
      expect(parsed.links.length).toBe(0)
    })

    it('should handle whitespace-only content', () => {
      const fixture = fixtures.find((f: any) => f.name === 'only_whitespace')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.hasContent).toBe(false)
    })

    it('should handle multiple paragraphs', () => {
      const fixture = fixtures.find((f: any) => f.name === 'multiple_paragraphs')
      const parsed = parseEmailContent(fixture.body_text)

      expect(parsed.hasContent).toBe(true)
      // Should not be detected as code or quotes
      expect(parsed.codeBlocks.length).toBe(0)
      expect(parsed.quotes.length).toBe(0)
    })
  })

  describe('URL Pattern Matching', () => {
    it('should extract URL without angle brackets', () => {
      const links = extractLinks('Check out https://example.com for more info')
      expect(links).toEqual(['https://example.com'])
    })

    it('should extract URL with angle brackets', () => {
      const links = extractLinks('Link: <https://example.com>')
      expect(links).toEqual(['https://example.com'])
    })

    it('should extract multiple URLs', () => {
      const links = extractLinks('Visit https://site1.com and https://site2.com')
      expect(links).toEqual(['https://site1.com', 'https://site2.com'])
    })

    it('should handle URLs with paths and query strings', () => {
      const links = extractLinks('https://example.com/path?query=123&foo=bar')
      expect(links).toEqual(['https://example.com/path?query=123&foo=bar'])
    })

    it('should handle URLs with URL-encoded characters', () => {
      const text = 'https://www.postgresql.org/message-id/20070406175131.3FABF7FED85%40cvs.postgresql.org'
      const links = extractLinks(text)
      expect(links.length).toBe(1)
      expect(links[0]).toContain('%40')
    })

    it('should extract markdown links', () => {
      const links = extractLinks('Check the [docs](https://example.com) for info')
      expect(links).toEqual(['https://example.com'])
    })

    it('should extract multiple markdown links', () => {
      const links = extractLinks('See [site1](https://site1.com) and [site2](https://site2.com)')
      expect(links).toEqual(['https://site1.com', 'https://site2.com'])
    })

    it('should extract both markdown and bare URLs in order', () => {
      const links = extractLinks('Visit [docs](https://docs.com) or https://blog.com')
      expect(links).toEqual(['https://docs.com', 'https://blog.com'])
    })

    it('should not duplicate URLs in markdown links', () => {
      const links = extractLinks('[link](https://example.com)')
      expect(links.length).toBe(1)
      expect(links[0]).toBe('https://example.com')
    })
  })

  describe('Bold and Italic Pattern Matching', () => {
    it('should extract bold text with double asterisks', () => {
      const bold = extractBold('This is **bold** text')
      expect(bold).toEqual(['bold'])
    })

    it('should extract bold text with double underscores', () => {
      const bold = extractBold('This is __bold__ text')
      expect(bold).toEqual(['bold'])
    })

    it('should extract multiple bold sections', () => {
      const bold = extractBold('**First** and **second** bold')
      expect(bold).toEqual(['First', 'second'])
    })

    it('should extract italic text with single asterisk', () => {
      const italic = extractItalic('This is *italic* text')
      expect(italic).toEqual(['italic'])
    })

    it('should extract italic text with single underscore', () => {
      const italic = extractItalic('This is _italic_ text')
      expect(italic).toEqual(['italic'])
    })

    it('should not extract bold as italic', () => {
      const italic = extractItalic('This is **bold** not italic')
      expect(italic.length).toBe(0)
    })

    it('should extract both bold and italic from same text', () => {
      const text = '**bold** and *italic* together'
      const bold = extractBold(text)
      const italic = extractItalic(text)
      expect(bold).toEqual(['bold'])
      expect(italic).toEqual(['italic'])
    })
  })
})

describe('Email Formatting - Specific Test Cases', () => {
  it('should correctly parse the real-world pgsql-hackers email', () => {
    const fixture = fixtures.find((f: any) => f.id === '<CACJufxHu0sXO8791FDcNXp2bFnE89jyuGkJbLCQkhgWq6XuNLg@mail.gmail.com>')
    expect(fixture).toBeDefined()

    const parsed = parseEmailContent(fixture.body_text)

    // Should detect the error message as quoted or code
    expect(parsed.hasContent).toBe(true)

    // Should detect the C code block
    expect(parsed.codeBlocks.length).toBeGreaterThan(0)
    const codeContent = parsed.codeBlocks.join(' ')
    expect(codeContent).toContain('case UNKNOWNOID:')

    // Should detect the URLs
    expect(parsed.links.length).toBeGreaterThan(0)
    expect(parsed.links.some(l => l.includes('postgresql.org'))).toBe(true)
  })
})

describe('PostgreSQL Table Formatting', () => {
  describe('Table Detection', () => {
    it('should detect PostgreSQL table with separator line', () => {
      const fixture = fixtures.find((f: any) => f.name === 'decoupling_our_alignment_assumptions_about')
      expect(fixture).toBeDefined()

      const parsed = parseEmailContent(fixture.body_text)

      // Table should be detected as a code block to preserve formatting
      expect(parsed.codeBlocks.length).toBeGreaterThan(0)

      // Should contain table content
      const tableContent = parsed.codeBlocks.join('\n')
      expect(tableContent).toContain('typname')
      expect(tableContent).toContain('typlen')
      expect(tableContent).toContain('typalign')
    })

    it('should detect pg_stat_recovery table format', () => {
      const fixture = fixtures.find((f: any) => f.name === 'add_pgstatrecovery_system_view')
      expect(fixture).toBeDefined()

      const parsed = parseEmailContent(fixture.body_text)

      // Table should be detected as a code block
      expect(parsed.codeBlocks.length).toBeGreaterThan(0)

      const tableContent = parsed.codeBlocks.join('\n')
      expect(tableContent).toContain('promote_triggered')
      expect(tableContent).toContain('pause_state')
    })

    it('should handle tables inside quotes', () => {
      const fixture = fixtures.find((f: any) => f.name === 'postgres_table_in_quote')
      expect(fixture).toBeDefined()

      const parsed = parseEmailContent(fixture.body_text)

      // Should detect quotes with code/table content preserved
      expect(parsed.quotes.length).toBeGreaterThan(0)

      // The quoted content should include both the SQL and the table
      const quoteText = parsed.quotes.join('\n')
      expect(quoteText).toContain('SELECT')
      expect(quoteText).toContain('Alice')
    })

    it('should handle table without separator line', () => {
      const fixture = fixtures.find((f: any) => f.name === 'postgres_table_no_separator')
      expect(fixture).toBeDefined()

      const parsed = parseEmailContent(fixture.body_text)

      // Should still detect as code block
      expect(parsed.codeBlocks.length).toBeGreaterThan(0)

      const tableContent = parsed.codeBlocks.join('\n')
      expect(tableContent).toContain('column_name')
      expect(tableContent).toContain('data_type')
    })
  })

  describe('Real-World Regression Tests', () => {
    it('should correctly format email <1127261.1769649624@sss.pgh.pa.us>', () => {
      const fixture = fixtures.find((f: any) => f.id === '<1127261.1769649624@sss.pgh.pa.us>')
      expect(fixture).toBeDefined()

      const parsed = parseEmailContent(fixture.body_text)

      // Should detect the table as code
      expect(parsed.codeBlocks.length).toBeGreaterThan(0)

      // Table should be complete (not split)
      const allCode = parsed.codeBlocks.join('\n')
      expect(allCode).toContain('typname')
      expect(allCode).toContain('anyarray')
      expect(allCode).toContain('anyrange')
    })

    it('should correctly format email <CABPTF7W+Nody-+P9y4PNk37-QWuLpfUrEonHuEhrX+Vx9Kq+Kw@mail.gmail.com>', () => {
      const fixture = fixtures.find((f: any) => f.id === '<CABPTF7W+Nody-+P9y4PNk37-QWuLpfUrEonHuEhrX+Vx9Kq+Kw@mail.gmail.com>')
      expect(fixture).toBeDefined()

      const parsed = parseEmailContent(fixture.body_text)

      // Should detect the result table as code
      expect(parsed.codeBlocks.length).toBeGreaterThan(0)

      const allCode = parsed.codeBlocks.join('\n')
      expect(allCode).toContain('promote_triggered')
      expect(allCode).toContain('not paused')
      expect(allCode).toContain('---') // separator line
    })
  })
})
