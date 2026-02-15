import { getSupabaseClient } from '@/lib/supabase'
import { TradeDashboard, type TradePlayer } from '@/app/ui/TradeDashboard'

export const revalidate = 60

type TradeBlockRow = {
  id: string
  notes: string | null
  keeper_status: string
  players: {
    id: string
    full_name: string
    mlb_team: string | null
    primary_position: string | null
    headshot_url: string | null
    fantasypros_ecr: number | null
    keeper_cost_round: number | null
    keeper_cost_label: string | null
    stats_2025: any | null
  } | null
}

export default async function Home() {
  const leagueKey = process.env.YAHOO_LEAGUE_KEY
  const teamKey = process.env.YAHOO_TEAM_KEY

  if (!leagueKey || !teamKey) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-primary vault-glow">🐍 TUNNEL SNAKES — Trade Terminal</h1>
        <p className="mt-4 font-mono text-muted-foreground">
          &gt; ERROR: Missing <code className="text-accent">YAHOO_LEAGUE_KEY</code> / <code className="text-accent">YAHOO_TEAM_KEY</code> environment variables.
        </p>
        <p className="mt-2 font-mono text-muted-foreground">
          &gt; Consult the Overseer (check your .env.local file).
        </p>
      </main>
    )
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-primary vault-glow">🐍 TUNNEL SNAKES — Trade Terminal</h1>
        <p className="mt-4 font-mono text-muted-foreground">
          &gt; ERROR: Missing Supabase connection. The vault&apos;s database is offline.
        </p>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('my_roster_players')
    .select('id, notes, keeper_status, players:player_id(id, full_name, mlb_team, primary_position, headshot_url, fantasypros_ecr, keeper_cost_round, keeper_cost_label, stats_2025)')
    .eq('yahoo_league_key', leagueKey)
    .eq('yahoo_team_key', teamKey)
    .eq('is_available', true)

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-primary vault-glow">🐍 TUNNEL SNAKES — Trade Terminal</h1>
        <p className="mt-4 text-red-500 font-mono">
          &gt; CRITICAL ERROR: {error.message}
        </p>
      </main>
    )
  }

  const rows = (data ?? []) as unknown as TradeBlockRow[]
  const players: TradePlayer[] = rows
    .filter((r) => r.players)
    .map((r) => ({
      rosterRowId: r.id,
      playerId: r.players!.id,
      fullName: r.players!.full_name,
      mlbTeam: r.players!.mlb_team,
      position: r.players!.primary_position,
      keeperStatus: r.keeper_status,
      notes: r.notes,
      headshotUrl: r.players!.headshot_url,
      ecr: r.players!.fantasypros_ecr,
      keeperCostLabel: r.players!.keeper_cost_label,
      keeperCostRound: r.players!.keeper_cost_round,
      stats2025: r.players!.stats_2025,
    }))
    .sort((a, b) => (a.position ?? '').localeCompare(b.position ?? '') || a.fullName.localeCompare(b.fullName))

  return <TradeDashboard players={players} />
}
