import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time importer: hardcoded from keepers page paste.
// Idempotent: safe to run multiple times.
// All players default to "undecided" keeper status.

type PlayerSeed = {
  full_name: string
  mlb_team: string
  primary_position: string
  eligible_positions: string[]
}

const SEEDS: PlayerSeed[] = [
  // Batters
  { full_name: 'Aaron Judge', mlb_team: 'NYY', primary_position: 'OF', eligible_positions: ['OF'] },
  { full_name: 'José Ramírez', mlb_team: 'CLE', primary_position: '3B', eligible_positions: ['3B'] },
  { full_name: 'Bryce Harper', mlb_team: 'PHI', primary_position: '1B', eligible_positions: ['1B'] },
  { full_name: 'Freddie Freeman', mlb_team: 'LAD', primary_position: '1B', eligible_positions: ['1B'] },
  { full_name: 'Brice Turang', mlb_team: 'MIL', primary_position: '2B', eligible_positions: ['2B'] },
  { full_name: 'Michael Harris II', mlb_team: 'ATL', primary_position: 'OF', eligible_positions: ['OF'] },
  { full_name: 'Byron Buxton', mlb_team: 'MIN', primary_position: 'OF', eligible_positions: ['OF'] },
  { full_name: 'Willson Contreras', mlb_team: 'BOS', primary_position: '1B', eligible_positions: ['1B'] },
  { full_name: 'Nico Hoerner', mlb_team: 'CHC', primary_position: '2B', eligible_positions: ['2B'] },
  { full_name: 'Dansby Swanson', mlb_team: 'CHC', primary_position: 'SS', eligible_positions: ['SS'] },
  { full_name: 'Heliot Ramos', mlb_team: 'SF', primary_position: 'OF', eligible_positions: ['OF'] },
  { full_name: 'Jasson Domínguez', mlb_team: 'NYY', primary_position: 'OF', eligible_positions: ['OF'] },
  { full_name: 'Spencer Jones', mlb_team: 'NYY', primary_position: 'OF', eligible_positions: ['OF'] },
  { full_name: 'George Lombard Jr.', mlb_team: 'NYY', primary_position: '2B', eligible_positions: ['2B', '3B', 'SS'] },

  // Pitchers
  { full_name: 'Tyler Glasnow', mlb_team: 'LAD', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Bubba Chandler', mlb_team: 'PIT', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Emmet Sheehan', mlb_team: 'LAD', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'David Peterson', mlb_team: 'NYM', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Gerrit Cole', mlb_team: 'NYY', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Jack Leiter', mlb_team: 'TEX', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Will Warren', mlb_team: 'NYY', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Luis Severino', mlb_team: 'ATH', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Bryan Abreu', mlb_team: 'HOU', primary_position: 'RP', eligible_positions: ['RP'] },
  { full_name: 'Corbin Burnes', mlb_team: 'AZ', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Zack Littell', mlb_team: 'CIN', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Luis Gil', mlb_team: 'NYY', primary_position: 'SP', eligible_positions: ['SP'] },
  { full_name: 'Blake Treinen', mlb_team: 'LAD', primary_position: 'RP', eligible_positions: ['RP'] },
  { full_name: 'Chris Paddack', mlb_team: 'MIA', primary_position: 'SP', eligible_positions: ['SP', 'RP'] },
]

export async function POST(req: Request) {
  const secret = process.env.IMPORT_SECRET
  const leagueKey = process.env.YAHOO_LEAGUE_KEY
  const teamKey = process.env.YAHOO_TEAM_KEY

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) return new NextResponse('Missing IMPORT_SECRET env', { status: 500 })
  if (!leagueKey || !teamKey) return new NextResponse('Missing YAHOO_LEAGUE_KEY/YAHOO_TEAM_KEY', { status: 500 })
  if (!supabaseUrl || !serviceKey) return new NextResponse('Missing Supabase service env', { status: 500 })

  const provided = req.headers.get('x-import-secret')
  if (provided !== secret) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1) Fetch existing players by name/team
  const names = SEEDS.map((s) => s.full_name)
  const { data: existingPlayers, error: existingErr } = await supabase
    .from('players')
    .select('id, full_name, mlb_team')
    .in('full_name', names)

  if (existingErr) return new NextResponse(existingErr.message, { status: 500 })

  const existingMap = new Map<string, { id: string }>()
  for (const p of existingPlayers ?? []) {
    existingMap.set(`${p.full_name}__${p.mlb_team ?? ''}`, { id: p.id })
  }

  const toInsert = SEEDS.filter((s) => !existingMap.has(`${s.full_name}__${s.mlb_team}`)).map((s) => ({
    full_name: s.full_name,
    mlb_team: s.mlb_team,
    primary_position: s.primary_position,
    eligible_positions: s.eligible_positions,
  }))

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('players').insert(toInsert)
    if (insErr) return new NextResponse(insErr.message, { status: 500 })
  }

  // 2) Re-fetch all players to get ids
  const { data: allPlayers, error: allErr } = await supabase
    .from('players')
    .select('id, full_name, mlb_team')
    .in('full_name', names)

  if (allErr) return new NextResponse(allErr.message, { status: 500 })

  const allMap = new Map<string, string>()
  for (const p of allPlayers ?? []) {
    allMap.set(`${p.full_name}__${p.mlb_team ?? ''}`, p.id)
  }

  // 3) Upsert into my_roster_players (all default to "undecided")
  const rosterRows = SEEDS.map((s) => {
    const playerId = allMap.get(`${s.full_name}__${s.mlb_team}`)
    if (!playerId) throw new Error(`Missing player id for ${s.full_name}`)
    return {
      yahoo_league_key: leagueKey,
      yahoo_team_key: teamKey,
      player_id: playerId,
      keeper_status: 'undecided',
      is_available: true,
    }
  })

  const { error: rosterErr } = await supabase
    .from('my_roster_players')
    .upsert(rosterRows, { onConflict: 'yahoo_league_key,yahoo_team_key,player_id' })

  if (rosterErr) return new NextResponse(rosterErr.message, { status: 500 })

  return NextResponse.json({
    ok: true,
    insertedPlayers: toInsert.length,
    rosterCount: rosterRows.length,
  })
}
