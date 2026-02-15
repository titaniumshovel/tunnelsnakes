import { getSupabaseClient } from '@/lib/supabase'
import { TradeDashboard, type TradePlayer } from '@/app/ui/TradeDashboard'

/* Players manually tagged as high value trade pieces */
const HIGH_VALUE_PLAYER_IDS = [
  '0bb03f22-365e-4b3d-ba13-a2628214e780', // Yandy Díaz
  '49cba133-cd1f-417b-9fd8-c981ae0a3eac', // Zack Wheeler
  'e268f280-0543-4005-b01e-2867fbe5d27c', // Chris Sale
  '16f65ddf-3862-454f-8708-04c174733d0f', // Austin Riley
  '092f1a9b-2bf4-412b-a559-51c1e090b7e7', // Andrés Muñoz
  '7ee12849-ab0f-44a1-b71e-5d730f90ce2d', // Nick Pivetta
  '808e683e-1932-4abf-a0b9-c82b3d8e7008', // Jackson Merrill
  '25675237-934e-49fb-b782-7ca31664ded0', // Steven Kwan
]

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
      highValue: HIGH_VALUE_PLAYER_IDS.includes(r.players!.id),
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
