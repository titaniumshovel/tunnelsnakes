export const metadata = {
  title: 'League Rules',
  description:
    'The official rulebook for The Sandlot fantasy baseball league — keeper rules, draft order, payouts, categories, and more.',
}

export default function RulesPage() {
  return (
    <main className="min-h-[80vh] mx-auto max-w-[1000px] px-4 py-10 font-mono">
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="text-center mb-12">
        <span className="text-5xl">📖</span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-display text-primary tracking-tight">
          LEAGUE RULES
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground italic font-serif">
          The official rulebook of The Sandlot — 2026 Season
        </p>
      </header>

      {/* ── League Details ─────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          ⚾ League Details
        </h2>
        <div className="dashboard-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">Platform:</span>
              <span className="font-semibold">Yahoo Fantasy</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">League Name:</span>
              <span className="font-semibold">The Sandlot</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">Format:</span>
              <span className="font-semibold">Head-to-Head, 5×5 Category</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">Teams:</span>
              <span className="font-semibold">12</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">Draft Date:</span>
              <span className="font-semibold">Friday, March 6, 2026</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">Draft Type:</span>
              <span className="font-semibold">Snake, 27 rounds</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">Entry Fee:</span>
              <span className="font-semibold">$200</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground">Season:</span>
              <span className="font-semibold">March 25 – September 6, 2026</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Rounds 24–27 are minor league / NA-only rounds.
          </p>
        </div>
      </section>

      {/* ── Payouts ────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          💰 Payouts
        </h2>
        <div className="dashboard-card">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 border border-amber-300/40 dark:border-amber-600/30">
              <div className="text-2xl mb-1">🥇</div>
              <div className="text-xl font-bold text-primary">$1,200</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">1st Place</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-700/30 dark:to-gray-700/10 border border-gray-300/40 dark:border-gray-600/30">
              <div className="text-2xl mb-1">🥈</div>
              <div className="text-xl font-bold text-primary">$500</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">2nd Place</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-b from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-900/10 border border-orange-300/40 dark:border-orange-600/30">
              <div className="text-2xl mb-1">🥉</div>
              <div className="text-xl font-bold text-primary">$200</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">3rd Place</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-b from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/10 border border-green-300/40 dark:border-green-600/30">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xl font-bold text-primary">$500</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Reg Season 1st</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Total prize pool: $2,400 from $200 × 12 teams
          </p>
        </div>
      </section>

      {/* ── Scoring Categories ─────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          📊 Scoring Categories
        </h2>

        {/* 2026 Rule Changes Callout */}
        <div className="mb-4 p-4 rounded-lg border-2 border-accent/40 bg-accent/5 dark:bg-accent/10">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🆕</span>
            <div>
              <h3 className="text-sm font-bold text-accent mb-1">2026 Rule Changes</h3>
              <ul className="text-sm space-y-1 text-foreground">
                <li><strong>OBP replaces AVG</strong> — rewards plate discipline over batting average</li>
                <li><strong>SV+H replaces Saves</strong> — gives middle relievers and setup men real fantasy value</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="dashboard-card">
            <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">
              ⚾ Offense (5 Categories)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>HR</span>
                <span className="text-muted-foreground text-xs">— Home Runs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span className="font-bold text-accent">OBP</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold uppercase tracking-wider">New</span>
                <span className="text-muted-foreground text-xs">— On-Base Percentage (was AVG)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>RBI</span>
                <span className="text-muted-foreground text-xs">— Runs Batted In</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>Runs</span>
                <span className="text-muted-foreground text-xs">— Runs Scored</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>SB</span>
                <span className="text-muted-foreground text-xs">— Stolen Bases</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">
              🎯 Pitching (5 Categories)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>W</span>
                <span className="text-muted-foreground text-xs">— Wins</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>ERA</span>
                <span className="text-muted-foreground text-xs">— Earned Run Average</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>WHIP</span>
                <span className="text-muted-foreground text-xs">— Walks + Hits per IP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                <span>K&apos;s</span>
                <span className="text-muted-foreground text-xs">— Strikeouts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span className="font-bold text-accent">SV+H</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold uppercase tracking-wider">New</span>
                <span className="text-muted-foreground text-xs">— Saves + Holds (was SV)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roster Positions ───────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          🧢 Roster Positions
        </h2>
        <div className="dashboard-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Hitters
              </h3>
              <div className="space-y-1.5 text-sm">
                {[
                  { pos: 'C', label: 'Catcher' },
                  { pos: '1B', label: 'First Base' },
                  { pos: '2B', label: 'Second Base' },
                  { pos: '3B', label: 'Third Base' },
                  { pos: 'SS', label: 'Shortstop' },
                  { pos: 'OF ×3', label: 'Outfield' },
                  { pos: 'Util ×2', label: 'Utility' },
                ].map(({ pos, label }) => (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="inline-block w-14 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-center">
                      {pos}
                    </span>
                    <span className="text-muted-foreground text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Pitchers
              </h3>
              <div className="space-y-1.5 text-sm">
                {[
                  { pos: 'SP ×4', label: 'Starting Pitcher' },
                  { pos: 'RP ×2', label: 'Relief Pitcher' },
                  { pos: 'Util P ×2', label: 'Utility Pitcher' },
                ].map(({ pos, label }) => (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="inline-block w-14 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-center">
                      {pos}
                    </span>
                    <span className="text-muted-foreground text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Bench / Reserve
              </h3>
              <div className="space-y-1.5 text-sm">
                {[
                  { pos: 'IL ×4', label: 'Injured List' },
                  { pos: 'BN ×5', label: 'Bench' },
                  { pos: 'NA ×4', label: 'Minor League / N/A' },
                ].map(({ pos, label }) => (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="inline-block w-14 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-center">
                      {pos}
                    </span>
                    <span className="text-muted-foreground text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2026 Draft Order ───────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          🎯 2026 Draft Order
        </h2>
        <div className="dashboard-card">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {[
              'Pudge', 'Nick', 'Web', 'Tom', 'Tyler', 'Thomas',
              'Chris', 'Alex', 'Greasy', 'Bob', 'Mike', 'Sean',
            ].map((name, i) => (
              <div
                key={name}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-border/50 bg-muted/30"
              >
                <span className="text-sm font-bold text-primary font-mono w-6 text-right">
                  {i + 1}.
                </span>
                <span className="text-sm font-semibold">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Keeper Rules ───────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          🔒 Keeper Rules
        </h2>

        {/* Limits */}
        <div className="dashboard-card mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">
            Limits
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary shrink-0 mt-0.5">•</span>
              <span>Up to <strong>6 keepers</strong> + <strong>4 minor leaguers (NA)</strong> per team</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary shrink-0 mt-0.5">•</span>
              <span>Minor leaguer = MLB Rookie eligible (fewer than 130 AB or 50 IP)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary shrink-0 mt-0.5">•</span>
              <span>Keeper deadline: <strong>February 20, 2026</strong></span>
            </li>
          </ul>
        </div>

        {/* Keeper Cost Structure */}
        <div className="dashboard-card mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">
            Keeper Cost Structure
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 text-xs text-muted-foreground font-semibold">Scenario</th>
                  <th className="py-2 text-xs text-muted-foreground font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { scenario: '1st year keeping a drafted player', cost: 'Round they were drafted' },
                  { scenario: '2nd+ year keeping any player', cost: 'ECR round (⌈ECR ÷ 12⌉)' },
                  { scenario: 'FA pickup (1st year)', cost: 'Last round (23rd), stacking down' },
                  { scenario: 'Multiple FA keepers', cost: '23rd, 22nd, 21st…' },
                  { scenario: 'Traded player', cost: 'Inherit previous owner\'s keeper contract' },
                  { scenario: 'Minor leaguer going major (2nd yr)', cost: 'ECR round' },
                ].map(({ scenario, cost }, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2.5 pr-4 text-foreground">{scenario}</td>
                    <td className="py-2.5 font-semibold text-primary">{cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>ECR Source:</strong>{' '}
            <a
              href="https://www.fantasypros.com/mlb/rankings/overall.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              FantasyPros Expert Consensus Ranking
            </a>
          </p>
        </div>

        {/* Special Rules */}
        <div className="dashboard-card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">
            Special Rules
          </h3>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-lg border border-accent/30 bg-accent/5">
              <div className="font-bold text-accent mb-1">⭐ 7th Keeper Rule</div>
              <p className="text-foreground">
                1st year keeping a new MLB player (from minors or just called up) doesn&apos;t count
                toward the 6 keeper limit. Valued at ECR. Limited to <strong>1 per year</strong>.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="font-bold text-destructive mb-1">🛡️ Top-5 ECR Protection</div>
              <p className="text-foreground">
                Can <strong>NOT</strong> keep a FA pickup at last round if they&apos;re top-5 ECR and
                were dropped due to injury/suspension/dumping. They revert to ECR round or original
                draft round, whichever is lower.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5 font-bold">🔄</span>
                <div>
                  <span className="font-bold">Contract Reset:</span>{' '}
                  If a player is drafted/kept then dropped then picked up by new owner = FA with reset contract.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5 font-bold">🔄</span>
                <div>
                  <span className="font-bold">Trade + Drop Reset:</span>{' '}
                  If traded mid-season, then dropped, then picked up by new owner = FA with reset contract.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5 font-bold">⚠️</span>
                <div>
                  <span className="font-bold">Same-round conflict:</span>{' '}
                  If keeping 2 players drafted in same round, lose that round + next round (stacking).
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5 font-bold">🔁</span>
                <div>
                  <span className="font-bold">Redraft = reset:</span>{' '}
                  If you draft, don&apos;t keep, then draft again later = treated as 1st year keeper.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5 font-bold">📋</span>
                <div>
                  <span className="font-bold">Minor league draft rounds:</span>{' '}
                  If drafted during regular draft (Rd 1–23) but as a minor leaguer, and a major leaguer
                  is drafted in Rd 24–26, the minor leaguer is treated as Rd 23 for keeper value.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trade Rules ────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-serif font-bold text-primary section-header mb-6">
          🤝 Trade Rules
        </h2>
        <div className="dashboard-card">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary shrink-0 mt-0.5">📱</span>
              <span>Trades must be announced in the <strong>league group text</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary shrink-0 mt-0.5">✅</span>
              <span>Both managers must confirm</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary shrink-0 mt-0.5">⭐</span>
              <span>Commissioner (<strong>Chris</strong>) processes trades</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary shrink-0 mt-0.5">🔀</span>
              <span>
                <strong>Pick trades:</strong> when a team has multiple picks in the same round,
                traded picks track through the <strong>Pick Trail</strong> on the site
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Footer Quote ───────────────────────────────────────── */}
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground italic font-serif">
          &quot;Heroes get remembered, but legends never die.&quot;
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">— The Sandlot (1993)</p>
      </div>
    </main>
  )
}
