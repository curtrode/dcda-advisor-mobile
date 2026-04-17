// Term resolution helpers. Keep this file free of Firestore imports so it
// can be imported by build-time scripts and unit-tested without mocks.

const SEASON_LABEL: Record<string, string> = { sp: 'Spring', su: 'Summer', fa: 'Fall' }
const SEASON_ORDER: Record<string, number> = { sp: 0, su: 1, fa: 2 }

// Conservative rollover dates — when a term is considered "over" and the
// UI should start pointing at the next instance of that season.
//   sp: ends May 10
//   su: ends Aug 15
//   fa: ends Dec 20
// Picking a term on the exact rollover boundary is fine; the subscription
// falls back to static data if the Firestore doc for the new term doesn't
// exist yet.
function seasonRolloverMonthDay(season: string): [number, number] | null {
  if (season === 'sp') return [4, 10]  // May 10
  if (season === 'su') return [7, 15]  // Aug 15
  if (season === 'fa') return [11, 20] // Dec 20
  return null
}

function yy(year: number): string {
  return String(year % 100).padStart(2, '0')
}

/** Builds an offerings_{season}{yy} doc ID for the given year. */
function offeringsId(season: 'sp' | 'su' | 'fa', year: number): string {
  return `offerings_${season}${yy(year)}`
}

/**
 * Returns the most-relevant offerings doc ID for the given season at time
 * `now`. If the current year's instance of that season has not yet ended,
 * uses it; otherwise rolls to next year. Used by student-facing hooks that
 * need a single "current" term to subscribe to.
 */
export function currentTermId(season: 'sp' | 'su' | 'fa', now: Date = new Date()): string {
  const rollover = seasonRolloverMonthDay(season)
  if (!rollover) throw new Error(`Unknown season: ${season}`)
  const [month, day] = rollover
  const year = now.getFullYear()
  const rolloverDate = new Date(year, month, day)
  const useNextYear = now > rolloverDate
  return offeringsId(season, useNextYear ? year + 1 : year)
}

/** Parses an offerings_{season}{yy} doc ID. Returns null if it does not match. */
export function parseTermId(
  docId: string
): { season: 'sp' | 'su' | 'fa'; year: number; label: string; sortKey: number } | null {
  const match = docId.match(/^offerings_(sp|su|fa)(\d{2})$/)
  if (!match) return null
  const season = match[1] as 'sp' | 'su' | 'fa'
  const yearShort = parseInt(match[2], 10)
  const year = 2000 + yearShort
  return {
    season,
    year,
    label: `${SEASON_LABEL[season]} ${year}`,
    sortKey: year * 10 + SEASON_ORDER[season],
  }
}

/** Sorts an array of offerings_* doc IDs chronologically. Non-matching IDs are dropped. */
export function sortOfferingIds(ids: string[]): string[] {
  return ids
    .map((id) => ({ id, parsed: parseTermId(id) }))
    .filter((x): x is { id: string; parsed: NonNullable<ReturnType<typeof parseTermId>> } => x.parsed !== null)
    .sort((a, b) => a.parsed.sortKey - b.parsed.sortKey)
    .map((x) => x.id)
}
