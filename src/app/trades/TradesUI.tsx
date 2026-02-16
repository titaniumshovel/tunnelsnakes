'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MANAGERS, TEAM_COLORS, getManagerByEmail, type Manager } from '@/data/managers'
import { motion, AnimatePresence } from 'framer-motion'

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

const REACTION_EMOJI = ['🔥', '💀', '👍', '👎', '😂', '🤔'] as const
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'COMPLETED', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
  approved: { label: 'APPROVED', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
  pending: { label: 'PENDING', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  submitted: { label: 'SUBMITTED', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  rejected: { label: 'REJECTED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  declined: { label: 'DECLINED', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
}

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

export function TradesUI() {
  const [trades, setTrades] = useState<TradeOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [manager, setManager] = useState<Manager | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [showPropose, setShowPropose] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  // Proposal form state
  const [propTargetTeam, setPropTargetTeam] = useState('')
  const [propDescription, setPropDescription] = useState('')
  const [propSubmitting, setPropSubmitting] = useState(false)
  const [propSuccess, setPropSuccess] = useState(false)

  const fetchTrades = useCallback(async () => {
    const res = await fetch('/api/trades')
    if (res.ok) {
      const data = await res.json()
      setTrades(data)
    }
    setLoading(false)
  }, [])

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

  async function handlePropose() {
    if (!propTargetTeam || !propDescription.trim() || !manager) return
    setPropSubmitting(true)

    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from_team_name: manager.teamName,
        target_team: propTargetTeam,
        description: propDescription,
      }),
    })

    if (res.ok) {
      setPropSuccess(true)
      setPropTargetTeam('')
      setPropDescription('')
      await fetchTrades()
      setTimeout(() => {
        setPropSuccess(false)
        setShowPropose(false)
      }, 2000)
    }
    setPropSubmitting(false)
  }

  const filtered = trades.filter(t => {
    if (filter === 'completed') return t.status === 'completed' || t.status === 'approved'
    if (filter === 'pending') return t.status === 'pending' || t.status === 'submitted'
    return true
  })

  const isCommissioner = manager?.role === 'commissioner'

  if (loading) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">🤝</div>
          <p className="text-sm font-mono text-primary vault-glow terminal-cursor">Loading trade center</p>
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
              <h1 className="text-2xl font-bold text-primary vault-glow font-mono flex items-center gap-3">
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
              {userEmail && (
                <button
                  onClick={() => setShowPropose(!showPropose)}
                  className="btn-trade px-4 py-2 text-sm"
                >
                  {showPropose ? '✕ CLOSE' : '⚡ PROPOSE TRADE'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Propose Trade Form */}
        <AnimatePresence>
          {showPropose && userEmail && manager && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="dashboard-card p-6 border-accent/30">
                <h2 className="text-lg font-bold text-accent font-mono mb-4 flex items-center gap-2">
                  ⚡ PROPOSE A TRADE
                </h2>

                {propSuccess ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-primary font-mono font-bold">Trade Proposal Submitted!</p>
                    <p className="text-sm text-muted-foreground font-mono mt-1">The commissioner will review it.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                      <span className="text-primary">{manager.teamName}</span>
                      <span>→</span>
                      <select
                        value={propTargetTeam}
                        onChange={(e) => setPropTargetTeam(e.target.value)}
                        className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                      >
                        <option value="">Select target team…</option>
                        {MANAGERS.filter(m => m.teamName !== manager.teamName).map(m => (
                          <option key={m.teamSlug} value={m.teamName}>{m.teamName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80 mb-1">
                        Trade Details
                      </label>
                      <textarea
                        value={propDescription}
                        onChange={(e) => setPropDescription(e.target.value)}
                        placeholder="Describe the trade — players, picks, conditions..."
                        className="w-full min-h-[120px] rounded-md border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                      />
                    </div>

                    <button
                      onClick={handlePropose}
                      disabled={!propTargetTeam || !propDescription.trim() || propSubmitting}
                      className="btn-trade w-full"
                    >
                      {propSubmitting ? '⏳ SUBMITTING...' : '⚡ SUBMIT TRADE PROPOSAL'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!userEmail && (
          <div className="dashboard-card p-4 text-center">
            <p className="text-sm font-mono text-muted-foreground">
              🔐 <a href="/login" className="text-primary hover:text-primary/80 underline">Log in</a> to propose trades, react, and comment
            </p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {([['all', 'All Trades'], ['completed', 'Completed'], ['pending', 'Pending']] as const).map(([key, label]) => (
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
              {key === 'pending' && trades.filter(t => t.status === 'pending' || t.status === 'submitted').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
                  {trades.filter(t => t.status === 'pending' || t.status === 'submitted').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Trade Feed */}
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
      </div>
    </main>
  )
}

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
  const isLegacyOffer = trade.trade_type !== 'offseason' && !hasDetails && trade.offer_text

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

      {/* Pick Details */}
      {hasDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {trade.offering_picks?.length > 0 && (
            <div className="bg-secondary/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                {teams[0] ?? 'Team A'} sends →
              </div>
              <div className="text-sm font-mono text-foreground">
                {formatPickList(trade.offering_picks)}
              </div>
            </div>
          )}
          {trade.requesting_picks?.length > 0 && (
            <div className="bg-secondary/50 p-3 rounded-md border border-border">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                ← {teams[1] ?? 'Team B'} sends
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
        {trade.from_name && trade.trade_type !== 'offseason' && (
          <span>from {trade.from_name}</span>
        )}
      </div>

      {/* Commissioner Actions */}
      {isCommissioner && (trade.status === 'pending' || trade.status === 'submitted') && (
        <div className="flex items-center gap-2 mb-3 p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
          <span className="text-xs font-mono text-amber-400 font-bold">⭐ COMMISSIONER:</span>
          <button
            onClick={() => onStatusChange(trade.id, 'approved')}
            className="px-3 py-1 text-xs font-mono font-bold uppercase rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors"
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
