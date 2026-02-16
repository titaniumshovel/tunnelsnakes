export const metadata = {
  title: 'League History',
  description:
    'The story of The Sandlot fantasy baseball league — champions, milestones, and six seasons of glory.',
}

/* ── Data ─────────────────────────────────────────────────────── */

const CHAMPIONS = [
  { year: 2020, label: 'Inaugural Season', winner: 'TBD' },
  { year: 2021, label: 'Season 2', winner: 'TBD' },
  { year: 2022, label: 'Season 3', winner: 'TBD' },
  { year: 2023, label: 'Season 4', winner: 'TBD' },
  { year: 2024, label: 'Season 5', winner: 'TBD' },
  { year: 2025, label: 'Season 6', winner: 'TBD' },
]

const TIMELINE = [
  {
    year: '2020',
    text: 'The Sandlot is founded. 10 managers enter the diamond.',
  },
  {
    year: '2025',
    text: 'League expands to 12 teams. Thomas and Tyler join as expansion franchises.',
  },
  {
    year: '2026',
    text: 'Major rule changes: AVG → OBP, Saves → Saves+Holds. The game evolves.',
  },
  {
    year: '2026',
    text: 'thesandlot.app launches — the league goes digital.',
  },
]

const RULE_CHANGES = [
  { year: 2026, text: 'AVG replaced by OBP (On-Base Percentage)' },
  { year: 2026, text: 'Saves replaced by SV+H (Saves + Holds)' },
  { year: 2025, text: 'League expanded from 10 to 12 teams' },
  { year: 2025, text: 'Draft expanded to 27 rounds (added 4 NA/minor league rounds)' },
]

const BY_THE_NUMBERS = [
  { value: '6', label: 'Seasons' },
  { value: '12', label: 'Teams' },
  { value: '$1,200', label: 'In Prizes' },
  { value: '27', label: 'Draft Rounds' },
  { value: '~300', label: 'Players Rostered' },
]

const COMING_SOON = [
  { icon: '📊', label: 'Historical Season Standings' },
  { icon: '📈', label: 'All-Time Stat Leaders' },
  { icon: '🏅', label: 'Hall of Fame' },
  { icon: '📖', label: 'Season-by-Season Recap' },
]

/* ── Page ─────────────────────────────────────────────────────── */

export default function HistoryPage() {
  return (
    <main className="min-h-[80vh] mx-auto max-w-[1400px] px-4 py-10 font-mono">
      {/* ── A. Page Header ─────────────────────────────────────── */}
      <header className="text-center mb-12">
        <span className="text-5xl">📜</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-display text-primary tracking-tight">
          LEAGUE HISTORY
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground italic font-serif">
          Six seasons of glory, heartbreak, and questionable trades
        </p>
      </header>

      {/* ── B. Champions Gallery ───────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          🏆 Champions Gallery
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHAMPIONS.map((c) => (
            <div
              key={c.year}
              className="dashboard-card relative overflow-hidden"
            >
              {/* Gold accent stripe */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400 dark:bg-amber-500" />

              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/20 text-2xl shrink-0">
                  🏆
                </div>
                <div>
                  <div className="text-2xl font-display text-primary">
                    {c.year}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {c.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {c.winner === 'TBD' ? 'Champion TBD' : c.winner}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground italic">
          Historical champion data coming soon — help us fill in the gaps!
        </p>
      </section>

      {/* ── C. League Timeline ─────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          ⏳ League Timeline
        </h2>

        <div className="relative border-l-2 border-primary/30 ml-4 pl-6 space-y-8">
          {TIMELINE.map((item, i) => (
            <div key={i} className="relative">
              {/* Dot on the line */}
              <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />

              <div
                className={`dashboard-card ${
                  i % 2 === 0 ? '' : 'bg-primary/5'
                }`}
              >
                <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-primary/10 text-primary mb-2">
                  {item.year}
                </span>
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── D. Rule Changes ────────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          📋 Rule Evolution
        </h2>

        <div className="dashboard-card space-y-3">
          {RULE_CHANGES.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="shrink-0 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded bg-primary/10 text-primary">
                {r.year}
              </span>
              <p className="text-sm text-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── E. By the Numbers ──────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          📊 By the Numbers
        </h2>

        <div className="dashboard-card">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {BY_THE_NUMBERS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {s.value}
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── F. Coming Soon ─────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          🔮 Coming Soon
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COMING_SOON.map((item) => (
            <div
              key={item.label}
              className="dashboard-card flex items-center gap-3 opacity-50"
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground">
                  {item.label}
                </p>
              </div>
              <span className="text-lg">🔒</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
