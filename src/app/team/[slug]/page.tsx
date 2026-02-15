import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MANAGERS, TEAM_COLORS, getManagerBySlug } from '@/data/managers'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return MANAGERS.map((m) => ({ slug: m.teamSlug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const manager = getManagerBySlug(slug)
  if (!manager) return { title: 'Team Not Found — The Sandlot' }
  return {
    title: `${manager.teamName} — The Sandlot`,
    description: `${manager.teamName} managed by ${manager.displayName}. The Sandlot fantasy baseball league.`,
  }
}

export default async function TeamProfilePage({ params }: Props) {
  const { slug } = await params
  const manager = getManagerBySlug(slug)

  if (!manager) {
    notFound()
  }

  const colors = TEAM_COLORS[manager.colorKey]

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back Link */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-sm font-mono mb-6"
        >
          ← ALL TEAMS
        </Link>

        {/* Team Header Card */}
        <div className={`dashboard-card p-8 border ${colors?.border} ${colors?.bg}`}>
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full ${colors?.dot} flex items-center justify-center text-xl`}>
              ⚾
            </div>
            <div>
              <h1 className={`text-3xl font-bold font-mono tracking-wider ${colors?.text} vault-glow`}>
                {manager.teamName}
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                Managed by <span className="text-foreground font-bold">{manager.displayName}</span>
                {manager.role === 'commissioner' && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded font-bold uppercase">
                    Commissioner
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className={`text-2xl font-bold font-mono ${colors?.text}`}>
                #{manager.draftPosition}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Draft Position
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className="text-2xl font-bold font-mono text-primary">
                27
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Draft Picks
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className="text-2xl font-bold font-mono text-accent">
                2026
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Season
              </div>
            </div>
          </div>
        </div>

        {/* Roster Placeholder */}
        <div className="mt-6 dashboard-card p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-bold font-mono text-primary tracking-wider">
            ROSTER COMING SOON
          </h2>
          <p className="mt-2 text-sm font-mono text-muted-foreground">
            Keeper lists, roster imports, and player stats will be available once the draft approaches.
          </p>
          <div className="mt-4 font-mono text-xs text-primary/40">
            &gt; roster_import.exe — awaiting initialization...
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/draft-board"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 text-sm font-mono text-primary hover:bg-primary/10 transition-colors"
          >
            🎯 View Draft Board
          </Link>
          <Link
            href="/teams"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 text-sm font-mono text-primary hover:bg-primary/10 transition-colors"
          >
            👥 All Teams
          </Link>
          {manager.teamSlug === 'tunnel-snakes' && (
            <Link
              href="/offer"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-accent/30 text-sm font-mono text-accent hover:bg-accent/10 transition-colors"
            >
              🤝 Trade Portal
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
