import { describe, it, expect } from 'vitest'

const {
  parseArgs,
  buildMboxUrl,
  extractMailboxId,
  getMonthRange,
  parseYearMonth
} = require('../../../scripts/lib/config.js')

describe('parseArgs', () => {
  it('parses --lists argument', () => {
    const result = parseArgs(['--lists', 'pgsql-hackers,pgsql-general'])
    expect(result.lists).toEqual(['pgsql-hackers', 'pgsql-general'])
  })

  it('parses --from and --to arguments', () => {
    const result = parseArgs(['--from', '2024-01', '--to', '2024-06'])
    expect(result.from).toBe('2024-01')
    expect(result.to).toBe('2024-06')
  })

  it('parses --force flag', () => {
    const result = parseArgs(['--force'])
    expect(result.force).toBe(true)
  })

  it('parses --limit argument', () => {
    const result = parseArgs(['--limit', '100'])
    expect(result.limit).toBe(100)
  })

  it('parses --verbose flag', () => {
    const result = parseArgs(['--verbose'])
    expect(result.verbose).toBe(true)

    const result2 = parseArgs(['-v'])
    expect(result2.verbose).toBe(true)
  })

  it('handles empty args', () => {
    const result = parseArgs([])
    expect(result.lists).toBeNull()
    expect(result.from).toBeNull()
    expect(result.to).toBeNull()
    expect(result.force).toBe(false)
    expect(result.limit).toBeNull()
    expect(result.verbose).toBe(false)
  })

  it('handles combined arguments', () => {
    const result = parseArgs([
      '--lists', 'pgsql-hackers',
      '--from', '2024-01',
      '--to', '2024-12',
      '--force',
      '--verbose',
      '--limit', '50'
    ])
    expect(result.lists).toEqual(['pgsql-hackers'])
    expect(result.from).toBe('2024-01')
    expect(result.to).toBe('2024-12')
    expect(result.force).toBe(true)
    expect(result.verbose).toBe(true)
    expect(result.limit).toBe(50)
  })
})

describe('buildMboxUrl', () => {
  it('constructs correct URL for list and date', () => {
    expect(buildMboxUrl('pgsql-hackers', 2024, 1))
      .toBe('https://www.postgresql.org/list/pgsql-hackers/mbox/pgsql-hackers.202401')
  })

  it('pads single-digit months with zero', () => {
    expect(buildMboxUrl('pgsql-general', 2023, 5))
      .toBe('https://www.postgresql.org/list/pgsql-general/mbox/pgsql-general.202305')
  })

  it('handles double-digit months', () => {
    expect(buildMboxUrl('pgsql-bugs', 2024, 12))
      .toBe('https://www.postgresql.org/list/pgsql-bugs/mbox/pgsql-bugs.202412')
  })
})

describe('extractMailboxId', () => {
  it('extracts list name from full path', () => {
    expect(extractMailboxId('archives/pgsql-hackers/pgsql-hackers.202401'))
      .toBe('pgsql-hackers')
  })

  it('extracts list name from filename only', () => {
    expect(extractMailboxId('pgsql-general.202312'))
      .toBe('pgsql-general')
  })

  it('handles lists with multiple hyphens', () => {
    expect(extractMailboxId('pgsql-de-allgemein.202401'))
      .toBe('pgsql-de-allgemein')
  })

  it('returns basename for non-standard format', () => {
    expect(extractMailboxId('some-random-file'))
      .toBe('some-random-file')
  })
})

describe('parseYearMonth', () => {
  it('parses date string correctly', () => {
    expect(parseYearMonth('2024-01')).toEqual({ year: 2024, month: 1 })
    expect(parseYearMonth('2023-12')).toEqual({ year: 2023, month: 12 })
  })
})

describe('getMonthRange', () => {
  it('generates range within same year', () => {
    const range = getMonthRange('2024-01', '2024-03')
    expect(range).toEqual([
      { year: 2024, month: 1 },
      { year: 2024, month: 2 },
      { year: 2024, month: 3 }
    ])
  })

  it('generates range across years', () => {
    const range = getMonthRange('2023-11', '2024-02')
    expect(range).toEqual([
      { year: 2023, month: 11 },
      { year: 2023, month: 12 },
      { year: 2024, month: 1 },
      { year: 2024, month: 2 }
    ])
  })

  it('handles single month range', () => {
    const range = getMonthRange('2024-06', '2024-06')
    expect(range).toEqual([{ year: 2024, month: 6 }])
  })

  it('handles full year range', () => {
    const range = getMonthRange('2024-01', '2024-12')
    expect(range).toHaveLength(12)
    expect(range[0]).toEqual({ year: 2024, month: 1 })
    expect(range[11]).toEqual({ year: 2024, month: 12 })
  })
})
