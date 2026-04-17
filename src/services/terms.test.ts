import { describe, it, expect } from 'vitest'
import { currentTermId, parseTermId, sortOfferingIds } from './terms'

describe('currentTermId(fa)', () => {
  it('uses current year when now is before Dec 20', () => {
    expect(currentTermId('fa', new Date(2026, 3, 17))).toBe('offerings_fa26')  // April
    expect(currentTermId('fa', new Date(2026, 7, 1))).toBe('offerings_fa26')   // before fall start
    expect(currentTermId('fa', new Date(2026, 10, 15))).toBe('offerings_fa26') // mid-fall
    expect(currentTermId('fa', new Date(2026, 11, 20))).toBe('offerings_fa26') // exactly Dec 20
  })

  it('rolls to next year after Dec 20', () => {
    expect(currentTermId('fa', new Date(2026, 11, 21))).toBe('offerings_fa27')
    expect(currentTermId('fa', new Date(2027, 0, 5))).toBe('offerings_fa27')  // Jan of next year
  })
})

describe('currentTermId(su)', () => {
  it('uses current year through Aug 15', () => {
    expect(currentTermId('su', new Date(2026, 0, 5))).toBe('offerings_su26')
    expect(currentTermId('su', new Date(2026, 7, 15))).toBe('offerings_su26')
  })

  it('rolls to next year after Aug 15', () => {
    expect(currentTermId('su', new Date(2026, 7, 16))).toBe('offerings_su27')
  })
})

describe('currentTermId(sp)', () => {
  it('rolls to next year after May 10', () => {
    expect(currentTermId('sp', new Date(2026, 4, 10))).toBe('offerings_sp26')
    expect(currentTermId('sp', new Date(2026, 4, 11))).toBe('offerings_sp27')
  })
})

describe('parseTermId', () => {
  it('parses offerings_fa26 into season, year, label, sortKey', () => {
    expect(parseTermId('offerings_fa26')).toEqual({
      season: 'fa',
      year: 2026,
      label: 'Fall 2026',
      sortKey: 2026 * 10 + 2,
    })
  })

  it('returns null for non-matching ids', () => {
    expect(parseTermId('courses')).toBeNull()
    expect(parseTermId('offerings_wi26')).toBeNull()
    expect(parseTermId('offerings_fa2026')).toBeNull()
  })

  it('sorts seasons within a year as spring < summer < fall', () => {
    const sp = parseTermId('offerings_sp27')!
    const su = parseTermId('offerings_su27')!
    const fa = parseTermId('offerings_fa27')!
    expect(sp.sortKey).toBeLessThan(su.sortKey)
    expect(su.sortKey).toBeLessThan(fa.sortKey)
  })
})

describe('sortOfferingIds', () => {
  it('sorts chronologically and drops non-offering ids', () => {
    const input = ['offerings_fa27', 'courses', 'offerings_sp26', 'offerings_fa26', 'requirements']
    expect(sortOfferingIds(input)).toEqual([
      'offerings_sp26',
      'offerings_fa26',
      'offerings_fa27',
    ])
  })
})
