'use client'

import { useEffect, useState } from 'react'
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

export default function DashboardPage() {
  const [manager, setManager] = useState<Manager | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
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
        <div className="grid grid-cols-3 gap-4">
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

        {/* Keeper Selection Placeholder */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-primary vault-glow font-mono">
              🔒 KEEPER SELECTIONS
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary/60 border border-primary/20 rounded">
              Phase 2
            </span>
          </div>
          <p className="text-sm font-mono text-muted-foreground">
            Keeper selections coming soon. You&apos;ll be able to lock in your keepers and see cost analysis here.
          </p>
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
          <Link href="/offer" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
            🤝 Trade Block
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
