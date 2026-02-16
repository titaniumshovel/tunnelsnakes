'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MANAGERS, TEAM_COLORS, getManagerByEmail, type Manager } from '@/data/managers'
import { motion, AnimatePresence } from 'framer-motion'
import draftBoard from '@/data/draft-board.json'

type TradePickInfo = {
  round: number
  slot: number
}

type TradeOffer = {
  id: string
  from_team_name: string
  target_team: string | null
  status: string
  trade_type: string | null
  description: string | null
  teams_involved: string[]
  offering_picks: TradePickInfo[]
  requesting_picks: TradePickInfo[]
  offering_players: string[]
  requesting_players: string[]
  offer_text: string | null
  message: string | null
  from_name: string | null
  from_email: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  reactions: Array<{ emoji: string; user_email: string }>
  comments: Array<{ id: string; user_email: string; user_name: string | null; comment: string; created_at: string }>
}

type TradedPick = {
  round: number
  slot: number
  originalOwner: string
  currentOwner: string
  path: string[]
}

const REACTION_EMOJI = ['🔥', '💀', '👍', '👎', '😂', '🤔'] as const
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'COMPLETED', color: 'text-secondary', bg: 'bg-secondary/15 border-secondary/30' },
  approved: { label: 'APPROVED', color: 'text-secondary', bg: 'bg-secondary/15 border-secondary/30' },
  pending: { label: 'PENDING', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  submitted: { label: 'SUBMITTED', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  rejected: { label: 'REJECTED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  declined: { label: 'DECLINED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  vetoed: { label: 'VETOED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
}

type FilterTab = 'all' | 'offseason' | 'midseason' | 'pending' | 'picktrail' | 'propose'

function getManagerByTeamName(teamName: string): Manager | undefined {
  return MANAGERS.find(m => m.teamName === teamName)
}

function getManagerByDisplayName(name: string): Manager | undefined {
  return MANAGERS.find(m => m.displayName === name)
}

function getTeamColorForName(name: string) {
  const mgr = getManagerByTeamName(name) ?? getManagerByDisplayName(name)
  if (mgr) return TEAM_COLORS[mgr.colorKey]
  return null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPickList(picks: TradePickInfo[]): string {
  if (!picks || picks.length === 0) return ''
  return picks.map(p => `Rd ${p.round}.${p.slot}`).join(', ')
}

// Extract all traded picks from draft-board.json
function getTradedPicks(): TradedPick[] {
  const picks: TradedPick[] = []
  const boardPicks = draftBoard.picks as Record<string, Array<{
    slot: number
    originalOwner: string
    currentOwner: string
    traded: boolean
    path: string[]
  }>>

  for (const [roundStr, roundPicks] of Object.entries(boardPicks)) {
    const round = parseInt(roundStr)
    for (const p of roundPicks) {
      if (p.traded && p.path.length > 1) {
        picks.push({
          round,
          slot: p.slot,
          originalOwner: p.originalOwner,
          currentOwner: p.currentOwner,
          path: p.path,
        })
      }
    }
  }
  return picks
}

export function TradesUI() {
  const [trades, setTrades] = useState<TradeOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [manager, setManager] = useState<Manager | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  // Public offer form state (📝 PROPOSE tab)
  const [offerTeam, setOfferTeam] = useState('')
  const [offerName, setOfferName] = useState('')
  const [offerEmail, setOfferEmail] = useState('')
  const [offerText, setOfferText] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [offerStatus, setOfferStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [offerError, setOfferError] = useState<string | null>(null)

  const fetchTrades = useCallback(async () => {
    const res = await fetch('/api/trades')
    if (res.ok) {
      const data = await res.json()
      setTrades(data)
    }
    setLoading(false)
  }, [])

  // Read URL tab param
  const searchParams = useSearchParams()
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'propose') {
      setFilter('propose')
    }
  }, [searchParams])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email)
        setManager(getManagerByEmail(user.email) ?? null)
      }
    })
    fetchTrades()
  }, [fetchTrades])

  async function handleReaction(tradeId: string, emoji: string) {
    if (!userEmail) return
    const res = await fetch(`/api/trades/${tradeId}/react`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok) {
      await fetchTrades()
    }
  }

  async function handleComment(tradeId: string, comment: string) {
    if (!userEmail || !comment.trim()) return
    const res = await fetch(`/api/trades/${tradeId}/comment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ comment }),
    })
    if (res.ok) {
      await fetchTrades()
    }
  }

  async function handleStatusChange(tradeId: string, newStatus: string) {
    const res = await fetch('/api/trades', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: tradeId, status: newStatus }),
    })
    if (res.ok) {
      await fetchTrades()
    }
  }

  async function handleOffer(e: React.FormEvent) {
    e.preventDefault()
    setOfferStatus('submitting')
    setOfferError(null)

    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        teamName: offerTeam,
        displayName: offerName,
        email: offerEmail,
        offerText,
        message: offerMessage,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      setOfferStatus('error')
      setOfferError(text || 'Something went wrong. Please try again.')
      return
    }

    setOfferStatus('success')
  }

  const pendingCount = trades.filter(t => t.status === 'pending' || t.status === 'submitted').length

  const filtered = trades.filter(t => {
    if (filter === 'offseason') return t.trade_type === 'offseason'
    if (filter === 'midseason') return t.trade_type === 'midseason'
    if (filter === 'pending') return t.status === 'pending' || t.status === 'submitted'
    return true // 'all' and 'picktrail' show all (picktrail handled separately)
  })

  const isCommissioner = manager?.role === 'commissioner'

  if (loading) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">🤝</div>
          <p className="text-sm font-semibold text-primary">Loading trade center</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-[1000px] px-4 py-8 space-y-6">
        {/* Header */}
        <div className="dashboard-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold text-primary flex items-center gap-3">
                <span className="text-3xl">🤝</span>
                TRADE CENTER
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                League trades, proposals, and hot takes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono text-muted-foreground">
                {trades.length} trade{trades.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {!userEmail && (
          <div className="dashboard-card p-4 text-center">
            <p className="text-sm font-mono text-muted-foreground">
              🔐 <a href="/login" className="text-primary hover:text-primary/80 underline">Log in</a> to react and comment on trades
            </p>
          </div>
        )}

        {/* Propose Trade CTA */}
        <button
          onClick={() => setFilter('propose')}
          className={`w-full py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
            filter === 'propose'
              ? 'bg-accent text-white shadow-lg shadow-accent/25 border-2 border-accent'
              : 'bg-gradient-to-r from-accent/15 to-accent/5 text-accent border-2 border-accent/40 hover:border-accent hover:bg-accent/20 hover:shadow-md'
          }`}
        >
          <span className="text-lg">⚾</span>
          Propose a Trade
          <span className="text-lg">→</span>
        </button>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            ['all', 'ALL'],
            ['offseason', '2026 OFFSEASON'],
            ['midseason', '2025 IN-SEASON'],
            ['pending', 'PENDING'],
            ['picktrail', '📍 PICK TRAIL'],
          ] as [FilterTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                filter === key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
              }`}
            >
              {label}
              {key === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
                  {pendingCount}
                </span>
              )}
              {key === 'midseason' && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">
                  {trades.filter(t => t.trade_type === 'midseason').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content: propose form, pick trail, or trade feed */}
        {filter === 'propose' ? (
          <div className="dashboard-card p-6">
            <h2 className="text-lg font-bold text-primary font-serif mb-2 flex items-center gap-2">
              ⚾ Propose a Trade
            </h2>
            <p className="text-sm text-muted-foreground font-mono mb-6">
              Put your offer in plain English. Include picks, players, whatever you&apos;ve got.
              The Commissioner will review your proposal.
            </p>

            {offerStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">⚾</div>
                <div className="font-bold text-primary text-lg uppercase tracking-wider">Trade Proposal Submitted!</div>
                <p className="mt-2 text-sm text-muted-foreground font-mono">
                  The Commissioner will review your proposal and get back to you.
                </p>
                <button
                  onClick={() => {
                    setOfferStatus('idle')
                    setOfferTeam('')
                    setOfferName('')
                    setOfferEmail('')
                    setOfferText('')
                    setOfferMessage('')
                  }}
                  className="mt-4 px-4 py-2 rounded-md border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  Submit Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleOffer} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">Your Team</label>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    value={offerTeam}
                    onChange={(e) => setOfferTeam(e.target.value)}
                    required
                  >
                    <option value="">Select your team…</option>
                    {MANAGERS.map((m) => (
                      <option key={m.teamSlug} value={m.teamName}>{m.teamName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">
                    Your Name <span className="normal-case text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    value={offerName}
                    onChange={(e) => setOfferName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">
                    Email <span className="normal-case text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    value={offerEmail}
                    onChange={(e) => setOfferEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">Your Offer</label>
                  <textarea
                    className="mt-1 w-full min-h-[120px] rounded-md border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    value={offerText}
                    onChange={(e) => setOfferText(e.target.value)}
                    required
                    placeholder="Include picks, players, whatever you've got."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">
                    Additional Notes <span className="normal-case text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="mt-1 w-full min-h-[80px] rounded-md border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="Anything else the Commissioner should know..."
                  />
                </div>

                {offerStatus === 'error' && (
                  <p className="text-sm text-red-500 font-mono">&gt; ERROR: {offerError}</p>
                )}

                <button
                  type="submit"
                  disabled={offerStatus === 'submitting'}
                  className="w-full px-4 py-3 rounded-md bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {offerStatus === 'submitting' ? '⏳ SUBMITTING...' : '⚾ SUBMIT TRADE PROPOSAL'}
                </button>
              </form>
            )}
          </div>
        ) : filter === 'picktrail' ? (
          <PickOriginTrail />
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="dashboard-card p-8 text-center">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-sm font-mono text-muted-foreground">No trades found</p>
              </div>
            ) : (
              filtered.map((trade) => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  userEmail={userEmail}
                  isCommissioner={isCommissioner}
                  expandedComments={expandedComments}
                  toggleComments={(id) => {
                    setExpandedComments(prev => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }}
                  onReact={handleReaction}
                  onComment={handleComment}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}

// ============================================
// Pick Origin Trail Component
// ============================================
function PickOriginTrail() {
  const tradedPicks = useMemo(() => getTradedPicks(), [])
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [expandedPick, setExpandedPick] = useState<string | null>(null)

  const owners = useMemo(() => {
    const set = new Set<string>()
    for (const p of tradedPicks) {
      set.add(p.currentOwner)
      set.add(p.originalOwner)
      for (const name of p.path) set.add(name)
    }
    return Array.from(set).sort()
  }, [tradedPicks])

  const filteredPicks = useMemo(() => {
    if (teamFilter === 'all') return tradedPicks
    return tradedPicks.filter(p =>
      p.currentOwner === teamFilter ||
      p.originalOwner === teamFilter ||
      p.path.includes(teamFilter)
    )
  }, [tradedPicks, teamFilter])

  // Group by current owner
  const grouped = useMemo(() => {
    const map = new Map<string, TradedPick[]>()
    for (const p of filteredPicks) {
      const key = p.currentOwner
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    // Sort groups by owner name, sort picks within each group
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    for (const [, picks] of entries) {
      picks.sort((a, b) => a.round - b.round || a.slot - b.slot)
    }
    return entries
  }, [filteredPicks])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="dashboard-card p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-primary font-mono flex items-center gap-2">
              📍 Pick Origin Trail
            </h2>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              {tradedPicks.length} picks changed hands across the offseason. Click any pick to trace its journey.
            </p>
          </div>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="all">All Teams</option>
            {owners.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Quick stats */}
        {teamFilter !== 'all' && (
          <div className="mt-3 flex gap-4 text-xs font-mono">
            <span className="text-secondary">
              ↙ Acquired: {filteredPicks.filter(p => p.currentOwner === teamFilter).length}
            </span>
            <span className="text-red-400">
              ↗ Traded away: {filteredPicks.filter(p => p.originalOwner === teamFilter && p.currentOwner !== teamFilter).length}
            </span>
            <span className="text-blue-400">
              ↔ Passed through: {filteredPicks.filter(p => p.path.includes(teamFilter) && p.originalOwner !== teamFilter && p.currentOwner !== teamFilter).length}
            </span>
          </div>
        )}
      </div>

      {/* Pick Grid by Owner */}
      {grouped.map(([owner, picks]) => {
        const ownerColors = TEAM_COLORS[owner]
        return (
          <div key={owner} className="dashboard-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-3 h-3 rounded-full ${ownerColors?.dot ?? 'bg-muted-foreground'}`} />
              <span className={`text-sm font-mono font-bold ${ownerColors?.text ?? 'text-foreground'}`}>
                {owner}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                — {picks.length} pick{picks.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {picks.map(pick => {
                const pickKey = `${pick.round}.${pick.slot}`
                const isExpanded = expandedPick === pickKey
                const origColors = TEAM_COLORS[pick.originalOwner]

                return (
                  <button
                    key={pickKey}
                    onClick={() => setExpandedPick(isExpanded ? null : pickKey)}
                    className={`text-left rounded-md border p-2 transition-all ${
                      isExpanded
                        ? `${ownerColors?.bg ?? 'bg-secondary'} ${ownerColors?.border ?? 'border-border'}`
                        : 'bg-secondary/50 border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-foreground">
                        Rd {pick.round}.{pick.slot}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${origColors?.dot ?? 'bg-muted-foreground'}`}
                        title={`Originally: ${pick.originalOwner}`} />
                    </div>
                    {isExpanded && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {pick.path.map((name, i) => {
                            const colors = TEAM_COLORS[name]
                            return (
                              <span key={i} className="flex items-center gap-1">
                                {i > 0 && <span className="text-muted-foreground text-[10px]">→</span>}
                                <span className={`text-[11px] font-mono font-bold ${colors?.text ?? 'text-foreground'}`}>
                                  {name}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {pick.path.length - 1} trade{pick.path.length - 1 !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {filteredPicks.length === 0 && (
        <div className="dashboard-card p-8 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm font-mono text-muted-foreground">No traded picks found for this filter</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Trade Card Component
// ============================================
function TradeCard({
  trade,
  userEmail,
  isCommissioner,
  expandedComments,
  toggleComments,
  onReact,
  onComment,
  onStatusChange,
}: {
  trade: TradeOffer
  userEmail: string | null
  isCommissioner: boolean
  expandedComments: Set<string>
  toggleComments: (id: string) => void
  onReact: (tradeId: string, emoji: string) => void
  onComment: (tradeId: string, comment: string) => void
  onStatusChange: (tradeId: string, status: string) => void
}) {
  const [commentText, setCommentText] = useState('')
  const statusCfg = STATUS_CONFIG[trade.status] ?? { label: trade.status.toUpperCase(), color: 'text-muted-foreground', bg: 'bg-secondary border-border' }

  const teams = trade.teams_involved && trade.teams_involved.length > 0
    ? trade.teams_involved
    : [trade.from_team_name, trade.target_team].filter(Boolean) as string[]

  const hasDetails = (trade.offering_picks?.length > 0 || trade.requesting_picks?.length > 0 || trade.offering_players?.length > 0 || trade.requesting_players?.length > 0)
  const isLegacyOffer = trade.trade_type !== 'offseason' && trade.trade_type !== 'midseason' && !hasDetails && trade.offer_text

  // Count reactions by emoji
  const reactionCounts: Record<string, { count: number; userReacted: boolean }> = {}
  for (const r of trade.reactions) {
    if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, userReacted: false }
    reactionCounts[r.emoji].count++
    if (r.user_email === userEmail) reactionCounts[r.emoji].userReacted = true
  }

  const commentsExpanded = expandedComments.has(trade.id)

  return (
    <div className="dashboard-card p-5">
      {/* Header: Teams + Status + Date */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {teams.map((team, i) => {
            const colors = getTeamColorForName(team)
            const mgr = getManagerByTeamName(team) ?? getManagerByDisplayName(team)
            return (
              <span key={team} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground text-xs mx-1">↔</span>}
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors?.dot ?? 'bg-muted-foreground'}`} />
                <span className={`text-sm font-mono font-bold ${colors?.text ?? 'text-foreground'}`}>
                  {mgr?.displayName ?? team}
                </span>
              </span>
            )
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border rounded ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          {trade.trade_type === 'offseason' && (
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded">
              OFFSEASON
            </span>
          )}
          {trade.trade_type === 'midseason' && (
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded">
              IN-SEASON
            </span>
          )}
        </div>
      </div>

      {/* Trade Description */}
      {trade.description && (
        <p className="text-sm font-mono text-foreground/80 mb-3 leading-relaxed">
          {trade.description}
        </p>
      )}

      {/* Legacy offer text */}
      {isLegacyOffer && (
        <div className="text-sm font-mono text-foreground/80 mb-3 bg-secondary/50 p-3 rounded-md border border-border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Offer:</div>
          {trade.offer_text}
          {trade.message && (
            <>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-2 mb-1">Message:</div>
              {trade.message}
            </>
          )}
        </div>
      )}

      {/* Player Details */}
      {(trade.offering_players?.length > 0 || trade.requesting_players?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {trade.offering_players?.length > 0 && (
            <div className="bg-secondary/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                {teams[0] ?? 'Team A'} sends →
              </div>
              <div className="text-sm font-mono text-foreground">
                {trade.offering_players.join(', ')}
              </div>
            </div>
          )}
          {trade.requesting_players?.length > 0 && (
            <div className="bg-secondary/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                ← {teams[1] ?? 'Team B'} sends
              </div>
              <div className="text-sm font-mono text-foreground">
                {trade.requesting_players.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pick Details */}
      {(trade.offering_picks?.length > 0 || trade.requesting_picks?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {trade.offering_picks?.length > 0 && (
            <div className="bg-secondary/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                {teams[0] ?? 'Team A'} sends picks →
              </div>
              <div className="text-sm font-mono text-foreground">
                {formatPickList(trade.offering_picks)}
              </div>
            </div>
          )}
          {trade.requesting_picks?.length > 0 && (
            <div className="bg-secondary/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                ← {teams[1] ?? 'Team B'} sends picks
              </div>
              <div className="text-sm font-mono text-foreground">
                {formatPickList(trade.requesting_picks)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Date + From Info */}
      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-3">
        <span>{formatDate(trade.created_at)}</span>
        {trade.from_name && trade.trade_type !== 'offseason' && trade.trade_type !== 'midseason' && (
          <span>from {trade.from_name}</span>
        )}
      </div>

      {/* Commissioner Actions */}
      {isCommissioner && (trade.status === 'pending' || trade.status === 'submitted') && (
        <div className="flex items-center gap-2 mb-3 p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
          <span className="text-xs font-mono text-amber-400 font-bold">⭐ COMMISSIONER:</span>
          <button
            onClick={() => onStatusChange(trade.id, 'approved')}
            className="px-3 py-1 text-xs font-mono font-bold uppercase rounded bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => onStatusChange(trade.id, 'rejected')}
            className="px-3 py-1 text-xs font-mono font-bold uppercase rounded bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors"
          >
            ✕ Reject
          </button>
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {REACTION_EMOJI.map(emoji => {
          const data = reactionCounts[emoji]
          const hasReacted = data?.userReacted ?? false
          const count = data?.count ?? 0
          return (
            <button
              key={emoji}
              onClick={() => userEmail && onReact(trade.id, emoji)}
              disabled={!userEmail}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-all ${
                hasReacted
                  ? 'bg-primary/15 border border-primary/30 scale-105'
                  : count > 0
                    ? 'bg-secondary border border-border hover:border-primary/20'
                    : 'bg-transparent border border-transparent hover:bg-secondary hover:border-border opacity-50 hover:opacity-100'
              } ${!userEmail ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-xs font-mono text-muted-foreground">{count}</span>}
            </button>
          )
        })}

        {/* Comment toggle */}
        <button
          onClick={() => toggleComments(trade.id)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-all ml-auto ${
            commentsExpanded
              ? 'bg-primary/15 border border-primary/30'
              : 'bg-secondary border border-border hover:border-primary/20'
          }`}
        >
          <span>💬</span>
          {trade.comments.length > 0 && (
            <span className="text-xs font-mono text-muted-foreground">{trade.comments.length}</span>
          )}
        </button>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {commentsExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border">
              {trade.comments.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {trade.comments.map(c => {
                    const cmgr = getManagerByEmail(c.user_email)
                    const ccolors = cmgr ? TEAM_COLORS[cmgr.colorKey] : null
                    return (
                      <div key={c.id} className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ccolors?.dot ?? 'bg-muted-foreground'}`} />
                        <div className="min-w-0">
                          <span className={`text-xs font-mono font-bold ${ccolors?.text ?? 'text-foreground'}`}>
                            {c.user_name ?? c.user_email.split('@')[0]}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground ml-2">
                            {formatDate(c.created_at)}
                          </span>
                          <p className="text-sm font-mono text-foreground/80 mt-0.5">{c.comment}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground mb-3">No comments yet</p>
              )}

              {userEmail ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        onComment(trade.id, commentText)
                        setCommentText('')
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (commentText.trim()) {
                        onComment(trade.id, commentText)
                        setCommentText('')
                      }
                    }}
                    disabled={!commentText.trim()}
                    className="px-3 py-1.5 text-xs font-mono font-bold uppercase rounded bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground">
                  <a href="/login" className="text-primary underline">Log in</a> to comment
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
