import Link from 'next/link'
import { MANAGERS, TEAM_COLORS } from '@/data/managers'

export const metadata = {
  title: 'Teams — The Sandlot',
  description: 'All 12 teams in The Sandlot fantasy baseball league.',
}

export default function TeamsPage() {
  // Sort by draft position
  const sorted = [...MANAGERS].sort((a, b) => a.draftPosition - b.draftPosition)

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-primary">
            👥 LEAGUE TEAMS
          </h1>
          <p className="mt-1 text-sm font-mono text-muted-foreground">
            12 teams • Sorted by 2026 draft position
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((manager) => {
            const colors = TEAM_COLORS[manager.colorKey]
            return (
              <Link
                key={manager.teamSlug}
                href={`/team/${manager.teamSlug}`}
                className={`group relative dashboard-card p-5 transition-all duration-200 hover:scale-[1.01] hover:border-primary/40 ${colors?.bg} border ${colors?.border}`}
              >
                {/* Draft Position Badge */}
                <div
                  className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm border ${colors?.border} ${colors?.text}`}
                  style={{ backgroundColor: 'hsl(var(--background) / 0.6)' }}
                >
                  {manager.draftPosition}
                </div>

                {/* Team Color Dot + Name */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-4 w-4 rounded-full shrink-0 ${colors?.dot}`} />
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-lg font-serif font-bold ${colors?.text}`}>
                      {manager.teamName}
                    </h2>
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      {manager.displayName}
                      {manager.role === 'commissioner' && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded font-bold uppercase">
                          Commish
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-4 flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Draft Pick #{manager.draftPosition}</span>
                  <span className="text-primary/50 group-hover:text-primary/80 transition-colors">
                    VIEW →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-8 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            {MANAGERS.length} teams • 27-round snake draft • March 6, 2026
          </p>
        </div>
      </div>
    </main>
  )
}
