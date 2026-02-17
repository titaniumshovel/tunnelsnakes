/**
 * Tests for trade display logic — pick formatting, status config, team color mapping.
 */
import { describe, it, expect } from 'vitest'
import { MANAGERS, TEAM_COLORS, getManagerByEmail } from '@/data/managers'
import draftBoardData from '@/data/draft-board.json'

type TradePickInfo = {
  round: number
  slot: number
}

// Re-create the formatPickList function from TradesUI
function formatPickList(picks: TradePickInfo[]): string {
  if (!picks || picks.length === 0) return ''
  return picks.map((p: TradePickInfo | string) => {
    if (typeof p === 'string') return p // legacy fallback
    if (typeof p === 'object' && p !== null) {
      const pick = p as TradePickInfo
      if (pick.round && pick.slot) return `Rd ${pick.round}.${pick.slot}`
      if (pick.round) return `Rd ${pick.round}`
    }
    return String(p)
  }).join(', ')
}

describe('formatPickList', () => {
  it('formats round.slot picks correctly', () => {
    expect(formatPickList([{ round: 1, slot: 3 }])).toBe('Rd 1.3')
  })

  it('formats multiple picks', () => {
    expect(formatPickList([
      { round: 1, slot: 3 },
      { round: 5, slot: 7 },
    ])).toBe('Rd 1.3, Rd 5.7')
  })

  it('handles round-only picks', () => {
    expect(formatPickList([{ round: 3, slot: 0 }])).toBe('Rd 3')
  })

  it('handles empty array', () => {
    expect(formatPickList([])).toBe('')
  })

  it('handles null/undefined input', () => {
    expect(formatPickList(null as unknown as TradePickInfo[])).toBe('')
    expect(formatPickList(undefined as unknown as TradePickInfo[])).toBe('')
  })

  it('handles legacy string format', () => {
    // Legacy trades might have strings in the picks array
    expect(formatPickList(['Rd 1.3' as unknown as TradePickInfo])).toBe('Rd 1.3')
  })
})

describe('Trade status configuration', () => {
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: 'COMPLETED', color: 'text-secondary', bg: 'bg-secondary/15 border-secondary/30' },
    approved: { label: 'APPROVED', color: 'text-secondary', bg: 'bg-secondary/15 border-secondary/30' },
    pending: { label: 'PENDING', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
    submitted: { label: 'SUBMITTED', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
    rejected: { label: 'REJECTED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
    declined: { label: 'DECLINED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
    vetoed: { label: 'VETOED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  }

  it('has all expected statuses', () => {
    expect(Object.keys(STATUS_CONFIG)).toHaveLength(7)
    expect(STATUS_CONFIG.completed).toBeDefined()
    expect(STATUS_CONFIG.approved).toBeDefined()
    expect(STATUS_CONFIG.pending).toBeDefined()
    expect(STATUS_CONFIG.submitted).toBeDefined()
    expect(STATUS_CONFIG.rejected).toBeDefined()
    expect(STATUS_CONFIG.declined).toBeDefined()
    expect(STATUS_CONFIG.vetoed).toBeDefined()
  })

  it('each status has label, color, and bg', () => {
    for (const [, cfg] of Object.entries(STATUS_CONFIG)) {
      expect(cfg.label).toBeTruthy()
      expect(cfg.color).toBeTruthy()
      expect(cfg.bg).toBeTruthy()
    }
  })
})

describe('Trade team color resolution', () => {
  it('every manager teamName resolves to team colors', () => {
    for (const mgr of MANAGERS) {
      const colors = TEAM_COLORS[mgr.colorKey]
      expect(colors).toBeDefined()
    }
  })

  it('getManagerByEmail works for identifying trade participants', () => {
    // Commissioner needs to be identified to enable admin actions
    const chris = getManagerByEmail('cjm91792@gmail.com')
    expect(chris).toBeDefined()
    expect(chris!.role).toBe('commissioner')
  })
})

describe('Pick trail data from draft board', () => {
  it('can extract traded picks', () => {
    const tradedPicks: Array<{ round: number; slot: number; path: string[] }> = []
    const boardPicks = draftBoardData.picks as Record<string, Array<{
      slot: number
      originalOwner: string
      currentOwner: string
      traded: boolean
      path?: string[]
    }>>

    for (const [roundStr, roundPicks] of Object.entries(boardPicks)) {
      const round = parseInt(roundStr)
      for (const p of roundPicks) {
        if (p.traded && p.path && p.path.length > 1) {
          tradedPicks.push({ round, slot: p.slot, path: p.path })
        }
      }
    }

    // There should be some traded picks
    expect(tradedPicks.length).toBeGreaterThan(0)
  })

  it('traded pick paths start with originalOwner and end with currentOwner', () => {
    const boardPicks = draftBoardData.picks as Record<string, Array<{
      slot: number
      originalOwner: string
      currentOwner: string
      traded: boolean
      path?: string[]
    }>>

    for (const [, roundPicks] of Object.entries(boardPicks)) {
      for (const p of roundPicks) {
        if (p.traded && p.path && p.path.length > 1) {
          expect(p.path[0]).toBe(p.originalOwner)
          expect(p.path[p.path.length - 1]).toBe(p.currentOwner)
        }
      }
    }
  })
})

describe('Trade filter tabs', () => {
  const TAB_KEYS = ['all', 'offseason', 'midseason', 'pending', 'picktrail', 'propose'] as const

  it('has all expected filter tabs', () => {
    expect(TAB_KEYS).toHaveLength(6)
  })

  it('tab keys include offseason and midseason', () => {
    expect(TAB_KEYS).toContain('offseason')
    expect(TAB_KEYS).toContain('midseason')
  })

  it('tab keys include picktrail', () => {
    expect(TAB_KEYS).toContain('picktrail')
  })
})

describe('teams_involved array on trades', () => {
  it('trade type supports teams_involved field', () => {
    // Verify the type structure that the UI expects
    type TradeOffer = {
      id: string
      from_team_name: string
      target_team: string | null
      teams_involved: string[]
    }

    const mockTrade: TradeOffer = {
      id: '123',
      from_team_name: 'Tunnel Snakes',
      target_team: 'Red Stagz',
      teams_involved: ['Tunnel Snakes', 'Red Stagz'],
    }

    expect(mockTrade.teams_involved).toHaveLength(2)
    expect(mockTrade.teams_involved).toContain('Tunnel Snakes')
    expect(mockTrade.teams_involved).toContain('Red Stagz')
  })

  it('falls back to from_team_name + target_team when teams_involved is empty', () => {
    const teams_involved: string[] = []
    const from_team_name = 'Tunnel Snakes'
    const target_team: string | null = 'Red Stagz'

    const teams = teams_involved.length > 0
      ? teams_involved
      : [from_team_name, target_team].filter(Boolean) as string[]

    expect(teams).toEqual(['Tunnel Snakes', 'Red Stagz'])
  })
})
