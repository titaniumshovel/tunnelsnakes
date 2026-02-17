import Image from 'next/image'
import { TEAM_COLORS } from '@/data/managers'

import standings2020 from '@/data/historical/standings-2020.json'
import standings2021 from '@/data/historical/standings-2021.json'
import standings2022 from '@/data/historical/standings-2022.json'
import standings2023 from '@/data/historical/standings-2023.json'
import standings2024 from '@/data/historical/standings-2024.json'
import standings2025 from '@/data/historical/standings-2025.json'

import drafts2020 from '@/data/historical/drafts-2020.json'
import drafts2021 from '@/data/historical/drafts-2021.json'
import drafts2022 from '@/data/historical/drafts-2022.json'
import drafts2023 from '@/data/historical/drafts-2023.json'
import drafts2024 from '@/data/historical/drafts-2024.json'
import drafts2025 from '@/data/historical/drafts-2025.json'

export const metadata = {
  title: 'League History',
  description:
    'The story of The Sandlot fantasy baseball league — champions, milestones, and six seasons of glory.',
}

/* ── Helpers ───────────────────────────────────────────────────── */

const ALL_STANDINGS = [standings2020, standings2021, standings2022, standings2023, standings2024, standings2025]
const ALL_DRAFTS = [drafts2020, drafts2021, drafts2022, drafts2023, drafts2024, drafts2025]

const SEASON_LABELS: Record<number, string> = {
  2020: 'Inaugural Season',
  2021: 'Season 2',
  2022: 'Season 3',
  2023: 'Season 4',
  2024: 'Season 5',
  2025: 'Season 6',
}

const MANAGER_SLUGS: Record<string, string> = {
  Chris: 'tunnel-snakes',
  Alex: 'alex-in-chains',
  Pudge: 'bleacher-creatures',
  Sean: 'clutchhutch',
  Tom: 'goin-yahdgoats',
  Greasy: 'greasy-cap-advisors',
  Web: 'lollygaggers',
  Nick: 'red-stagz',
  Bob: 'runs-n-roses',
  Mike: 'the-dirty-farm',
  Thomas: 'lake-monsters',
  Tyler: 'tylers-slugfest',
}

const CURRENT_TEAM_NAMES: Record<string, string> = {
  Chris: 'Tunnel Snakes',
  Alex: 'Alex in Chains',
  Pudge: 'Bleacher Creatures',
  Sean: 'ClutchHutch',
  Tom: "Goin' Yahdgoats",
  Greasy: 'Greasy Cap Advisors',
  Web: 'Lollygaggers',
  Nick: 'Red Stagz',
  Bob: 'Runs-N-Roses',
  Mike: 'The Dirty Farm',
  Thomas: 'Lake Monsters',
  Tyler: "Tyler's Slugfest",
}

/** Original 10 managers (excludes 2026 expansion teams) */
const ORIGINAL_MANAGERS = ['Chris', 'Alex', 'Pudge', 'Sean', 'Tom', 'Greasy', 'Web', 'Nick', 'Bob', 'Mike']

function getSlug(manager: string): string {
  return MANAGER_SLUGS[manager] ?? 'tunnel-snakes'
}

function getColors(manager: string) {
  return TEAM_COLORS[manager] ?? { bg: 'bg-muted', border: 'border-border', text: 'text-foreground', dot: 'bg-muted-foreground', hex: '#888' }
}

/* ── Computed Data ─────────────────────────────────────────────── */

// Aggregate all-time records for each manager
type ManagerRecord = {
  manager: string
  teamName: string
  wins: number
  losses: number
  ties: number
  titles: number
  titleYears: number[]
}

function computeAllTimeStandings(): ManagerRecord[] {
  const records: Record<string, ManagerRecord> = {}

  for (const m of ORIGINAL_MANAGERS) {
    records[m] = { manager: m, teamName: CURRENT_TEAM_NAMES[m], wins: 0, losses: 0, ties: 0, titles: 0, titleYears: [] }
  }

  for (const season of ALL_STANDINGS) {
    // Count titles
    if (records[season.champion]) {
      records[season.champion].titles++
      records[season.champion].titleYears.push(season.year)
    }

    // Aggregate W-L-T
    for (const entry of season.standings) {
      const mgr = entry.team
      if (records[mgr]) {
        records[mgr].wins += entry.wins
        records[mgr].losses += entry.losses
        records[mgr].ties += entry.ties
      }
    }
  }

  // Sort by win percentage descending
  return Object.values(records).sort((a, b) => {
    const totalA = a.wins + a.losses + a.ties
    const totalB = b.wins + b.losses + b.ties
    const pctA = totalA > 0 ? (a.wins + a.ties * 0.5) / totalA : 0
    const pctB = totalB > 0 ? (b.wins + b.ties * 0.5) / totalB : 0
    return pctB - pctA
  })
}

function findHighestWinSeason(): { manager: string; wins: number; losses: number; ties: number; year: number } {
  let best = { manager: '', wins: 0, losses: 0, ties: 0, year: 0 }
  for (const season of ALL_STANDINGS) {
    for (const entry of season.standings) {
      if (entry.wins > best.wins) {
        best = { manager: entry.team, wins: entry.wins, losses: entry.losses, ties: entry.ties, year: season.year }
      }
    }
  }
  return best
}

function findMostTitles(): { manager: string; count: number } {
  const titles: Record<string, number> = {}
  for (const season of ALL_STANDINGS) {
    titles[season.champion] = (titles[season.champion] ?? 0) + 1
  }
  let best = { manager: '', count: 0 }
  for (const [mgr, count] of Object.entries(titles)) {
    if (count > best.count) best = { manager: mgr, count }
  }
  return best
}

const allTimeStandings = computeAllTimeStandings()
const highestWin = findHighestWinSeason()
const mostTitles = findMostTitles()

/* ── Static Data ───────────────────────────────────────────────── */

const TIMELINE = [
  { year: '2020', text: 'The Sandlot is founded. 10 managers enter the diamond. Nick\'s Red Stagz win the inaugural title.' },
  { year: '2021', text: 'Chris\'s Tunnel Snakes (formerly Return of the Mack) claim the crown.' },
  { year: '2022', text: 'Bob\'s Runs-N-Roses win it all in a slugfest.' },
  { year: '2023', text: 'Chris repeats! Two titles in three years.' },
  { year: '2024', text: 'Sean\'s ClutchHutch dynasty begins.' },
  { year: '2025', text: 'Sean goes back-to-back. ClutchHutch cements the dynasty. League expands to 12 teams for 2026.' },
  { year: '2026', text: 'thesandlot.app launches. AVG→OBP, Saves→SV+H. The game evolves.' },
]

const RULE_CHANGES = [
  { year: 2026, text: 'AVG replaced by OBP (On-Base Percentage)' },
  { year: 2026, text: 'Saves replaced by SV+H (Saves + Holds)' },
  { year: 2025, text: 'League expanded from 10 to 12 teams' },
  { year: 2025, text: 'Draft expanded to 27 rounds (added 4 NA/minor league rounds)' },
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
          Six seasons of glory, heartbreak, and questionable trades — the complete story of The Sandlot
        </p>
      </header>

      {/* ── B. Champions Gallery ───────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          🏆 Champions Gallery
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_STANDINGS.map((season) => {
            const champColors = getColors(season.champion)
            return (
              <div
                key={season.year}
                className="dashboard-card relative overflow-hidden"
              >
                {/* Gold accent stripe */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

                <div className="pt-3 space-y-3">
                  {/* Year header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-display text-primary">
                        {season.year}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        {SEASON_LABELS[season.year]}
                      </div>
                    </div>
                    <span className="text-3xl">🏆</span>
                  </div>

                  {/* Champion */}
                  <div className={`flex items-center gap-3 p-2 rounded-lg ${champColors.bg}`}>
                    <Image
                      src={`/logos/${getSlug(season.champion)}.png`}
                      width={48}
                      height={48}
                      alt={`${season.championTeam} logo`}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${champColors.text}`}>
                        🥇 {season.champion}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {season.championTeam}
                      </div>
                    </div>
                  </div>

                  {/* Runner-up */}
                  <div className="flex items-center gap-3 px-2">
                    <Image
                      src={`/logos/${getSlug(season.runnerUp)}.png`}
                      width={28}
                      height={28}
                      alt={`${season.runnerUpTeam} logo`}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-muted-foreground">
                        🥈 {season.runnerUp} — {season.runnerUpTeam}
                      </div>
                    </div>
                  </div>

                  {/* Third place */}
                  <div className="flex items-center gap-3 px-2">
                    <Image
                      src={`/logos/${getSlug(season.third)}.png`}
                      width={28}
                      height={28}
                      alt={`${season.thirdTeam} logo`}
                      className="rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-muted-foreground">
                        🥉 {season.third} — {season.thirdTeam}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── C. All-Time Standings ──────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          📊 All-Time Standings
        </h2>
        <p className="text-sm text-muted-foreground mb-4 italic font-serif">
          Aggregate records across all 6 seasons (2020–2025). Original 10 managers only.
        </p>

        <div className="dashboard-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-2 text-xs text-muted-foreground font-semibold w-10">#</th>
                <th className="py-2 pr-2 text-xs text-muted-foreground font-semibold">Manager</th>
                <th className="py-2 pr-2 text-xs text-muted-foreground font-semibold hidden sm:table-cell">Team</th>
                <th className="py-2 pr-2 text-xs text-muted-foreground font-semibold text-center">W</th>
                <th className="py-2 pr-2 text-xs text-muted-foreground font-semibold text-center">L</th>
                <th className="py-2 pr-2 text-xs text-muted-foreground font-semibold text-center">T</th>
                <th className="py-2 pr-2 text-xs text-muted-foreground font-semibold text-center">Win%</th>
                <th className="py-2 text-xs text-muted-foreground font-semibold text-center">Titles</th>
              </tr>
            </thead>
            <tbody>
              {allTimeStandings.map((m, i) => {
                const total = m.wins + m.losses + m.ties
                const winPct = total > 0 ? ((m.wins + m.ties * 0.5) / total).toFixed(3) : '.000'
                const colors = getColors(m.manager)
                return (
                  <tr key={m.manager} className={`border-b border-border/50 ${i < 3 ? 'font-semibold' : ''}`}>
                    <td className="py-2.5 pr-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                        <Image
                          src={`/logos/${getSlug(m.manager)}.png`}
                          width={24}
                          height={24}
                          alt=""
                          className="rounded-full hidden sm:block"
                        />
                        <span className={colors.text}>{m.manager}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 text-muted-foreground hidden sm:table-cell">{m.teamName}</td>
                    <td className="py-2.5 pr-2 text-center">{m.wins}</td>
                    <td className="py-2.5 pr-2 text-center">{m.losses}</td>
                    <td className="py-2.5 pr-2 text-center">{m.ties}</td>
                    <td className="py-2.5 pr-2 text-center font-mono">{winPct}</td>
                    <td className="py-2.5 text-center">
                      {m.titles > 0 ? (
                        <span title={m.titleYears.join(', ')}>
                          {'🏆'.repeat(m.titles)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── D. Season-by-Season ────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          📅 Season-by-Season
        </h2>

        <div className="space-y-3">
          {[...ALL_STANDINGS].reverse().map((season) => {
            const draft = ALL_DRAFTS.find(d => d.year === season.year)
            const rd1Picks = draft?.picks.filter(p => p.round === 1) ?? []
            const champColors = getColors(season.champion)

            return (
              <details key={season.year} className="dashboard-card group" open={season.year === 2025}>
                <summary className="cursor-pointer list-none flex items-center justify-between py-1 select-none">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-display text-primary">{season.year}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {SEASON_LABELS[season.year]}
                    </span>
                    <span className="text-sm">
                      🏆 {season.champion}
                    </span>
                  </div>
                  <span className="text-muted-foreground group-open:rotate-90 transition-transform text-sm">▶</span>
                </summary>

                <div className="mt-4 space-y-4">
                  {/* Champion banner */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${champColors.bg} ${champColors.border} border`}>
                    <Image
                      src={`/logos/${getSlug(season.champion)}.png`}
                      width={40}
                      height={40}
                      alt=""
                      className="rounded-full"
                    />
                    <div>
                      <div className={`text-sm font-bold ${champColors.text}`}>
                        🏆 Champion: {season.champion} — {season.championTeam}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        🥈 {season.runnerUp} ({season.runnerUpTeam}) · 🥉 {season.third} ({season.thirdTeam})
                      </div>
                    </div>
                  </div>

                  {/* Standings table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-1.5 pr-2 text-xs text-muted-foreground w-10">#</th>
                          <th className="py-1.5 pr-2 text-xs text-muted-foreground">Team</th>
                          <th className="py-1.5 pr-2 text-xs text-muted-foreground text-center">W</th>
                          <th className="py-1.5 pr-2 text-xs text-muted-foreground text-center">L</th>
                          <th className="py-1.5 text-xs text-muted-foreground text-center">T</th>
                        </tr>
                      </thead>
                      <tbody>
                        {season.standings.map((entry) => {
                          const entryColors = getColors(entry.team)
                          const isChamp = entry.team === season.champion
                          return (
                            <tr key={entry.team} className={`border-b border-border/30 ${isChamp ? 'font-semibold' : ''}`}>
                              <td className="py-1.5 pr-2 text-muted-foreground">{entry.rank}</td>
                              <td className="py-1.5 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${entryColors.dot}`} />
                                  <span className={isChamp ? entryColors.text : ''}>{entry.team}</span>
                                  <span className="text-xs text-muted-foreground hidden sm:inline">
                                    ({entry.teamName.replace(/ \(👑\)/, '')})
                                  </span>
                                  {isChamp && <span className="text-xs">🏆</span>}
                                </div>
                              </td>
                              <td className="py-1.5 pr-2 text-center">{entry.wins}</td>
                              <td className="py-1.5 pr-2 text-center">{entry.losses}</td>
                              <td className="py-1.5 text-center">{entry.ties}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Round 1 draft picks */}
                  {rd1Picks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                        🎯 Round 1 Draft Picks
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {rd1Picks.map((pick) => {
                          const pickColors = getColors(pick.team)
                          return (
                            <div key={pick.pick} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/50">
                              <span className="text-muted-foreground font-mono w-4 text-right shrink-0">
                                {pick.pick}.
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pickColors.dot}`} />
                              <span className="font-semibold">{pick.player}</span>
                              <span className="text-muted-foreground">→ {pick.team}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      </section>

      {/* ── E. League Timeline ─────────────────────────────────── */}
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

      {/* ── F. Rule Changes ────────────────────────────────────── */}
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

      {/* ── G. By the Numbers ──────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          📊 By the Numbers
        </h2>

        <div className="dashboard-card">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">6</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Seasons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">12</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">1,380</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Draft Picks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {highestWin.wins}-{highestWin.losses}-{highestWin.ties}
              </div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Best Record ({highestWin.manager} &apos;{String(highestWin.year).slice(2)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {mostTitles.count}🏆
              </div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Most Titles ({mostTitles.manager})
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
