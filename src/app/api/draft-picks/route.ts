import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagerByEmail } from '@/data/managers'

// GET: fetch all draft picks (public)
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('draft_picks')
    .select('*')
    .order('round', { ascending: true })
    .order('pick_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

async function requireCommissioner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null }
  }
  const manager = getManagerByEmail(user.email)
  if (!manager || manager.role !== 'commissioner') {
    return { error: NextResponse.json({ error: 'Commissioner access required' }, { status: 403 }), supabase: null }
  }
  return { error: null, supabase }
}

// POST: create a draft pick (commissioner only)
export async function POST(req: Request) {
  const { error, supabase } = await requireCommissioner()
  if (error) return error

  const body = await req.json()
  const { round, pick_number, slot_index, owner, original_owner, player_name, player_position, player_team, ecr_rank } = body

  if (!round || !pick_number || slot_index == null || !owner || !player_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (round < 1 || round > 23) {
    return NextResponse.json({ error: 'Round must be between 1 and 23' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase!
    .from('draft_picks')
    .insert({
      round,
      pick_number,
      slot_index,
      owner,
      original_owner: original_owner || null,
      player_name,
      player_position: player_position || null,
      player_team: player_team || null,
      ecr_rank: ecr_rank || null,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH: edit a draft pick (commissioner only)
export async function PATCH(req: Request) {
  const { error, supabase } = await requireCommissioner()
  if (error) return error

  const body = await req.json()
  const { id, player_name, player_position, player_team, ecr_rank } = body

  if (!id || !player_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase!
    .from('draft_picks')
    .update({
      player_name,
      player_position: player_position || null,
      player_team: player_team || null,
      ecr_rank: ecr_rank || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE: remove a draft pick (commissioner only)
export async function DELETE(req: Request) {
  const { error, supabase } = await requireCommissioner()
  if (error) return error

  const body = await req.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing pick id' }, { status: 400 })
  }

  const { error: dbError } = await supabase!
    .from('draft_picks')
    .delete()
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
