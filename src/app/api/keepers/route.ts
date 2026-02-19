import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagerByEmail, MANAGERS } from '@/data/managers'
import { resolveKeeperStacking, getEffectiveKeeperCostRound, type KeeperInput } from '@/lib/keeper-stacking'

// GET: fetch all keeper data (public) — includes stacking info
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('my_roster_players')
    .select('*, players(*)')
    .order('keeper_cost_round', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []

  // Compute stacking per team and annotate rows
  const teamGroups: Record<string, typeof rows> = {}
  for (const row of rows) {
    const key = row.yahoo_team_key as string
    if (!teamGroups[key]) teamGroups[key] = []
    teamGroups[key].push(row)
  }

  // Build a map of stacking info: id → { effective_round, stacked_from }
  const stackingInfo: Record<string, { effective_round: number; stacked_from: number | null }> = {}

  for (const [, teamRows] of Object.entries(teamGroups)) {
    const keeperInputs: KeeperInput[] = teamRows
      .filter((r: Record<string, unknown>) =>
        (r.keeper_status === 'keeping' || r.keeper_status === 'keeping-7th') && r.keeper_cost_round
      )
      .map((r: Record<string, unknown>) => {
        const ecr = (r.players as Record<string, unknown>)?.fantasypros_ecr as number | null ?? null
        return {
          id: r.id as string,
          player_name: (r.players as Record<string, unknown>)?.full_name as string ?? 'Unknown',
          keeper_cost_round: getEffectiveKeeperCostRound(r.keeper_status as string, r.keeper_cost_round as number, ecr) ?? (r.keeper_cost_round as number),
          ecr,
          keeper_status: r.keeper_status as string,
        }
      })

    if (keeperInputs.length > 0) {
      const result = resolveKeeperStacking(keeperInputs)
      for (const resolved of result.keepers) {
        stackingInfo[resolved.id] = {
          effective_round: resolved.effective_round,
          stacked_from: resolved.stacked_from,
        }
      }
    }
  }

  // Annotate rows with stacking info
  const annotatedRows = rows.map(row => ({
    ...row,
    stacking: stackingInfo[row.id as string] ?? null,
  }))

  return NextResponse.json(annotatedRows)
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

  const validStatuses = ['undecided', 'keeping', 'keeping-7th', 'not-keeping', 'keeping-na']
  if (!validStatuses.includes(keeper_status)) {
    return NextResponse.json({ error: 'Invalid keeper status' }, { status: 400 })
  }

  // Verify ownership: the roster player must belong to this manager's team
  const { data: rosterPlayer } = await supabase
    .from('my_roster_players')
    .select('id, yahoo_team_key, players(eligible_positions, is_na_eligible)')
    .eq('id', roster_player_id)
    .single()

  if (!rosterPlayer) {
    return NextResponse.json({ error: 'Roster player not found' }, { status: 404 })
  }

  // Gate 7th keeper: player must be NA-eligible (under rookie thresholds: <130 AB and <50 IP)
  if (keeper_status === 'keeping-7th') {
    const players = rosterPlayer as { players?: { eligible_positions?: string[]; is_na_eligible?: boolean } }
    const eligible = players.players?.eligible_positions ?? []
    const isNAEligible = players.players?.is_na_eligible === true || (players.players?.is_na_eligible == null && eligible.includes('NA'))
    if (!isNAEligible) {
      return NextResponse.json({ error: 'This player has exceeded qualifying thresholds (130 AB or 50 IP) — not eligible for 7th Keeper' }, { status: 400 })
    }
  }

  // Gate NA keepers: allow keeping-na if player has is_na_eligible flag OR NA in eligible_positions
  if (keeper_status === 'keeping-na') {
    const players = rosterPlayer as { players?: { eligible_positions?: string[]; is_na_eligible?: boolean } }
    const eligible = players.players?.eligible_positions ?? []
    const isNAEligible = players.players?.is_na_eligible === true || (players.players?.is_na_eligible == null && eligible.includes('NA'))
    if (!isNAEligible) {
      return NextResponse.json({ error: 'This player is not minor league (NA) eligible' }, { status: 400 })
    }
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
