/**
 * Keeper Stacking Resolution
 *
 * League Rule: "Same-round conflict: If keeping 2 players drafted in same round,
 * lose that round + next round (stacking)."
 *
 * When multiple keepers share the same keeper_cost_round, the keeper with the
 * BETTER ECR (lower number = more valuable) stays at the original round.
 * The worse-ECR keeper gets bumped to the next round. If that round also has
 * a conflict, cascade-bump continues.
 *
 * Max draft round is 23 for regular keepers (rounds 24-27 are NA-only).
 */

const MAX_REGULAR_ROUND = 23

/**
 * Get the effective keeper cost round for a player.
 * For 7th keepers (keeping-7th), the cost is ALWAYS ECR-based: ceil(ECR / 12).
 * For regular keepers, the cost is the stored keeper_cost_round.
 */
export function getEffectiveKeeperCostRound(
  keeperStatus: string,
  keeperCostRound: number | null,
  fantasyprosEcr: number | null
): number | null {
  if (keeperStatus === 'keeping-7th' && fantasyprosEcr != null) {
    return Math.ceil(fantasyprosEcr / 12)
  }
  return keeperCostRound
}

export type KeeperInput = {
  id: string
  player_name: string
  keeper_cost_round: number
  ecr: number | null // lower = better; null = unranked (treated as worst)
  keeper_status: string
}

export type ResolvedKeeper = KeeperInput & {
  effective_round: number    // the round this keeper actually occupies after stacking
  stacked_from: number | null // original round if bumped, null if not stacked
}

export type StackingError = {
  player_name: string
  original_round: number
  message: string
}

export type StackingResult = {
  keepers: ResolvedKeeper[]
  errors: StackingError[]
  has_stacking: boolean
}

/**
 * Resolve keeper stacking for a set of keepers (one team's regular keepers).
 * Only processes keepers with status 'keeping' or 'keeping-7th'.
 * NA keepers ('keeping-na') are excluded — they use separate NA rounds.
 */
export function resolveKeeperStacking(allKeepers: KeeperInput[]): StackingResult {
  // Only stack regular keepers (not NA)
  const regularKeepers = allKeepers.filter(
    k => (k.keeper_status === 'keeping' || k.keeper_status === 'keeping-7th') && k.keeper_cost_round
  )

  if (regularKeepers.length === 0) {
    return { keepers: [], errors: [], has_stacking: false }
  }

  // Sort by round ASC, then by ECR ASC (better ECR first; null ECR = worst)
  const sorted = [...regularKeepers].sort((a, b) => {
    if (a.keeper_cost_round !== b.keeper_cost_round) {
      return a.keeper_cost_round - b.keeper_cost_round
    }
    const aEcr = a.ecr ?? 9999
    const bEcr = b.ecr ?? 9999
    return aEcr - bEcr
  })

  const resolved: ResolvedKeeper[] = []
  const errors: StackingError[] = []
  // Track which rounds are occupied (round → keeper id)
  const occupiedRounds = new Map<number, string>()

  for (const keeper of sorted) {
    let targetRound = keeper.keeper_cost_round
    const originalRound = keeper.keeper_cost_round

    // Find the next available round starting from the keeper's cost round
    while (occupiedRounds.has(targetRound)) {
      targetRound++
    }

    // Check if we've exceeded the maximum regular round
    if (targetRound > MAX_REGULAR_ROUND) {
      errors.push({
        player_name: keeper.player_name,
        original_round: originalRound,
        message: `Stacking pushes ${keeper.player_name} beyond Rd ${MAX_REGULAR_ROUND} (would be Rd ${targetRound}). Cannot keep this many players in adjacent rounds.`,
      })
      continue
    }

    occupiedRounds.set(targetRound, keeper.id)

    resolved.push({
      ...keeper,
      effective_round: targetRound,
      stacked_from: targetRound !== originalRound ? originalRound : null,
    })
  }

  const has_stacking = resolved.some(k => k.stacked_from !== null)

  return { keepers: resolved, errors, has_stacking }
}

/**
 * Check if adding a new keeper would create a same-round conflict.
 * Returns stacking info for the potential conflict.
 */
export function checkStackingConflict(
  existingKeepers: KeeperInput[],
  newKeeper: KeeperInput
): { conflicts: boolean; conflictWith: string | null; effectiveRound: number; stackedFrom: number | null } {
  const allKeepers = [...existingKeepers, newKeeper]
  const result = resolveKeeperStacking(allKeepers)
  const resolved = result.keepers.find(k => k.id === newKeeper.id)

  if (!resolved) {
    return { conflicts: false, conflictWith: null, effectiveRound: newKeeper.keeper_cost_round, stackedFrom: null }
  }

  if (resolved.stacked_from !== null) {
    // Find who the conflict is with (the keeper staying at the original round)
    const conflictKeeper = result.keepers.find(
      k => k.id !== newKeeper.id && k.effective_round === resolved.stacked_from
    )
    return {
      conflicts: true,
      conflictWith: conflictKeeper?.player_name ?? null,
      effectiveRound: resolved.effective_round,
      stackedFrom: resolved.stacked_from,
    }
  }

  return { conflicts: false, conflictWith: null, effectiveRound: resolved.effective_round, stackedFrom: null }
}
