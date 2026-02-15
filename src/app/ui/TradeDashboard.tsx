'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Search, Users, ArrowRightLeft, Check, X, Zap, Shield, Radiation } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { getLabeledStat, isPitcher } from '@/app/ui/stats'

export type TradePlayer = {
  rosterRowId: string
  playerId: string
  fullName: string
  mlbTeam?: string | null
  position?: string | null
  keeperStatus: string
  notes?: string | null
  headshotUrl?: string | null
  ecr?: number | null
  keeperCostLabel?: string | null
  keeperCostRound?: number | null
  stats2025?: any | null
}

const DRAFT_PICKS = Array.from({ length: 24 }, (_, i) => i + 1)

const LEAGUE_TEAMS = [
  'Tunnel Snakes',
  'Alex in Chains',
  'Bleacher Creatures',
  'ClutchHutch',
  "Goin' Yahdgoats",
  'Greasy Cap Advisors',
  'Lollygaggers',
  'Red Stagz',
  'Runs-N-Roses',
  'The Dirty Farm',
  'Lake Monsters',
  "Tyler's Slugfest",
]

const KEEPERS = new Set(['Aaron Judge', 'José Ramírez', 'Freddie Freeman', 'Bryce Harper'])

/* Fallout flavor text that rotates in the empty trade panel */
const VAULT_QUOTES = [
  'War never changes... but your lineup should.',
  'S.P.E.C.I.A.L. trades available in the Wasteland.',
  'Tunnel Snakes rule! And so does a good trade.',
  'Please stand by... select a player to begin.',
  'V.A.T.S. locked on. Pick your target.',
  'Vault-Tec recommends diversifying your roster.',
]

export function TradeDashboard({ players }: { players: TradePlayer[] }) {
  const [selected, setSelected] = useState<TradePlayer | null>(null)
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('ALL')

  const [selectedPicks, setSelectedPicks] = useState<number[]>([])
  const [fromTeam, setFromTeam] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [vaultQuote, setVaultQuote] = useState(VAULT_QUOTES[0])
  useEffect(() => {
    setVaultQuote(VAULT_QUOTES[Math.floor(Math.random() * VAULT_QUOTES.length)])
  }, [])

  const togglePick = (pick: number) => {
    setSelectedPicks((prev) => (prev.includes(pick) ? prev.filter((p) => p !== pick) : [...prev, pick]))
  }

  const clearTrade = () => {
    setSelectedPicks([])
    setFromTeam('')
    setNotes('')
    setSelected(null)
  }

  const submitOffer = async () => {
    if (!selected || selectedPicks.length === 0 || !fromTeam) return

    const offerText = `Offering picks #${selectedPicks
      .slice()
      .sort((a, b) => a - b)
      .join(', #')} for ${selected.fullName}`

    const payload = {
      teamName: fromTeam,
      displayName: '',
      email: '',
      requestedPlayerId: selected.playerId,
      offerText,
      message: notes,
    }

    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      toast.error(t || 'Transmission failed. Try again, wastelander.')
      return
    }

    setSubmitted(true)
    toast.success(`Trade transmitted! ${selectedPicks.length} pick(s) for ${selected.fullName}`, { duration: 4000 })
    setTimeout(() => {
      setSubmitted(false)
      clearTrade()
    }, 1500)
  }

  const positions = useMemo(() => {
    const set = new Set<string>()
    for (const p of players) if (p.position) set.add(p.position)
    return ['ALL', ...Array.from(set).sort()]
  }, [players])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return players.filter((p) => {
      const matchSearch =
        !q || p.fullName.toLowerCase().includes(q) || (p.mlbTeam ?? '').toLowerCase().includes(q)
      const matchPos = posFilter === 'ALL' || p.position === posFilter
      return matchSearch && matchPos
    })
  }, [players, search, posFilter])

  /* Shared stat line renderer */
  const StatLine = ({ player }: { player: TradePlayer }) => (
    <div className="grid grid-cols-5 gap-2 mb-4">
      {(isPitcher(player.position)
        ? [
            { label: 'W', value: getLabeledStat(player.stats2025, ['W']) },
            { label: 'K', value: getLabeledStat(player.stats2025, ['K']) },
            { label: 'ERA', value: getLabeledStat(player.stats2025, ['ERA']) },
            { label: 'WHIP', value: getLabeledStat(player.stats2025, ['WHIP']) },
            { label: 'SV+H', value: getLabeledStat(player.stats2025, ['SV+H', 'SV+HLD', 'SV+HOLD']) },
          ]
        : [
            { label: 'R', value: getLabeledStat(player.stats2025, ['R']) },
            { label: 'HR', value: getLabeledStat(player.stats2025, ['HR']) },
            { label: 'RBI', value: getLabeledStat(player.stats2025, ['RBI']) },
            { label: 'SB', value: getLabeledStat(player.stats2025, ['SB']) },
            { label: 'OBP', value: getLabeledStat(player.stats2025, ['OBP']) },
          ]
      ).map((stat) => (
        <div key={stat.label} className="text-center p-2 rounded-md bg-secondary border border-border">
          <div className="text-[10px] text-primary/70 uppercase tracking-widest font-mono">
            {stat.label}
          </div>
          <div className="text-sm font-bold font-mono text-foreground">{stat.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )

  /* Shared selected player card */
  const SelectedPlayerCard = ({ player, showClose }: { player: TradePlayer; showClose?: boolean }) => (
    <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10 border border-primary/30 mb-4" style={{ boxShadow: '0 0 12px hsl(121 99% 54% / 0.1)' }}>
      <div className="w-11 h-11 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
        {player.headshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.headshotUrl} alt={player.fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono">{player.position ?? '—'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm flex items-center gap-2">
          <span>{player.fullName}</span>
          {typeof player.ecr === 'number' ? (
            <span className="stat-badge bg-accent/10 text-accent">ECR #{player.ecr}</span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {player.position ?? '—'} · {player.mlbTeam ?? '—'}
        </div>
      </div>
      {showClose ? (
        <button onClick={clearTrade} className="p-1.5 rounded-md hover:bg-secondary transition-colors" aria-label="Clear">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  )

  /* Shared trade form */
  const TradeFormFields = () => (
    <>
      {/* Your team */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2 uppercase tracking-wider text-primary/80">Your Faction</label>
        <select
          value={fromTeam}
          onChange={(e) => setFromTeam(e.target.value)}
          className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
        >
          <option value="">Select your team…</option>
          {LEAGUE_TEAMS.filter((t) => t !== 'Tunnel Snakes').map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Draft picks */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary/80">Offer Draft Picks</span>
          {selectedPicks.length > 0 ? (
            <span className="text-xs text-accent font-bold font-mono">{selectedPicks.length} selected</span>
          ) : null}
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {DRAFT_PICKS.map((pick) => (
            <button
              key={pick}
              onClick={() => togglePick(pick)}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-md text-sm font-bold border cursor-pointer transition-all duration-150 active:scale-95 font-mono ${
                selectedPicks.includes(pick)
                  ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_12px_hsl(42_95%_55%/0.4)]'
                  : 'bg-secondary text-muted-foreground border-border hover:border-primary hover:text-primary'
              }`}
            >
              {pick}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2 uppercase tracking-wider text-primary/80">
          Transmission Notes <span className="normal-case text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Players offered, positions needed, threats, bribes..."
          className="w-full min-h-[90px] rounded-md border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
        />
      </div>

      <button
        onClick={submitOffer}
        disabled={selectedPicks.length === 0 || !fromTeam}
        className="btn-trade w-full"
      >
        {!fromTeam
          ? '[ SELECT YOUR FACTION ]'
          : selectedPicks.length === 0
            ? '[ SELECT PICKS TO OFFER ]'
            : `⚡ TRANSMIT TRADE (${selectedPicks.length} pick${selectedPicks.length > 1 ? 's' : ''})`}
      </button>

      <div className="mt-3 text-xs text-muted-foreground font-mono">
        Prefer a detailed transmission?{' '}
        <Link href={`/offer?player=${encodeURIComponent(selected!.playerId)}`} className="underline text-primary/70 hover:text-primary">
          Use the full form
        </Link>
        .
      </div>
    </>
  )

  /* Submitted success state */
  const SubmittedState = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4" style={{ boxShadow: '0 0 20px hsl(121 80% 45% / 0.3)' }}>
        <Check className="w-8 h-8 text-success" />
      </div>
      <p className="text-foreground font-bold text-lg uppercase tracking-wider">Trade Transmitted!</p>
      <p className="text-muted-foreground text-sm mt-1 font-mono">Awaiting Overseer review...</p>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4">
        {/* === HEADER === */}
        <header className="flex items-center justify-between py-4 border-b border-primary/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-xl" style={{ boxShadow: '0 0 10px hsl(121 99% 54% / 0.15)' }}>
              🐍
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider leading-none vault-glow pip-flicker text-primary">
                TUNNEL SNAKES
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                Vault 101 — Trade Terminal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="stat-badge bg-primary/15 text-primary font-mono">
              <Radiation className="w-3 h-3" />
              Roster: {players.length}
            </div>
          </div>
        </header>

        {/* Flavor text banner */}
        <div className="mb-4 py-2 px-4 rounded-md bg-primary/5 border border-primary/10 text-center">
          <p className="text-xs text-primary/60 font-mono tracking-wide italic">
            &gt; {vaultQuote}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-8">
          {/* === MOBILE TRADE PANEL (bottom sheet) === */}
          <AnimatePresence>
            {selected ? (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                  onClick={clearTrade}
                />
                <motion.div
                  key="sheet"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
                >
                  <div className="mx-auto max-w-6xl px-4 pb-4">
                    <div className="dashboard-card max-h-[80vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-extrabold tracking-wider flex items-center gap-2 uppercase text-primary">
                          <ArrowRightLeft className="w-4 h-4" />
                          Initiate Trade
                        </div>
                        <button onClick={clearTrade} className="p-2 rounded-md hover:bg-secondary transition-colors" aria-label="Close">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        {submitted ? (
                          <SubmittedState key="submitted-mobile" />
                        ) : (
                          <motion.div
                            key="trade-form-mobile"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex flex-col"
                          >
                            <SelectedPlayerCard player={selected} />
                            <StatLine player={selected} />
                            <TradeFormFields />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>

          {/* === PLAYER LIST === */}
          <div className="lg:col-span-3 min-h-[60vh]">
            <div className="dashboard-card flex flex-col h-full">
              <h2 className="text-lg font-extrabold tracking-wider mb-3 flex items-center gap-2 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ boxShadow: '0 0 8px hsl(121 99% 54% / 0.5)' }} />
                Available Assets
              </h2>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search the wasteland..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                />
              </div>

              {/* Position filters */}
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {positions.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosFilter(pos)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all uppercase tracking-wider ${
                      posFilter === pos
                        ? 'bg-primary text-primary-foreground shadow-[0_0_10px_hsl(121_99%_54%/0.3)]'
                        : 'bg-secondary text-muted-foreground hover:text-primary hover:border-primary/30'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {/* Player rows */}
              <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
                {filtered.map((p) => {
                  const isKeeper = KEEPERS.has(p.fullName)
                  return (
                    <div
                      key={p.rosterRowId}
                      onClick={() => (isKeeper ? null : setSelected(p))}
                      className={`player-row ${selected?.rosterRowId === p.rosterRowId ? 'selected' : ''} ${
                        isKeeper ? 'bg-accent/5 border-accent/20 cursor-not-allowed hover:bg-accent/5' : ''
                      }`}
                      aria-disabled={isKeeper}
                      title={isKeeper ? 'KEEPER — Not available for trade' : undefined}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 overflow-hidden border border-border">
                        {p.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.headshotUrl} alt={p.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-mono">{p.position ?? '—'}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                          <span className="truncate max-w-[12rem] sm:max-w-none">{p.fullName}</span>
                          {typeof p.ecr === 'number' ? (
                            <span className="stat-badge bg-accent/10 text-accent whitespace-nowrap font-mono">ECR #{p.ecr}</span>
                          ) : null}
                          {p.keeperCostLabel ? (
                            <span className="stat-badge bg-primary/10 text-primary whitespace-nowrap font-mono">{p.keeperCostLabel}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {p.position ?? '—'} · {p.mlbTeam ?? '—'}
                          {p.notes ? ' · ' : ''}
                          {p.notes ? <span className="text-accent">{p.notes}</span> : null}
                        </div>
                      </div>

                      {/* Row stats (desktop) */}
                      <div className="hidden md:flex items-center gap-3 text-xs font-mono text-muted-foreground">
                        {(isPitcher(p.position)
                          ? [
                              { label: 'W', value: getLabeledStat(p.stats2025, ['W']) },
                              { label: 'K', value: getLabeledStat(p.stats2025, ['K']) },
                              { label: 'ERA', value: getLabeledStat(p.stats2025, ['ERA']) },
                              { label: 'WHIP', value: getLabeledStat(p.stats2025, ['WHIP']) },
                              { label: 'SV+H', value: getLabeledStat(p.stats2025, ['SV+H', 'SV+HLD', 'SV+HOLD']) },
                            ]
                          : [
                              { label: 'R', value: getLabeledStat(p.stats2025, ['R']) },
                              { label: 'HR', value: getLabeledStat(p.stats2025, ['HR']) },
                              { label: 'RBI', value: getLabeledStat(p.stats2025, ['RBI']) },
                              { label: 'SB', value: getLabeledStat(p.stats2025, ['SB']) },
                              { label: 'OBP', value: getLabeledStat(p.stats2025, ['OBP']) },
                            ]
                        ).map((s) => (
                          <span key={s.label}>
                            {s.label}: <span className="text-foreground">{s.value ?? '—'}</span>
                          </span>
                        ))}
                      </div>

                      {/* Keeper badge */}
                      <div className="text-xs text-muted-foreground">
                        {isKeeper ? (
                          <span className="stat-badge bg-accent/15 text-accent uppercase tracking-wider">
                            <Shield className="w-3 h-3" />
                            KEEP
                          </span>
                        ) : (
                          <span className="font-mono">{p.keeperStatus}</span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm font-mono">
                    No assets found in the wasteland...
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* === TRADE PANEL (desktop) === */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="dashboard-card flex flex-col">
              <h2 className="text-lg font-extrabold tracking-wider mb-3 flex items-center gap-2 text-primary">
                <ArrowRightLeft className="w-4 h-4" />
                Initiate Trade
              </h2>

              <AnimatePresence mode="wait">
                {!selected ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center mb-4 border border-border" style={{ boxShadow: '0 0 15px hsl(121 99% 54% / 0.08)' }}>
                      <Zap className="w-7 h-7 text-primary/40" />
                    </div>
                    <p className="text-muted-foreground text-sm font-mono px-4">
                      {vaultQuote}
                    </p>
                    <p className="text-primary/30 text-xs font-mono mt-3 terminal-cursor">
                      AWAITING INPUT
                    </p>
                  </motion.div>
                ) : submitted ? (
                  <SubmittedState key="submitted" />
                ) : (
                  <motion.div
                    key="trade-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex-1 flex flex-col"
                  >
                    <SelectedPlayerCard player={selected} showClose />
                    <StatLine player={selected} />
                    <TradeFormFields />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-primary/10 py-4 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            VAULT-TEC INDUSTRIES · TUNNEL SNAKES RULE · EST. VAULT 101
          </p>
        </footer>
      </div>
    </div>
  )
}
