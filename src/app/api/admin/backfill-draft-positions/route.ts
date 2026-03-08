import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time backfill: update player_position and player_team for 15 draft picks
// that were manually inserted without this data (rounds 24-27).

const BACKFILL_DATA: { player_name: string; player_position: string; player_team: string }[] = [
  { player_name: 'Kade Anderson', player_position: 'SP', player_team: 'SEA' },
  { player_name: 'Max Meyer', player_position: 'SP', player_team: 'MIA' },
  { player_name: 'Kodai Senga', player_position: 'SP', player_team: 'NYM' },
  { player_name: 'Braden Montgomery', player_position: 'OF', player_team: 'CWS' },
  { player_name: 'Ryan Sloan', player_position: 'SP', player_team: 'SEA' },
  { player_name: 'Otto Lopez', player_position: 'SS', player_team: 'MIA' },
  { player_name: 'Bryce Rainer', player_position: 'SS', player_team: 'DET' },
  { player_name: 'Josue Briceño', player_position: 'C', player_team: 'DET' },
  { player_name: 'Kaelen Culpepper', player_position: 'SS', player_team: 'MIN' },
  { player_name: 'Heliot Ramos', player_position: 'OF', player_team: 'SF' },
  { player_name: 'Brice Matthews', player_position: '2B', player_team: 'HOU' },
  { player_name: 'Robby Snelling', player_position: 'SP', player_team: 'MIA' },
  { player_name: 'Aiva Arquette', player_position: 'SS', player_team: 'MIA' },
  { player_name: 'Justin Verlander', player_position: 'SP', player_team: 'DET' },
  { player_name: 'Jordan Lawlar', player_position: 'SS', player_team: 'ARI' },
]

export async function POST(req: Request) {
  const secret = req.headers.get('x-import-secret')
  if (secret !== process.env.IMPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const results: { player_name: string; status: string }[] = []

  for (const player of BACKFILL_DATA) {
    const { data, error } = await supabase
      .from('draft_picks')
      .update({
        player_position: player.player_position,
        player_team: player.player_team,
        updated_at: new Date().toISOString(),
      })
      .eq('player_name', player.player_name)
      .is('player_position', null)
      .select('id, player_name')

    if (error) {
      results.push({ player_name: player.player_name, status: `error: ${error.message}` })
    } else if (data && data.length > 0) {
      results.push({ player_name: player.player_name, status: `updated ${data.length} row(s)` })
    } else {
      results.push({ player_name: player.player_name, status: 'no matching row (already filled or not found)' })
    }
  }

  return NextResponse.json({ results })
}
