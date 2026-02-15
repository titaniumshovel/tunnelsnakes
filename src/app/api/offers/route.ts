import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const BodySchema = z.object({
  teamName: z.string().min(1).max(80),
  displayName: z.string().max(80).optional().or(z.literal('')),
  email: z.string().email().max(254).optional().or(z.literal('')),
  offerText: z.string().min(3).max(5000),
  message: z.string().max(5000).optional().or(z.literal('')),
  requestedPlayerId: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  const leagueKey = process.env.YAHOO_LEAGUE_KEY
  const teamKey = process.env.YAHOO_TEAM_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!leagueKey || !teamKey) {
    return new NextResponse('Missing YAHOO_LEAGUE_KEY/YAHOO_TEAM_KEY', { status: 500 })
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return new NextResponse('Missing Supabase env', { status: 500 })
  }

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return new NextResponse(parsed.error.message, { status: 400 })
  }

  const { teamName, displayName, email, offerText, message, requestedPlayerId } = parsed.data

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { error: offerErr } = await supabase.from('trade_offers').insert({
    yahoo_league_key: leagueKey,
    yahoo_team_key: teamKey,
    from_team_name: teamName,
    from_name: displayName || null,
    from_email: email || null,
    requested_player_id: requestedPlayerId ?? null,
    offer_text: offerText,
    message: message || null,
    status: 'submitted',
  })

  if (offerErr) {
    return new NextResponse(offerErr.message, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
