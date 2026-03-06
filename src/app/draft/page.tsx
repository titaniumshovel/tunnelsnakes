'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MANAGERS,
  TEAM_COLORS,
  getManagerByYahooTeamKey,
  type Manager,
} from '@/data/managers'
import draftBoardData from '@/data/draft-board.json'
import {
  resolveKeeperStacking,
  getEffectiveKeeperCostRound,
  type KeeperInput,
} from '@/lib/keeper-stacking'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Player = {
  id: string
  yahoo_player_id: string
  full_name: string
  primary_position: string | null
  eligible_positions: string[] | null
  fantasypros_ecr: number | null
  mlb_team: string | null
  is_na_eligible: boolean | null
}

type RosterPlayer = {
  id: string
  yahoo_player_id: string
  yahoo_team_key: string
  keeper_status: string
  keeper_cost_round: number | null
  players: Player | null
}

/** One slot in the master pick order (27 rounds × 12 picks). */
type PickSlot = {
  round: number
  pickInRound: number // 1-12 within the round (snake-adjusted order)
  overallPick: number // 1-324
  slot: number // original draftOrder slot (1-12)
  currentOwner: string // displayName
  originalOwner: string
  traded: boolean
  isNARound: boolean
  // Filled by keeper or live draft pick
  player: Player | null
  source: 'keeper' | 'draft' | null
}

type DraftBoardPick = {
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
  picks: Record<string, DraftBoardPick[]>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const draftBoard = draftBoardData as DraftBoard

/** Roster slot counts by position. */
const ROSTER_FORMAT: Record<string, number> = {
  C: 1,
  '1B': 1,
  '2B': 1,
  '3B': 1,
  SS: 1,
  OF: 3,
  Util: 2,
  SP: 4,
  RP: 2,
  'Util P': 2,
  BN: 5,
  NA: 4,
}

/** Positions available as BPA filter buttons. */
const FILTER_POSITIONS = ['ALL', 'C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'] as const

/** Positions that are "real" roster spots (not bench/util/NA). */
const REAL_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'] as const

/** Map sub-positions to roster-compatible positions. */
function normalizePosition(pos: string): string {
  if (['LF', 'CF', 'RF'].includes(pos)) return 'OF'
  if (pos === 'DH') return 'Util'
  return pos
}

/** Check if a player can fill a given roster position. */
function canFillPosition(player: Player, pos: string): boolean {
  const eligible = (player.eligible_positions ?? []).map(normalizePosition)
  if (pos === 'Util') return !eligible.some((p) => ['SP', 'RP'].includes(p)) // batters only
  if (pos === 'Util P') return eligible.some((p) => ['SP', 'RP'].includes(p)) // pitchers only
  if (pos === 'BN') return true
  if (pos === 'NA') return player.is_na_eligible === true
  return eligible.includes(pos)
}

/** Get the "primary" filterable position for display. */
function displayPositions(player: Player): string {
  const raw = player.eligible_positions ?? []
  const mapped = [...new Set(raw.map(normalizePosition))]
  // Filter to real positions only
  const real = mapped.filter((p) =>
    (REAL_POSITIONS as readonly string[]).includes(p),
  )
  return real.length > 0 ? real.join('/') : player.primary_position ?? '?'
}

// ---------------------------------------------------------------------------
// Build master pick order from draft-board.json
// ---------------------------------------------------------------------------

function buildPickOrder(): Omit<PickSlot, 'player' | 'source'>[] {
  const picks: Omit<PickSlot, 'player' | 'source'>[] = []
  let overall = 0

  for (let round = 1; round <= draftBoard.rounds; round++) {
    const roundPicks = draftBoard.picks[String(round)] ?? []
    // Snake: odd rounds ascending slot, even rounds descending slot
    const sorted =
      round % 2 === 0
        ? [...roundPicks].sort((a, b) => b.slot - a.slot)
        : [...roundPicks].sort((a, b) => a.slot - b.slot)

    sorted.forEach((p, idx) => {
      overall++
      picks.push({
        round,
        pickInRound: idx + 1,
        overallPick: overall,
        slot: p.slot,
        currentOwner: p.currentOwner,
        originalOwner: p.originalOwner,
        traded: p.traded,
        isNARound: draftBoard.naRounds.includes(round),
      })
    })
  }

  return picks
}

// ---------------------------------------------------------------------------
// Positional scarcity helpers
// ---------------------------------------------------------------------------

type ScarcityInfo = {
  position: string
  top5Remaining: number
  top10Remaining: number
  top20Remaining: number
  total5: number
  total10: number
  total20: number
}

function computeScarcity(
  allPlayers: Player[],
  draftedIds: Set<string>,
): ScarcityInfo[] {
  return (REAL_POSITIONS as readonly string[]).map((pos) => {
    // All players eligible for this position, ranked by ECR
    const eligible = allPlayers
      .filter((p) => {
        const positions = (p.eligible_positions ?? []).map(normalizePosition)
        return positions.includes(pos)
      })
      .filter((p) => p.fantasypros_ecr != null)
      .sort((a, b) => (a.fantasypros_ecr ?? 9999) - (b.fantasypros_ecr ?? 9999))

    const top5 = eligible.slice(0, 5)
    const top10 = eligible.slice(0, 10)
    const top20 = eligible.slice(0, 20)

    return {
      position: pos,
      top5Remaining: top5.filter((p) => !draftedIds.has(p.yahoo_player_id))
        .length,
      top10Remaining: top10.filter((p) => !draftedIds.has(p.yahoo_player_id))
        .length,
      top20Remaining: top20.filter((p) => !draftedIds.has(p.yahoo_player_id))
        .length,
      total5: top5.length,
      total10: top10.length,
      total20: top20.length,
    }
  })
}

// ---------------------------------------------------------------------------
// Team needs helpers
// ---------------------------------------------------------------------------

type TeamNeed = {
  position: string
  required: number
  filled: number
  status: 'empty' | 'partial' | 'full'
}

function computeTeamNeeds(
  teamKey: string,
  teamPlayers: Player[],
): TeamNeed[] {
  const needs: TeamNeed[] = []
  const assigned: Set<string> = new Set() // track player IDs already assigned

  for (const [pos, count] of Object.entries(ROSTER_FORMAT)) {
    if (pos === 'BN' || pos === 'Util' || pos === 'Util P') continue // skip generic slots

    let filled = 0
    for (const p of teamPlayers) {
      if (assigned.has(p.yahoo_player_id)) continue
      if (canFillPosition(p, pos)) {
        filled++
        assigned.add(p.yahoo_player_id)
        if (filled >= count) break
      }
    }

    needs.push({
      position: pos,
      required: count,
      filled: Math.min(filled, count),
      status:
        filled === 0
          ? 'empty'
          : filled < count
            ? 'partial'
            : 'full',
    })
  }

  return needs
}

// ---------------------------------------------------------------------------
// Smart suggestion scoring
// ---------------------------------------------------------------------------

type Suggestion = {
  player: Player
  score: number
  reasons: string[]
}

function computeSuggestions(
  teamKey: string,
  teamPlayers: Player[],
  availablePlayers: Player[],
  scarcity: ScarcityInfo[],
  isNARound: boolean,
): Suggestion[] {
  if (availablePlayers.length === 0) return []

  const needs = computeTeamNeeds(teamKey, teamPlayers)
  const needMap = new Map(needs.map((n) => [n.position, n]))
  const scarcityMap = new Map(scarcity.map((s) => [s.position, s]))

  // ECR range for normalization
  const ecrs = availablePlayers
    .map((p) => p.fantasypros_ecr)
    .filter((e): e is number => e != null)
  const minEcr = Math.min(...ecrs, 1)
  const maxEcr = Math.max(...ecrs, 300)

  const suggestions: Suggestion[] = availablePlayers
    .filter((p) => p.fantasypros_ecr != null)
    .map((p) => {
      const reasons: string[] = []
      let score = 0

      // 1. ECR value (0-50 points, lower ECR = higher score)
      const ecrNorm =
        1 - ((p.fantasypros_ecr ?? maxEcr) - minEcr) / (maxEcr - minEcr)
      const ecrScore = ecrNorm * 50
      score += ecrScore

      // 2. Positional scarcity bonus (0-25 points)
      const playerPositions = (p.eligible_positions ?? []).map(
        normalizePosition,
      )
      let maxScarcityBonus = 0
      let scarcestPos = ''
      for (const pos of playerPositions) {
        const sc = scarcityMap.get(pos)
        if (!sc) continue
        // Fewer remaining in top 10 → higher bonus
        const scarcityScore =
          sc.total10 > 0
            ? (1 - sc.top10Remaining / sc.total10) * 25
            : 0
        if (scarcityScore > maxScarcityBonus) {
          maxScarcityBonus = scarcityScore
          scarcestPos = pos
        }
      }
      score += maxScarcityBonus
      if (maxScarcityBonus > 12) {
        reasons.push(`${scarcestPos} is scarce`)
      }

      // 3. Team need bonus (0-25 points)
      let maxNeedBonus = 0
      let neediestPos = ''
      for (const pos of playerPositions) {
        const need = needMap.get(pos)
        if (!need) continue
        let needScore = 0
        if (need.status === 'empty') {
          needScore = 25
        } else if (need.status === 'partial') {
          needScore = 15
        } else {
          needScore = -10 // penalty for already-filled positions
        }
        if (needScore > maxNeedBonus) {
          maxNeedBonus = needScore
          neediestPos = pos
        }
      }
      score += maxNeedBonus
      if (maxNeedBonus >= 15) {
        reasons.push(`fills ${neediestPos} need`)
      }

      // BPA label
      if (ecrScore > 40) {
        reasons.unshift('BPA')
      }

      return { player: p, score, reasons }
    })

  suggestions.sort((a, b) => b.score - a.score)
  return suggestions.slice(0, 5)
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function getOwnerColors(name: string) {
  return (
    TEAM_COLORS[name] ?? {
      bg: 'bg-muted',
      border: 'border-border',
      text: 'text-foreground',
      dot: 'bg-muted-foreground',
      hex: '#888',
    }
  )
}

function scarcityColor(remaining: number, total: number): string {
  if (total === 0) return 'text-muted-foreground'
  const ratio = remaining / total
  if (ratio <= 0.3) return 'text-red-500 dark:text-red-400'
  if (ratio <= 0.6) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-green-500 dark:text-green-400'
}

function scarcityBg(remaining: number, total: number): string {
  if (total === 0) return 'bg-muted'
  const ratio = remaining / total
  if (ratio <= 0.3) return 'bg-red-500/20'
  if (ratio <= 0.6) return 'bg-yellow-500/20'
  return 'bg-green-500/20'
}

function needColor(status: 'empty' | 'partial' | 'full'): string {
  if (status === 'empty') return 'text-red-500 dark:text-red-400'
  if (status === 'partial') return 'text-yellow-500 dark:text-yellow-400'
  return 'text-green-500 dark:text-green-400'
}

function needBg(status: 'empty' | 'partial' | 'full'): string {
  if (status === 'empty') return 'bg-red-500/20 border-red-500/30'
  if (status === 'partial') return 'bg-yellow-500/20 border-yellow-500/30'
  return 'bg-green-500/20 border-green-500/30'
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DraftAssistantPage() {
  // ----- Data loading state -----
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [keeperRecords, setKeeperRecords] = useState<RosterPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ----- Draft state -----
  const [draftPicks, setDraftPicks] = useState<
    { overallPick: number; playerId: string; teamName: string }[]
  >([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // ----- UI state -----
  const [posFilter, setPosFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<string>(
    MANAGERS.find((m) => m.displayName === 'Chris')?.yahooTeamKey ?? MANAGERS[0].yahooTeamKey,
  )
  const [showDraftLog, setShowDraftLog] = useState(false)

  // ----- Load data from Supabase -----
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()

        const [playersRes, keepersRes] = await Promise.all([
          supabase
            .from('players')
            .select('id, yahoo_player_id, full_name, primary_position, eligible_positions, fantasypros_ecr, mlb_team, is_na_eligible')
            .order('fantasypros_ecr', { ascending: true, nullsFirst: false }),
          supabase
            .from('my_roster_players')
            .select('id, yahoo_player_id, yahoo_team_key, keeper_status, keeper_cost_round, players(*)')
            .in('keeper_status', ['keeping', 'keeping-7th', 'keeping-na']),
        ])

        if (playersRes.error) throw playersRes.error
        if (keepersRes.error) throw keepersRes.error

        setAllPlayers((playersRes.data as Player[]) ?? [])
        setKeeperRecords((keepersRes.data as unknown as RosterPlayer[]) ?? [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ----- Build master pick order with keepers pre-filled -----
  const masterPicks = useMemo<PickSlot[]>(() => {
    const skeleton = buildPickOrder()
    const slots: PickSlot[] = skeleton.map((s) => ({
      ...s,
      player: null,
      source: null,
    }))

    if (keeperRecords.length === 0) return slots

    // Group keepers by team
    const keepersByTeam: Record<string, RosterPlayer[]> = {}
    for (const kr of keeperRecords) {
      const mgr = getManagerByYahooTeamKey(kr.yahoo_team_key)
      if (!mgr) continue
      const name = mgr.displayName
      if (!keepersByTeam[name]) keepersByTeam[name] = []
      keepersByTeam[name].push(kr)
    }

    // Resolve stacking per team and assign to pick slots
    for (const [teamName, keepers] of Object.entries(keepersByTeam)) {
      // Separate NA keepers from regular keepers
      const regularKeepers = keepers.filter(
        (k) => k.keeper_status !== 'keeping-na',
      )
      const naKeepers = keepers.filter(
        (k) => k.keeper_status === 'keeping-na',
      )

      // Resolve stacking for regular keepers
      if (regularKeepers.length > 0) {
        const inputs: KeeperInput[] = regularKeepers.map((k) => ({
          id: k.id,
          player_name: k.players?.full_name ?? 'Unknown',
          keeper_cost_round:
            getEffectiveKeeperCostRound(
              k.keeper_status,
              k.keeper_cost_round,
              k.players?.fantasypros_ecr ?? null,
            ) ?? k.keeper_cost_round ?? 1,
          ecr: k.players?.fantasypros_ecr ?? null,
          keeper_status: k.keeper_status,
        }))

        const result = resolveKeeperStacking(inputs)

        for (const resolved of result.keepers) {
          const kr = regularKeepers.find((k) => k.id === resolved.id)
          if (!kr?.players) continue
          // Find the pick slot for this team in the effective round
          const slot = slots.find(
            (s) =>
              s.round === resolved.effective_round &&
              s.currentOwner === teamName &&
              s.player === null,
          )
          if (slot) {
            slot.player = kr.players
            slot.source = 'keeper'
          }
        }
      }

      // Assign NA keepers to NA rounds
      for (const nk of naKeepers) {
        if (!nk.players) continue
        const naSlot = slots.find(
          (s) =>
            s.isNARound &&
            s.currentOwner === teamName &&
            s.player === null,
        )
        if (naSlot) {
          naSlot.player = nk.players
          naSlot.source = 'keeper'
        }
      }
    }

    return slots
  }, [keeperRecords])

  // ----- Apply live draft picks to the master pick order -----
  const pickSlots = useMemo<PickSlot[]>(() => {
    const slots = masterPicks.map((s) => ({ ...s }))
    for (const dp of draftPicks) {
      const slot = slots.find((s) => s.overallPick === dp.overallPick)
      if (slot) {
        const player = allPlayers.find(
          (p) => p.yahoo_player_id === dp.playerId,
        )
        if (player) {
          slot.player = player
          slot.source = 'draft'
        }
      }
    }
    return slots
  }, [masterPicks, draftPicks, allPlayers])

  // ----- Current pick (first unfilled slot) -----
  const currentPickIndex = useMemo(
    () => pickSlots.findIndex((s) => s.player === null),
    [pickSlots],
  )
  const currentPick = currentPickIndex >= 0 ? pickSlots[currentPickIndex] : null

  // ----- Set of drafted/kept player IDs -----
  const draftedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const s of pickSlots) {
      if (s.player) ids.add(s.player.yahoo_player_id)
    }
    return ids
  }, [pickSlots])

  // ----- Available (undrafted) players sorted by ECR -----
  const availablePlayers = useMemo(() => {
    return allPlayers
      .filter((p) => !draftedIds.has(p.yahoo_player_id))
      .sort(
        (a, b) =>
          (a.fantasypros_ecr ?? 9999) - (b.fantasypros_ecr ?? 9999),
      )
  }, [allPlayers, draftedIds])

  // ----- Filtered BPA list -----
  const filteredBPA = useMemo(() => {
    let list = availablePlayers

    // Position filter
    if (posFilter !== 'ALL') {
      list = list.filter((p) => {
        const positions = (p.eligible_positions ?? []).map(normalizePosition)
        return positions.includes(posFilter)
      })
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) => p.full_name.toLowerCase().includes(q))
    }

    return list
  }, [availablePlayers, posFilter, searchQuery])

  // ----- Positional scarcity -----
  const scarcity = useMemo(
    () => computeScarcity(allPlayers, draftedIds),
    [allPlayers, draftedIds],
  )

  // ----- Team rosters (keepers + drafted) -----
  const teamRosters = useMemo(() => {
    const rosters: Record<string, Player[]> = {}
    for (const m of MANAGERS) {
      rosters[m.yahooTeamKey] = []
    }
    for (const s of pickSlots) {
      if (!s.player) continue
      const mgr = MANAGERS.find((m) => m.displayName === s.currentOwner)
      if (mgr && rosters[mgr.yahooTeamKey]) {
        rosters[mgr.yahooTeamKey].push(s.player)
      }
    }
    return rosters
  }, [pickSlots])

  // ----- Team needs for selected team -----
  const selectedTeamNeeds = useMemo(() => {
    return computeTeamNeeds(selectedTeam, teamRosters[selectedTeam] ?? [])
  }, [selectedTeam, teamRosters])

  // ----- Smart suggestions for current pick -----
  const suggestions = useMemo(() => {
    if (!currentPick) return []
    const mgr = MANAGERS.find((m) => m.displayName === currentPick.currentOwner)
    if (!mgr) return []
    return computeSuggestions(
      mgr.yahooTeamKey,
      teamRosters[mgr.yahooTeamKey] ?? [],
      availablePlayers,
      scarcity,
      currentPick.isNARound,
    )
  }, [currentPick, teamRosters, availablePlayers, scarcity])

  // ----- Draft actions -----
  const draftPlayer = useCallback(
    (player: Player, teamName?: string) => {
      if (!currentPick) return
      const team = teamName ?? currentPick.currentOwner
      setDraftPicks((prev) => [
        ...prev,
        {
          overallPick: currentPick.overallPick,
          playerId: player.yahoo_player_id,
          teamName: team,
        },
      ])
      setSelectedPlayer(null)
    },
    [currentPick],
  )

  const undoLastPick = useCallback(() => {
    setDraftPicks((prev) => prev.slice(0, -1))
  }, [])

  // ----- Draft log (recent picks in reverse) -----
  const draftLog = useMemo(() => {
    return [...draftPicks]
      .reverse()
      .map((dp) => {
        const slot = pickSlots.find((s) => s.overallPick === dp.overallPick)
        const player = allPlayers.find(
          (p) => p.yahoo_player_id === dp.playerId,
        )
        return { ...dp, slot, player }
      })
  }, [draftPicks, pickSlots, allPlayers])

  // ===================================================================
  // RENDER
  // ===================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="text-muted-foreground">Loading draft data…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 max-w-md text-center">
          <p className="text-destructive font-semibold">Error loading data</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    )
  }

  const onTheClockMgr = currentPick
    ? MANAGERS.find((m) => m.displayName === currentPick.currentOwner)
    : null
  const onTheClockColors = onTheClockMgr
    ? getOwnerColors(onTheClockMgr.colorKey)
    : null

  return (
    <div className="max-w-[1600px] mx-auto p-4 space-y-4">
      {/* ============================================================= */}
      {/* HEADER — On The Clock */}
      {/* ============================================================= */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">⚾ Draft Assistant</h1>
            <p className="text-muted-foreground text-sm">
              {allPlayers.length} players loaded · {draftPicks.length} picks
              made · {availablePlayers.length} available
            </p>
          </div>

          {currentPick ? (
            <div
              className={`rounded-lg border-2 px-5 py-3 text-center ${onTheClockColors?.border ?? 'border-primary'} ${onTheClockColors?.bg ?? 'bg-primary/10'}`}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On the Clock
              </div>
              <div
                className={`text-xl font-bold ${onTheClockColors?.text ?? 'text-foreground'}`}
              >
                {currentPick.currentOwner}
              </div>
              <div className="text-xs text-muted-foreground">
                Round {currentPick.round} · Pick {currentPick.pickInRound} ·
                Overall #{currentPick.overallPick}
                {currentPick.isNARound && (
                  <span className="ml-1 text-blue-500">(NA)</span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-green-500 bg-green-500/10 px-5 py-3 text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                Draft Complete! 🎉
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={undoLastPick}
              disabled={draftPicks.length === 0}
              className="rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ↩ Undo
            </button>
            <button
              onClick={() => setShowDraftLog(!showDraftLog)}
              className="rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              📋 Log {draftPicks.length > 0 && `(${draftPicks.length})`}
            </button>
          </div>
        </div>

        {/* Draft log dropdown */}
        {showDraftLog && draftLog.length > 0 && (
          <div className="mt-3 border-t pt-3 max-h-60 overflow-y-auto">
            <div className="grid gap-1">
              {draftLog.map((entry, i) => {
                const colors = getOwnerColors(entry.slot?.currentOwner ?? '')
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${colors.bg}`}
                  >
                    <span className="text-xs text-muted-foreground w-16">
                      R{entry.slot?.round}.{entry.slot?.pickInRound}
                    </span>
                    <span className={`font-medium ${colors.text} w-20`}>
                      {entry.teamName}
                    </span>
                    <span className="font-medium">
                      {entry.player?.full_name ?? '?'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {entry.player ? displayPositions(entry.player) : ''}
                    </span>
                    {entry.player?.fantasypros_ecr && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        ECR #{entry.player.fantasypros_ecr}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* MAIN 3-COLUMN LAYOUT */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ------- LEFT: Smart Suggestions + Positional Scarcity ------- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Smart Suggestions */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-bold mb-3">🧠 Smart Picks</h2>
            {currentPick ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Top recommendations for{' '}
                  <span className="font-semibold">
                    {currentPick.currentOwner}
                  </span>
                </p>
                {suggestions.map((s, i) => (
                  <button
                    key={s.player.yahoo_player_id}
                    onClick={() => draftPlayer(s.player)}
                    className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {i + 1}. {s.player.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {displayPositions(s.player)} ·{' '}
                          {s.player.mlb_team ?? ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-muted-foreground">
                          ECR #{s.player.fantasypros_ecr}
                        </div>
                        <div className="text-xs font-semibold text-primary">
                          {s.score.toFixed(0)} pts
                        </div>
                      </div>
                    </div>
                    {s.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.reasons.map((r, ri) => (
                          <span
                            key={ri}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Draft is complete.
              </p>
            )}
          </div>

          {/* Positional Scarcity */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-bold mb-3">📊 Position Scarcity</h2>
            <div className="space-y-2">
              {scarcity.map((s) => (
                <div
                  key={s.position}
                  className={`rounded-lg border p-2.5 ${scarcityBg(s.top10Remaining, s.total10)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{s.position}</span>
                    <span
                      className={`text-sm font-semibold ${scarcityColor(s.top10Remaining, s.total10)}`}
                    >
                      {s.top10Remaining}/{s.total10}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                    <span>
                      Top 5:{' '}
                      <span
                        className={`font-semibold ${scarcityColor(s.top5Remaining, s.total5)}`}
                      >
                        {s.top5Remaining}
                      </span>
                    </span>
                    <span>
                      Top 10:{' '}
                      <span
                        className={`font-semibold ${scarcityColor(s.top10Remaining, s.total10)}`}
                      >
                        {s.top10Remaining}
                      </span>
                    </span>
                    <span>
                      Top 20:{' '}
                      <span
                        className={`font-semibold ${scarcityColor(s.top20Remaining, s.total20)}`}
                      >
                        {s.top20Remaining}
                      </span>
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.top10Remaining / s.total10 <= 0.3
                          ? 'bg-red-500'
                          : s.top10Remaining / s.total10 <= 0.6
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${s.total10 > 0 ? (s.top10Remaining / s.total10) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ------- CENTER: BPA Panel ------- */}
        <div className="lg:col-span-6">
          <div className="rounded-xl border bg-card shadow-sm">
            {/* BPA Header + Filters */}
            <div className="p-4 border-b space-y-3">
              <h2 className="text-lg font-bold">
                📋 Best Player Available
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredBPA.length})
                </span>
              </h2>

              {/* Search */}
              <input
                type="text"
                placeholder="Search players…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />

              {/* Position filter buttons */}
              <div className="flex flex-wrap gap-1.5">
                {FILTER_POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosFilter(pos)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      posFilter === pos
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* BPA List */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              {/* Header row */}
              <div className="sticky top-0 bg-card border-b px-4 py-2 grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-2">Pos</div>
                <div className="col-span-2">Team</div>
                <div className="col-span-2 text-right">ECR</div>
              </div>

              {filteredBPA.slice(0, 200).map((player, idx) => (
                <div
                  key={player.yahoo_player_id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-sm cursor-pointer transition-colors hover:bg-muted/50 border-b border-border/50 ${
                    selectedPlayer?.yahoo_player_id ===
                    player.yahoo_player_id
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : ''
                  }`}
                >
                  <div className="col-span-1 text-xs text-muted-foreground">
                    {idx + 1}
                  </div>
                  <div className="col-span-5 font-medium truncate">
                    {player.full_name}
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {displayPositions(player)}
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {player.mlb_team ?? '—'}
                  </div>
                  <div className="col-span-2 text-right">
                    {player.fantasypros_ecr != null ? (
                      <span className="font-mono text-xs">
                        #{player.fantasypros_ecr}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}

              {filteredBPA.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No players match your filters.
                </div>
              )}
            </div>
          </div>

          {/* Player Action Bar — appears when a player is selected */}
          {selectedPlayer && (
            <div className="mt-2 rounded-xl border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold">
                    {selectedPlayer.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {displayPositions(selectedPlayer)} ·{' '}
                    {selectedPlayer.mlb_team ?? ''} · ECR #
                    {selectedPlayer.fantasypros_ecr ?? 'N/A'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick draft to on-the-clock team */}
                  {currentPick && (
                    <button
                      onClick={() => draftPlayer(selectedPlayer)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors`}
                      style={{
                        backgroundColor:
                          onTheClockColors?.hex ?? 'hsl(var(--primary))',
                      }}
                    >
                      Draft → {currentPick.currentOwner}
                    </button>
                  )}

                  {/* Dropdown to draft to another team */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        draftPlayer(selectedPlayer, e.target.value)
                      }
                    }}
                    value=""
                    className="rounded-lg border bg-background px-2 py-2 text-sm"
                  >
                    <option value="">Other team…</option>
                    {MANAGERS.map((m) => (
                      <option key={m.yahooTeamKey} value={m.displayName}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ------- RIGHT: Team Needs ------- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Team Selector */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-bold mb-3">👥 Team Needs</h2>

            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm mb-3"
            >
              {MANAGERS.map((m) => (
                <option key={m.yahooTeamKey} value={m.yahooTeamKey}>
                  {m.displayName} — {m.teamName}
                </option>
              ))}
            </select>

            {/* Roster summary */}
            <div className="text-xs text-muted-foreground mb-3">
              {(teamRosters[selectedTeam] ?? []).length} players rostered
            </div>

            {/* Position needs grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {selectedTeamNeeds.map((n) => (
                <div
                  key={n.position}
                  className={`rounded-lg border p-2 text-center ${needBg(n.status)}`}
                >
                  <div className="font-bold text-sm">{n.position}</div>
                  <div className={`text-lg font-bold ${needColor(n.status)}`}>
                    {n.filled}/{n.required}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {n.status === 'empty'
                      ? 'NEED'
                      : n.status === 'partial'
                        ? 'Want more'
                        : 'Filled'}
                  </div>
                </div>
              ))}
            </div>

            {/* Team roster list */}
            {(teamRosters[selectedTeam] ?? []).length > 0 && (
              <div className="mt-4 border-t pt-3">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                  ROSTER
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(teamRosters[selectedTeam] ?? []).map((p) => {
                    const isKeeper = keeperRecords.some(
                      (k) =>
                        k.players?.yahoo_player_id === p.yahoo_player_id,
                    )
                    return (
                      <div
                        key={p.yahoo_player_id}
                        className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-muted/50"
                      >
                        {isKeeper && (
                          <span className="text-[10px]">🔒</span>
                        )}
                        <span className="font-medium truncate flex-1">
                          {p.full_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {displayPositions(p)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Upcoming picks */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-bold mb-3">⏭ Up Next</h2>
            <div className="space-y-1.5">
              {pickSlots
                .filter((s) => s.player === null)
                .slice(0, 8)
                .map((s, i) => {
                  const colors = getOwnerColors(s.currentOwner)
                  return (
                    <div
                      key={s.overallPick}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        i === 0
                          ? `${colors.border} ${colors.bg} border-2`
                          : 'border-border/50'
                      }`}
                    >
                      <span className="text-xs text-muted-foreground w-14">
                        R{s.round}.{s.pickInRound}
                      </span>
                      <span
                        className={`w-3 h-3 rounded-full ${colors.dot}`}
                      />
                      <span
                        className={`font-medium ${i === 0 ? colors.text : 'text-foreground'}`}
                      >
                        {s.currentOwner}
                      </span>
                      {s.traded && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          (traded)
                        </span>
                      )}
                      {s.isNARound && (
                        <span className="text-[10px] text-blue-500 ml-auto">
                          NA
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
