import Link from 'next/link'
import Image from 'next/image'
import { MANAGERS, TEAM_COLORS } from '@/data/managers'
import TeamLogo from '@/components/TeamLogo'

const NAV_CARDS: Array<{ href: string; icon: string; title: string; desc: string; color: string; badge?: string }> = [
  {
    href: '/teams',
    icon: '👥',
    title: 'TEAMS',
    desc: 'All 12 teams, managers & draft positions',
    color: 'primary',
  },
  {
    href: '/draft-board',
    icon: '🎯',
    title: 'DRAFT BOARD',
    desc: '2026 snake draft — 27 rounds of destiny',
    color: 'primary',
  },
  {
    href: '/trades',
    icon: '🤝',
    title: 'TRADE CENTER',
    desc: 'League trades, proposals, reactions & hot takes',
    color: 'accent',
  },
  {
    href: '/keepers',
    icon: '🔐',
    title: 'KEEPERS',
    desc: 'Keeper selections, costs & deadline countdown',
    color: 'primary',
  },
  {
    href: '/ask-smalls',
    icon: '🧢',
    title: 'ASK SMALLS',
    desc: 'AI league expert — keepers, trades, draft strategy & more',
    color: 'primary',
  },
  {
    href: '/history',
    icon: '📜',
    title: 'HISTORY',
    desc: 'League champions, milestones & the story so far',
    color: 'primary',
  },
]

export default function Home() {
  return (
    <main className="min-h-[80vh]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-200 via-background to-amber-100 dark:from-slate-800 dark:via-background dark:to-slate-900">
        <div className="relative mx-auto max-w-[1400px] px-4 pt-16 pb-12 text-center">
          {/* Big Title */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-display text-primary tracking-tight">
            THE SANDLOT
          </h1>
          <p className="mt-4 text-lg sm:text-xl font-serif text-primary/80 italic">
            "Heroes get remembered, but legends never die"
          </p>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Fantasy Baseball League Hub • Est. 2020 • 12 Teams
          </p>

          {/* Quick Stats Bar */}
          <div className="mt-8 inline-flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
            <Stat label="TEAMS" value="12" />
            <StatDivider />
            <Stat label="ROUNDS" value="27" />
            <StatDivider />
            <Stat label="DRAFT DAY" value="MAR 6" />
            <StatDivider />
            <Stat label="BUY-IN" value="$200" />
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="mx-auto max-w-[1400px] px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`group relative sandlot-card p-6 transition-all duration-200 ${
                card.badge
                  ? 'opacity-60 cursor-default'
                  : 'hover:shadow-lg'
              }`}
            >
              {card.badge && (
                <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-accent/20 text-accent border border-accent/30 rounded">
                  {card.badge}
                </span>
              )}
              <div className="text-3xl mb-3">{card.icon}</div>
              <h2 className={`text-lg font-serif font-bold ${
                card.badge ? 'text-muted-foreground' : 'text-primary'
              }`}>
                {card.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {card.desc}
              </p>
              {!card.badge && (
                <div className="mt-3 text-xs text-primary/70 group-hover:text-primary transition-colors">
                  View →
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Teams Quick Grid */}
      <section className="mx-auto max-w-[1400px] px-4 pb-12">
        <h2 className="text-lg font-serif font-bold text-primary section-header mb-4">
          League Roster — 12 Teams
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {MANAGERS.map((m) => {
            const colors = TEAM_COLORS[m.colorKey]
            return (
              <Link
                key={m.teamSlug}
                href={`/team/${m.teamSlug}`}
                className={`flex flex-col items-center gap-2 rounded-lg px-3 py-4 border transition-all duration-150 hover:scale-[1.03] hover:shadow-lg ${colors?.bg} ${colors?.border}`}
              >
                {/* Team Logo or Fallback Dot */}
                {m.logo ? (
                  <div className="relative shrink-0">
                    <TeamLogo
                      src={m.logo}
                      alt={`${m.teamName} logo`}
                      size={96}
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`h-[96px] w-[96px] rounded-full shrink-0 ${colors?.dot} flex items-center justify-center`}>
                    <span className="text-xl font-bold text-white">
                      {m.teamName.charAt(0)}
                    </span>
                  </div>
                )}
                
                <div className="text-center min-w-0 w-full">
                  <div className={`text-xs font-semibold truncate ${colors?.text}`}>
                    {m.teamName}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {m.displayName} • #{m.draftPosition}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-primary font-bold text-lg sm:text-xl">{value}</div>
      <div className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</div>
    </div>
  )
}

function StatDivider() {
  return <div className="hidden sm:block h-8 w-px bg-primary/20" />
}
