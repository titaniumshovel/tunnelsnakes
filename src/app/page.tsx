import Link from 'next/link'
import { MANAGERS, TEAM_COLORS } from '@/data/managers'

const NAV_CARDS = [
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
    href: '/offer',
    icon: '📝',
    title: 'TRADE BLOCK',
    desc: 'Tunnel Snakes trade portal — make your pitch',
    color: 'primary',
  },
  {
    href: '#',
    icon: '🧠',
    title: 'ASK SMALLS',
    desc: 'AI league assistant — coming soon',
    color: 'muted',
    badge: 'SOON',
  },
]

export default function Home() {
  return (
    <main className="min-h-[80vh]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle grid bg */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative mx-auto max-w-[1400px] px-4 pt-16 pb-12 text-center">
          {/* Big Title */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-primary vault-glow tracking-tight font-mono pip-flicker">
            THE SANDLOT
          </h1>
          <p className="mt-3 text-sm sm:text-base font-mono text-muted-foreground tracking-widest uppercase">
            Fantasy Baseball League Hub • Est. 2019 • 12 Teams
          </p>

          {/* Quick Stats Bar */}
          <div className="mt-8 inline-flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-mono">
            <Stat label="TEAMS" value="12" />
            <StatDivider />
            <Stat label="ROUNDS" value="27" />
            <StatDivider />
            <Stat label="DRAFT DAY" value="MAR 6" />
            <StatDivider />
            <Stat label="BUY-IN" value="$200" />
          </div>

          {/* Terminal flavor text */}
          <div className="mt-8 font-mono text-xs text-primary/50">
            <span className="terminal-cursor">&gt; initializing draft protocols</span>
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
              className={`group relative dashboard-card p-6 transition-all duration-200 ${
                card.badge
                  ? 'opacity-60 cursor-default'
                  : 'hover:border-primary/40 hover:shadow-[0_0_25px_hsl(var(--primary)/0.15)]'
              }`}
            >
              {card.badge && (
                <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30 rounded">
                  {card.badge}
                </span>
              )}
              <div className="text-3xl mb-3">{card.icon}</div>
              <h2 className={`text-lg font-bold font-mono tracking-wider ${
                card.badge ? 'text-muted-foreground' : 'text-primary group-hover:vault-glow'
              }`}>
                {card.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground font-mono">
                {card.desc}
              </p>
              {!card.badge && (
                <div className="mt-3 text-xs font-mono text-primary/50 group-hover:text-primary/80 transition-colors">
                  → ENTER
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Teams Quick Grid */}
      <section className="mx-auto max-w-[1400px] px-4 pb-12">
        <h2 className="text-sm font-mono font-bold text-primary vault-glow mb-4 uppercase tracking-wider">
          ⚡ League Roster — 12 Teams
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {MANAGERS.map((m) => {
            const colors = TEAM_COLORS[m.colorKey]
            return (
              <Link
                key={m.teamSlug}
                href={`/team/${m.teamSlug}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-all duration-150 hover:scale-[1.02] ${colors?.bg} ${colors?.border}`}
              >
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors?.dot}`} />
                <div className="min-w-0">
                  <div className={`text-xs font-mono font-bold truncate ${colors?.text}`}>
                    {m.teamName}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
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
      <div className="text-primary vault-glow font-bold text-lg sm:text-xl">{value}</div>
      <div className="text-muted-foreground text-[10px] tracking-widest">{label}</div>
    </div>
  )
}

function StatDivider() {
  return <div className="hidden sm:block h-8 w-px bg-primary/20" />
}
