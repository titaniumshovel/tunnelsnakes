/**
 * Tests for the History page data — champions, all-time standings, season data.
 */
import { describe, it, expect } from 'vitest'

import standings2020 from '@/data/historical/standings-2020.json'
import standings2021 from '@/data/historical/standings-2021.json'
import standings2022 from '@/data/historical/standings-2022.json'
import standings2023 from '@/data/historical/standings-2023.json'
import standings2024 from '@/data/historical/standings-2024.json'
import standings2025 from '@/data/historical/standings-2025.json'

import drafts2020 from '@/data/historical/drafts-2020.json'
import drafts2021 from '@/data/historical/drafts-2021.json'
import drafts2022 from '@/data/historical/drafts-2022.json'
import drafts2023 from '@/data/historical/drafts-2023.json'
import drafts2024 from '@/data/historical/drafts-2024.json'
import drafts2025 from '@/data/historical/drafts-2025.json'

const ALL_STANDINGS = [standings2020, standings2021, standings2022, standings2023, standings2024, standings2025]
const ALL_DRAFTS = [drafts2020, drafts2021, drafts2022, drafts2023, drafts2024, drafts2025]

describe('Historical standings data', () => {
  it('has 6 seasons (2020-2025)', () => {
    expect(ALL_STANDINGS).toHaveLength(6)
    const years = ALL_STANDINGS.map(s => s.year)
    expect(years).toEqual([2020, 2021, 2022, 2023, 2024, 2025])
  })

  it('each season has correct champion data', () => {
    const expected: Record<number, { champion: string; team: string }> = {
      2020: { champion: 'Nick', team: 'Red Stagz' },
      2021: { champion: 'Chris', team: 'Tunnel Snakes' },
      2022: { champion: 'Bob', team: 'Runs-N-Roses' },
      2023: { champion: 'Chris', team: 'Tunnel Snakes' },
      2024: { champion: 'Sean', team: 'ClutchHutch' },
      2025: { champion: 'Sean', team: 'ClutchHutch' },
    }
    for (const season of ALL_STANDINGS) {
      const exp = expected[season.year]
      expect(season.champion).toBe(exp.champion)
      expect(season.championTeam).toBe(exp.team)
    }
  })

  it('each season has 10 teams in standings', () => {
    for (const season of ALL_STANDINGS) {
      expect(season.standings).toHaveLength(10)
    }
  })

  it('each standings entry has required fields', () => {
    for (const season of ALL_STANDINGS) {
      for (const entry of season.standings) {
        expect(entry.rank).toBeGreaterThanOrEqual(1)
        expect(entry.rank).toBeLessThanOrEqual(10)
        expect(entry.team).toBeTruthy()
        expect(entry.teamName).toBeTruthy()
        expect(typeof entry.wins).toBe('number')
        expect(typeof entry.losses).toBe('number')
        expect(typeof entry.ties).toBe('number')
      }
    }
  })

  it('each season has runner-up and third-place', () => {
    for (const season of ALL_STANDINGS) {
      expect(season.runnerUp).toBeTruthy()
      expect(season.runnerUpTeam).toBeTruthy()
      expect(season.third).toBeTruthy()
      expect(season.thirdTeam).toBeTruthy()
    }
  })
})

describe('All-time standings computation', () => {
  const ORIGINAL_MANAGERS = ['Chris', 'Alex', 'Pudge', 'Sean', 'Tom', 'Greasy', 'Web', 'Nick', 'Bob', 'Mike']

  type ManagerRecord = {
    manager: string
    wins: number
    losses: number
    ties: number
    titles: number
  }

  function computeAllTimeStandings(): ManagerRecord[] {
    const records: Record<string, ManagerRecord> = {}
    for (const m of ORIGINAL_MANAGERS) {
      records[m] = { manager: m, wins: 0, losses: 0, ties: 0, titles: 0 }
    }
    for (const season of ALL_STANDINGS) {
      if (records[season.champion]) {
        records[season.champion].titles++
      }
      for (const entry of season.standings) {
        if (records[entry.team]) {
          records[entry.team].wins += entry.wins
          records[entry.team].losses += entry.losses
          records[entry.team].ties += entry.ties
        }
      }
    }
    return Object.values(records).sort((a, b) => {
      const totalA = a.wins + a.losses + a.ties
      const totalB = b.wins + b.losses + b.ties
      const pctA = totalA > 0 ? (a.wins + a.ties * 0.5) / totalA : 0
      const pctB = totalB > 0 ? (b.wins + b.ties * 0.5) / totalB : 0
      return pctB - pctA
    })
  }

  it('computes standings for all 10 original managers', () => {
    const standings = computeAllTimeStandings()
    expect(standings).toHaveLength(10)
  })

  it('every manager has played games', () => {
    const standings = computeAllTimeStandings()
    for (const m of standings) {
      const total = m.wins + m.losses + m.ties
      expect(total).toBeGreaterThan(0)
    }
  })

  it('Chris and Sean have 2 titles each (most titles)', () => {
    const standings = computeAllTimeStandings()
    const chris = standings.find(m => m.manager === 'Chris')!
    const sean = standings.find(m => m.manager === 'Sean')!
    expect(chris.titles).toBe(2)
    expect(sean.titles).toBe(2)
  })

  it('Nick and Bob have 1 title each', () => {
    const standings = computeAllTimeStandings()
    expect(standings.find(m => m.manager === 'Nick')!.titles).toBe(1)
    expect(standings.find(m => m.manager === 'Bob')!.titles).toBe(1)
  })

  it('managers without titles have 0', () => {
    const standings = computeAllTimeStandings()
    const noTitles = standings.filter(m => !['Chris', 'Sean', 'Nick', 'Bob'].includes(m.manager))
    for (const m of noTitles) {
      expect(m.titles).toBe(0)
    }
  })

  it('win percentages are between 0 and 1', () => {
    const standings = computeAllTimeStandings()
    for (const m of standings) {
      const total = m.wins + m.losses + m.ties
      const pct = (m.wins + m.ties * 0.5) / total
      expect(pct).toBeGreaterThan(0)
      expect(pct).toBeLessThanOrEqual(1)
    }
  })
})

describe('Historical draft data', () => {
  it('has 6 seasons of draft data', () => {
    expect(ALL_DRAFTS).toHaveLength(6)
  })

  it('each draft has picks with required fields', () => {
    for (const draft of ALL_DRAFTS) {
      expect(draft.year).toBeTruthy()
      expect(draft.picks).toBeDefined()
      expect(Array.isArray(draft.picks)).toBe(true)
      expect(draft.picks.length).toBeGreaterThan(0)

      // Check first pick structure
      const pick = draft.picks[0]
      expect(pick.pick).toBeDefined()
      expect(pick.round).toBeDefined()
      expect(pick.player).toBeTruthy()
      expect(pick.team).toBeTruthy()
    }
  })

  it('each draft has round 1 picks', () => {
    for (const draft of ALL_DRAFTS) {
      const rd1 = draft.picks.filter(p => p.round === 1)
      expect(rd1.length).toBeGreaterThanOrEqual(10) // At least 10 teams
    }
  })
})
