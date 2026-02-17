/**
 * Tests for the managers data module — the source of truth for all team data.
 */
import { describe, it, expect } from 'vitest'
import {
  MANAGERS,
  TEAM_COLORS,
  getManagerBySlug,
  getManagerByEmail,
  getManagerByYahooTeamKey,
  getTeamColors,
} from '@/data/managers'

describe('MANAGERS data', () => {
  it('has exactly 12 managers', () => {
    expect(MANAGERS).toHaveLength(12)
  })

  it('every manager has required fields', () => {
    for (const m of MANAGERS) {
      expect(m.displayName).toBeTruthy()
      expect(m.teamName).toBeTruthy()
      expect(m.teamSlug).toBeTruthy()
      expect(['owner', 'commissioner']).toContain(m.role)
      expect(m.draftPosition).toBeGreaterThanOrEqual(1)
      expect(m.draftPosition).toBeLessThanOrEqual(12)
      expect(m.colorKey).toBeTruthy()
      expect(m.yahooTeamKey).toMatch(/^469\.l\.24701\.t\.\d+$/)
      expect(m.theme).toBeDefined()
      expect(m.theme.gradient).toBeTruthy()
      expect(m.theme.tagline).toBeTruthy()
      expect(m.theme.textColor).toBeTruthy()
    }
  })

  it('every manager has a unique teamSlug', () => {
    const slugs = MANAGERS.map(m => m.teamSlug)
    expect(new Set(slugs).size).toBe(12)
  })

  it('every manager has a unique draftPosition', () => {
    const positions = MANAGERS.map(m => m.draftPosition)
    expect(new Set(positions).size).toBe(12)
  })

  it('every manager has a unique yahooTeamKey', () => {
    const keys = MANAGERS.map(m => m.yahooTeamKey)
    expect(new Set(keys).size).toBe(12)
  })

  it('has exactly one commissioner (Chris)', () => {
    const commissioners = MANAGERS.filter(m => m.role === 'commissioner')
    expect(commissioners).toHaveLength(1)
    expect(commissioners[0].displayName).toBe('Chris')
  })

  it('all 12 team slugs are present', () => {
    const expectedSlugs = [
      'bleacher-creatures',
      'red-stagz',
      'lollygaggers',
      'goin-yahdgoats',
      'tylers-slugfest',
      'lake-monsters',
      'tunnel-snakes',
      'alex-in-chains',
      'greasy-cap-advisors',
      'runs-n-roses',
      'the-dirty-farm',
      'clutchhutch',
    ]
    const slugs = MANAGERS.map(m => m.teamSlug)
    for (const slug of expectedSlugs) {
      expect(slugs).toContain(slug)
    }
  })
})

describe('TEAM_COLORS', () => {
  it('has colors for all 12 colorKeys', () => {
    const colorKeys = MANAGERS.map(m => m.colorKey)
    for (const key of colorKeys) {
      expect(TEAM_COLORS[key]).toBeDefined()
      const c = TEAM_COLORS[key]
      expect(c.bg).toBeTruthy()
      expect(c.border).toBeTruthy()
      expect(c.text).toBeTruthy()
      expect(c.dot).toBeTruthy()
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('getManagerBySlug', () => {
  it('finds Tunnel Snakes by slug', () => {
    const m = getManagerBySlug('tunnel-snakes')
    expect(m).toBeDefined()
    expect(m!.displayName).toBe('Chris')
    expect(m!.teamName).toBe('Tunnel Snakes')
  })

  it('returns undefined for unknown slug', () => {
    expect(getManagerBySlug('fake-team')).toBeUndefined()
  })

  it('finds every team by its slug', () => {
    for (const mgr of MANAGERS) {
      expect(getManagerBySlug(mgr.teamSlug)).toBe(mgr)
    }
  })
})

describe('getManagerByEmail', () => {
  it('finds Chris by email', () => {
    const m = getManagerByEmail('cjm91792@gmail.com')
    expect(m).toBeDefined()
    expect(m!.displayName).toBe('Chris')
  })

  it('is case-insensitive', () => {
    const m = getManagerByEmail('CJM91792@GMAIL.COM')
    expect(m).toBeDefined()
    expect(m!.displayName).toBe('Chris')
  })

  it('returns undefined for unknown email', () => {
    expect(getManagerByEmail('nobody@example.com')).toBeUndefined()
  })
})

describe('getManagerByYahooTeamKey', () => {
  it('finds teams by yahoo key', () => {
    const m = getManagerByYahooTeamKey('469.l.24701.t.1')
    expect(m).toBeDefined()
    expect(m!.displayName).toBe('Chris')
  })

  it('returns undefined for unknown key', () => {
    expect(getManagerByYahooTeamKey('999.l.99999.t.1')).toBeUndefined()
  })
})

describe('getTeamColors', () => {
  it('returns colors for known key', () => {
    const c = getTeamColors('Chris')
    expect(c.hex).toBe('#f59e0b')
  })

  it('returns default colors for unknown key', () => {
    const c = getTeamColors('NonexistentTeam')
    expect(c.hex).toBe('#888')
  })
})
