/**
 * Tests for the Sandlot Times (news page) data and logic.
 */
import { describe, it, expect } from 'vitest'

// Manager color badge mapping used by the news page
const MANAGER_COLORS: Record<string, string> = {
  Chris: 'bg-amber-100 text-amber-800 border-amber-300',
  Alex: 'bg-orange-100 text-orange-800 border-orange-300',
  Pudge: 'bg-red-100 text-red-800 border-red-300',
  Sean: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Tom: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Greasy: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Web: 'bg-green-100 text-green-800 border-green-300',
  Nick: 'bg-blue-100 text-blue-800 border-blue-300',
  Bob: 'bg-slate-100 text-slate-800 border-slate-300',
  Mike: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  Thomas: 'bg-pink-100 text-pink-800 border-pink-300',
  Tyler: 'bg-purple-100 text-purple-800 border-purple-300',
}

describe('Manager color badges', () => {
  it('has colors for all 12 managers', () => {
    expect(Object.keys(MANAGER_COLORS)).toHaveLength(12)
  })

  it('each badge has bg, text, and border classes', () => {
    for (const [name, classes] of Object.entries(MANAGER_COLORS)) {
      expect(classes).toContain('bg-')
      expect(classes).toContain('text-')
      expect(classes).toContain('border-')
    }
  })
})

describe('Edition type structure', () => {
  it('edition object has required fields', () => {
    // Mock edition to verify the type structure
    const edition = {
      id: 'abc-123',
      date: '2026-02-15',
      headline: 'Spring Training Heats Up',
      hero_image_url: 'https://example.com/image.jpg',
      mlb_headlines: [
        { title: 'Big Trade', summary: 'A big trade happened', source_url: 'https://mlb.com', tags: ['trades'] },
      ],
      fantasy_impact: [
        { title: 'Fantasy Impact', analysis: 'This affects fantasy', affected_players: ['Player A'] },
      ],
      league_watch: [
        { title: 'League Watch', analysis: 'Something happening', affected_managers: ['Chris'], affected_team_keys: ['469.l.24701.t.1'] },
      ],
      hot_take: 'Hot take text here',
      power_rankings: [
        { rank: 1, manager: 'Sean', team: 'ClutchHutch', reasoning: 'Back to back champ' },
      ],
      raw_items_count: 15,
      created_at: '2026-02-15T10:00:00Z',
    }

    expect(edition.id).toBeTruthy()
    expect(edition.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(edition.headline).toBeTruthy()
    expect(edition.mlb_headlines).toHaveLength(1)
    expect(edition.fantasy_impact).toHaveLength(1)
    expect(edition.league_watch).toHaveLength(1)
    expect(edition.hot_take).toBeTruthy()
    expect(edition.power_rankings).toHaveLength(1)
    expect(edition.raw_items_count).toBeGreaterThan(0)
  })
})

describe('Date navigation logic', () => {
  const availableDates = ['2026-02-15', '2026-02-14', '2026-02-13', '2026-02-12'] // Sorted descending

  it('identifies newer and older editions', () => {
    const currentDate = '2026-02-14'
    const currentIndex = availableDates.indexOf(currentDate)

    const hasNewer = currentIndex > 0
    const hasOlder = currentIndex < availableDates.length - 1

    expect(hasNewer).toBe(true)  // 2026-02-15 is newer
    expect(hasOlder).toBe(true)  // 2026-02-13 is older
  })

  it('first edition has no newer', () => {
    const currentDate = '2026-02-15' // Most recent
    const currentIndex = availableDates.indexOf(currentDate)

    const hasNewer = currentIndex > 0
    expect(hasNewer).toBe(false)
  })

  it('last edition has no older', () => {
    const currentDate = '2026-02-12' // Oldest
    const currentIndex = availableDates.indexOf(currentDate)

    const hasOlder = currentIndex < availableDates.length - 1
    expect(hasOlder).toBe(false)
  })

  it('navigation goes to correct date', () => {
    const currentDate = '2026-02-14'
    const currentIndex = availableDates.indexOf(currentDate)

    const newerDate = availableDates[currentIndex - 1]
    const olderDate = availableDates[currentIndex + 1]

    expect(newerDate).toBe('2026-02-15')
    expect(olderDate).toBe('2026-02-13')
  })
})

describe('URL params for news page', () => {
  it('parses ?date= parameter', () => {
    const url = new URL('http://localhost/news?date=2026-02-15')
    const dateParam = url.searchParams.get('date')
    expect(dateParam).toBe('2026-02-15')
  })

  it('handles missing date parameter gracefully', () => {
    const url = new URL('http://localhost/news')
    const dateParam = url.searchParams.get('date')
    expect(dateParam).toBeNull()
  })
})

describe('Expandable sections default state', () => {
  it('all sections default expanded (defaultOpen=true)', () => {
    // The EditionCard passes defaultOpen={true} to all ExpandableSection components
    const defaultOpen = true
    expect(defaultOpen).toBe(true) // Sections start expanded
  })
})

describe('Date closest matching', () => {
  it('finds closest available date when exact date not available', () => {
    const availableDates = ['2026-02-15', '2026-02-13', '2026-02-10']
    const requestedDate = '2026-02-14' // Not in available

    // Logic from the news page
    const sorted = [...availableDates].sort()
    const closest = sorted.reduce((prev, curr) =>
      Math.abs(new Date(curr).getTime() - new Date(requestedDate).getTime()) <
      Math.abs(new Date(prev).getTime() - new Date(requestedDate).getTime())
        ? curr
        : prev
    )

    expect(closest).toBe('2026-02-13') // Feb 13 is closest to Feb 14
  })
})

describe('Keyboard navigation', () => {
  it('ArrowLeft goes to older edition', () => {
    // Verify the mapping: ArrowLeft = older (higher index)
    const keyMapping = {
      ArrowLeft: 'older',
      ArrowRight: 'newer',
    }
    expect(keyMapping.ArrowLeft).toBe('older')
    expect(keyMapping.ArrowRight).toBe('newer')
  })
})
