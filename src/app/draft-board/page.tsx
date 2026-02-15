'use client'

import { useState } from 'react'
import { ArrowLeft, AlertTriangle, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

// Import the draft board data
import draftBoardData from '@/data/draft-board.json'

type DraftPick = {
  slot: number
  originalOwner: string
  currentOwner: string
  traded: boolean
}

type DraftBoard = {
  draftOrder: string[]
  rounds: number
  naRounds: number[]
  auditStatus?: string
  auditNotes?: string[]
  trades: Array<{
    description: string
    source: string
  }>
  picks: Record<string, DraftPick[]>
}

// Team colors for visual distinction
const TEAM_COLORS: Record<string, string> = {
  'Pudge': 'bg-red-500/20 border-red-400/40 text-red-300',
  'Nick': 'bg-blue-500/20 border-blue-400/40 text-blue-300',
  'Web': 'bg-green-500/20 border-green-400/40 text-green-300',
  'Tom': 'bg-yellow-500/20 border-yellow-400/40 text-yellow-300',
  'Tyler': 'bg-purple-500/20 border-purple-400/40 text-purple-300',
  'Thomas': 'bg-pink-500/20 border-pink-400/40 text-pink-300',
  'Chris': 'bg-primary/20 border-primary/40 text-primary',
  'Alex': 'bg-orange-500/20 border-orange-400/40 text-orange-300',
  'Greasy': 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300',
  'Bob': 'bg-slate-500/20 border-slate-400/40 text-slate-300',
  'Mike': 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300',
  'Sean': 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
  'CONFLICT': 'bg-destructive/20 border-destructive/40 text-red-300'
}

export default function DraftBoardPage() {
  const [showTrades, setShowTrades] = useState(false)
  const data = draftBoardData as DraftBoard

  // Generate all 27 rounds of picks
  const allRounds = []
  for (let round = 1; round <= data.rounds; round++) {
    const roundPicks = []
    
    // If we have actual pick data, use it; otherwise generate default
    if (data.picks[round.toString()]) {
      roundPicks.push(...data.picks[round.toString()])
    } else {
      // Generate default snake draft order
      for (let slot = 1; slot <= 12; slot++) {
        const draftSlot = round % 2 === 1 ? slot : 13 - slot
        const owner = data.draftOrder[slot - 1]
        roundPicks.push({
          slot: draftSlot,
          originalOwner: owner,
          currentOwner: owner,
          traded: false
        })
      }
    }
    
    // Sort by slot number for display
    roundPicks.sort((a, b) => a.slot - b.slot)
    allRounds.push({ round, picks: roundPicks, isNA: data.naRounds.includes(round) })
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-primary/20">
        <div className="mx-auto max-w-7xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-mono">← BACK TO TERMINAL</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-2xl font-bold text-primary vault-glow">
                🎯 2026 DRAFT BOARD
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>March 6, 2026</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>12 Teams • 27 Rounds</span>
              </div>
            </div>
          </div>

          {/* Audit Status Warning */}
          {data.auditStatus === 'CONFLICTS FOUND' && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">AUDIT CONFLICTS DETECTED</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Trade records contain impossible transactions. Manual verification recommended.
                  </p>
                  <button 
                    onClick={() => setShowTrades(!showTrades)}
                    className="text-xs text-primary hover:text-primary/80 mt-2 underline"
                  >
                    {showTrades ? 'Hide' : 'Show'} Trade Log
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Trade Log */}
          {showTrades && (
            <div className="mt-4 p-4 bg-card rounded-lg border border-primary/20">
              <h3 className="font-bold text-primary mb-3">TRADE LOG</h3>
              <div className="space-y-2">
                {data.trades.map((trade, i) => (
                  <div key={i} className="text-sm font-mono">
                    <span className="text-muted-foreground">[{trade.source}]</span>{' '}
                    <span className={trade.description.includes('CONFLICT') ? 'text-destructive' : 'text-foreground'}>
                      {trade.description}
                    </span>
                  </div>
                ))}
              </div>
              {data.auditNotes && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">AUDIT NOTES:</p>
                  {data.auditNotes.map((note, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {note}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Draft Board Grid */}
      <div className="mx-auto max-w-7xl p-4">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Column Headers */}
            <div className="grid grid-cols-13 gap-1 mb-2">
              <div className="p-2 text-center font-mono text-xs text-muted-foreground">
                RND
              </div>
              {data.draftOrder.map((team, index) => (
                <div key={team} className="p-2 text-center">
                  <div className="text-xs font-mono text-muted-foreground">#{index + 1}</div>
                  <div className="text-sm font-bold text-foreground truncate">{team}</div>
                </div>
              ))}
            </div>

            {/* Draft Rounds */}
            <div className="space-y-1">
              {allRounds.map(({ round, picks, isNA }) => (
                <div key={round} className="grid grid-cols-13 gap-1">
                  {/* Round Label */}
                  <div className={`p-3 rounded border text-center font-mono font-bold ${
                    isNA 
                      ? 'bg-accent/20 border-accent/40 text-accent' 
                      : 'bg-muted border-border text-foreground'
                  }`}>
                    {isNA ? `NA${round - 23}` : round}
                  </div>

                  {/* Draft Picks */}
                  {picks.map((pick) => {
                    const colorClass = TEAM_COLORS[pick.currentOwner] || TEAM_COLORS['Bob']
                    const isSnakeReverse = round % 2 === 0
                    
                    return (
                      <div
                        key={`${round}-${pick.slot}`}
                        className={`p-2 rounded border text-center transition-all hover:scale-105 ${colorClass}`}
                        title={
                          pick.traded 
                            ? `Originally ${pick.originalOwner}, traded to ${pick.currentOwner}`
                            : `${pick.currentOwner} - Pick ${round}.${pick.slot}`
                        }
                      >
                        <div className="text-xs font-mono font-bold truncate">
                          {pick.currentOwner}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {round}.{pick.slot}
                        </div>
                        {pick.traded && (
                          <div className="text-xs text-accent">
                            ↔
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-card rounded-lg border border-primary/20">
          <h3 className="font-bold text-primary mb-3">LEGEND</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-semibold mb-2">Draft Format:</p>
              <ul className="text-xs space-y-1 font-mono text-muted-foreground">
                <li>• Snake draft: Odd rounds 1→12, Even rounds 12→1</li>
                <li>• Rounds 1-23: Regular players</li>
                <li className="text-accent">• Rounds 24-27: NA/Minor League only</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Pick Display:</p>
              <ul className="text-xs space-y-1 font-mono text-muted-foreground">
                <li>• Each cell shows: Team Name, Round.Slot</li>
                <li className="text-accent">• ↔ indicates traded pick</li>
                <li className="text-destructive">• CONFLICT = impossible trade</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Team Colors:</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(TEAM_COLORS)
                  .filter(([team]) => team !== 'CONFLICT')
                  .slice(0, 12)
                  .map(([team, colorClass]) => (
                    <div key={team} className={`text-xs p-1 rounded ${colorClass}`}>
                      {team}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}