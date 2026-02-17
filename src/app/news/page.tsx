'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Chris: 'bg-amber-100 text-amber-800 border-amber-300',
  Alex: 'bg-orange-100 text-orange-800 border-orange-300',
  Pudge: 'bg-red-100 text-red-800 border-red-300',
  Sean: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Tom: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Greasy: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Web: 'bg-green-100 text-green-800 border-green-300',
  Nick: 'bg-blue-100 text-blue-800 border-blue-300',
  Bob: 'bg-slate-100 text-slate-800 border-slate-300',
  Mike: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  Thomas: 'bg-pink-100 text-pink-800 border-pink-300',
  Tyler: 'bg-purple-100 text-purple-800 border-purple-300',
}

function ManagerBadge({ name }: { name: string }) {
  const color = MANAGER_COLORS[name] || 'bg-gray-100 text-gray-700 border-gray-300'
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

  // Reset open state when defaultOpen changes (new edition loaded)
  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])

  if (count === 0) return null

  return (
    <div className="border border-primary/15 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted transition-colors text-left"
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

function EditionCard({ edition }: { edition: Edition }) {
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
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-accent">{formattedDate}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {edition.raw_items_count} sources
          </span>
        </div>
        <h2 className="text-xl font-serif font-bold text-primary">
          {edition.headline}
        </h2>
      </div>

      {/* All sections default expanded in single-edition view */}
      <div className="space-y-2">
        {/* MLB Headlines */}
        <ExpandableSection
          title="MLB Headlines"
          icon="📰"
          count={edition.mlb_headlines?.length ?? 0}
          defaultOpen={true}
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
                    <span key={tag} className="font-mono text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
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
          defaultOpen={true}
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
          defaultOpen={true}
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
          <ExpandableSection title="Smalls' Hot Take" icon="🧢" count={1} defaultOpen={true}>
            <div className="relative pl-4 border-l-2 border-accent/40">
              <p className="text-sm text-foreground leading-relaxed italic">{edition.hot_take}</p>
              <p className="text-xs text-accent mt-2 font-mono">— Smalls 🤖</p>
            </div>
          </ExpandableSection>
        )}

        {/* Power Rankings (if present) */}
        {edition.power_rankings && edition.power_rankings.length > 0 && (
          <ExpandableSection title="Power Rankings" icon="📊" count={edition.power_rankings.length} defaultOpen={true}>
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

// ─── Date Navigation ─────────────────────────────────────────────

function DateNav({
  currentDate,
  availableDates,
  onNavigate,
  loading,
}: {
  currentDate: string
  availableDates: string[]
  onNavigate: (date: string) => void
  loading: boolean
}) {
  const dateInputRef = useRef<HTMLInputElement>(null)

  const currentIndex = availableDates.indexOf(currentDate)
  // Dates are sorted desc: index 0 = latest, last index = oldest
  const hasNewer = currentIndex > 0
  const hasOlder = currentIndex < availableDates.length - 1 && currentIndex !== -1

  const goNewer = useCallback(() => {
    if (hasNewer) onNavigate(availableDates[currentIndex - 1])
  }, [hasNewer, availableDates, currentIndex, onNavigate])

  const goOlder = useCallback(() => {
    if (hasOlder) onNavigate(availableDates[currentIndex + 1])
  }, [hasOlder, availableDates, currentIndex, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't capture arrow keys when a focusable input element is active
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goOlder()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNewer()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNewer, goOlder])

  const formattedDate = currentDate
    ? new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  // Build set of available dates for the date picker min/max
  const oldestDate = availableDates.length > 0 ? availableDates[availableDates.length - 1] : ''
  const newestDate = availableDates.length > 0 ? availableDates[0] : ''

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {/* Older (left arrow) */}
      <button
        onClick={goOlder}
        disabled={!hasOlder || loading}
        aria-label="Previous edition"
        className={`
          flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full
          font-mono text-xl sm:text-2xl font-bold
          border-2 transition-all duration-200 select-none
          ${hasOlder && !loading
            ? 'border-primary text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 cursor-pointer'
            : 'border-muted text-muted-foreground/40 cursor-not-allowed'
          }
        `}
      >
        ←
      </button>

      {/* Date display + picker */}
      <div className="relative flex-1 max-w-xs text-center">
        <button
          onClick={() => dateInputRef.current?.showPicker()}
          className="font-mono text-sm sm:text-base text-foreground hover:text-primary transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20"
          aria-label="Open date picker"
        >
          <span className="block">{formattedDate}</span>
          <span className="block text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">
            click to pick date · ← → to navigate
          </span>
        </button>
        {/* Hidden native date input */}
        <input
          ref={dateInputRef}
          type="date"
          value={currentDate}
          min={oldestDate}
          max={newestDate}
          onChange={(e) => {
            const val = e.target.value
            if (val) {
              // Find closest available date
              if (availableDates.includes(val)) {
                onNavigate(val)
              } else {
                // Find the nearest available date
                const sorted = [...availableDates].sort()
                const closest = sorted.reduce((prev, curr) =>
                  Math.abs(new Date(curr).getTime() - new Date(val).getTime()) <
                  Math.abs(new Date(prev).getTime() - new Date(val).getTime())
                    ? curr
                    : prev
                )
                onNavigate(closest)
              }
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </div>

      {/* Newer (right arrow) */}
      <button
        onClick={goNewer}
        disabled={!hasNewer || loading}
        aria-label="Next edition"
        className={`
          flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full
          font-mono text-xl sm:text-2xl font-bold
          border-2 transition-all duration-200 select-none
          ${hasNewer && !loading
            ? 'border-primary text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 cursor-pointer'
            : 'border-muted text-muted-foreground/40 cursor-not-allowed'
          }
        `}
      >
        →
      </button>
    </div>
  )
}

// ─── News Page ───────────────────────────────────────────────────

function NewsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedDate = searchParams.get('date')

  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [currentDate, setCurrentDate] = useState<string>('')
  const [edition, setEdition] = useState<Edition | null>(null)
  const [loading, setLoading] = useState(true)
  const [datesLoading, setDatesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch available dates on mount
  useEffect(() => {
    async function fetchDates() {
      try {
        const res = await fetch('/api/editions?dates=true')
        if (!res.ok) throw new Error(`Failed to fetch dates (${res.status})`)
        const dates: string[] = await res.json()
        setAvailableDates(dates)

        // Determine initial date
        const targetDate = requestedDate && dates.includes(requestedDate)
          ? requestedDate
          : dates[0] ?? ''

        setCurrentDate(targetDate)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setDatesLoading(false)
      }
    }
    fetchDates()
    // Only run on mount — requestedDate won't change after initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch edition when currentDate changes
  useEffect(() => {
    if (!currentDate) {
      setLoading(false)
      return
    }

    async function fetchEdition() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/editions?date=${currentDate}`)
        if (!res.ok) throw new Error(`Failed to fetch edition (${res.status})`)
        const data = await res.json()
        setEdition(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchEdition()
  }, [currentDate])

  // Update URL when date changes
  const navigate = useCallback(
    (date: string) => {
      setCurrentDate(date)
      // Update URL without full navigation
      const url = date ? `/news?date=${date}` : '/news'
      router.replace(url, { scroll: false })
    },
    [router]
  )

  const isInitialLoading = datesLoading

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-block mb-2">
          <span className="text-4xl">📰</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary">
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

      {/* Initial loading */}
      {isInitialLoading && (
        <div className="text-center py-16">
          <div className="inline-block animate-pulse">
            <span className="text-primary text-lg">
              Loading editions...
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isInitialLoading && (
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

      {/* No editions at all */}
      {!isInitialLoading && !error && availableDates.length === 0 && (
        <div className="dashboard-card text-center py-16">
          <span className="text-5xl mb-4 block">🗞</span>
          <h2 className="font-mono text-lg text-foreground mb-2">No editions yet</h2>
          <p className="font-mono text-sm text-muted-foreground">
            First issue coming soon! The presses are warming up...
          </p>
        </div>
      )}

      {/* Date navigation + content */}
      {!isInitialLoading && !error && availableDates.length > 0 && currentDate && (
        <>
          <DateNav
            currentDate={currentDate}
            availableDates={availableDates}
            onNavigate={navigate}
            loading={loading}
          />

          {/* Edition content */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block animate-pulse">
                <span className="text-primary text-lg">
                  Loading edition...
                </span>
              </div>
            </div>
          )}

          {!loading && edition && (
            <EditionCard edition={edition} />
          )}

          {!loading && !edition && (
            <div className="dashboard-card text-center py-16">
              <span className="text-5xl mb-4 block">📭</span>
              <h2 className="font-mono text-lg text-foreground mb-2">No edition for this date</h2>
              <p className="font-mono text-sm text-muted-foreground">
                The presses were quiet on {new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {/* Edition counter */}
          <div className="text-center mt-6">
            <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider uppercase">
              Edition {availableDates.indexOf(currentDate) + 1} of {availableDates.length}
            </span>
          </div>
        </>
      )}
    </main>
  )
}

// Wrap with Suspense boundary for useSearchParams
import { Suspense } from 'react'

export default function NewsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="text-center py-16">
            <div className="inline-block animate-pulse">
              <span className="text-primary text-lg">Loading...</span>
            </div>
          </div>
        </main>
      }
    >
      <NewsPageInner />
    </Suspense>
  )
}
