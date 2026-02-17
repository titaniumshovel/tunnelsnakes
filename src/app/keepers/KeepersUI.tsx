'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { MANAGERS, TEAM_COLORS, getManagerByYahooTeamKey, type Manager } from '@/data/managers'

type RosterPlayer = {
  id: string
  keeper_status: string
  keeper_cost_round: number | null
  keeper_cost_label: string | null
  yahoo_team_key: string
  players: {
    id: string
    full_name: string
    primary_position: string | null
    mlb_team: string | null
    fantasypros_ecr: number | null
    keeper_cost_round: number | null
    keeper_cost_label: string | null
    is_na_eligible: boolean | null
    na_eligibility_reason: string | null
  } | null
}

const KEEPER_DEADLINE = new Date('2026-02-20T23:59:59-05:00')
const MAX_KEEPERS = 6
const MAX_NA = 4

const STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  keeping: { icon: '🔒', label: 'Locked', color: 'text-secondary' },
  'keeping-7th': { icon: '⭐', label: '7th Keeper', color: 'text-amber-400' },
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

  // Group roster by manager using yahoo_team_key
  const teamKeepers = useMemo(() => {
    const grouped: Record<string, RosterPlayer[]> = {}
    for (const mgr of MANAGERS) {
      grouped[mgr.displayName] = []
    }

    for (const rp of rosterData) {
      const mgr = getManagerByYahooTeamKey(rp.yahoo_team_key)
      if (mgr && grouped[mgr.displayName]) {
        grouped[mgr.displayName].push(rp)
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
      mgrs.sort((a, b) => {
        const aKeepers = (teamKeepers[a.displayName] ?? []).filter(rp => rp.keeper_status === 'keeping' || rp.keeper_status === 'keeping-7th' || rp.keeper_status === 'keeping-na').length
        const bKeepers = (teamKeepers[b.displayName] ?? []).filter(rp => rp.keeper_status === 'keeping' || rp.keeper_status === 'keeping-7th' || rp.keeper_status === 'keeping-na').length
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
          <p className="text-sm font-semibold text-primary">Loading keeper data</p>
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
              <h1 className="text-2xl font-serif font-bold text-primary flex items-center gap-3">
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
                  <div className="text-3xl sm:text-4xl font-bold text-primary font-mono">
                    {String(value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs font-mono text-muted-foreground mt-2">
            February 20, 2026 • {MAX_KEEPERS} keepers + {MAX_NA} NA slots per team
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
            const seventhKeepers = roster.filter(rp => rp.keeper_status === 'keeping-7th')
            const naKeepers = roster.filter(rp => rp.keeper_status === 'keeping-na')
            const undecided = roster.filter(rp => rp.keeper_status === 'undecided')
            const notKeeping = roster.filter(rp => rp.keeper_status === 'not-keeping')
            const hasData = roster.length > 0
            const isExpansion = mgr.yahooTeamKey.endsWith('.t.11') || mgr.yahooTeamKey.endsWith('.t.12')

            return (
              <div key={mgr.teamSlug} className={`dashboard-card p-4 ${colors?.border} ${colors?.bg}`}>
                {/* Team Header */}
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/team/${mgr.teamSlug}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className={`w-3 h-3 rounded-full ${colors?.dot}`} />
                    <div>
                      <div className={`text-sm font-mono font-bold ${colors?.text}`}>{mgr.teamName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {mgr.displayName} • #{mgr.draftPosition}
                        {isExpansion && ' • 🆕 Expansion'}
                      </div>
                    </div>
                  </Link>
                  {hasData && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-secondary">🔒 {keepers.length}/{MAX_KEEPERS}</span>
                      <span className="text-blue-400">🔷 {naKeepers.length}/{MAX_NA}</span>
                    </div>
                  )}
                  {!hasData && !isExpansion && (
                    <div className="text-[10px] font-mono text-muted-foreground/50">
                      {roster.length} players
                    </div>
                  )}
                </div>

                {isExpansion && !hasData ? (
                  <div className="text-center py-4">
                    <p className="text-sm font-mono text-muted-foreground/60">🆕 Expansion team — no 2025 roster</p>
                  </div>
                ) : !hasData ? (
                  <div className="text-center py-4">
                    <p className="text-sm font-mono text-muted-foreground/60">No selections yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Show keepers first, then 7th keeper, then NA, then undecided (limited), then not-keeping (limited) */}
                    {[...keepers, ...seventhKeepers, ...naKeepers].map(rp => {
                      if (!rp.players) return null
                      const statusInfo = STATUS_DISPLAY[rp.keeper_status] ?? STATUS_DISPLAY.undecided
                      const costRound = rp.keeper_cost_round ?? rp.players.keeper_cost_round
                      const costLabel = rp.keeper_cost_label ?? rp.players.keeper_cost_label
                      return (
                        <div key={rp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/30">
                          <span className="text-sm">{statusInfo.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground truncate">
                              <span className="truncate">{rp.players.full_name}</span>
                              {rp.players.is_na_eligible && (
                                <span
                                  className="shrink-0 px-1 py-0.5 text-[8px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded leading-none"
                                  title={rp.players.na_eligibility_reason ?? 'NA eligible'}
                                >
                                  NA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {rp.players.primary_position ?? '—'} · {rp.players.mlb_team ?? '—'}
                              {costRound && ` · Rd ${costRound}`}
                              {costLabel && !costRound && ` · ${costLabel}`}
                            </div>
                          </div>
                          {rp.players.fantasypros_ecr && (
                            <span className="text-[10px] font-mono text-accent shrink-0">
                              ECR #{rp.players.fantasypros_ecr}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {/* Undecided count */}
                    {undecided.length > 0 && keepers.length + naKeepers.length > 0 && (
                      <div className="text-center py-1">
                        <span className="text-[10px] font-mono text-amber-400/70">
                          + {undecided.length} undecided
                        </span>
                      </div>
                    )}
                    {/* If no keepers locked, show first few undecided */}
                    {keepers.length === 0 && naKeepers.length === 0 && undecided.slice(0, 5).map(rp => {
                      if (!rp.players) return null
                      const costRound = rp.keeper_cost_round ?? rp.players.keeper_cost_round
                      const costLabel = rp.keeper_cost_label ?? rp.players.keeper_cost_label
                      return (
                        <div key={rp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/30">
                          <span className="text-sm">⏳</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground truncate">
                              <span className="truncate">{rp.players.full_name}</span>
                              {rp.players.is_na_eligible && (
                                <span
                                  className="shrink-0 px-1 py-0.5 text-[8px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded leading-none"
                                  title={rp.players.na_eligibility_reason ?? 'NA eligible'}
                                >
                                  NA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {rp.players.primary_position ?? '—'} · {rp.players.mlb_team ?? '—'}
                              {costRound && ` · Rd ${costRound}`}
                              {costLabel && !costRound && ` · ${costLabel}`}
                            </div>
                          </div>
                          {rp.players.fantasypros_ecr && (
                            <span className="text-[10px] font-mono text-accent shrink-0">
                              ECR #{rp.players.fantasypros_ecr}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {keepers.length === 0 && naKeepers.length === 0 && undecided.length > 5 && (
                      <div className="text-center py-1">
                        <span className="text-[10px] font-mono text-muted-foreground/60">
                          + {undecided.length - 5} more undecided
                        </span>
                      </div>
                    )}
                    {/* Not-keeping count */}
                    {notKeeping.length > 0 && (
                      <div className="text-center py-1">
                        <span className="text-[10px] font-mono text-red-400/70">
                          ❌ {notKeeping.length} cut
                        </span>
                      </div>
                    )}
                    {/* Roster total */}
                    <div className="text-center pt-1 border-t border-primary/5">
                      <Link
                        href={`/team/${mgr.teamSlug}`}
                        className="text-[10px] font-mono text-primary/60 hover:text-primary transition-colors"
                      >
                        View full roster ({roster.length} players) →
                      </Link>
                    </div>
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
                const costRound = rp.keeper_cost_round ?? rp.players.keeper_cost_round
                return (
                  <div key={rp.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/5 border border-red-500/15">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground truncate">
                        <span className="truncate">{rp.players.full_name}</span>
                        {rp.players.is_na_eligible && (
                          <span
                            className="shrink-0 px-1 py-0.5 text-[8px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded leading-none"
                            title={rp.players.na_eligibility_reason ?? 'NA eligible'}
                          >
                            NA
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {rp.players.primary_position} · {rp.players.mlb_team}
                        {costRound && ` · Was Rd ${costRound}`}
                      </div>
                    </div>
                    {rp.players.fantasypros_ecr && (
                      <span className="text-[10px] font-mono text-accent shrink-0">
                        ECR #{rp.players.fantasypros_ecr}
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
