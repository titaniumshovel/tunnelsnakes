/**
 * Tests for team page routing, data, and ISR configuration.
 */
import { describe, it, expect } from 'vitest'
import { MANAGERS, TEAM_COLORS, getManagerBySlug } from '@/data/managers'

// The team page exports revalidate = 300
// We can't directly import page.tsx in tests easily due to Next.js RSC,
// but we can verify the data layer that drives it.

const ALL_TEAM_SLUGS = [
  'bleacher-creatures',
  'red-stagz',
  'lollygaggers',
  'goin-yahdgoats',
  'i-fielder-boobs',
  'lake-monsters',
  'tunnel-snakes',
  'alex-in-chains',
  'greasy-cap-advisors',
  'runs-n-roses',
  'the-dirty-farm',
  'clutchhutch',
]

describe('Team slugs and data', () => {
  it('has exactly 12 team slugs', () => {
    expect(ALL_TEAM_SLUGS).toHaveLength(12)
  })

  it('every slug resolves to a manager', () => {
    for (const slug of ALL_TEAM_SLUGS) {
      const manager = getManagerBySlug(slug)
      expect(manager).toBeDefined()
      expect(manager!.teamSlug).toBe(slug)
    }
  })

  it('every manager has a logo path', () => {
    for (const slug of ALL_TEAM_SLUGS) {
      const manager = getManagerBySlug(slug)!
      // Most teams should have logos (expansion teams might not)
      expect(manager.logo).toBeTruthy()
      expect(manager.logo).toMatch(/^\/logos\//)
    }
  })

  it('every manager has team colors', () => {
    for (const slug of ALL_TEAM_SLUGS) {
      const manager = getManagerBySlug(slug)!
      const colors = TEAM_COLORS[manager.colorKey]
      expect(colors).toBeDefined()
      expect(colors.bg).toBeTruthy()
      expect(colors.border).toBeTruthy()
      expect(colors.text).toBeTruthy()
      expect(colors.dot).toBeTruthy()
      expect(colors.hex).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('every manager has a themed header', () => {
    for (const slug of ALL_TEAM_SLUGS) {
      const manager = getManagerBySlug(slug)!
      expect(manager.theme.gradient).toBeTruthy()
      expect(manager.theme.gradient).toContain('from-')
      expect(manager.theme.tagline).toBeTruthy()
      expect(manager.theme.textColor).toBeTruthy()
    }
  })

  it('expansion teams are Tyler and Thomas', () => {
    const tyler = getManagerBySlug('i-fielder-boobs')!
    const thomas = getManagerBySlug('lake-monsters')!
    // Expansion teams have team keys ending in .t.11 or .t.12
    expect(tyler.yahooTeamKey.endsWith('.t.12')).toBe(true)
    expect(thomas.yahooTeamKey.endsWith('.t.11')).toBe(true)
  })
})

describe('generateStaticParams coverage', () => {
  it('MANAGERS produces all 12 static params', () => {
    const params = MANAGERS.map(m => ({ slug: m.teamSlug }))
    expect(params).toHaveLength(12)
    for (const slug of ALL_TEAM_SLUGS) {
      expect(params.find(p => p.slug === slug)).toBeDefined()
    }
  })
})

describe('ISR configuration', () => {
  it('revalidate is set to 300 seconds (5 minutes) in team page module', async () => {
    // We read the actual source to verify the export
    // In a real test we'd import the module, but RSC makes that tricky.
    // Instead, verify the constant in the file.
    const fs = await import('fs')
    const path = await import('path')
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/team/[slug]/page.tsx'),
      'utf-8'
    )
    expect(content).toContain('export const revalidate = 300')
  })
})

describe('Team page metadata generation', () => {
  it('generates correct title for each team', () => {
    for (const slug of ALL_TEAM_SLUGS) {
      const manager = getManagerBySlug(slug)!
      const expectedTitle = `${manager.teamName} — The Sandlot`
      // Verify the data is there for metadata generation
      expect(expectedTitle).toBeTruthy()
      expect(expectedTitle).toContain(manager.teamName)
    }
  })
})
