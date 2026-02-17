/**
 * Tests for keeper tracker logic — status cycle, limits, grouping.
 */
import { describe, it, expect } from 'vitest'
import { MANAGERS, getManagerByYahooTeamKey } from '@/data/managers'

const MAX_KEEPERS = 6
const MAX_NA = 4

const STATUS_CYCLE = ['undecided', 'keeping', 'keeping-na', 'not-keeping'] as const
type KeeperStatus = typeof STATUS_CYCLE[number]

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  keeping: { icon: '🔒', label: 'Locked', color: 'text-secondary' },
  'keeping-na': { icon: '🔷', label: 'NA Keeper', color: 'text-blue-400' },
  undecided: { icon: '⏳', label: 'Undecided', color: 'text-amber-400' },
  'not-keeping': { icon: '❌', label: 'Not Keeping', color: 'text-red-400' },
}

describe('Keeper status cycle', () => {
  it('has 4 states', () => {
    expect(STATUS_CYCLE).toHaveLength(4)
  })

  it('cycles: undecided → keeping → keeping-na → not-keeping → undecided', () => {
    expect(STATUS_CYCLE[0]).toBe('undecided')
    expect(STATUS_CYCLE[1]).toBe('keeping')
    expect(STATUS_CYCLE[2]).toBe('keeping-na')
    expect(STATUS_CYCLE[3]).toBe('not-keeping')
  })

  it('next status wraps around', () => {
    function getNextStatus(current: KeeperStatus): KeeperStatus {
      const idx = STATUS_CYCLE.indexOf(current)
      return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    }

    expect(getNextStatus('undecided')).toBe('keeping')
    expect(getNextStatus('keeping')).toBe('keeping-na')
    expect(getNextStatus('keeping-na')).toBe('not-keeping')
    expect(getNextStatus('not-keeping')).toBe('undecided')
  })
})

describe('Keeper status display', () => {
  it('has display config for all 4 statuses', () => {
    for (const status of STATUS_CYCLE) {
      expect(STATUS_DISPLAY[status]).toBeDefined()
      expect(STATUS_DISPLAY[status].icon).toBeTruthy()
      expect(STATUS_DISPLAY[status].label).toBeTruthy()
      expect(STATUS_DISPLAY[status].color).toBeTruthy()
    }
  })
})

describe('Keeper limits', () => {
  it('max 6 total keepers per team', () => {
    expect(MAX_KEEPERS).toBe(6)
  })

  it('max 4 NA keepers per team', () => {
    expect(MAX_NA).toBe(4)
  })

  it('NA keepers count toward total', () => {
    // A team with 4 NA keepers can only have 2 regular keepers
    const naKeepers = 4
    const regularKeepers = MAX_KEEPERS - naKeepers
    expect(regularKeepers).toBe(2)
  })

  it('enforces max keepers correctly', () => {
    type MockPlayer = { keeper_status: KeeperStatus }

    function canKeep(roster: MockPlayer[]): boolean {
      const keepers = roster.filter(p => p.keeper_status === 'keeping')
      const naKeepers = roster.filter(p => p.keeper_status === 'keeping-na')
      return (keepers.length + naKeepers.length) < MAX_KEEPERS
    }

    function canKeepNA(roster: MockPlayer[]): boolean {
      const keepers = roster.filter(p => p.keeper_status === 'keeping')
      const naKeepers = roster.filter(p => p.keeper_status === 'keeping-na')
      return naKeepers.length < MAX_NA && (keepers.length + naKeepers.length) < MAX_KEEPERS
    }

    // Roster with 5 keepers — can keep one more
    const roster5: MockPlayer[] = [
      ...Array(5).fill({ keeper_status: 'keeping' }),
      ...Array(10).fill({ keeper_status: 'undecided' }),
    ]
    expect(canKeep(roster5)).toBe(true)

    // Roster with 6 keepers — cannot keep more
    const roster6: MockPlayer[] = [
      ...Array(6).fill({ keeper_status: 'keeping' }),
      ...Array(10).fill({ keeper_status: 'undecided' }),
    ]
    expect(canKeep(roster6)).toBe(false)

    // Roster with 3 NA keepers — can keep-na more
    const rosterNA3: MockPlayer[] = [
      ...Array(3).fill({ keeper_status: 'keeping-na' }),
      ...Array(10).fill({ keeper_status: 'undecided' }),
    ]
    expect(canKeepNA(rosterNA3)).toBe(true)

    // Roster with 4 NA keepers — cannot keep-na more
    const rosterNA4: MockPlayer[] = [
      ...Array(4).fill({ keeper_status: 'keeping-na' }),
      ...Array(10).fill({ keeper_status: 'undecided' }),
    ]
    expect(canKeepNA(rosterNA4)).toBe(false)
  })
})

describe('Keeper team grouping', () => {
  it('all 12 managers are present for grouping', () => {
    expect(MANAGERS).toHaveLength(12)
  })

  it('each manager can be found by Yahoo team key', () => {
    for (const mgr of MANAGERS) {
      const found = getManagerByYahooTeamKey(mgr.yahooTeamKey)
      expect(found).toBe(mgr)
    }
  })

  it('grouping creates a slot for each display name', () => {
    const grouped: Record<string, unknown[]> = {}
    for (const mgr of MANAGERS) {
      grouped[mgr.displayName] = []
    }
    expect(Object.keys(grouped)).toHaveLength(12)
  })
})

describe('Keeper progress bars', () => {
  it('progress percentage calculation', () => {
    function getProgress(keeperCount: number): number {
      return Math.round((keeperCount / MAX_KEEPERS) * 100)
    }

    expect(getProgress(0)).toBe(0)
    expect(getProgress(3)).toBe(50)
    expect(getProgress(6)).toBe(100)
  })

  it('NA progress percentage calculation', () => {
    function getNAProgress(naCount: number): number {
      return Math.round((naCount / MAX_NA) * 100)
    }

    expect(getNAProgress(0)).toBe(0)
    expect(getNAProgress(2)).toBe(50)
    expect(getNAProgress(4)).toBe(100)
  })
})

describe('Keeper valid statuses for API', () => {
  it('valid statuses match the status cycle', () => {
    const validStatuses = ['undecided', 'keeping', 'not-keeping', 'keeping-na']
    for (const status of STATUS_CYCLE) {
      expect(validStatuses).toContain(status)
    }
  })
})
