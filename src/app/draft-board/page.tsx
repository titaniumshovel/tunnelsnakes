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
 * Snake board keepers — maps owner → round → player display info.
 * NA keepers use virtual rounds 24-27 (one per slot).
 */
type SnakeKeeper = {
  player: string      // Display name
  pos: string         // Primary position
  year?: string       // e.g. "5yr", "1yr"
  isNA?: boolean
  is7th?: boolean
}

const SNAKE_KEEPERS: Record<string, Record<number, SnakeKeeper>> = {
  Chris: {
    3:  { player: 'Yordan Alvarez', pos: 'OF', year: '5yr' },
    4:  { player: 'Chris Sale', pos: 'SP', year: '2yr' },
    5:  { player: 'Jackson Merrill', pos: 'OF', year: '2yr' },
    6:  { player: 'Cody Bellinger', pos: 'OF', year: '3yr' },
    9:  { player: 'Cal Raleigh', pos: 'C', year: '1yr' },
    23: { player: 'Eury Pérez', pos: 'SP', year: '1yr' },
    24: { player: 'Josue De Paula', pos: 'SP', isNA: true },
    25: { player: 'Lazaro Montes', pos: 'OF', isNA: true },
    26: { player: 'Ethan Salas', pos: 'C', isNA: true },
  },
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
  {
    date: 'Feb 15, 2026',
    parties: ['Alex', 'Nick'],
    swaps: [
      { rounds: [19, 20], fromSlotOwner: 'Mike', toOwner: 'Nick' },  // Mike's slots Alex had (21 removed — goes to Bob in #35)
      { rounds: [21, 22], fromSlotOwner: 'Alex', toOwner: 'Nick' },  // Alex's original slots
      { rounds: [23], fromSlotOwner: 'Alex', toOwner: 'Nick' },  // Alex's original Rd 23 (replaces 2nd Rd 21)
      { rounds: [7, 9], fromSlotOwner: 'Mike', toOwner: 'Alex' },  // Mike's slots Nick had
      { rounds: [8, 10], fromSlotOwner: 'Nick', toOwner: 'Alex' },  // Nick's original slots
      { rounds: [11], fromSlotOwner: 'Bob', toOwner: 'Alex' },  // Bob's slot Nick had
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Alex', 'Mike'],
    swaps: [
      { rounds: [15], fromSlotOwner: 'Alex', toOwner: 'Mike' },  // Alex's original
      { rounds: [12], fromSlotOwner: 'Mike', toOwner: 'Alex' },  // Mike's original
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Mike', 'Tyler'],
    swaps: [
      { rounds: [21, 22, 23], fromSlotOwner: 'Nick', toOwner: 'Tyler' },  // Nick's slots Mike had
      { rounds: [7, 8, 10], fromSlotOwner: 'Tyler', toOwner: 'Mike' },  // Tyler's original slots
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Chris', 'Bob'],
    swaps: [
      { rounds: [11], fromSlotOwner: 'Chris', toOwner: 'Bob' },  // Chris's original
      { rounds: [7], fromSlotOwner: 'Bob', toOwner: 'Chris' },  // Bob's original (7.10)
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Thomas', 'Tyler'],
    swaps: [
      { rounds: [4, 6, 8, 23], fromSlotOwner: 'Thomas', toOwner: 'Tyler' },
      { rounds: [1, 11, 12, 14], fromSlotOwner: 'Tyler', toOwner: 'Thomas' },
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Nick', 'Alex'],
    swaps: [
      { rounds: [8], fromSlotOwner: 'Mike', toOwner: 'Alex' },  // Mike's slot Nick had (8.2)
      { rounds: [22], fromSlotOwner: 'Mike', toOwner: 'Nick' },  // Mike's slot Alex had (22.2)
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Mike', 'Alex'],
    swaps: [
      { rounds: [20], fromSlotOwner: 'Web', toOwner: 'Alex' },  // Web's slot Mike had (20.10), modified from Rd 23
      { rounds: [13], fromSlotOwner: 'Sean', toOwner: 'Mike' },  // Sean's slot Alex had (13.12)
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Tom', 'Alex'],
    swaps: [
      { rounds: [8, 10], fromSlotOwner: 'Tom', toOwner: 'Alex' },  // Tom's original slots
      { rounds: [13], fromSlotOwner: 'Alex', toOwner: 'Tom' },  // Alex's original slot
      { rounds: [18], fromSlotOwner: 'Mike', toOwner: 'Tom' },  // Mike's slot Alex had (18.2)
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Alex', 'Tyler'],
    swaps: [
      { rounds: [8, 10], fromSlotOwner: 'Nick', toOwner: 'Tyler' },  // Nick's slots Alex had (8.11, 10.11)
      { rounds: [2], fromSlotOwner: 'Tyler', toOwner: 'Alex' },  // Tyler's original (2.8)
      { rounds: [6], fromSlotOwner: 'Thomas', toOwner: 'Alex' },  // Thomas's slot Tyler had from #29 (6.7)
    ],
  },
  {
    date: 'Feb 17, 2026',
    parties: ['Alex', 'Pudge'],
    swaps: [
      { rounds: [7], fromSlotOwner: 'Mike', toOwner: 'Pudge' },  // Mike's slot Alex had (7.11)
      { rounds: [20], fromSlotOwner: 'Web', toOwner: 'Pudge' },  // Web's slot Alex had (20.10)
      { rounds: [11], fromSlotOwner: 'Pudge', toOwner: 'Alex' },  // Pudge's original (11.1)
      { rounds: [23], fromSlotOwner: 'Pudge', toOwner: 'Alex' },  // Pudge's original (23.1)
    ],
  },
  {
    date: 'Feb 19, 2026',
    parties: ['Bob', 'Alex'],
    swaps: [
      { rounds: [16, 17], fromSlotOwner: 'Alex', toOwner: 'Bob' },  // Alex's original slots
      { rounds: [21], fromSlotOwner: 'Mike', toOwner: 'Bob' },  // Mike's slot Alex kept (21.11)
      { rounds: [15, 19, 23], fromSlotOwner: 'Bob', toOwner: 'Alex' },  // Bob's original slots (higher picks traded first)
    ],
  },
  {
    date: 'Feb 19, 2026',
    parties: ['Chris', 'Thomas'],
    swaps: [
      { rounds: [22], fromSlotOwner: 'Chris', toOwner: 'Thomas' },  // Chris's original (22.6)
      { rounds: [23], fromSlotOwner: 'Mike', toOwner: 'Thomas' },  // Mike's slot Chris had (23.11)
      { rounds: [12], fromSlotOwner: 'Tyler', toOwner: 'Chris' },  // Tyler's slot Thomas had from #29 (12.8)
      { rounds: [16], fromSlotOwner: 'Thomas', toOwner: 'Chris' },  // Thomas's original (16.7)
    ],
  },
  {
    date: 'Feb 19, 2026',
    parties: ['Nick', 'Tyler'],
    swaps: [
      { rounds: [13], fromSlotOwner: 'Nick', toOwner: 'Tyler' },  // Nick's original (13.2)
      { rounds: [23], fromSlotOwner: 'Thomas', toOwner: 'Nick' },  // Thomas's slot Tyler had from #29 (23.6)
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
  const [fontSize, setFontSize] = useState(0.75)
  const [keepers, setKeepers] = useState<Map<string, Map<number, KeeperInfo>>>(new Map())
  const [, setKeepersLoading] = useState(true)
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
        {/* Font Size Controls */}
        <div className="flex items-center justify-end">
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

        {/* Snake View — snake-order draft board with trade overrides */}
        {(() => {
          const draftOrder = data.draftOrder
          const totalRounds = 23
          const teamCount = draftOrder.length // 12
          const tradeMap = buildTradeMap(draftOrder)

          // Build keeper placement map: "round-slotIdx" → SnakeKeeper
          const keeperPlacements = new Map<string, SnakeKeeper>()
          for (const [ownerName, rounds] of Object.entries(SNAKE_KEEPERS)) {
            for (const [roundStr, keeper] of Object.entries(rounds)) {
              const round = parseInt(roundStr)
              if (round > 23) continue // NA handled separately
              // Find which slots this owner has in this round
              const ownerSlots: number[] = []
              for (let s = 0; s < teamCount; s++) {
                const tradeOverride = tradeMap.get(round)?.get(s)
                const cellOwner = tradeOverride ? tradeOverride.newOwner : draftOrder[s]
                if (cellOwner === ownerName) ownerSlots.push(s)
              }
              if (ownerSlots.length > 0) {
                // Place keeper in first available slot not already taken by another keeper
                const slot = ownerSlots.find(s => !keeperPlacements.has(`${round}-${s}`)) ?? ownerSlots[0]
                keeperPlacements.set(`${round}-${slot}`, keeper)
              }
            }
          }

          // Collect NA keepers per owner for NA rows
          const naKeepers: Record<string, SnakeKeeper[]> = {}
          for (const [ownerName, rounds] of Object.entries(SNAKE_KEEPERS)) {
            for (const [roundStr, keeper] of Object.entries(rounds)) {
              if (keeper.isNA) {
                if (!naKeepers[ownerName]) naKeepers[ownerName] = []
                naKeepers[ownerName].push(keeper)
              }
            }
          }
          const maxNA = Math.max(1, ...Object.values(naKeepers).map(arr => arr.length))

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
                          const slotIdx = isOdd ? colIdx : (teamCount - 1 - colIdx)
                          const tradeOverride = roundTrades?.get(slotIdx)
                          const owner = tradeOverride ? tradeOverride.newOwner : draftOrder[slotIdx]
                          const isTraded = !!tradeOverride
                          const originalOwner = tradeOverride?.originalOwner ?? ''
                          const colors = TEAM_COLORS[owner]
                          const keeper = keeperPlacements.get(`${round}-${slotIdx}`)

                          return (
                            <td
                              key={colIdx}
                              className="p-0.5 text-center border border-border/10"
                              title={keeper
                                ? `${keeper.player} (${keeper.pos}) — ${owner}, Round ${round}`
                                : isTraded
                                  ? `Round ${round}, Pick ${pickNum} — ${owner} (from ${originalOwner})`
                                  : `Round ${round}, Pick ${pickNum} — ${owner}`
                              }
                            >
                              <div
                                className={`rounded border ${colors?.bg ?? 'bg-muted'} ${colors?.border ?? 'border-border'} min-h-[56px] flex flex-col ${isTraded && !keeper ? 'ring-2 ring-black dark:ring-white' : ''} ${keeper ? 'ring-2 ring-yellow-500' : ''}`}
                                style={{ opacity: 0.9 }}
                              >
                                {/* Owner name — sectioned off at top */}
                                <div
                                  className={`font-mono font-bold leading-tight text-center px-1 pt-0.5 ${colors?.text ?? 'text-foreground'} ${keeper ? 'border-b border-black/20' : ''}`}
                                  style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}
                                >
                                  {owner}
                                </div>
                                {/* Content: keeper player or pick number */}
                                <div className="flex-1 flex flex-col items-center justify-center px-0.5">
                                  {keeper ? (
                                    <>
                                      <div
                                        className="font-bold leading-tight text-black text-center"
                                        style={{ fontSize: `${Math.max(fontSize * 0.7, 0.45)}rem` }}
                                      >
                                        {keeper.player}
                                      </div>
                                      <div
                                        className="font-mono text-black/70 leading-tight"
                                        style={{ fontSize: `${Math.max(fontSize * 0.6, 0.4)}rem` }}
                                      >
                                        ({keeper.pos}){keeper.year ? ` ${keeper.year}` : ''}
                                      </div>
                                    </>
                                  ) : isTraded ? (
                                    <div
                                      className="font-mono font-bold leading-tight text-black"
                                      style={{ fontSize: `${Math.max(fontSize * 0.65, 0.45)}rem` }}
                                    >
                                      {round}.{pickNum} ← {originalOwner}
                                    </div>
                                  ) : (
                                    <div
                                      className="font-mono leading-tight text-black/60"
                                      style={{ fontSize: `${Math.max(fontSize * 0.7, 0.45)}rem` }}
                                    >
                                      {round}.{pickNum}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {/* NA Keeper Rows */}
                  {maxNA > 0 && (
                    <>
                      <tr>
                        <td colSpan={teamCount + 1} className="p-0">
                          <div className="border-t-2 border-primary/40" />
                        </td>
                      </tr>
                      {Array.from({ length: maxNA }, (_, naIdx) => (
                        <tr key={`na-${naIdx}`} className="bg-card/50">
                          <td className="sticky left-0 z-[5] p-2 text-center font-mono font-bold border-r border-primary/20 bg-card/50"
                            style={{ fontSize: `${fontSize * 0.9}rem` }}>
                            <div className="flex items-center justify-center">
                              <span className="text-muted-foreground">NA</span>
                            </div>
                          </td>
                          {Array.from({ length: teamCount }, (_, colIdx) => {
                            // NA rows aren't snake-ordered — each column = that slot's owner
                            const owner = draftOrder[colIdx]
                            const ownerNA = naKeepers[owner] ?? []
                            const keeper = ownerNA[naIdx]
                            const colors = TEAM_COLORS[owner]

                            return (
                              <td key={colIdx} className="p-0.5 text-center border border-border/10">
                                {keeper ? (
                                  <div
                                    className={`rounded border ${colors?.bg ?? 'bg-muted'} ${colors?.border ?? 'border-border'} min-h-[56px] flex flex-col ring-2 ring-blue-400`}
                                    style={{ opacity: 0.9 }}
                                  >
                                    <div
                                      className={`font-mono font-bold leading-tight text-center px-1 pt-0.5 ${colors?.text ?? 'text-foreground'} border-b border-black/20`}
                                      style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}
                                    >
                                      {owner}
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-center px-0.5">
                                      <div
                                        className="font-bold leading-tight text-black text-center"
                                        style={{ fontSize: `${Math.max(fontSize * 0.7, 0.45)}rem` }}
                                      >
                                        {keeper.player}
                                      </div>
                                      <div
                                        className="font-mono text-black/70 leading-tight"
                                        style={{ fontSize: `${Math.max(fontSize * 0.6, 0.4)}rem` }}
                                      >
                                        ({keeper.pos}) 🔷
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded border border-border/20 bg-muted/30 min-h-[56px]" />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </>
                  )}
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
