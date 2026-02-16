import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagerByEmail } from '@/data/managers'

// GET: fetch all keeper data (public)
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('my_roster_players')
    .select('*, players(*)')
    .order('keeper_cost_round', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// PATCH: update keeper status (auth required, own team only)
export async function PATCH(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const manager = getManagerByEmail(user.email)
  if (!manager) {
    return NextResponse.json({ error: 'Not a league manager' }, { status: 403 })
  }

  const body = await req.json()
  const { roster_player_id, keeper_status } = body

  if (!roster_player_id || !keeper_status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const validStatuses = ['undecided', 'keeping', 'not-keeping', 'keeping-na']
  if (!validStatuses.includes(keeper_status)) {
    return NextResponse.json({ error: 'Invalid keeper status' }, { status: 400 })
  }

  // Verify ownership: the roster player must belong to this manager's team
  const { data: rosterPlayer } = await supabase
    .from('my_roster_players')
    .select('id, yahoo_team_key')
    .eq('id', roster_player_id)
    .single()

  if (!rosterPlayer) {
    return NextResponse.json({ error: 'Roster player not found' }, { status: 404 })
  }

  const { data: updated, error } = await supabase
    .from('my_roster_players')
    .update({ keeper_status })
    .eq('id', roster_player_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
