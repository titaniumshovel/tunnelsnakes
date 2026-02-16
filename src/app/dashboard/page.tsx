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
  players: {
    id: string
    full_name: string
    position: string | null
    mlb_team: string | null
    ecr_overall: number | null
  } | null
}

const MAX_KEEPERS = 6
const MAX_NA = 4

const STATUS_CYCLE = ['undecided', 'keeping', 'not-keeping'] as const
const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  keeping: { icon: '🔒', label: 'KEEPING', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
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
    const res = await fetch('/api/keepers')
    if (res.ok) {
      const data = await res.json()
      setRoster(data)
    }
    setRosterLoading(false)
  }, [])

  useEffect(() => {
    if (manager) {
      fetchRoster()
    }
  }, [manager, fetchRoster])

  async function cycleKeeperStatus(rp: RosterPlayer) {
    // Determine next status in cycle
    const currentIdx = STATUS_CYCLE.indexOf(rp.keeper_status as typeof STATUS_CYCLE[number])
    const nextIdx = (currentIdx + 1) % STATUS_CYCLE.length
    const nextStatus = STATUS_CYCLE[nextIdx]

    // Check limits before allowing "keeping"
    if (nextStatus === 'keeping') {
      const currentKeepers = roster.filter(r => r.keeper_status === 'keeping').length
      if (currentKeepers >= MAX_KEEPERS) {
        // Can't add more keepers
        return
      }
    }

    setUpdatingId(rp.id)
    const res = await fetch('/api/keepers', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roster_player_id: rp.id, keeper_status: nextStatus }),
    })

    if (res.ok) {
      // Update local state immediately
      setRoster(prev => prev.map(r => r.id === rp.id ? { ...r, keeper_status: nextStatus } : r))
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⚡</div>
          <p className="text-sm font-mono text-primary vault-glow terminal-cursor">
            Loading terminal
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
  const naKeepers = roster.filter(r => r.keeper_status === 'keeping-na').length
  const notKeepingCount = roster.filter(r => r.keeper_status === 'not-keeping').length

  // Sort roster: keepers first, then NA, then undecided, then not-keeping
  const sortOrder: Record<string, number> = { 'keeping': 0, 'keeping-na': 1, 'undecided': 2, 'not-keeping': 3 }
  const sortedRoster = [...roster].sort((a, b) => {
    const aOrder = sortOrder[a.keeper_status] ?? 2
    const bOrder = sortOrder[b.keeper_status] ?? 2
    if (aOrder !== bOrder) return aOrder - bOrder
    return (a.keeper_cost_round ?? 99) - (b.keeper_cost_round ?? 99)
  })

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-[1000px] px-4 py-8 space-y-6">
        {/* Welcome Header */}
        <div className="dashboard-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-4 w-4 rounded-full ${colors?.dot}`} />
                <h1 className="text-2xl font-bold text-primary vault-glow font-mono">
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          <div className="dashboard-card p-4 text-center">
            <div className="text-2xl font-bold text-primary vault-glow font-mono">{totalPicks}</div>
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
            <div className="text-2xl font-bold text-green-400 font-mono">{keepersSelected}</div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Keepers</div>
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
            <h2 className="text-lg font-bold text-primary vault-glow font-mono">
              🔒 KEEPER SELECTIONS
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-green-400">🔒 {keepersSelected}/{MAX_KEEPERS}</span>
              <span className="text-blue-400">🔷 {naKeepers}/{MAX_NA}</span>
            </div>
          </div>

          {/* Keeper limit bar */}
          <div className="mb-4">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500/60 rounded-full transition-all duration-300"
                style={{ width: `${(keepersSelected / MAX_KEEPERS) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
              <span>{keepersSelected} of {MAX_KEEPERS} keeper slots used</span>
              <span>{MAX_KEEPERS - keepersSelected} remaining</span>
            </div>
          </div>

          {rosterLoading ? (
            <p className="text-sm font-mono text-muted-foreground terminal-cursor">Loading roster...</p>
          ) : sortedRoster.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm font-mono text-muted-foreground">
                No roster data yet. Roster import happens during keeper setup.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedRoster.map(rp => {
                if (!rp.players) return null
                const statusInfo = STATUS_DISPLAY[rp.keeper_status] ?? STATUS_DISPLAY.undecided
                const isUpdating = updatingId === rp.id

                return (
                  <div
                    key={rp.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-all cursor-pointer hover:scale-[1.005] active:scale-[0.995] ${statusInfo.bg} ${statusInfo.border} ${isUpdating ? 'opacity-60' : ''}`}
                    onClick={() => !isUpdating && cycleKeeperStatus(rp)}
                    title="Click to cycle: Undecided → Keeping → Not Keeping"
                  >
                    <span className="text-lg shrink-0">{statusInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-bold text-foreground truncate">
                          {rp.players.full_name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {rp.players.position ?? '—'} · {rp.players.mlb_team ?? '—'}
                        {rp.keeper_cost_round && ` · Cost: Rd ${rp.keeper_cost_round}`}
                        {rp.keeper_cost_label && !rp.keeper_cost_round && ` · ${rp.keeper_cost_label}`}
                      </div>
                    </div>
                    {rp.players.ecr_overall && (
                      <span className="text-xs font-mono text-accent shrink-0">
                        ECR #{rp.players.ecr_overall}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-3 text-xs font-mono text-muted-foreground/60 text-center">
            Click any player to cycle: ⏳ Undecided → 🔒 Keeping → ❌ Not Keeping
          </div>
        </div>

        {/* Draft Picks */}
        <div className="dashboard-card p-6">
          <h2 className="text-lg font-bold text-primary vault-glow font-mono mb-4">
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

                return (
                  <div
                    key={`${round}-${pick.slot}`}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-md border transition-colors ${
                      isNA
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
                    <div className="flex-1">
                      <span className="text-xs font-mono text-foreground">
                        Pick {round}.{pick.slot}
                      </span>
                      {isTraded && (
                        <span className="text-xs font-mono text-accent ml-2">
                          ↔ from{' '}
                          <span className={originalColors?.text ?? 'text-muted-foreground'}>
                            {pick.originalOwner}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
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
