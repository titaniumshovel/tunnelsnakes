'use client'

import { useState } from 'react'
import { Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react'
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
  trades: Array<{ description: string; source: string }>
  picks: Record<string, DraftPick[]>
}

const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Pudge:  { bg: 'bg-red-900/40',     border: 'border-red-500/50',    text: 'text-red-300',     dot: 'bg-red-400' },
  Nick:   { bg: 'bg-blue-900/40',    border: 'border-blue-500/50',   text: 'text-blue-300',    dot: 'bg-blue-400' },
  Web:    { bg: 'bg-green-900/40',   border: 'border-green-500/50',  text: 'text-green-300',   dot: 'bg-green-400' },
  Tom:    { bg: 'bg-yellow-900/40',  border: 'border-yellow-500/50', text: 'text-yellow-300',  dot: 'bg-yellow-400' },
  Tyler:  { bg: 'bg-purple-900/40',  border: 'border-purple-500/50', text: 'text-purple-300',  dot: 'bg-purple-400' },
  Thomas: { bg: 'bg-pink-900/40',    border: 'border-pink-500/50',   text: 'text-pink-300',    dot: 'bg-pink-400' },
  Chris:  { bg: 'bg-amber-900/40',   border: 'border-amber-500/50',  text: 'text-amber-300',   dot: 'bg-amber-400' },
  Alex:   { bg: 'bg-orange-900/40',  border: 'border-orange-500/50', text: 'text-orange-300',  dot: 'bg-orange-400' },
  Greasy: { bg: 'bg-cyan-900/40',    border: 'border-cyan-500/50',   text: 'text-cyan-300',    dot: 'bg-cyan-400' },
  Bob:    { bg: 'bg-slate-700/40',   border: 'border-slate-400/50',  text: 'text-slate-300',   dot: 'bg-slate-400' },
  Mike:   { bg: 'bg-fuchsia-900/40', border: 'border-fuchsia-500/50',text: 'text-fuchsia-300', dot: 'bg-fuchsia-400' },
  Sean:   { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50',text: 'text-emerald-300', dot: 'bg-emerald-400' },
}

export default function DraftBoardPage() {
  const [showTrades, setShowTrades] = useState(false)
  const [viewMode, setViewMode] = useState<'board' | 'owner' | 'clicky'>('board')
  const [fontSize, setFontSize] = useState(0.75)
  const data = draftBoardData as DraftBoard

  // Build owner→round→picks map for Owner View
  const ownerRoundMap = new Map<string, Map<number, DraftPick[]>>()
  for (const owner of data.draftOrder) {
    ownerRoundMap.set(owner, new Map())
  }
  for (let round = 1; round <= data.rounds; round++) {
    const roundPicks = (data.picks[round.toString()] ?? []) as DraftPick[]
    for (const pick of roundPicks) {
      const ownerMap = ownerRoundMap.get(pick.currentOwner)
      if (ownerMap) {
        const existing = ownerMap.get(round) ?? []
        existing.push(pick)
        ownerMap.set(round, existing)
      }
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Page Header (nav is in layout) */}
      <div className="bg-background/80 border-b border-primary/10">
        <div className="mx-auto max-w-[1400px] px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-primary">
              🎯 2026 DRAFT BOARD
            </h1>
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> March 6, 2026</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 12 Teams • 27 Rounds</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] p-4 space-y-4">
        {/* Controls Row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-card rounded-lg border border-primary/20 p-0.5">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 rounded text-xs font-semibold font-bold transition-colors ${
                  viewMode === 'board'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📊 BOARD
              </button>
              <button
                onClick={() => setViewMode('owner')}
                className={`px-3 py-1.5 rounded text-xs font-semibold font-bold transition-colors ${
                  viewMode === 'owner'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                👥 OWNERS
              </button>
              <button
                onClick={() => setViewMode('clicky')}
                className={`px-3 py-1.5 rounded text-xs font-semibold font-bold transition-colors ${
                  viewMode === 'clicky'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📋 PICKS
              </button>
            </div>

            {/* Trade Log Toggle */}
            <button
              onClick={() => setShowTrades(!showTrades)}
              className="flex items-center gap-2 text-sm font-mono text-primary hover:text-primary/80 transition-colors"
            >
              {showTrades ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showTrades ? 'Hide' : 'Show'} Trade Log ({data.trades.length} trades)
            </button>
          </div>

          {/* Font Size Controls */}
          <div className="flex items-center gap-1 bg-card rounded-lg border border-primary/20 p-0.5">
            <button
              onClick={() => setFontSize(prev => Math.max(0.55, prev - 0.05))}
              className="px-2 py-1 rounded text-xs font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
              title="Decrease font size"
            >
              A-
            </button>
            <span className="px-1.5 text-[10px] font-mono text-muted-foreground">{Math.round(fontSize * 100)}%</span>
            <button
              onClick={() => setFontSize(prev => Math.min(1.1, prev + 0.05))}
              className="px-2 py-1 rounded text-xs font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
              title="Increase font size"
            >
              A+
            </button>
          </div>
        </div>

        {showTrades && (
          <div className="p-4 bg-card rounded-lg border border-primary/20 max-h-80 overflow-y-auto">
            <div className="space-y-1.5">
              {data.trades.map((trade, i) => (
                <div key={i} className="text-xs font-mono flex gap-2">
                  <span className="text-muted-foreground shrink-0">[{trade.source === 'yahoo_2025' ? 'IN-SEASON' : 'OFFSEASON'}]</span>
                  <span className="text-foreground">{trade.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Board View */}
        {viewMode === 'board' && (
          <div className="overflow-x-auto rounded-lg border border-primary/20">
            <table className="w-full border-collapse" style={{ minWidth: '960px', fontSize: `${fontSize}rem` }}>
              <thead>
                <tr className="bg-card">
                  <th className="sticky left-0 z-[5] bg-card p-2 text-center font-mono text-muted-foreground border-b border-r border-primary/20 w-12" style={{ fontSize: `${fontSize}rem` }}>
                    RND
                  </th>
                  {Array.from({ length: 12 }, (_, idx) => (
                    <th key={idx} className="p-2 text-center border-b border-primary/20 min-w-[75px]">
                      <div className="font-mono font-bold text-foreground" style={{ fontSize: `${fontSize}rem` }}>#{idx + 1}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: data.rounds }, (_, i) => i + 1).map((round) => {
                  const roundPicks = (data.picks[round.toString()] ?? []) as DraftPick[]
                  const isNA = data.naRounds.includes(round)
                  const isEven = round % 2 === 0

                  // Build a map: slot → pick data
                  const slotMap = new Map<number, DraftPick>()
                  for (const p of roundPicks) {
                    slotMap.set(p.slot, p)
                  }

                  // For snake display, even rounds go 12→1
                  const displaySlots = isEven
                    ? [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

                  return (
                    <tr key={round} className={`${isNA ? 'bg-amber-950/20' : round % 2 === 0 ? 'bg-card/50' : ''} hover:bg-primary/5 transition-colors`}>
                      <td className={`sticky left-0 z-[5] p-2 text-center font-mono font-bold border-r border-primary/20 ${
                        isNA ? 'bg-amber-950/40 text-amber-400' : round % 2 === 0 ? 'bg-card/90' : 'bg-background'
                      }`} style={{ fontSize: `${fontSize * 1.1}rem` }}>
                        {isNA ? (
                          <div>
                            <div>{round}</div>
                            <div className="text-amber-500" style={{ fontSize: `${fontSize * 0.65}rem` }}>NA</div>
                          </div>
                        ) : (
                          <>
                            {round}
                            {isEven && <span className="text-muted-foreground ml-0.5" style={{ fontSize: `${fontSize * 0.65}rem` }}>←</span>}
                          </>
                        )}
                      </td>
                      {displaySlots.map((slot) => {
                        const pick = slotMap.get(slot)
                        if (!pick) {
                          return <td key={slot} className="p-1 text-center border border-border/10"><span className="text-muted-foreground" style={{ fontSize: `${fontSize}rem` }}>—</span></td>
                        }

                        const colors = TEAM_COLORS[pick.currentOwner]
                        const isTraded = pick.traded
                        const path = pick.path ?? [pick.originalOwner]
                        const isMultiHop = path.length > 2
                        const pathDisplay = path.join(' → ')

                        return (
                          <td
                            key={slot}
                            className="p-0.5 text-center border border-border/10"
                            title={isTraded
                              ? `Pick ${round}.${slot} — Path: ${pathDisplay}`
                              : `Pick ${round}.${slot} — ${pick.currentOwner}`}
                          >
                            <div className={`rounded px-1 py-1.5 border ${
                              colors ? `${colors.bg} ${colors.border}` : 'bg-muted border-border'
                            } ${isTraded ? 'ring-1 ring-accent/30' : ''}`}>
                              <div className={`font-mono font-bold leading-tight ${colors?.text ?? 'text-foreground'}`} style={{ fontSize: `${fontSize}rem` }}>
                                {pick.currentOwner}
                              </div>
                              {isTraded && (
                                <div className={`font-mono leading-tight ${isMultiHop ? 'text-yellow-400' : 'text-accent'}`} style={{ fontSize: `${fontSize * 0.75}rem` }}>
                                  {isMultiHop
                                    ? path.slice(0, -1).map((p, i) => (
                                        <span key={i}>
                                          {i > 0 && '→'}
                                          <span className={TEAM_COLORS[p]?.text ?? 'text-muted-foreground'}>{p}</span>
                                        </span>
                                      ))
                                    : <>↔ {pick.originalOwner}</>
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Owner View */}
        {viewMode === 'owner' && (
          <div className="overflow-x-auto rounded-lg border border-primary/20">
            <table className="border-collapse" style={{ minWidth: '1600px', fontSize: `${fontSize}rem` }}>
              <thead>
                <tr className="bg-card">
                  <th className="sticky left-0 z-[5] bg-card p-2 text-center font-mono text-xs text-muted-foreground border-b border-r border-primary/20 min-w-[90px]">
                    OWNER
                  </th>
                  {Array.from({ length: data.rounds }, (_, i) => {
                    const round = i + 1
                    const isNA = data.naRounds.includes(round)
                    return (
                      <th key={round} className={`p-1.5 text-center border-b border-primary/20 min-w-[48px] ${isNA ? 'bg-amber-950/30' : ''}`}>
                        <div className={`text-[10px] font-mono font-bold ${isNA ? 'text-amber-400' : 'text-foreground'}`}>
                          {round}
                        </div>
                        {isNA && <div className="text-[8px] font-mono text-amber-500">NA</div>}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {data.draftOrder.map((owner, ownerIdx) => {
                  const colors = TEAM_COLORS[owner]
                  const roundMap = ownerRoundMap.get(owner) ?? new Map<number, DraftPick[]>()

                  return (
                    <tr key={owner} className={`${ownerIdx % 2 === 0 ? '' : 'bg-card/30'} hover:bg-primary/5 transition-colors`}>
                      <td className={`sticky left-0 z-[5] p-2 border-r border-primary/20 ${ownerIdx % 2 === 0 ? 'bg-background' : 'bg-card/80'}`}>
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors?.dot}`} />
                          <span className={`text-xs font-mono font-bold ${colors?.text}`}>{owner}</span>
                        </div>
                      </td>
                      {Array.from({ length: data.rounds }, (_, i) => {
                        const round = i + 1
                        const isNA = data.naRounds.includes(round)
                        const picks = roundMap.get(round) ?? []
                        const pickCount = picks.length

                        if (pickCount === 0) {
                          // Gap — no pick this round
                          return (
                            <td
                              key={round}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`${owner} — No pick in round ${round}`}
                            >
                              <div className={`rounded h-full min-h-[32px] border border-dashed ${
                                isNA ? 'border-amber-800/30 bg-amber-950/5' : 'border-muted-foreground/15 bg-muted/10'
                              }`} style={{
                                backgroundImage: isNA
                                  ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(180,83,9,0.06) 3px, rgba(180,83,9,0.06) 4px)'
                                  : 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(100,100,100,0.05) 3px, rgba(100,100,100,0.05) 4px)'
                              }} />
                            </td>
                          )
                        }

                        if (pickCount === 1) {
                          const pick = picks[0]
                          const isTraded = pick.traded && pick.originalOwner !== owner
                          return (
                            <td
                              key={round}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`${owner} — Round ${round}, Slot ${pick.slot}${isTraded ? ` (from ${pick.originalOwner})` : ''}`}
                            >
                              <div className={`rounded px-0.5 py-1 border ${colors?.bg} ${colors?.border} ${isTraded ? 'ring-1 ring-accent/30' : ''}`}>
                                <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}>
                                  {pick.slot}
                                </div>
                                {isTraded && (
                                  <div className="text-accent leading-tight" style={{ fontSize: `${Math.max(fontSize * 0.6, 0.45)}rem` }}>↔</div>
                                )}
                              </div>
                            </td>
                          )
                        }

                        // Multiple picks in this round
                        return (
                          <td
                            key={round}
                            className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                            title={`${owner} — Round ${round}: ${pickCount} picks (slots ${picks.map(p => p.slot).join(', ')})`}
                          >
                            <div className={`rounded px-0.5 py-1 border relative ${colors?.bg} ${colors?.border}`}
                              style={{
                                boxShadow: '0 0 8px rgba(234,179,8,0.25), inset 0 0 6px rgba(234,179,8,0.1)',
                              }}
                            >
                              <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 0.75, 0.5)}rem` }}>
                                {picks.map(p => p.slot).join(',')}
                              </div>
                              <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black rounded-full flex items-center justify-center font-mono font-bold"
                                style={{ fontSize: '0.5rem', width: '14px', height: '14px' }}
                              >
                                ×{pickCount}
                              </div>
                              {picks.some(p => p.traded && p.originalOwner !== owner) && (
                                <div className="text-accent leading-tight" style={{ fontSize: `${Math.max(fontSize * 0.6, 0.45)}rem` }}>↔</div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Clicky/Picks View — ClickyDraft style: columns=owners, rows=rounds */}
        {viewMode === 'clicky' && (
          <div className="overflow-x-auto rounded-lg border border-primary/20">
            <table className="border-collapse" style={{ minWidth: '960px', fontSize: `${fontSize}rem` }}>
              <thead>
                <tr className="bg-card">
                  <th className="sticky left-0 z-[5] bg-card p-2 text-center font-mono text-xs text-muted-foreground border-b border-r border-primary/20 w-12">
                    RND
                  </th>
                  {data.draftOrder.map((owner) => {
                    const colors = TEAM_COLORS[owner]
                    return (
                      <th key={owner} className={`p-2 text-center border-b border-primary/20 min-w-[80px] ${colors?.bg}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={`h-2 w-2 rounded-full ${colors?.dot}`} />
                          <div className={`text-xs font-mono font-bold ${colors?.text}`}>{owner}</div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: data.rounds }, (_, i) => i + 1).map((round) => {
                  const isNA = data.naRounds.includes(round)
                  const isEven = round % 2 === 0

                  return (
                    <tr key={round} className={`${isNA ? 'bg-amber-950/20' : round % 2 === 0 ? 'bg-card/50' : ''} hover:bg-primary/5 transition-colors`}>
                      <td className={`sticky left-0 z-[5] p-2 text-center font-mono font-bold text-sm border-r border-primary/20 ${
                        isNA ? 'bg-amber-950/40 text-amber-400' : round % 2 === 0 ? 'bg-card/90' : 'bg-background'
                      }`}>
                        {isNA ? (
                          <div>
                            <div>{round}</div>
                            <div className="text-[9px] text-amber-500">NA</div>
                          </div>
                        ) : (
                          <>
                            {round}
                            {isEven && <span className="text-[9px] text-muted-foreground ml-0.5">←</span>}
                          </>
                        )}
                      </td>
                      {data.draftOrder.map((owner) => {
                        const colors = TEAM_COLORS[owner]
                        const roundMap = ownerRoundMap.get(owner) ?? new Map<number, DraftPick[]>()
                        const picks = roundMap.get(round) ?? []
                        const pickCount = picks.length

                        if (pickCount === 0) {
                          return (
                            <td
                              key={owner}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`${owner} — No pick in round ${round}`}
                            >
                              <div className={`rounded min-h-[36px] border border-dashed ${
                                isNA ? 'border-amber-800/30 bg-amber-950/5' : 'border-muted-foreground/15 bg-muted/10'
                              }`} style={{
                                backgroundImage: isNA
                                  ? 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(180,83,9,0.06) 3px, rgba(180,83,9,0.06) 4px)'
                                  : 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(100,100,100,0.05) 3px, rgba(100,100,100,0.05) 4px)'
                              }} />
                            </td>
                          )
                        }

                        if (pickCount === 1) {
                          const pick = picks[0]
                          const isTraded = pick.traded && pick.originalOwner !== owner
                          return (
                            <td
                              key={owner}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`Pick ${round}.${pick.slot} — ${owner}${isTraded ? ` (from ${pick.originalOwner})` : ''}`}
                            >
                              <div className={`rounded px-1 py-2 border ${colors?.bg} ${colors?.border} ${isTraded ? 'ring-1 ring-accent/30' : ''}`}>
                                <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 1, 0.65)}rem` }}>
                                  {round}.{pick.slot}
                                </div>
                                {isTraded && (
                                  <div className="text-accent leading-tight mt-0.5" style={{ fontSize: `${Math.max(fontSize * 0.7, 0.45)}rem` }}>
                                    ↔ {pick.originalOwner}
                                  </div>
                                )}
                              </div>
                            </td>
                          )
                        }

                        // Multiple picks
                        return (
                          <td
                            key={owner}
                            className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                            title={`${owner} — Round ${round}: ${pickCount} picks (${picks.map(p => `${round}.${p.slot}`).join(', ')})`}
                          >
                            <div className={`rounded px-1 py-1 border relative ${colors?.bg} ${colors?.border}`}
                              style={{
                                boxShadow: '0 0 8px rgba(234,179,8,0.25), inset 0 0 6px rgba(234,179,8,0.1)',
                              }}
                            >
                              <div className="space-y-0.5">
                                {picks.map((pick, pi) => {
                                  const isTraded = pick.traded && pick.originalOwner !== owner
                                  return (
                                    <div key={pi}>
                                      <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 0.9, 0.55)}rem` }}>
                                        {round}.{pick.slot}
                                        {isTraded && <span className="text-accent ml-0.5" style={{ fontSize: `${Math.max(fontSize * 0.6, 0.4)}rem` }}>↔</span>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black rounded-full flex items-center justify-center font-mono font-bold"
                                style={{ fontSize: '0.5rem', width: '14px', height: '14px' }}
                              >
                                ×{pickCount}
                              </div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team Legend */}
          <div className="p-4 bg-card rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-3 font-mono text-sm">TEAMS</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {data.draftOrder.map((team) => {
                const colors = TEAM_COLORS[team]
                const pickCount = Object.values(data.picks).reduce((acc, round) =>
                  acc + (round as DraftPick[]).filter(p => p.currentOwner === team).length, 0
                )
                const tradedIn = Object.values(data.picks).reduce((acc, round) =>
                  acc + (round as DraftPick[]).filter(p => p.currentOwner === team && p.traded).length, 0
                )
                return (
                  <div key={team} className={`flex items-center gap-1.5 rounded px-2 py-1 ${colors?.bg} ${colors?.border} border`}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${colors?.dot}`} />
                    <span className={`text-xs font-mono font-bold ${colors?.text}`}>{team}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">{pickCount}pk</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Key Info */}
          <div className="p-4 bg-card rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-3 font-mono text-sm">FORMAT</h3>
            <ul className="text-xs space-y-1.5 font-mono text-muted-foreground">
              <li>• <span className="text-foreground">Snake draft:</span> Odd rounds pick 1→12, even rounds 12→1</li>
              <li>• <span className="text-foreground">Rounds 1-23:</span> Regular players</li>
              <li>• <span className="text-amber-400">Rounds 24-27:</span> NA/Minor League only</li>
              <li>• <span className="text-accent">↔ symbol:</span> Pick was traded once (shows original owner)</li>
              <li>• <span className="text-yellow-400">Multi-hop path:</span> Pick traded through multiple teams (e.g. Mike→Nick→Alex)</li>
              <li>• <span className="text-foreground">← arrow:</span> Even rounds flow right-to-left</li>
              <li className="pt-2 border-t border-border">• <span className="text-foreground">Hover</span> any cell for full trade details</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs font-mono text-muted-foreground">
            THE SANDLOT — 2026 FANTASY BASEBALL DRAFT • MARCH 6, 2026
          </p>
        </div>
      </div>
    </main>
  )
}
