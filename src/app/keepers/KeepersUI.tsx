'use client'

import { useEffect, useState, useMemo } from 'react'
import { MANAGERS, TEAM_COLORS, type Manager } from '@/data/managers'

type RosterPlayer = {
  id: string
  keeper_status: string
  keeper_cost_round: number | null
  keeper_cost_label: string | null
  yahoo_team_key: string
  players: {
    id: string
    full_name: string
    position: string | null
    mlb_team: string | null
    ecr_overall: number | null
  } | null
}

const KEEPER_DEADLINE = new Date('2026-03-01T23:59:59-05:00')
const MAX_KEEPERS = 6
const MAX_NA = 4

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  keeping: { icon: '🔒', label: 'Locked', color: 'text-green-400' },
  'keeping-na': { icon: '🔷', label: 'NA Keeper', color: 'text-blue-400' },
  undecided: { icon: '⏳', label: 'Undecided', color: 'text-amber-400' },
  'not-keeping': { icon: '❌', label: 'Not Keeping', color: 'text-red-400' },
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, expired: false }
}

export function KeepersUI() {
  const [rosterData, setRosterData] = useState<RosterPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'team' | 'round' | 'ecr'>('team')
  const countdown = useCountdown(KEEPER_DEADLINE)

  useEffect(() => {
    async function fetchKeepers() {
      const res = await fetch('/api/keepers')
      if (res.ok) {
        const data = await res.json()
        setRosterData(data)
      }
      setLoading(false)
    }
    fetchKeepers()
  }, [])

  // Group roster by manager (by matching yahoo_team_key or manager email patterns)
  const teamKeepers = useMemo(() => {
    const grouped: Record<string, RosterPlayer[]> = {}
    for (const mgr of MANAGERS) {
      grouped[mgr.displayName] = []
    }

    for (const rp of rosterData) {
      // Try to match by team key — for now Chris's data will be here
      // Default to Chris since that's the only team with data
      const managerName = 'Chris' // TODO: match by yahoo_team_key when more teams have data
      if (grouped[managerName]) {
        grouped[managerName].push(rp)
      }
    }

    return grouped
  }, [rosterData])

  // Players returning to draft pool
  const returningToDraft = rosterData.filter(rp => rp.keeper_status === 'not-keeping' && rp.players)

  // Sort managers
  const sortedManagers = useMemo(() => {
    const mgrs = [...MANAGERS]
    if (sortBy === 'team') {
      mgrs.sort((a, b) => a.teamName.localeCompare(b.teamName))
    } else if (sortBy === 'round' || sortBy === 'ecr') {
      // Sort by number of keepers selected (descending), then team name
      mgrs.sort((a, b) => {
        const aKeepers = (teamKeepers[a.displayName] ?? []).filter(rp => rp.keeper_status === 'keeping' || rp.keeper_status === 'keeping-na').length
        const bKeepers = (teamKeepers[b.displayName] ?? []).filter(rp => rp.keeper_status === 'keeping' || rp.keeper_status === 'keeping-na').length
        if (bKeepers !== aKeepers) return bKeepers - aKeepers
        return a.teamName.localeCompare(b.teamName)
      })
    }
    return mgrs
  }, [sortBy, teamKeepers])

  if (loading) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">🔐</div>
          <p className="text-sm font-mono text-primary vault-glow terminal-cursor">Loading keeper data</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-[1200px] px-4 py-8 space-y-6">
        {/* Header */}
        <div className="dashboard-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary vault-glow font-mono flex items-center gap-3">
                <span className="text-3xl">🔐</span>
                KEEPER TRACKER
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                All 12 teams — keeper selections &amp; draft pool returns
              </p>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="dashboard-card p-6 text-center border-accent/20">
          <div className="text-xs font-mono text-accent uppercase tracking-widest mb-2">
            ⏰ KEEPER DEADLINE
          </div>
          {countdown.expired ? (
            <div className="text-2xl font-bold text-red-400 font-mono">DEADLINE PASSED</div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              {[
                { value: countdown.days, label: 'DAYS' },
                { value: countdown.hours, label: 'HRS' },
                { value: countdown.minutes, label: 'MIN' },
                { value: countdown.seconds, label: 'SEC' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary vault-glow font-mono">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs font-mono text-muted-foreground mt-2">
            March 1, 2026 • {MAX_KEEPERS} keepers + {MAX_NA} NA slots per team
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Sort:</span>
          {([['team', 'Team Name'], ['round', 'Most Locked'], ['ecr', 'Progress']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                sortBy === key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedManagers.map((mgr) => {
            const colors = TEAM_COLORS[mgr.colorKey]
            const roster = teamKeepers[mgr.displayName] ?? []
            const keepers = roster.filter(rp => rp.keeper_status === 'keeping')
            const naKeepers = roster.filter(rp => rp.keeper_status === 'keeping-na')
            const undecided = roster.filter(rp => rp.keeper_status === 'undecided')
            const notKeeping = roster.filter(rp => rp.keeper_status === 'not-keeping')
            const hasData = roster.length > 0

            return (
              <div key={mgr.teamSlug} className={`dashboard-card p-4 ${colors?.border} ${colors?.bg}`}>
                {/* Team Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colors?.dot}`} />
                    <div>
                      <div className={`text-sm font-mono font-bold ${colors?.text}`}>{mgr.teamName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{mgr.displayName} • #{mgr.draftPosition}</div>
                    </div>
                  </div>
                  {hasData && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-green-400">🔒 {keepers.length}/{MAX_KEEPERS}</span>
                      <span className="text-blue-400">🔷 {naKeepers.length}/{MAX_NA}</span>
                    </div>
                  )}
                </div>

                {!hasData ? (
                  <div className="text-center py-4">
                    <p className="text-sm font-mono text-muted-foreground/60">No selections yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Show keepers first, then NA, then undecided, then not-keeping */}
                    {[...keepers, ...naKeepers, ...undecided, ...notKeeping].map(rp => {
                      if (!rp.players) return null
                      const statusInfo = STATUS_DISPLAY[rp.keeper_status] ?? STATUS_DISPLAY.undecided
                      return (
                        <div key={rp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/30">
                          <span className="text-sm">{statusInfo.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono font-bold text-foreground truncate">
                              {rp.players.full_name}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {rp.players.position ?? '—'} · {rp.players.mlb_team ?? '—'}
                              {rp.keeper_cost_round && ` · Rd ${rp.keeper_cost_round}`}
                              {rp.keeper_cost_label && !rp.keeper_cost_round && ` · ${rp.keeper_cost_label}`}
                            </div>
                          </div>
                          {rp.players.ecr_overall && (
                            <span className="text-[10px] font-mono text-accent shrink-0">
                              ECR #{rp.players.ecr_overall}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Players Returning to Draft Pool */}
        {returningToDraft.length > 0 && (
          <div className="dashboard-card p-6">
            <h2 className="text-lg font-bold text-destructive font-mono mb-4 flex items-center gap-2">
              ❌ RETURNING TO DRAFT POOL
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {returningToDraft.map(rp => {
                if (!rp.players) return null
                return (
                  <div key={rp.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/5 border border-red-500/15">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-bold text-foreground truncate">
                        {rp.players.full_name}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {rp.players.position} · {rp.players.mlb_team}
                        {rp.keeper_cost_round && ` · Was Rd ${rp.keeper_cost_round}`}
                      </div>
                    </div>
                    {rp.players.ecr_overall && (
                      <span className="text-[10px] font-mono text-accent shrink-0">
                        ECR #{rp.players.ecr_overall}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
