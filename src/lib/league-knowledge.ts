import { MANAGERS } from '@/data/managers'
import draftBoard from '@/data/draft-board.json'
import { createClient } from '@supabase/supabase-js'

// ─── Cache ───────────────────────────────────────────────
let cachedContext: string | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ─── Keeper Rules (baked in to avoid filesystem reads at runtime) ───
const KEEPER_RULES = `
## Keeper Limits
- Up to 6 keepers + 4 minor leaguers (NA) per team
- Minor leaguer = MLB Rookie eligible (fewer than 130 AB or 50 IP)

## Keeper Cost Structure
| Scenario | Cost |
|----------|------|
| 1st year keeping a drafted player | Round they were drafted |
| 2nd+ year keeping any player | ECR round |
| FA pickup (1st year) | Last round (23rd), stacking down |
| Multiple FA keepers | 23rd, 22nd, 21st... |
| Traded player | Inherit previous owner's keeper contract |
| Minor leaguer going major (2nd yr) | ECR round |

## Special Rules
- 7th Keeper Rule: 1st year keeping a new MLB player (from minors or just called up) doesn't count toward 6 keeper limit. Valued at ECR. Limited to 1 per year.
- Top-5 ECR Protection: Can NOT keep a FA pickup at last round if they're top-5 ECR and were dropped due to injury/suspension/dumping. They revert to ECR round or original draft round, whichever is lower.
- Contract Reset: If a player is drafted/kept → dropped → picked up by new owner = FA with reset contract.
- Trade + Drop Reset: If traded mid-season, then dropped, then picked up by new owner = FA with reset contract.
- Same-round conflict: If keeping 2 players drafted in same round, lose that round + next round (stacking).
- Redraft = reset: If you draft, don't keep, then draft again later = treated as 1st year keeper.
- Minor league draft rounds: If drafted during regular draft (Rd 1-23) but as a minor leaguer, and a major leaguer is drafted in Rd 24-26, the minor leaguer is treated as Rd 23 for keeper value.

## ECR Source
FantasyPros Expert Consensus Ranking (fantasypros.com/mlb/rankings/overall.php)
`

const LEAGUE_INFO = `
## League Details
- Platform: Yahoo Fantasy
- League Name: The Sandlot
- Format: Head-to-Head, 5x5 Category
- Teams: 12
- Draft Date: Friday, March 6, 2026
- Entry Fee: $200
- Season: March 25 – September 6, 2026

## Payouts
- 1st Place: $1,200
- 2nd Place: $500
- 3rd Place: $200
- Regular Season 1st: $500

## Categories
Offense: HR, OBP (was AVG — new for 2026), RBI, Runs, SB
Pitching: Wins, ERA, WHIP, K's, Saves+Holds (was Saves — new for 2026)

## Roster Positions
C, 1B, 2B, 3B, SS, OF(3), Util(2), SP(4), RP(2), Util P(2), IL(4), Bench(5), NA(4)

## 2026 Draft Order
1. Pudge, 2. Nick, 3. Web, 4. Tom, 5. Tyler, 6. Thomas, 7. Chris, 8. Alex, 9. Greasy, 10. Bob, 11. Mike, 12. Sean
`

// ─── Helpers ─────────────────────────────────────────────

function buildManagersSection(): string {
  const lines = MANAGERS.map(m =>
    `- ${m.displayName} — "${m.teamName}" (Draft #${m.draftPosition}${m.role === 'commissioner' ? ', Commissioner' : ''})`
  )
  return `## All 12 Managers\n${lines.join('\n')}`
}

function buildDraftBoardSection(): string {
  const board = draftBoard as {
    draftOrder: string[]
    rounds: number
    naRounds: number[]
    picks: Record<string, Array<{
      slot: number
      originalOwner: string
      currentOwner: string
      traded: boolean
      path: string[]
    }>>
  }

  // Count picks per owner
  const pickCounts: Record<string, number> = {}
  const tradedPicks: string[] = []

  for (const [round, picks] of Object.entries(board.picks)) {
    for (const pick of picks) {
      pickCounts[pick.currentOwner] = (pickCounts[pick.currentOwner] || 0) + 1
      if (pick.traded) {
        tradedPicks.push(
          `Rd ${round} Pick ${pick.slot} (originally ${pick.originalOwner}) → now owned by ${pick.currentOwner} (path: ${pick.path.join(' → ')})`
        )
      }
    }
  }

  const countLines = Object.entries(pickCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([owner, count]) => `- ${owner}: ${count} picks`)

  return `## Draft Board — Pick Ownership Summary
Total rounds: ${board.rounds} (Rounds ${board.naRounds.join(', ')} are minor league/NA rounds)
Draft order: ${board.draftOrder.join(', ')}

### Picks Per Manager
${countLines.join('\n')}

### Traded Picks
${tradedPicks.length > 0 ? tradedPicks.join('\n') : 'No traded picks.'}`
}

async function buildRostersSection(): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) return '## Rosters\n(Database unavailable)'

  const { data: rosterData, error } = await supabase
    .from('my_roster_players')
    .select('yahoo_team_key, keeper_status, players(full_name, primary_position, keeper_cost_round, keeper_cost_label, fantasypros_ecr)')
    .order('keeper_cost_round', { ascending: true })

  if (error || !rosterData) {
    return `## Rosters\n(Error loading: ${error?.message ?? 'no data'})`
  }

  // Group by team
  const teamRosters: Record<string, Array<{
    name: string
    position: string
    keeperCostRound: number | null
    keeperCostLabel: string | null
    ecr: number | null
    keeperStatus: string
  }>> = {}

  for (const row of rosterData) {
    // Supabase returns joined relation as object (single) or array — handle both
    const rawPlayer = row.players as unknown
    const player = (Array.isArray(rawPlayer) ? rawPlayer[0] : rawPlayer) as {
      full_name: string
      primary_position: string
      keeper_cost_round: number | null
      keeper_cost_label: string | null
      fantasypros_ecr: number | null
    } | null
    if (!player) continue

    const teamKey = row.yahoo_team_key
    const manager = MANAGERS.find(m => m.yahooTeamKey === teamKey)
    const label = manager?.displayName ?? teamKey

    if (!teamRosters[label]) teamRosters[label] = []
    teamRosters[label].push({
      name: player.full_name,
      position: player.primary_position ?? '?',
      keeperCostRound: player.keeper_cost_round,
      keeperCostLabel: player.keeper_cost_label,
      ecr: player.fantasypros_ecr,
      keeperStatus: row.keeper_status ?? 'undecided',
    })
  }

  const sections = Object.entries(teamRosters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([managerName, players]) => {
      const manager = MANAGERS.find(m => m.displayName === managerName)
      const teamName = manager?.teamName ?? managerName
      const lines = players.map(p => {
        // For ECR-based keepers (2nd+ year), compute the effective cost round from ECR rank
        let cost: string
        if (p.keeperCostLabel && p.keeperCostLabel.includes('ECR') && p.ecr) {
          const effectiveRound = Math.ceil(p.ecr / 12)
          cost = `Rd ${effectiveRound} (${p.keeperCostLabel})`
        } else {
          cost = p.keeperCostLabel ?? (p.keeperCostRound ? `Rd ${p.keeperCostRound}` : 'N/A')
        }
        const ecr = p.ecr ? `ECR #${p.ecr}` : ''
        const status = p.keeperStatus !== 'undecided' ? ` [${p.keeperStatus.toUpperCase()}]` : ''
        return `  - ${p.name} (${p.position}) — Cost: ${cost}${ecr ? `, ${ecr}` : ''}${status}`
      })
      return `### ${managerName} — ${teamName}\n${lines.join('\n')}`
    })

  return `## All Team Rosters (with keeper costs)\n${sections.join('\n\n')}`
}

async function buildTradesSection(): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) return '## Trade History\n(Database unavailable)'

  const { data: trades, error } = await supabase
    .from('trade_offers')
    .select('*')
    .in('status', ['completed', 'vetoed'])
    .order('created_at', { ascending: true })

  if (error || !trades) {
    return `## Trade History\n(Error loading: ${error?.message ?? 'no data'})`
  }

  const offseason = trades.filter(t => t.trade_type === 'offseason')
  const midseason = trades.filter(t => t.trade_type === 'midseason')

  function formatTrade(t: Record<string, unknown>): string {
    const status = t.status === 'vetoed' ? ' [VETOED]' : ''
    const date = t.created_at ? new Date(t.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    return `- ${date}${status}: ${t.description ?? 'No description'}`
  }

  const offseasonLines = offseason.map(formatTrade)
  const midseasonLines = midseason.map(formatTrade)

  return `## Trade History

### Offseason Trades (Draft Pick Swaps)
${offseasonLines.length > 0 ? offseasonLines.join('\n') : 'None'}

### Midseason Trades (Player Swaps from 2025 Season)
${midseasonLines.length > 0 ? midseasonLines.join('\n') : 'None'}`
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ─── Main Export ──────────────────────────────────────────

export async function buildLeagueContext(): Promise<string> {
  const now = Date.now()
  if (cachedContext && now - cacheTimestamp < CACHE_TTL) {
    return cachedContext
  }

  const [rostersSection, tradesSection] = await Promise.all([
    buildRostersSection(),
    buildTradesSection(),
  ])

  const context = [
    '# THE SANDLOT — Complete League Knowledge Base\n',
    LEAGUE_INFO,
    buildManagersSection(),
    '\n',
    KEEPER_RULES,
    '\n',
    buildDraftBoardSection(),
    '\n',
    rostersSection,
    '\n',
    tradesSection,
  ].join('\n')

  cachedContext = context
  cacheTimestamp = now
  return context
}

export function getSystemPrompt(leagueContext: string, userTeamName?: string): string {
  const personalNote = userTeamName
    ? `\n\nThe user asking questions is the manager of "${userTeamName}". When they say "my team" or "my players", they mean ${userTeamName}. Personalize your answers accordingly.`
    : ''

  return `You are Smalls 🧢, the AI assistant for The Sandlot fantasy baseball league. You're named after Scotty Smalls from the movie The Sandlot.

Personality:
- Friendly, nerdy about stats, enthusiastic about the league
- Occasional Sandlot movie references ("You're killing me!" / "For-ev-er" / "Heroes get remembered, but legends never die")
- Call managers by their display names (Pudge, Nick, Web, Tom, Tyler, Thomas, Chris, Alex, Greasy, Bob, Mike, Sean)
- Be opinionated about trades — give honest analysis
- Keep answers concise but thorough
- Use markdown formatting for readability (bold, bullet lists, etc.)

You have deep knowledge of The Sandlot league:

${leagueContext}

Rules:
- Always cite specific data when answering (round numbers, player names, costs)
- If you don't know something, say so — don't make up stats
- Be helpful for draft prep, trade analysis, and keeper decisions
- When comparing keeper values, lower round = better value (Rd 23 keeper is a steal, Rd 1 is expensive)
- For ECR-based keepers (2nd+ year), their cost IS their ECR round: divide ECR rank by 12 (number of teams) and round up. ECR #18 = Round 2 cost, ECR #39 = Round 4 cost, ECR #61 = Round 6 cost. Always compute the value gap for these — they are NOT "unknown" cost.

CRITICAL — Keeper Value Analysis (read this carefully):
- Simple "cost vs ECR" gap is NOT enough in a keeper league. You MUST factor in the keeper pool effect.
- With 12 teams keeping up to 6 players each, that's up to 72 players OFF the board before the draft even starts.
- This dramatically inflates draft-day cost. A player with ECR #60 (normally ~Rd 5) might go in Rd 1-2 of the actual draft because all the top talent is kept.
- Therefore: ECR-based keepers showing "even" (cost = ECR round) are NOT bad value — they're STILL worth keeping if they're elite or near-elite talent, because you'd have to spend a MUCH higher pick to replace them in the depleted draft pool.
- When analyzing keeper value, think in TWO tiers:
  1. **Draft Discount** — players whose keeper cost is cheaper than their ECR round (e.g., Cal Raleigh at Rd 9 with ECR #18 = Rd 2 value). These are obvious slam-dunk keeps.
  2. **Scarcity Keeps** — elite players at ECR cost who you should STILL keep because they'd be first off the board if returned to the draft pool. A top-30 player at ECR cost is worth keeping because in a 72-player-depleted draft, they'd cost Rd 1-2. Mention this explicitly: "Even at ECR cost, [player] would be a top pick in a draft where 72 players are already kept."
- When someone asks "best keeper values," show BOTH tiers. Don't dismiss ECR-cost keepers as "even" — explain why elite ones are still worth keeping.
- Suggest trade opportunities: "If you're not keeping [elite player], they have huge trade value to teams desperate for top talent."

TEAM STRATEGY PROFILING — "Read the Room":
- Analyze trade patterns to identify each team's strategy. Look at the full trade history and connect the dots:
  - **Teardown/Rebuild teams**: Shipping established players for draft picks (e.g., if a team traded away multiple stars for picks, they're stockpiling draft capital to rebuild)
  - **Win-now teams**: Acquiring proven talent by giving up picks (especially new expansion teams trying to compete immediately)
  - **Keeper hoarders**: Accumulating elite keepers through trades, building long-term value
- When answering trade or draft questions, factor in team strategies: "Talk to [manager] — they're selling talent for picks" or "[Manager] is hoarding picks, they might overpay for an elite keeper"
- Identify trade partners: teams with opposite strategies are natural trade matches (rebuilders sell to contenders)

DRAFT POOL PREDICTION — "Who's Coming Back?":
- This is premium analysis. Each team can keep up to 6 players + 4 minor leaguers. If a team has 8+ good keeper candidates, some solid players MUST return to the draft pool.
- When asked about draft strategy or keeper decisions, project which notable players might be available in the draft:
  - Look at each team's roster and identify players that are likely NOT being kept (bad value, redundant positions, too many good options)
  - Flag elite players who might hit the draft pool — these are the gems to target
  - Note: you can't be certain what others will keep, but you can reason about it based on value and roster construction
- This helps managers plan their draft picks: "If [Player X] returns to the pool, they'll go early in Rd 1-2 of the depleted draft"

CATEGORY-AWARE ROSTER BUILDING — 2026 Rule Changes:
- **AVG → OBP (new for 2026)**: On-base percentage replaces batting average. This significantly changes player values:
  - High-walk players gain value (e.g., patient hitters who draw walks)
  - Pure contact hitters who don't walk lose relative value
  - When evaluating keepers/trades, factor in whether a player's OBP is significantly better than their AVG (walk-heavy hitters are now more valuable)
- **Saves → Saves+Holds (SV+H) (new for 2026)**: This is a MAJOR shift that creates entirely new value:
  - Elite closers still have value, but the gap between closers and setup men shrinks dramatically
  - **Middle relievers now have real fantasy value for the first time.** Setup men who rack up holds (60-80+ appearances) are suddenly viable fantasy assets
  - Teams should consider keeping/drafting high-leverage setup men — they're undervalued because most leagues still use Saves-only
  - This creates a new category of "cheap value" — setup men at late-round keeper costs who contribute meaningfully to SV+H
- When analyzing any roster, evaluate category balance: power vs speed, rotation vs bullpen, OBP upside
- Flag category holes: "Your keepers are loaded on HR/RBI but have no SB upside — prioritize speed in the draft"
- Flag 2026 rule change impacts: "With OBP replacing AVG, [player]'s value goes up/down because..."${personalNote}`
}
