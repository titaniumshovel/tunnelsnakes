'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MANAGERS, TEAM_COLORS, getManagerByEmail, type Manager } from '@/data/managers'
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
  picks: Record<string, DraftPick[]>
}

type RosterPlayer = {
  id: string
  keeper_status: string
  keeper_cost_round: number | null
  keeper_cost_label: string | null
  high_value: boolean
  notes: string | null
  yahoo_team_key: string
  players: {
    id: string
    full_name: string
    primary_position: string | null
    mlb_team: string | null
    fantasypros_ecr: number | null
    eligible_positions: string[] | null
    is_na_eligible: boolean | null
    na_eligibility_reason: string | null
  } | null
}

function isNAEligible(rp: RosterPlayer): boolean {
  // If our auto-detection ran (is_na_eligible is not null), trust it over Yahoo
  if (rp.players?.is_na_eligible === true) return true
  if (rp.players?.is_na_eligible === false) return false
  // Fallback to Yahoo positions only if we haven't checked yet (is_na_eligible is null)
  return rp.players?.eligible_positions?.includes('NA') ?? false
}

const MAX_KEEPERS = 6
const MAX_NA = 4

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  keeping: { icon: '🔒', label: 'KEEPING', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/30' },
  'keeping-7th': { icon: '⭐', label: '7TH KEEPER', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  'keeping-na': { icon: '🔷', label: 'KEEPER (NA)', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  undecided: { icon: '⏳', label: 'UNDECIDED', color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
  'not-keeping': { icon: '❌', label: 'NOT KEEPING', color: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20' },
}

export default function DashboardPage() {
  const [manager, setManager] = useState<Manager | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email ?? null)

      if (user.email) {
        const mgr = getManagerByEmail(user.email)
        if (mgr) {
          setManager(mgr)
        } else {
          setNotFound(true)
        }
      } else {
        setNotFound(true)
      }

      setLoading(false)
    }

    loadUser()
  }, [router])

  const fetchRoster = useCallback(async () => {
    if (!manager) return
    const res = await fetch('/api/keepers')
    if (res.ok) {
      const data = await res.json()
      // Filter to only this manager's team
      const myPlayers = data.filter((rp: RosterPlayer) => rp.yahoo_team_key === manager.yahooTeamKey)
      setRoster(myPlayers)
    }
    setRosterLoading(false)
  }, [manager])

  useEffect(() => {
    if (manager) {
      fetchRoster()
    }
  }, [manager, fetchRoster])

  function getStatusOptions(rp: RosterPlayer) {
    const others = roster.filter(r => r.id !== rp.id)
    const keepingCount = others.filter(r => r.keeper_status === 'keeping').length
    const has7th = others.some(r => r.keeper_status === 'keeping-7th')
    const naCount = others.filter(r => r.keeper_status === 'keeping-na').length
    const naEligible = isNAEligible(rp)

    return [
      { status: 'keeping', available: keepingCount < MAX_KEEPERS, reason: keepingCount >= MAX_KEEPERS ? 'Keeper limit reached' : undefined },
      { status: 'keeping-7th', available: !has7th && naEligible, reason: has7th ? '7th slot taken' : !naEligible ? 'Exceeded qualifying thresholds' : undefined },
      { status: 'keeping-na', available: naEligible && naCount < MAX_NA, reason: !naEligible ? 'Not NA eligible' : naCount >= MAX_NA ? 'NA limit reached' : undefined },
      { status: 'undecided', available: true },
      { status: 'not-keeping', available: true },
    ]
  }

  async function setKeeperStatus(rp: RosterPlayer, newStatus: string) {
    if (newStatus === rp.keeper_status) {
      setOpenPopoverId(null)
      return
    }

    setOpenPopoverId(null)
    setUpdatingId(rp.id)
    const res = await fetch('/api/keepers', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roster_player_id: rp.id, keeper_status: newStatus }),
    })

    if (res.ok) {
      setRoster(prev => prev.map(r => r.id === rp.id ? { ...r, keeper_status: newStatus } : r))
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⚡</div>
          <p className="text-sm font-semibold text-primary">
            Loading dashboard
          </p>
        </div>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md dashboard-card p-6 text-center space-y-4">
          <div className="text-4xl">🚫</div>
          <h2 className="text-lg font-bold text-destructive font-mono">
            ACCESS DENIED
          </h2>
          <p className="text-sm font-mono text-muted-foreground">
            Your email{' '}
            <span className="text-foreground">{userEmail}</span>{' '}
            isn&apos;t associated with a team.
          </p>
          <p className="text-xs font-mono text-muted-foreground/60">
            Contact the commissioner to get your email added to the system.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/" className="text-xs font-mono text-primary hover:text-primary/80 transition-colors">
              ← Home
            </Link>
            <LogoutButton />
          </div>
        </div>
      </main>
    )
  }

  if (!manager) return null

  const colors = TEAM_COLORS[manager.colorKey]
  const data = draftBoardData as DraftBoard

  // Gather this manager's picks across all rounds
  const myPicks: { round: number; pick: DraftPick }[] = []
  for (let round = 1; round <= data.rounds; round++) {
    const roundPicks = (data.picks[round.toString()] ?? []) as DraftPick[]
    for (const pick of roundPicks) {
      if (pick.currentOwner === manager.displayName) {
        myPicks.push({ round, pick })
      }
    }
  }

  const totalPicks = myPicks.length
  const tradedIn = myPicks.filter(p => p.pick.traded && p.pick.originalOwner !== manager.displayName).length
  const tradedAway = Object.values(data.picks).reduce((acc, roundPicks) => {
    return acc + (roundPicks as DraftPick[]).filter(
      p => p.originalOwner === manager.displayName && p.currentOwner !== manager.displayName
    ).length
  }, 0)

  // Keeper counts
  const keepersSelected = roster.filter(r => r.keeper_status === 'keeping').length
  const seventhKeeper = roster.filter(r => r.keeper_status === 'keeping-7th').length
  const naKeepers = roster.filter(r => r.keeper_status === 'keeping-na').length
  const notKeepingCount = roster.filter(r => r.keeper_status === 'not-keeping').length

  // Sort roster: keepers first, then 7th keeper, then NA, then undecided, then not-keeping
  const sortOrder: Record<string, number> = { 'keeping': 0, 'keeping-7th': 1, 'keeping-na': 2, 'undecided': 3, 'not-keeping': 4 }
  const sortedRoster = [...roster].sort((a, b) => {
    const aOrder = sortOrder[a.keeper_status] ?? 2
    const bOrder = sortOrder[b.keeper_status] ?? 2
    if (aOrder !== bOrder) return aOrder - bOrder
    return (a.keeper_cost_round ?? 99) - (b.keeper_cost_round ?? 99)
  })

  // Compute keeper-to-draft-pick assignments (display only)
  const keeperPickAssignments: Record<string, RosterPlayer> = {} // key: "round-slot"
  {
    // Regular keepers (keeping + keeping-7th) — assign to their keeper_cost_round
    const regularKeepers = roster.filter(
      r => (r.keeper_status === 'keeping' || r.keeper_status === 'keeping-7th') && r.keeper_cost_round
    )
    // Group by round
    const byRound: Record<number, RosterPlayer[]> = {}
    for (const k of regularKeepers) {
      const rd = k.keeper_cost_round!
      if (!byRound[rd]) byRound[rd] = []
      byRound[rd].push(k)
    }
    // For each round, assign to highest slot numbers (worst pick rule)
    for (const [rdStr, keepers] of Object.entries(byRound)) {
      const rd = Number(rdStr)
      const roundPicks = (data.picks[rdStr] ?? []) as DraftPick[]
      const myRoundPicks = roundPicks
        .filter(p => p.currentOwner === manager.displayName)
        .sort((a, b) => b.slot - a.slot) // highest slot first
      // Sort keepers by cost round (they're same round so just assign in order)
      for (let i = 0; i < keepers.length && i < myRoundPicks.length; i++) {
        keeperPickAssignments[`${rd}-${myRoundPicks[i].slot}`] = keepers[i]
      }
    }

    // NA keepers — assign to NA rounds 24-27, highest available slot
    const naKeepersRoster = roster.filter(r => r.keeper_status === 'keeping-na')
    const naRoundSlots: { round: number; slot: number }[] = []
    for (const naRd of data.naRounds) {
      const roundPicks = (data.picks[naRd.toString()] ?? []) as DraftPick[]
      const myNaPicks = roundPicks
        .filter(p => p.currentOwner === manager.displayName)
        .sort((a, b) => b.slot - a.slot) // highest slot first
      for (const p of myNaPicks) {
        naRoundSlots.push({ round: naRd, slot: p.slot })
      }
    }
    // Sort all NA slots: highest round first, then highest slot
    naRoundSlots.sort((a, b) => b.round - a.round || b.slot - a.slot)
    for (let i = 0; i < naKeepersRoster.length && i < naRoundSlots.length; i++) {
      const { round, slot } = naRoundSlots[i]
      keeperPickAssignments[`${round}-${slot}`] = naKeepersRoster[i]
    }
  }

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-[1000px] px-4 py-8 space-y-6">
        {/* Welcome Header */}
        <div className="dashboard-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-4 w-4 rounded-full ${colors?.dot}`} />
                <h1 className="text-2xl font-serif font-bold text-primary">
                  Welcome back, {manager.displayName}
                </h1>
                {manager.role === 'commissioner' && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded animate-pulse">
                    ⭐ COMMISSIONER
                  </span>
                )}
              </div>
              <p className={`text-sm font-mono ${colors?.text}`}>
                {manager.teamName}
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Draft Position: #{manager.draftPosition}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/team/${manager.teamSlug}`}
                className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-primary/30 rounded text-primary hover:bg-primary/10 transition-colors"
              >
                Team Page →
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-4">
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-primary font-mono">{totalPicks}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Total Picks</div>
          </div>
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-accent font-mono">{tradedIn}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Acquired</div>
          </div>
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-destructive font-mono">{tradedAway}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Traded Away</div>
          </div>
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-secondary font-mono">{keepersSelected}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Keepers</div>
          </div>
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400 font-mono">{seventhKeeper}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">7th Keeper</div>
          </div>
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 font-mono">{naKeepers}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">NA Slots</div>
          </div>
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-red-400 font-mono">{notKeepingCount}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Returning</div>
          </div>
        </div>

        {/* Keeper Selections */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-bold text-primary">
              🔒 KEEPER SELECTIONS
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-secondary">🔒 {keepersSelected}/{MAX_KEEPERS}</span>
              <span className="text-amber-400">⭐ {seventhKeeper}/1</span>
              <span className="text-blue-400">🔷 {naKeepers}/{MAX_NA}</span>
            </div>
          </div>

          {/* Keeper limit bars */}
          <div className="mb-4 space-y-2">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                <span>🔒 Keepers: {keepersSelected}/{MAX_KEEPERS}</span>
                <span>{MAX_KEEPERS - keepersSelected} remaining</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${keepersSelected >= MAX_KEEPERS ? 'bg-accent' : 'bg-secondary/60'}`}
                  style={{ width: `${(keepersSelected / MAX_KEEPERS) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                <span>🔷 Minor Leaguers (NA): {naKeepers}/{MAX_NA}</span>
                <span>{MAX_NA - naKeepers} remaining</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${naKeepers >= MAX_NA ? 'bg-accent' : 'bg-blue-500/60'}`}
                  style={{ width: `${(naKeepers / MAX_NA) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {rosterLoading ? (
            <p className="text-sm text-muted-foreground">Loading roster...</p>
          ) : sortedRoster.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm font-mono text-muted-foreground">
                No roster data yet. Roster import happens during keeper setup.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 relative">
              {/* Click-outside overlay when popover is open */}
              {openPopoverId && (
                <div className="fixed inset-0 z-40" onClick={() => setOpenPopoverId(null)} />
              )}
              {sortedRoster.map(rp => {
                if (!rp.players) return null
                const statusInfo = STATUS_DISPLAY[rp.keeper_status] ?? STATUS_DISPLAY.undecided
                const isUpdating = updatingId === rp.id
                const isPopoverOpen = openPopoverId === rp.id

                return (
                  <div key={rp.id} className="relative">
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-all cursor-pointer hover:scale-[1.005] active:scale-[0.995] ${statusInfo.bg} ${statusInfo.border} ${isUpdating ? 'opacity-60' : ''} ${isPopoverOpen ? 'ring-2 ring-primary/40' : ''}`}
                      onClick={() => !isUpdating && setOpenPopoverId(isPopoverOpen ? null : rp.id)}
                    >
                      <span className="text-lg shrink-0">{statusInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-bold text-foreground truncate">
                            {rp.players.full_name}
                          </span>
                          {isNAEligible(rp) && (
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded"
                              title={rp.players.na_eligibility_reason ?? 'NA eligible'}
                            >
                              NA
                            </span>
                          )}
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {rp.players.primary_position ?? '—'} · {rp.players.mlb_team ?? '—'}
                          {rp.keeper_cost_round && ` · Cost: Rd ${rp.keeper_cost_round}`}
                          {rp.keeper_cost_label && !rp.keeper_cost_round && ` · ${rp.keeper_cost_label}`}
                        </div>
                      </div>
                      {rp.players.fantasypros_ecr && (
                        <span className="text-xs font-mono text-accent shrink-0">
                          ECR #{rp.players.fantasypros_ecr}
                        </span>
                      )}
                    </div>
                    {isPopoverOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 rounded-md border border-border bg-card shadow-xl overflow-hidden">
                        {getStatusOptions(rp).map(opt => {
                          const display = STATUS_DISPLAY[opt.status] ?? STATUS_DISPLAY.undecided
                          const isCurrent = rp.keeper_status === opt.status
                          return (
                            <button
                              key={opt.status}
                              disabled={!opt.available && !isCurrent}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (opt.available || isCurrent) setKeeperStatus(rp, opt.status)
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                                isCurrent
                                  ? `${display.bg} ${display.border} border-l-2`
                                  : opt.available
                                    ? 'hover:bg-muted/50 border-l-2 border-transparent'
                                    : 'opacity-40 cursor-not-allowed border-l-2 border-transparent'
                              }`}
                            >
                              <span className="text-base shrink-0">{display.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isCurrent ? display.color : opt.available ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {display.label}
                                </span>
                                {!opt.available && !isCurrent && opt.reason && (
                                  <span className="text-[10px] font-mono text-muted-foreground/60 ml-2">
                                    — {opt.reason}
                                  </span>
                                )}
                              </div>
                              {isCurrent && (
                                <span className="text-[10px] font-mono text-primary shrink-0">✓ current</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <ValidateKeepers roster={roster} />
        </div>

        {/* Draft Picks */}
        <div className="dashboard-card p-6">
          <h2 className="text-lg font-serif font-bold text-primary mb-4">
            🎯 YOUR DRAFT PICKS
          </h2>

          {myPicks.length === 0 ? (
            <p className="text-sm font-mono text-muted-foreground">
              No picks found. Check back after draft trades are finalized.
            </p>
          ) : (
            <div className="space-y-2">
              {myPicks.map(({ round, pick }) => {
                const isNA = data.naRounds.includes(round)
                const isTraded = pick.traded && pick.originalOwner !== manager.displayName
                const originalColors = isTraded ? TEAM_COLORS[pick.originalOwner] : null
                const assignedKeeper = keeperPickAssignments[`${round}-${pick.slot}`]

                return (
                  <div
                    key={`${round}-${pick.slot}`}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-md border transition-colors ${
                      assignedKeeper
                        ? 'border-secondary/30 bg-secondary/5 opacity-80'
                        : isNA
                          ? 'border-amber-500/20 bg-amber-950/10'
                          : `${colors?.border} ${colors?.bg}`
                    } ${isTraded ? 'ring-1 ring-accent/20' : ''}`}
                  >
                    {/* Round number */}
                    <div className={`text-sm font-mono font-bold w-16 shrink-0 ${
                      isNA ? 'text-amber-400' : colors?.text
                    }`}>
                      Rd {round}
                      {isNA && <span className="text-[9px] text-amber-500 ml-1">NA</span>}
                    </div>

                    {/* Pick info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-foreground">
                          Pick {round}.{pick.slot}
                        </span>
                        {isTraded && (
                          <span className="text-xs font-mono text-accent">
                            ↔ from{' '}
                            <span className={originalColors?.text ?? 'text-muted-foreground'}>
                              {pick.originalOwner}
                            </span>
                          </span>
                        )}
                      </div>
                      {assignedKeeper && assignedKeeper.players && (
                        <div className="text-[11px] font-mono text-secondary mt-0.5">
                          🔒 {assignedKeeper.players.full_name}
                          {assignedKeeper.keeper_status === 'keeping-7th' && (
                            <span className="text-amber-400 ml-1">⭐</span>
                          )}
                          {assignedKeeper.keeper_status === 'keeping-na' && (
                            <span className="text-blue-400 ml-1">🔷</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      {assignedKeeper && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-secondary/15 text-secondary border border-secondary/20 rounded">
                          Keeper
                        </span>
                      )}
                      {isTraded && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-accent/15 text-accent border border-accent/20 rounded">
                          Traded
                        </span>
                      )}
                      {isNA && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded">
                          NA Only
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="flex items-center justify-center gap-4 py-4">
          <Link href="/teams" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
            👥 All Teams
          </Link>
          <span className="text-muted-foreground/30">•</span>
          <Link href="/draft-board" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
            🎯 Draft Board
          </Link>
          <span className="text-muted-foreground/30">•</span>
          <Link href="/trades" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
            🤝 Trades
          </Link>
          <span className="text-muted-foreground/30">•</span>
          <Link href="/keepers" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
            🔐 Keepers
          </Link>
        </div>
      </div>
    </main>
  )
}

function ValidateKeepers({ roster }: { roster: RosterPlayer[] }) {
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; messages: string[] } | null>(null)

  function validateKeepers() {
    const keepersSelected = roster.filter(r => r.keeper_status === 'keeping').length
    const seventhKeeper = roster.filter(r => r.keeper_status === 'keeping-7th')
    const naKeepers = roster.filter(r => r.keeper_status === 'keeping-na').length
    
    const errors: string[] = []
    const warnings: string[] = []

    // Check total keepers (keeping + keeping-7th) doesn't exceed 7
    const totalKeepers = keepersSelected + seventhKeeper.length
    if (totalKeepers > 7) {
      errors.push(`Too many total keepers: ${totalKeepers}/7 maximum`)
    }

    // Check regular keepers doesn't exceed 6
    if (keepersSelected > MAX_KEEPERS) {
      errors.push(`Too many regular keepers: ${keepersSelected}/${MAX_KEEPERS} maximum`)
    }

    // Check NA keepers doesn't exceed 4
    if (naKeepers > MAX_NA) {
      errors.push(`Too many NA keepers: ${naKeepers}/${MAX_NA} maximum`)
    }

    // Check at most 1 player has keeping-7th status
    if (seventhKeeper.length > 1) {
      errors.push(`Multiple 7th Keepers selected: ${seventhKeeper.length}/1 maximum`)
    }

    // Validate 7th keeper eligibility: player must be under MLB rookie thresholds
    // (fewer than 130 career AB AND fewer than 50 career IP, i.e. NA-eligible)
    if (seventhKeeper.length === 1) {
      const player = seventhKeeper[0]
      if (player.players) {
        if (!isNAEligible(player)) {
          errors.push(`❌ ${player.players.full_name} has exceeded qualifying thresholds (130 AB or 50 IP) — not eligible for 7th Keeper`)
        }
      }
    }

    const allMessages = [...errors, ...warnings]
    const isValid = errors.length === 0

    if (isValid && allMessages.length === 0) {
      const seventhName = seventhKeeper.length === 1 && seventhKeeper[0].players
        ? seventhKeeper[0].players.full_name
        : null
      if (seventhName) {
        allMessages.push(`✅ Keeper configuration is valid! 7th keeper (${seventhName}) confirmed eligible. Ready to submit by Feb 20.`)
      } else {
        allMessages.push("✅ Keeper configuration is valid! Ready to submit by Feb 20.")
      }
    }

    setValidationResult({ isValid, messages: allMessages })
  }

  return (
    <div className="mt-4">
      <button
        onClick={validateKeepers}
        className="w-full px-4 py-3 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 text-sm font-mono font-bold text-primary transition-colors"
      >
        ✅ Validate Keeper Configuration
      </button>
      
      {validationResult && (
        <div className={`mt-3 px-4 py-3 rounded-md text-sm font-mono ${
          validationResult.isValid 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {validationResult.messages.map((message, index) => (
            <div key={index} className={index > 0 ? 'mt-2' : ''}>
              {message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border border-destructive/30 rounded text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
    >
      Logout
    </button>
  )
}
