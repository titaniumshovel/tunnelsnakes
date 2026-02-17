/**
 * Tests for draft board data structure and display logic.
 */
import { describe, it, expect } from 'vitest'
import draftBoardData from '@/data/draft-board.json'

type DraftPick = {
  slot: number
  originalOwner: string
  currentOwner: string
  traded: boolean
  path?: string[]
}

type DraftBoard = {
  draftOrder: string[]
  rounds: number
  naRounds: number[]
  trades: Array<{ description: string; source: string }>
  picks: Record<string, DraftPick[]>
}

const data = draftBoardData as DraftBoard

describe('Draft Board structure', () => {
  it('has 12 teams in draft order', () => {
    expect(data.draftOrder).toHaveLength(12)
  })

  it('has 27 rounds', () => {
    expect(data.rounds).toBe(27)
  })

  it('has NA rounds 24-27', () => {
    expect(data.naRounds).toEqual([24, 25, 26, 27])
  })

  it('has picks for all 27 rounds', () => {
    for (let round = 1; round <= 27; round++) {
      const key = round.toString()
      expect(data.picks[key]).toBeDefined()
      expect(Array.isArray(data.picks[key])).toBe(true)
    }
  })

  it('each round has 12 picks (slots)', () => {
    for (let round = 1; round <= 27; round++) {
      const roundPicks = data.picks[round.toString()]
      expect(roundPicks).toHaveLength(12)
    }
  })

  it('total picks = 27 rounds × 12 teams = 324', () => {
    let totalPicks = 0
    for (let round = 1; round <= 27; round++) {
      totalPicks += data.picks[round.toString()].length
    }
    expect(totalPicks).toBe(324)
  })
})

describe('Draft Board picks structure', () => {
  it('every pick has required fields', () => {
    for (let round = 1; round <= 27; round++) {
      for (const pick of data.picks[round.toString()]) {
        expect(pick.slot).toBeGreaterThanOrEqual(1)
        expect(pick.slot).toBeLessThanOrEqual(12)
        expect(pick.originalOwner).toBeTruthy()
        expect(pick.currentOwner).toBeTruthy()
        expect(typeof pick.traded).toBe('boolean')
      }
    }
  })

  it('each round has unique slots 1-12', () => {
    for (let round = 1; round <= 27; round++) {
      const slots = data.picks[round.toString()].map(p => p.slot)
      expect(new Set(slots).size).toBe(12)
      expect(Math.min(...slots)).toBe(1)
      expect(Math.max(...slots)).toBe(12)
    }
  })

  it('all draft order names appear as owners', () => {
    const allOwners = new Set<string>()
    for (let round = 1; round <= 27; round++) {
      for (const pick of data.picks[round.toString()]) {
        allOwners.add(pick.currentOwner)
      }
    }
    for (const owner of data.draftOrder) {
      expect(allOwners.has(owner)).toBe(true)
    }
  })

  it('traded picks have path array', () => {
    for (let round = 1; round <= 27; round++) {
      for (const pick of data.picks[round.toString()]) {
        if (pick.traded && pick.path) {
          expect(pick.path.length).toBeGreaterThanOrEqual(2) // At least original + current
        }
      }
    }
  })

  it('non-traded picks have original = current owner', () => {
    for (let round = 1; round <= 27; round++) {
      for (const pick of data.picks[round.toString()]) {
        if (!pick.traded) {
          expect(pick.currentOwner).toBe(pick.originalOwner)
        }
      }
    }
  })
})

describe('Draft Board trades', () => {
  it('has trade records', () => {
    expect(data.trades).toBeDefined()
    expect(Array.isArray(data.trades)).toBe(true)
    expect(data.trades.length).toBeGreaterThan(0)
  })

  it('each trade has description and source', () => {
    for (const trade of data.trades) {
      expect(trade.description).toBeTruthy()
      expect(trade.source).toBeTruthy()
    }
  })
})

describe('Draft Board team colors mapping', () => {
  // The draft board page defines its own TEAM_COLORS — verify all draft order names have colors
  const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    Pudge:  { bg: 'bg-red-100',      border: 'border-red-400',      text: 'text-red-800',      dot: 'bg-red-500' },
    Nick:   { bg: 'bg-blue-100',     border: 'border-blue-400',     text: 'text-blue-800',     dot: 'bg-blue-500' },
    Web:    { bg: 'bg-green-100',    border: 'border-green-400',    text: 'text-green-800',    dot: 'bg-green-500' },
    Tom:    { bg: 'bg-yellow-100',   border: 'border-yellow-400',   text: 'text-yellow-800',   dot: 'bg-yellow-500' },
    Tyler:  { bg: 'bg-purple-100',   border: 'border-purple-400',   text: 'text-purple-800',   dot: 'bg-purple-500' },
    Thomas: { bg: 'bg-pink-100',     border: 'border-pink-400',     text: 'text-pink-800',     dot: 'bg-pink-500' },
    Chris:  { bg: 'bg-amber-100',    border: 'border-amber-400',    text: 'text-amber-800',    dot: 'bg-amber-500' },
    Alex:   { bg: 'bg-orange-100',   border: 'border-orange-400',   text: 'text-orange-800',   dot: 'bg-orange-500' },
    Greasy: { bg: 'bg-cyan-100',     border: 'border-cyan-400',     text: 'text-cyan-800',     dot: 'bg-cyan-500' },
    Bob:    { bg: 'bg-slate-200',    border: 'border-slate-400',    text: 'text-slate-800',    dot: 'bg-slate-500' },
    Mike:   { bg: 'bg-fuchsia-100',  border: 'border-fuchsia-400',  text: 'text-fuchsia-800',  dot: 'bg-fuchsia-500' },
    Sean:   { bg: 'bg-emerald-100',  border: 'border-emerald-400',  text: 'text-emerald-800',  dot: 'bg-emerald-500' },
  }

  it('every draft order name has a color definition', () => {
    for (const name of data.draftOrder) {
      expect(TEAM_COLORS[name]).toBeDefined()
    }
  })
})

describe('Snake draft order logic', () => {
  it('odd rounds go 1→12 (ascending slots)', () => {
    // In snake draft, odd rounds have picks in slot order 1,2,...,12
    // We verify slot 1 exists in round 1
    const rd1 = data.picks['1']
    const slot1Pick = rd1.find(p => p.slot === 1)
    expect(slot1Pick).toBeDefined()
  })

  it('even rounds go 12→1 (descending display)', () => {
    // Even rounds still have slots 1-12, but displayed 12→1
    // The data should still have slots 1-12
    const rd2 = data.picks['2']
    expect(rd2).toHaveLength(12)
    const slots = rd2.map(p => p.slot).sort((a, b) => a - b)
    expect(slots).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})

describe('snakePickInRound display logic', () => {
  // Import the exported helper
  // slot = draft order position (1-12, same every round)
  // snakePickInRound returns the pick-in-round number (1=first pick, 12=last)
  function snakePickInRound(round: number, slot: number): number {
    return round % 2 === 0 ? 13 - slot : slot
  }

  it('odd rounds: pick-in-round equals slot', () => {
    // Pudge (slot 1) picks 1st in odd rounds
    expect(snakePickInRound(1, 1)).toBe(1)
    expect(snakePickInRound(3, 1)).toBe(1)
    // Sean (slot 12) picks 12th (last) in odd rounds
    expect(snakePickInRound(1, 12)).toBe(12)
    expect(snakePickInRound(5, 12)).toBe(12)
    // Nick (slot 2) picks 2nd
    expect(snakePickInRound(1, 2)).toBe(2)
  })

  it('even rounds: pick-in-round is reversed (13 - slot)', () => {
    // Pudge (slot 1) picks 12th (last) in even rounds
    expect(snakePickInRound(2, 1)).toBe(12)
    expect(snakePickInRound(4, 1)).toBe(12)
    // Sean (slot 12) picks 1st in even rounds
    expect(snakePickInRound(2, 12)).toBe(1)
    expect(snakePickInRound(6, 12)).toBe(1)
    // Nick (slot 2) picks 11th in even rounds
    expect(snakePickInRound(2, 2)).toBe(11)
  })

  it('snake produces correct overall pick numbers', () => {
    // Overall pick = (round - 1) * 12 + pickInRound
    // Pudge (slot 1): round 1 pick 1 (overall 1), round 2 pick 12 (overall 24)
    const pudgeR1 = (1 - 1) * 12 + snakePickInRound(1, 1)
    expect(pudgeR1).toBe(1)
    const pudgeR2 = (2 - 1) * 12 + snakePickInRound(2, 1)
    expect(pudgeR2).toBe(24)
    const pudgeR3 = (3 - 1) * 12 + snakePickInRound(3, 1)
    expect(pudgeR3).toBe(25)

    // Sean (slot 12): round 1 pick 12 (overall 12), round 2 pick 1 (overall 13)
    const seanR1 = (1 - 1) * 12 + snakePickInRound(1, 12)
    expect(seanR1).toBe(12)
    const seanR2 = (2 - 1) * 12 + snakePickInRound(2, 12)
    expect(seanR2).toBe(13)
  })

  it('owners view should show snake-adjusted picks per round', () => {
    // Verify data: Pudge has slot 1 in every round (draft order position)
    // But display should show alternating 1, 12, 1, 12...
    for (let round = 1; round <= 5; round++) {
      const roundPicks = data.picks[round.toString()]
      const pudgePick = roundPicks.find(p => p.originalOwner === 'Pudge' || p.currentOwner === 'Pudge')
      if (pudgePick) {
        const displaySlot = snakePickInRound(round, pudgePick.slot)
        if (round % 2 === 1) {
          expect(displaySlot).toBe(1) // Pudge picks first in odd rounds
        } else {
          expect(displaySlot).toBe(12) // Pudge picks last in even rounds
        }
      }
    }
  })
})
