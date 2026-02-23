'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users } from 'lucide-react'
import draftBoardData from '@/data/draft-board.json'
import { MANAGERS } from '@/data/managers'

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

type KeeperInfo = {
  playerName: string
  keeperStatus: 'keeping' | 'keeping-7th' | 'keeping-na'
  costRound: number
  effectiveRound: number
  stackedFrom: number | null
}

const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Pudge:  { bg: 'bg-red-100',      border: 'border-red-400',      text: 'text-red-800',      dot: 'bg-red-500' },
  Nick:   { bg: 'bg-blue-100',     border: 'border-blue-400',     text: 'text-blue-800',     dot: 'bg-blue-500' },
  Web:    { bg: 'bg-green-100',    border: 'border-green-400',    text: 'text-green-800',    dot: 'bg-green-500' },
  Tom:    { bg: 'bg-yellow-100',   border: 'border-yellow-400',   text: 'text-yellow-800',   dot: 'bg-yellow-500' },
  Tyler:  { bg: 'bg-purple-100',   border: 'border-purple-400',   text: 'text-purple-800',   dot: 'bg-purple-500' },
  Thomas: { bg: 'bg-pink-100',     border: 'border-pink-400',     text: 'text-pink-800',     dot: 'bg-pink-500' },
  Chris:  { bg: 'bg-amber-100',    border: 'border-amber-400',    text: 'text-amber-800',    dot: 'bg-amber-500' },
  Alex:   { bg: 'bg-orange-100',   border: 'border-orange-400',   text: 'text-orange-800',   dot: 'bg-orange-500' },
  Greasy: { bg: 'bg-cyan-100',     border: 'border-cyan-400',     text: 'text-cyan-800',     dot: 'bg-cyan-500' },
  Bob:    { bg: 'bg-slate-200',    border: 'border-slate-400',    text: 'text-slate-800',    dot: 'bg-slate-500' },
  Mike:   { bg: 'bg-fuchsia-100',  border: 'border-fuchsia-400',  text: 'text-fuchsia-800',  dot: 'bg-fuchsia-500' },
  Sean:   { bg: 'bg-emerald-100',  border: 'border-emerald-400',  text: 'text-emerald-800',  dot: 'bg-emerald-500' },
}

/**
 * Snake-adjust a draft-order slot to the pick-in-round number.
 * In odd rounds, slot N picks Nth. In even rounds, slot N picks (13-N)th.
 * slot = draft order position (1=first in draft order, 12=last)
 * returns: pick position within the round (1=first pick, 12=last pick)
 */
export function snakePickInRound(round: number, slot: number): number {
  return round % 2 === 0 ? 13 - slot : slot
}

/**
 * Get keeper status indicator emoji
 */
function getKeeperStatusIcon(status: KeeperInfo['keeperStatus']): string {
  switch (status) {
    case 'keeping': return '🔒'
    case 'keeping-7th': return '⭐'
    case 'keeping-na': return '🔷'
    default: return '🔒'
  }
}

/**
 * 2025 Draft Pick Trades — applied to snake board
 * Each trade swaps pick SLOTS between two owners for specific rounds.
 */
const DRAFT_TRADES = [
  {
    date: 'Apr 26, 2025',
    parties: ['Alex', 'Mike'],
    swaps: [
      { rounds: [6, 7, 8, 9, 10, 11], fromSlotOwner: 'Alex', toOwner: 'Mike' },
      { rounds: [18, 19, 20, 21, 22, 23], fromSlotOwner: 'Mike', toOwner: 'Alex' },
    ],
  },
  {
    date: 'May 8, 2025',
    parties: ['Bob', 'Chris'],
    swaps: [
      { rounds: [12], fromSlotOwner: 'Chris', toOwner: 'Bob' },
      { rounds: [22], fromSlotOwner: 'Bob', toOwner: 'Chris' },
    ],
  },
  {
    date: 'Jun 1, 2025',
    parties: ['Bob', 'Nick'],
    swaps: [
      { rounds: [12], fromSlotOwner: 'Nick', toOwner: 'Bob' },
      { rounds: [20], fromSlotOwner: 'Bob', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Jun 30, 2025',
    parties: ['Bob', 'Greasy'],
    swaps: [
      { rounds: [9], fromSlotOwner: 'Greasy', toOwner: 'Bob' },
      { rounds: [16], fromSlotOwner: 'Bob', toOwner: 'Greasy' },
    ],
  },
  {
    date: 'Jul 7, 2025',
    parties: ['Bob', 'Tom'],
    swaps: [
      { rounds: [15], fromSlotOwner: 'Tom', toOwner: 'Bob' },
      { rounds: [12], fromSlotOwner: 'Bob', toOwner: 'Tom' },
    ],
  },
  {
    date: 'Jul 10, 2025',
    parties: ['Mike', 'Nick'],
    swaps: [
      { rounds: [21, 22, 23], fromSlotOwner: 'Nick', toOwner: 'Mike' },
      { rounds: [7, 8, 9], fromSlotOwner: 'Mike', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Jul 14, 2025',
    parties: ['Sean', 'Tom'],
    swaps: [
      { rounds: [17], fromSlotOwner: 'Tom', toOwner: 'Sean' },
      { rounds: [8], fromSlotOwner: 'Sean', toOwner: 'Tom' },
    ],
  },
  {
    date: 'Jul 26, 2025',
    parties: ['Bob', 'Nick'],
    swaps: [
      { rounds: [17], fromSlotOwner: 'Nick', toOwner: 'Bob' },
      { rounds: [11], fromSlotOwner: 'Bob', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Aug 7, 2025',
    parties: ['Bob', 'Nick'],
    swaps: [
      { rounds: [20], fromSlotOwner: 'Nick', toOwner: 'Bob' },
      { rounds: [14], fromSlotOwner: 'Bob', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Aug 7, 2025',
    parties: ['Chris', 'Pudge'],
    swaps: [
      { rounds: [20], fromSlotOwner: 'Pudge', toOwner: 'Chris' },
      { rounds: [9], fromSlotOwner: 'Chris', toOwner: 'Pudge' },
    ],
  },
  {
    date: 'Aug 8, 2025',
    parties: ['Chris', 'Nick'],
    swaps: [
      { rounds: [19], fromSlotOwner: 'Nick', toOwner: 'Chris' },
      { rounds: [10], fromSlotOwner: 'Chris', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Aug 9, 2025',
    parties: ['Bob', 'Web'],
    swaps: [
      { rounds: [21, 23], fromSlotOwner: 'Web', toOwner: 'Bob' },
      { rounds: [9, 10], fromSlotOwner: 'Bob', toOwner: 'Web' },
    ],
  },
  {
    date: 'Aug 9, 2025',
    parties: ['Web', 'Mike'],
    swaps: [
      { rounds: [17], fromSlotOwner: 'Mike', toOwner: 'Web' },
      { rounds: [20], fromSlotOwner: 'Web', toOwner: 'Mike' },
    ],
  },
  {
    date: 'Aug 10, 2025',
    parties: ['Alex', 'Chris'],
    swaps: [
      { rounds: [7], fromSlotOwner: 'Chris', toOwner: 'Alex' },
      { rounds: [23], fromSlotOwner: 'Mike', toOwner: 'Chris' },  // originally Mike's, Alex got from Trade 1, now to Chris
    ],
  },
  {
    date: 'Aug 10, 2025',
    parties: ['Web', 'Bob'],
    swaps: [
      { rounds: [12], fromSlotOwner: 'Nick', toOwner: 'Web' },  // originally Nick's, Bob got from Trade 3, now to Web
      { rounds: [19], fromSlotOwner: 'Web', toOwner: 'Bob' },
    ],
  },
  {
    date: 'Oct 19, 2025',
    parties: ['Bob', 'Chris'],
    swaps: [
      { rounds: [13], fromSlotOwner: 'Chris', toOwner: 'Bob' },
      { rounds: [9], fromSlotOwner: 'Greasy', toOwner: 'Chris' },  // originally Greasy's, Bob got from Trade #4, now to Chris
    ],
  },
  {
    date: 'Feb 11, 2026',
    parties: ['Sean', 'Alex'],
    swaps: [
      { rounds: [13], fromSlotOwner: 'Sean', toOwner: 'Alex' },
      { rounds: [7], fromSlotOwner: 'Chris', toOwner: 'Sean' },  // originally Chris's, Alex got from #19, now to Sean
    ],
  },
  {
    date: 'Feb 13, 2026',
    parties: ['Greasy', 'Sean'],
    swaps: [
      { rounds: [18], fromSlotOwner: 'Greasy', toOwner: 'Sean' },
      { rounds: [7], fromSlotOwner: 'Sean', toOwner: 'Greasy' },  // Sean's original slot (7.12)
    ],
  },
  {
    date: 'Feb 14, 2026',
    parties: ['Alex', 'Tyler'],
    swaps: [
      { rounds: [18, 19, 20], fromSlotOwner: 'Alex', toOwner: 'Tyler' },  // Alex's original slots (18.5, 19.8, 20.5)
      { rounds: [6, 9, 13], fromSlotOwner: 'Tyler', toOwner: 'Alex' },
    ],
  },
]

/**
 * Build trade override map: trades[round][slotIndex] = { newOwner, originalOwner }
 * slotIndex = index in draftOrder array (0-based)
 */
function buildTradeMap(draftOrder: string[]): Map<number, Map<number, { newOwner: string; originalOwner: string }>> {
  const tradeMap = new Map<number, Map<number, { newOwner: string; originalOwner: string }>>()

  for (const trade of DRAFT_TRADES) {
    for (const swap of trade.swaps) {
      const slotIdx = draftOrder.indexOf(swap.fromSlotOwner)
      if (slotIdx === -1) continue

      for (const round of swap.rounds) {
        if (!tradeMap.has(round)) {
          tradeMap.set(round, new Map())
        }
        tradeMap.get(round)!.set(slotIdx, {
          newOwner: swap.toOwner,
          originalOwner: swap.fromSlotOwner,
        })
      }
    }
  }

  return tradeMap
}

export default function DraftBoardPage() {
  const [viewMode, setViewMode] = useState<'board' | 'owner' | 'clicky' | 'snake'>('clicky')
  const [fontSize, setFontSize] = useState(0.75)
  const [keepers, setKeepers] = useState<Map<string, Map<number, KeeperInfo>>>(new Map())
  const [keepersLoading, setKeepersLoading] = useState(true)
  const data = draftBoardData as DraftBoard

  // Fetch keeper data on mount
  useEffect(() => {
    const fetchKeepers = async () => {
      try {
        const response = await fetch('/api/keepers')
        if (response.ok) {
          const keeperRows = await response.json()
          
          // Build lookup map: displayName → round → KeeperInfo
          // NA keepers go into NA rounds (24-27), not their cost round
          const keeperMap = new Map<string, Map<number, KeeperInfo>>()
          
          // Track NA keeper assignments per owner (rounds 24-27)
          const naCounters = new Map<string, number>()
          
          // First pass: regular + 7th keepers (they use their effective round)
          for (const row of keeperRows) {
            if (!row.keeper_cost_round) continue
            if (!['keeping', 'keeping-7th'].includes(row.keeper_status)) continue
            
            const manager = MANAGERS.find(m => m.yahooTeamKey === row.yahoo_team_key)
            if (!manager) continue
            
            const displayName = manager.displayName
            const effectiveRound = row.stacking?.effective_round ?? row.keeper_cost_round
            
            const keeperInfo: KeeperInfo = {
              playerName: row.players?.full_name ?? 'Unknown Player',
              keeperStatus: row.keeper_status,
              costRound: row.keeper_cost_round,
              effectiveRound,
              stackedFrom: row.stacking?.stacked_from ?? null
            }
            
            if (!keeperMap.has(displayName)) {
              keeperMap.set(displayName, new Map())
            }
            
            const ownerMap = keeperMap.get(displayName)!
            ownerMap.set(effectiveRound, keeperInfo)
          }
          
          // Second pass: NA keepers → assign to rounds 24-27 sequentially
          for (const row of keeperRows) {
            if (row.keeper_status !== 'keeping-na') continue
            
            const manager = MANAGERS.find(m => m.yahooTeamKey === row.yahoo_team_key)
            if (!manager) continue
            
            const displayName = manager.displayName
            const naIdx = naCounters.get(displayName) ?? 0
            const naRound = 24 + naIdx // NA rounds: 24, 25, 26, 27
            naCounters.set(displayName, naIdx + 1)
            
            if (naRound > 27) continue // Max 4 NA slots
            
            const keeperInfo: KeeperInfo = {
              playerName: row.players?.full_name ?? 'Unknown Player',
              keeperStatus: 'keeping-na',
              costRound: row.keeper_cost_round,
              effectiveRound: naRound,
              stackedFrom: null
            }
            
            if (!keeperMap.has(displayName)) {
              keeperMap.set(displayName, new Map())
            }
            
            const ownerMap = keeperMap.get(displayName)!
            ownerMap.set(naRound, keeperInfo)
          }
          
          setKeepers(keeperMap)
        }
      } catch (error) {
        console.error('Failed to fetch keepers:', error)
        // Graceful fallback - just show board without keepers
      } finally {
        setKeepersLoading(false)
      }
    }
    
    fetchKeepers()
  }, [])

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
                onClick={() => setViewMode('clicky')}
                className={`px-3 py-1.5 rounded text-xs font-semibold font-bold transition-colors ${
                  viewMode === 'clicky'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📋 PICKS
              </button>
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
                onClick={() => setViewMode('snake')}
                className={`px-3 py-1.5 rounded text-xs font-semibold font-bold transition-colors ${
                  viewMode === 'snake'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🐍 SNAKE
              </button>
            </div>

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

                  // Always display slots in draft-order position (1→12).
                  // The ← arrow on even rounds indicates read direction (right-to-left).
                  const displaySlots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

                  return (
                    <tr key={round} className={`${isNA ? 'bg-amber-950/20' : round % 2 === 0 ? 'bg-card/50' : ''} hover:bg-primary/5 transition-colors`}>
                      <td className={`sticky left-0 z-[5] p-2 text-center font-mono font-bold border-r border-primary/20 ${
                        isNA ? 'bg-amber-100 text-amber-700' : round % 2 === 0 ? 'bg-card/90' : 'bg-background'
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

                        // Check if there's a keeper for this owner in this round
                        const ownerKeepers = keepers.get(pick.currentOwner)
                        const keeper = ownerKeepers?.get(round)

                        const colors = TEAM_COLORS[pick.currentOwner]
                        const isTraded = pick.traded
                        const path = pick.path ?? [pick.originalOwner]
                        const isMultiHop = path.length > 2
                        const pathDisplay = path.join(' → ')

                        return (
                          <td
                            key={slot}
                            className="p-0.5 text-center border border-border/10"
                            title={keeper 
                              ? `${keeper.playerName} — ${pick.currentOwner} Keeper (${getKeeperStatusIcon(keeper.keeperStatus)}${keeper.stackedFrom ? ` stacked from Rd ${keeper.stackedFrom}` : ''})`
                              : isTraded
                              ? `Pick ${round}.${snakePickInRound(round, slot)} — Path: ${pathDisplay}`
                              : `Pick ${round}.${snakePickInRound(round, slot)} — ${pick.currentOwner}`}
                          >
                            <div className={`rounded px-1 py-1.5 border ${
                              colors ? `${colors.bg} ${colors.border}` : 'bg-muted border-border'
                            } ${keeper ? 'ring-2 ring-green-500/50' : isTraded ? 'ring-1 ring-accent/30' : ''}`}>
                              {keeper ? (
                                // Show keeper
                                <div>
                                  <div className={`font-mono font-bold leading-tight ${colors?.text ?? 'text-foreground'} flex items-center justify-center gap-1`} style={{ fontSize: `${fontSize * 0.85}rem` }}>
                                    <span className="truncate" title={keeper.playerName}>{keeper.playerName.length > 12 ? keeper.playerName.substring(0, 10) + '…' : keeper.playerName}</span>
                                    <span style={{ fontSize: `${fontSize * 0.6}rem` }}>{getKeeperStatusIcon(keeper.keeperStatus)}</span>
                                  </div>
                                  <div className={`text-xs leading-tight ${colors?.text ?? 'text-foreground'} opacity-70`} style={{ fontSize: `${fontSize * 0.65}rem` }}>
                                    Rd {round}{keeper.stackedFrom && <span className="text-yellow-600"> ↕{keeper.stackedFrom}</span>}
                                  </div>
                                </div>
                              ) : (
                                // Show regular pick
                                <div>
                                  <div className={`font-mono font-bold leading-tight ${colors?.text ?? 'text-foreground'} flex items-center justify-center gap-0.5`} style={{ fontSize: `${fontSize}rem` }}>
                                    {pick.currentOwner}
                                  </div>
                                  {isTraded && (
                                    <div className={`font-mono leading-tight ${isMultiHop ? 'text-yellow-700' : 'text-accent'}`} style={{ fontSize: `${fontSize * 0.75}rem` }}>
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
                        <div className={`text-[10px] font-mono font-bold ${isNA ? 'text-amber-700' : 'text-foreground'}`}>
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

                        // Check if there's a keeper for this owner in this round
                        const ownerKeepers = keepers.get(owner)
                        const keeper = ownerKeepers?.get(round)

                        if (keeper) {
                          // Show keeper - takes priority over regular picks
                          return (
                            <td
                              key={round}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`${keeper.playerName} — ${owner} Keeper (${getKeeperStatusIcon(keeper.keeperStatus)}${keeper.stackedFrom ? ` stacked from Rd ${keeper.stackedFrom}` : ''})`}
                            >
                              <div className={`rounded px-0.5 py-1 border ring-2 ring-green-500/50 ${colors?.bg} ${colors?.border}`}>
                                <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 0.8, 0.5)}rem` }}>
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="truncate" title={keeper.playerName}>
                                      {keeper.playerName.length > 8 ? keeper.playerName.substring(0, 6) + '…' : keeper.playerName}
                                    </span>
                                    <span style={{ fontSize: `${Math.max(fontSize * 0.6, 0.4)}rem` }}>{getKeeperStatusIcon(keeper.keeperStatus)}</span>
                                  </div>
                                </div>
                                {keeper.stackedFrom && (
                                  <div className="text-yellow-600 leading-tight" style={{ fontSize: `${Math.max(fontSize * 0.55, 0.4)}rem` }}>↕{keeper.stackedFrom}</div>
                                )}
                              </div>
                            </td>
                          )
                        }

                        if (pickCount === 0) {
                          // Gap — no pick this round
                          return (
                            <td
                              key={round}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`${owner} — No pick in round ${round}`}
                            >
                              <div className={`rounded h-full min-h-[32px] border border-dashed ${
                                isNA ? 'border-amber-300 bg-amber-50' : 'border-muted-foreground/15 bg-muted/10'
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
                              title={`${owner} — Round ${round}, Pick ${snakePickInRound(round, pick.slot)}${isTraded ? ` (from ${pick.originalOwner})` : ''}`}
                            >
                              <div className={`rounded px-0.5 py-1 border ${colors?.bg} ${colors?.border} ${isTraded ? 'ring-1 ring-accent/30' : ''}`}>
                                <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}>
                                  {snakePickInRound(round, pick.slot)}
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
                            title={`${owner} — Round ${round}: ${pickCount} picks (picks ${picks.map(p => snakePickInRound(round, p.slot)).sort((a, b) => a - b).join(', ')})`}
                          >
                            <div className={`rounded px-0.5 py-1 border relative ${colors?.bg} ${colors?.border}`}>
                              <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 0.75, 0.5)}rem` }}>
                                {picks.sort((a, b) => snakePickInRound(round, a.slot) - snakePickInRound(round, b.slot)).map((p, i) => (
                                  <span key={p.slot}>
                                    {i > 0 && ','}
                                    {snakePickInRound(round, p.slot)}
                                  </span>
                                ))}
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
                        isNA ? 'bg-amber-100 text-amber-700' : round % 2 === 0 ? 'bg-card/90' : 'bg-background'
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

                        // Check if there's a keeper for this owner in this round
                        const ownerKeepers = keepers.get(owner)
                        const keeper = ownerKeepers?.get(round)

                        if (keeper) {
                          // Show keeper - takes priority over regular picks
                          return (
                            <td
                              key={owner}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`${keeper.playerName} — ${owner} Keeper (${getKeeperStatusIcon(keeper.keeperStatus)}${keeper.stackedFrom ? ` stacked from Rd ${keeper.stackedFrom}` : ''})`}
                            >
                              <div className={`rounded px-1 py-2 border ring-2 ring-green-500/50 ${colors?.bg} ${colors?.border}`}>
                                <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}>
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <span className="truncate" title={keeper.playerName}>
                                      {keeper.playerName.length > 10 ? keeper.playerName.substring(0, 8) + '…' : keeper.playerName}
                                    </span>
                                    <span style={{ fontSize: `${Math.max(fontSize * 0.6, 0.4)}rem` }}>{getKeeperStatusIcon(keeper.keeperStatus)}</span>
                                  </div>
                                  <div className="text-xs opacity-70">Rd {round}</div>
                                </div>
                                {keeper.stackedFrom && (
                                  <div className="text-yellow-600 leading-tight mt-0.5" style={{ fontSize: `${Math.max(fontSize * 0.6, 0.4)}rem` }}>
                                    ↕ from Rd {keeper.stackedFrom}
                                  </div>
                                )}
                              </div>
                            </td>
                          )
                        }

                        if (pickCount === 0) {
                          return (
                            <td
                              key={owner}
                              className={`p-0.5 text-center border border-border/10 ${isNA ? 'bg-amber-950/10' : ''}`}
                              title={`${owner} — No pick in round ${round}`}
                            >
                              <div className={`rounded min-h-[36px] border border-dashed ${
                                isNA ? 'border-amber-300 bg-amber-50' : 'border-muted-foreground/15 bg-muted/10'
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
                              title={`Pick ${round}.${snakePickInRound(round, pick.slot)} — ${owner}${isTraded ? ` (from ${pick.originalOwner})` : ''}`}
                            >
                              <div className={`rounded px-1 py-2 border ${colors?.bg} ${colors?.border} ${isTraded ? 'ring-1 ring-accent/30' : ''}`}>
                                <div className={`font-mono font-bold leading-tight ${colors?.text}`} style={{ fontSize: `${Math.max(fontSize * 1, 0.65)}rem` }}>
                                  {round}.{snakePickInRound(round, pick.slot)}
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
                            title={`${owner} — Round ${round}: ${pickCount} picks (${picks.map(p => `${round}.${snakePickInRound(round, p.slot)}`).join(', ')})`}
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
                                        {round}.{snakePickInRound(round, pick.slot)}
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

        {/* Snake View — snake-order draft board with trade overrides */}
        {viewMode === 'snake' && (() => {
          const draftOrder = data.draftOrder
          const totalRounds = 23
          const teamCount = draftOrder.length // 12
          const tradeMap = buildTradeMap(draftOrder)

          return (
            <div className="overflow-x-auto rounded-lg border border-primary/20">
              <table className="border-collapse w-full" style={{ minWidth: '960px', fontSize: `${fontSize}rem` }}>
                <thead>
                  <tr className="bg-card">
                    <th className="sticky left-0 z-[5] bg-card p-2 text-center font-mono text-xs text-muted-foreground border-b border-r border-primary/20 w-14">
                      RND
                    </th>
                    {Array.from({ length: teamCount }, (_, i) => (
                      <th key={i} className="p-2 text-center border-b border-primary/20 min-w-[80px] bg-card">
                        <span className="font-mono font-bold text-muted-foreground" style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}>
                          Pick {i + 1}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
                    const isOdd = round % 2 === 1
                    const roundTrades = tradeMap.get(round)

                    return (
                      <tr key={round} className="hover:bg-primary/5 transition-colors">
                        <td className={`sticky left-0 z-[5] p-2 text-center font-mono font-bold border-r border-primary/20 ${
                          isOdd ? 'bg-background' : 'bg-card/90'
                        }`} style={{ fontSize: `${fontSize * 1.1}rem` }}>
                          <div className="flex items-center justify-center gap-1">
                            <span>{round}</span>
                            <span className="text-muted-foreground" style={{ fontSize: `${fontSize * 0.75}rem` }}>
                              {isOdd ? '→' : '←'}
                            </span>
                          </div>
                        </td>
                        {Array.from({ length: teamCount }, (_, colIdx) => {
                          const pickNum = colIdx + 1
                          // Map column back to original slot index in draftOrder
                          const slotIdx = isOdd ? colIdx : (teamCount - 1 - colIdx)

                          // Check for trade override on this slot
                          const tradeOverride = roundTrades?.get(slotIdx)
                          const owner = tradeOverride ? tradeOverride.newOwner : draftOrder[slotIdx]
                          const isTraded = !!tradeOverride
                          const originalOwner = tradeOverride?.originalOwner ?? ''
                          const colors = TEAM_COLORS[owner]

                          return (
                            <td
                              key={colIdx}
                              className="p-0.5 text-center border border-border/10"
                              title={isTraded
                                ? `Round ${round}, Pick ${pickNum} — ${owner} (from ${originalOwner})`
                                : `Round ${round}, Pick ${pickNum} — ${owner}`
                              }
                            >
                              <div
                                className={`rounded px-1 py-2 border ${colors?.bg ?? 'bg-muted'} ${colors?.border ?? 'border-border'} min-h-[48px] flex flex-col items-center justify-center gap-0.5 ${isTraded ? 'ring-1 ring-accent/40' : ''}`}
                                style={{ opacity: 0.9 }}
                              >
                                <div
                                  className={`font-mono font-bold leading-tight ${colors?.text ?? 'text-foreground'}`}
                                  style={{ fontSize: `${Math.max(fontSize * 1.05, 0.65)}rem` }}
                                >
                                  {owner}
                                </div>
                                <div
                                  className="font-mono leading-tight text-muted-foreground"
                                  style={{ fontSize: `${Math.max(fontSize * 0.7, 0.45)}rem` }}
                                >
                                  {round}.{pickNum}
                                </div>
                                {isTraded && (
                                  <div
                                    className="font-mono leading-tight text-accent"
                                    style={{ fontSize: `${Math.max(fontSize * 0.6, 0.4)}rem` }}
                                  >
                                    ↔ {originalOwner}
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
          )
        })()}

        {/* Legend & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Team Legend */}
          <div className="p-4 bg-card rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-3 font-mono text-sm">TEAMS</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {data.draftOrder.map((team) => {
                const colors = TEAM_COLORS[team]
                const pickCount = Object.values(data.picks).reduce((acc, round) =>
                  acc + (round as DraftPick[]).filter(p => p.currentOwner === team).length, 0
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
              <li>• <span className="text-amber-700">Rounds 24-27:</span> NA/Minor League only</li>
              <li>• <span className="text-accent">↔ symbol:</span> Pick was traded once (shows original owner)</li>
              <li>• <span className="text-yellow-700">Multi-hop path:</span> Pick traded through multiple teams (e.g. Mike→Nick→Alex)</li>
              <li>• <span className="text-foreground">← arrow:</span> Even rounds flow right-to-left</li>
              <li className="pt-2 border-t border-border space-y-1">
                <div>• <span className="text-green-600">🔒 = Keeper (locked)</span></div>
                <div>• <span className="text-yellow-600">⭐ = 7th Keeper</span></div>
                <div>• <span className="text-blue-600">🔷 = NA Keeper (minor league)</span></div>
                <div>• <span className="text-yellow-600">↕ = Stacked from different round</span></div>
              </li>
              <li className="pt-2 border-t border-border">• <span className="text-foreground">Hover</span> any cell for full details</li>
            </ul>
          </div>

          {/* Trade Log */}
          <div className="p-4 bg-card rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-3 font-mono text-sm">📋 TRADES</h3>
            <ul className="text-xs space-y-2 font-mono text-muted-foreground">
              {DRAFT_TRADES.map((trade, i) => (
                <li key={i} className="leading-snug">
                  <span className="text-foreground font-bold">{trade.date}</span>
                  {' — '}
                  <span className={TEAM_COLORS[trade.parties[0]]?.text}>{trade.parties[0]}</span>
                  {' ↔ '}
                  <span className={TEAM_COLORS[trade.parties[1]]?.text}>{trade.parties[1]}</span>
                  <div className="mt-0.5 pl-2 text-muted-foreground">
                    {trade.swaps.map((swap, j) => {
                      const rounds = swap.rounds
                      const rangeStr = rounds.length > 1 ? `Rd ${rounds[0]}-${rounds[rounds.length - 1]}` : `Rd ${rounds[0]}`
                      return (
                        <div key={j}>
                          <span className={TEAM_COLORS[swap.toOwner]?.text}>{swap.toOwner}</span>
                          {' gets '}
                          {rangeStr}
                        </div>
                      )
                    })}
                  </div>
                </li>
              ))}
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
