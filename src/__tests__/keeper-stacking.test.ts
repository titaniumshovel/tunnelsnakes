import { describe, it, expect } from 'vitest'
import { resolveKeeperStacking, checkStackingConflict, type KeeperInput } from '../lib/keeper-stacking'

describe('resolveKeeperStacking', () => {
  it('returns no stacking when all keepers have unique rounds', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Player A', keeper_cost_round: 3, ecr: 10, keeper_status: 'keeping' },
      { id: '2', player_name: 'Player B', keeper_cost_round: 5, ecr: 20, keeper_status: 'keeping' },
      { id: '3', player_name: 'Player C', keeper_cost_round: 10, ecr: 30, keeper_status: 'keeping' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.has_stacking).toBe(false)
    expect(result.errors).toHaveLength(0)
    expect(result.keepers).toHaveLength(3)
    for (const k of result.keepers) {
      expect(k.stacked_from).toBeNull()
      expect(k.effective_round).toBe(k.keeper_cost_round)
    }
  })

  it('stacks 2 keepers in the same round — better ECR stays', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Hunter Brown', keeper_cost_round: 10, ecr: 120, keeper_status: 'keeping' },
      { id: '2', player_name: 'Christian Yelich', keeper_cost_round: 10, ecr: 150, keeper_status: 'keeping' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.has_stacking).toBe(true)
    expect(result.errors).toHaveLength(0)

    const brown = result.keepers.find(k => k.player_name === 'Hunter Brown')!
    const yelich = result.keepers.find(k => k.player_name === 'Christian Yelich')!

    expect(brown.effective_round).toBe(10)
    expect(brown.stacked_from).toBeNull()
    expect(yelich.effective_round).toBe(11)
    expect(yelich.stacked_from).toBe(10)
  })

  it('stacks 3 keepers in the same round', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Player A', keeper_cost_round: 5, ecr: 10, keeper_status: 'keeping' },
      { id: '2', player_name: 'Player B', keeper_cost_round: 5, ecr: 20, keeper_status: 'keeping' },
      { id: '3', player_name: 'Player C', keeper_cost_round: 5, ecr: 30, keeper_status: 'keeping' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.has_stacking).toBe(true)

    const a = result.keepers.find(k => k.player_name === 'Player A')!
    const b = result.keepers.find(k => k.player_name === 'Player B')!
    const c = result.keepers.find(k => k.player_name === 'Player C')!

    expect(a.effective_round).toBe(5)
    expect(b.effective_round).toBe(6)
    expect(c.effective_round).toBe(7)
  })

  it('cascade bumps when stacking pushes into an occupied round', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Player A', keeper_cost_round: 5, ecr: 10, keeper_status: 'keeping' },
      { id: '2', player_name: 'Player B', keeper_cost_round: 5, ecr: 20, keeper_status: 'keeping' },
      { id: '3', player_name: 'Player C', keeper_cost_round: 6, ecr: 15, keeper_status: 'keeping' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.has_stacking).toBe(true)

    const a = result.keepers.find(k => k.player_name === 'Player A')!
    const b = result.keepers.find(k => k.player_name === 'Player B')!
    const c = result.keepers.find(k => k.player_name === 'Player C')!

    expect(a.effective_round).toBe(5) // stays
    expect(b.effective_round).toBe(6) // bumped from 5 to 6
    expect(c.effective_round).toBe(7) // cascade-bumped from 6 to 7 (6 now taken by B)
  })

  it('errors when stacking pushes beyond round 23', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Player A', keeper_cost_round: 22, ecr: 10, keeper_status: 'keeping' },
      { id: '2', player_name: 'Player B', keeper_cost_round: 22, ecr: 20, keeper_status: 'keeping' },
      { id: '3', player_name: 'Player C', keeper_cost_round: 23, ecr: 15, keeper_status: 'keeping' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].player_name).toBe('Player C')
    expect(result.errors[0].message).toContain('beyond Rd 23')

    // A and B should still be resolved
    expect(result.keepers).toHaveLength(2)
    expect(result.keepers.find(k => k.player_name === 'Player A')!.effective_round).toBe(22)
    expect(result.keepers.find(k => k.player_name === 'Player B')!.effective_round).toBe(23)
  })

  it('Tyler scenario: Turner Rd 3, Fried Rd 4, Bregman Rd 8, Brown Rd 10, Yelich Rd 10→11, Ward Rd 16', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Trea Turner', keeper_cost_round: 3, ecr: 25, keeper_status: 'keeping' },
      { id: '2', player_name: 'Max Fried', keeper_cost_round: 4, ecr: 40, keeper_status: 'keeping' },
      { id: '3', player_name: 'Alex Bregman', keeper_cost_round: 8, ecr: 75, keeper_status: 'keeping' },
      { id: '4', player_name: 'Hunter Brown', keeper_cost_round: 10, ecr: 120, keeper_status: 'keeping' },
      { id: '5', player_name: 'Christian Yelich', keeper_cost_round: 10, ecr: 150, keeper_status: 'keeping' },
      { id: '6', player_name: 'Taylor Ward', keeper_cost_round: 16, ecr: 200, keeper_status: 'keeping' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.has_stacking).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.keepers).toHaveLength(6)

    const assignments = result.keepers.map(k => ({
      name: k.player_name,
      round: k.effective_round,
      stacked: k.stacked_from,
    }))

    expect(assignments).toEqual([
      { name: 'Trea Turner', round: 3, stacked: null },
      { name: 'Max Fried', round: 4, stacked: null },
      { name: 'Alex Bregman', round: 8, stacked: null },
      { name: 'Hunter Brown', round: 10, stacked: null },
      { name: 'Christian Yelich', round: 11, stacked: 10 },
      { name: 'Taylor Ward', round: 16, stacked: null },
    ])
  })

  it('ignores NA keepers (keeping-na status)', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Regular Keeper', keeper_cost_round: 5, ecr: 10, keeper_status: 'keeping' },
      { id: '2', player_name: 'NA Keeper', keeper_cost_round: 5, ecr: 20, keeper_status: 'keeping-na' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.has_stacking).toBe(false)
    expect(result.keepers).toHaveLength(1)
    expect(result.keepers[0].player_name).toBe('Regular Keeper')
  })

  it('handles null ECR as worst ranking', () => {
    const keepers: KeeperInput[] = [
      { id: '1', player_name: 'Ranked Player', keeper_cost_round: 5, ecr: 200, keeper_status: 'keeping' },
      { id: '2', player_name: 'Unranked Player', keeper_cost_round: 5, ecr: null, keeper_status: 'keeping' },
    ]
    const result = resolveKeeperStacking(keepers)
    expect(result.has_stacking).toBe(true)

    const ranked = result.keepers.find(k => k.player_name === 'Ranked Player')!
    const unranked = result.keepers.find(k => k.player_name === 'Unranked Player')!

    // Ranked player stays (better ECR), unranked bumps
    expect(ranked.effective_round).toBe(5)
    expect(unranked.effective_round).toBe(6)
  })

  it('returns empty for no keepers', () => {
    const result = resolveKeeperStacking([])
    expect(result.has_stacking).toBe(false)
    expect(result.keepers).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })
})

describe('checkStackingConflict', () => {
  it('detects conflict when new keeper shares a round', () => {
    const existing: KeeperInput[] = [
      { id: '1', player_name: 'Hunter Brown', keeper_cost_round: 10, ecr: 120, keeper_status: 'keeping' },
    ]
    const newKeeper: KeeperInput = {
      id: '2', player_name: 'Christian Yelich', keeper_cost_round: 10, ecr: 150, keeper_status: 'keeping',
    }
    const result = checkStackingConflict(existing, newKeeper)
    expect(result.conflicts).toBe(true)
    expect(result.conflictWith).toBe('Hunter Brown')
    expect(result.effectiveRound).toBe(11)
    expect(result.stackedFrom).toBe(10)
  })

  it('reports no conflict when rounds are different', () => {
    const existing: KeeperInput[] = [
      { id: '1', player_name: 'Player A', keeper_cost_round: 5, ecr: 10, keeper_status: 'keeping' },
    ]
    const newKeeper: KeeperInput = {
      id: '2', player_name: 'Player B', keeper_cost_round: 8, ecr: 20, keeper_status: 'keeping',
    }
    const result = checkStackingConflict(existing, newKeeper)
    expect(result.conflicts).toBe(false)
    expect(result.conflictWith).toBeNull()
    expect(result.stackedFrom).toBeNull()
  })

  it('handles case where new keeper has better ECR and stays', () => {
    const existing: KeeperInput[] = [
      { id: '1', player_name: 'Worse Player', keeper_cost_round: 10, ecr: 200, keeper_status: 'keeping' },
    ]
    const newKeeper: KeeperInput = {
      id: '2', player_name: 'Better Player', keeper_cost_round: 10, ecr: 50, keeper_status: 'keeping',
    }
    const result = checkStackingConflict(existing, newKeeper)
    // The new keeper has better ECR, so they stay at Rd 10. No conflict for the new keeper.
    expect(result.conflicts).toBe(false)
    expect(result.stackedFrom).toBeNull()
    expect(result.effectiveRound).toBe(10)
  })
})
