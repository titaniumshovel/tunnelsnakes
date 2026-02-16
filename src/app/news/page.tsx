'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

// ─── Types ───────────────────────────────────────────────────────

interface MlbHeadline {
  title: string
  summary: string
  source_url?: string
  tags?: string[]
}

interface FantasyImpact {
  title: string
  analysis: string
  affected_players?: string[]
}

interface LeagueWatch {
  title: string
  analysis: string
  affected_managers?: string[]
  affected_team_keys?: string[]
}

interface PowerRanking {
  rank: number
  manager: string
  team: string
  reasoning: string
}

interface Edition {
  id: string
  date: string
  headline: string
  hero_image_url?: string
  mlb_headlines: MlbHeadline[]
  fantasy_impact: FantasyImpact[]
  league_watch: LeagueWatch[]
  hot_take?: string
  power_rankings?: PowerRanking[]
  raw_items_count: number
  created_at: string
}

// ─── Manager Color Badges ────────────────────────────────────────

const MANAGER_COLORS: Record<string, string> = {
  Chris: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40',
  Alex: 'bg-blue-600/30 text-blue-400 border-blue-500/40',
  Pudge: 'bg-red-600/30 text-red-400 border-red-500/40',
  Sean: 'bg-purple-600/30 text-purple-400 border-purple-500/40',
  Tom: 'bg-orange-600/30 text-orange-400 border-orange-500/40',
  Greasy: 'bg-yellow-600/30 text-yellow-400 border-yellow-500/40',
  Web: 'bg-cyan-600/30 text-cyan-400 border-cyan-500/40',
  Nick: 'bg-pink-600/30 text-pink-400 border-pink-500/40',
  Bob: 'bg-lime-600/30 text-lime-400 border-lime-500/40',
  Mike: 'bg-indigo-600/30 text-indigo-400 border-indigo-500/40',
  Thomas: 'bg-teal-600/30 text-teal-400 border-teal-500/40',
  Tyler: 'bg-amber-600/30 text-amber-400 border-amber-500/40',
}

function ManagerBadge({ name }: { name: string }) {
  const color = MANAGER_COLORS[name] || 'bg-gray-600/30 text-gray-400 border-gray-500/40'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${color}`}>
      {name}
    </span>
  )
}

// ─── Expandable Section ──────────────────────────────────────────

function ExpandableSection({
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (count === 0) return null

  return (
    <div className="border border-primary/15 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-mono font-bold text-sm uppercase tracking-wider text-foreground">
            {title}
          </span>
          <span className="font-mono text-xs text-muted-foreground">({count})</span>
        </div>
        <span className="font-mono text-primary text-lg transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▸
        </span>
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-primary/10 bg-background/50 space-y-3 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Edition Card ────────────────────────────────────────────────

function EditionCard({ edition, isLatest }: { edition: Edition; isLatest: boolean }) {
  const formattedDate = new Date(edition.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <article className="dashboard-card overflow-hidden">
      {/* Hero Image */}
      {edition.hero_image_url && (
        <div className="relative w-full aspect-[16/9] -mt-4 -mx-4 mb-4" style={{ width: 'calc(100% + 2rem)' }}>
          <Image
            src={edition.hero_image_url}
            alt={edition.headline}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority={isLatest}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-accent">{formattedDate}</span>
          {isLatest && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded border border-primary/30 uppercase tracking-widest">
              Latest
            </span>
          )}
          <span className="font-mono text-[10px] text-muted-foreground">
            {edition.raw_items_count} sources
          </span>
        </div>
        <h2 className="text-xl font-bold text-primary vault-glow font-mono uppercase tracking-wide">
          {edition.headline}
        </h2>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-2">
        {/* MLB Headlines */}
        <ExpandableSection
          title="MLB Headlines"
          icon="📰"
          count={edition.mlb_headlines?.length ?? 0}
          defaultOpen={isLatest}
        >
          {edition.mlb_headlines?.map((item, i) => (
            <div key={i} className="pb-2 last:pb-0">
              <h4 className="font-bold text-sm text-foreground mb-1">
                {item.source_url ? (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {item.title} ↗
                  </a>
                ) : (
                  item.title
                )}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {item.tags.map((tag) => (
                    <span key={tag} className="font-mono text-[10px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </ExpandableSection>

        {/* Fantasy Impact */}
        <ExpandableSection
          title="Fantasy Impact"
          icon="🎯"
          count={edition.fantasy_impact?.length ?? 0}
          defaultOpen={isLatest}
        >
          {edition.fantasy_impact?.map((item, i) => (
            <div key={i} className="pb-2 last:pb-0">
              <h4 className="font-bold text-sm text-foreground mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.analysis}</p>
              {item.affected_players && item.affected_players.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  <span className="font-mono text-[10px] text-accent">Players:</span>
                  {item.affected_players.map((player) => (
                    <span key={player} className="font-mono text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20 rounded">
                      {player}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </ExpandableSection>

        {/* League Watch */}
        <ExpandableSection
          title="League Watch"
          icon="👀"
          count={edition.league_watch?.length ?? 0}
          defaultOpen={isLatest}
        >
          {edition.league_watch?.map((item, i) => (
            <div key={i} className="pb-2 last:pb-0">
              <h4 className="font-bold text-sm text-foreground mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.analysis}</p>
              {item.affected_managers && item.affected_managers.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {item.affected_managers.map((mgr) => (
                    <ManagerBadge key={mgr} name={mgr} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </ExpandableSection>

        {/* Hot Take */}
        {edition.hot_take && (
          <ExpandableSection title="Smalls' Hot Take" icon="🧢" count={1} defaultOpen={isLatest}>
            <div className="relative pl-4 border-l-2 border-accent/40">
              <p className="text-sm text-foreground leading-relaxed italic">{edition.hot_take}</p>
              <p className="text-xs text-accent mt-2 font-mono">— Smalls 🤖</p>
            </div>
          </ExpandableSection>
        )}

        {/* Power Rankings (if present) */}
        {edition.power_rankings && edition.power_rankings.length > 0 && (
          <ExpandableSection title="Power Rankings" icon="📊" count={edition.power_rankings.length}>
            <div className="space-y-2">
              {edition.power_rankings.map((item) => (
                <div key={item.rank} className="flex items-start gap-3">
                  <span className="font-mono text-lg font-bold text-primary w-8 text-right">
                    #{item.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <ManagerBadge name={item.manager} />
                      {item.team && (
                        <span className="font-mono text-xs text-muted-foreground">{item.team}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}
      </div>
    </article>
  )
}

// ─── News Page ───────────────────────────────────────────────────

export default function NewsPage() {
  const [editions, setEditions] = useState<Edition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEditions() {
      try {
        const res = await fetch('/api/editions')
        if (!res.ok) throw new Error(`Failed to fetch editions (${res.status})`)
        const data = await res.json()
        setEditions(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchEditions()
  }, [])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-block mb-2">
          <span className="text-4xl">📰</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-primary vault-glow font-mono tracking-widest pip-flicker">
          THE SANDLOT TIMES
        </h1>
        <p className="font-mono text-sm text-muted-foreground mt-2 tracking-wide">
          Daily MLB News &amp; Fantasy Baseball Digest
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
          <span>⚾ 12 Teams</span>
          <span className="text-primary/30">|</span>
          <span>🤖 AI-Curated</span>
          <span className="text-primary/30">|</span>
          <span>📡 Live Feeds</span>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-pulse">
            <span className="font-mono text-primary vault-glow text-lg">
              Loading editions<span className="terminal-cursor" />
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="dashboard-card text-center py-8">
          <p className="font-mono text-destructive text-sm">⚠ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 font-mono text-xs text-primary hover:text-primary/80 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && editions.length === 0 && (
        <div className="dashboard-card text-center py-16">
          <span className="text-5xl mb-4 block">🗞</span>
          <h2 className="font-mono text-lg text-foreground mb-2">No editions yet</h2>
          <p className="font-mono text-sm text-muted-foreground">
            First issue coming soon! The presses are warming up...
          </p>
        </div>
      )}

      {!loading && !error && editions.length > 0 && (
        <div className="space-y-6">
          {editions.map((edition, i) => (
            <EditionCard key={edition.id} edition={edition} isLatest={i === 0} />
          ))}
        </div>
      )}
    </main>
  )
}
