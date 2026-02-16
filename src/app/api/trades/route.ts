import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: trades, error } = await supabase
    .from('trade_offers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch reactions for all trades
  const tradeIds = (trades ?? []).map(t => t.id)
  
  let reactions: Record<string, Array<{ emoji: string; user_email: string }>> = {}
  let comments: Record<string, Array<{ id: string; user_email: string; user_name: string | null; comment: string; created_at: string }>> = {}
  
  if (tradeIds.length > 0) {
    const { data: reactionsData } = await supabase
      .from('trade_reactions')
      .select('*')
      .in('trade_offer_id', tradeIds)

    if (reactionsData) {
      for (const r of reactionsData) {
        if (!reactions[r.trade_offer_id]) reactions[r.trade_offer_id] = []
        reactions[r.trade_offer_id].push({ emoji: r.emoji, user_email: r.user_email })
      }
    }

    const { data: commentsData } = await supabase
      .from('trade_comments')
      .select('*')
      .in('trade_offer_id', tradeIds)
      .order('created_at', { ascending: true })

    if (commentsData) {
      for (const c of commentsData) {
        if (!comments[c.trade_offer_id]) comments[c.trade_offer_id] = []
        comments[c.trade_offer_id].push({
          id: c.id,
          user_email: c.user_email,
          user_name: c.user_name,
          comment: c.comment,
          created_at: c.created_at,
        })
      }
    }
  }

  const enrichedTrades = (trades ?? []).map(t => ({
    ...t,
    reactions: reactions[t.id] ?? [],
    comments: comments[t.id] ?? [],
  }))

  return NextResponse.json(enrichedTrades)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { target_team, offering_players, requesting_players, offering_picks, requesting_picks, description, from_team_name } = body

  if (!target_team || !from_team_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: trade, error } = await supabase
    .from('trade_offers')
    .insert({
      from_team_name,
      from_email: user.email,
      target_team,
      offering_players: offering_players ?? [],
      requesting_players: requesting_players ?? [],
      offering_picks: offering_picks ?? [],
      requesting_picks: requesting_picks ?? [],
      description: description ?? null,
      status: 'pending',
      trade_type: 'proposal',
      teams_involved: [from_team_name, target_team],
      yahoo_league_key: process.env.YAHOO_LEAGUE_KEY ?? 'sandlot-2026',
      yahoo_team_key: process.env.YAHOO_TEAM_KEY ?? 'sandlot',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send Telegram notification
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (token && chatId) {
    const text = `🤝 <b>NEW TRADE PROPOSAL</b>\n\n<b>From:</b> ${from_team_name}\n<b>To:</b> ${target_team}\n${description ? `<b>Details:</b> ${description}\n` : ''}\n<i>tunnelsnakes.vercel.app/trades</i>`
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      })
    } catch {
      // Fire and forget
    }
  }

  return NextResponse.json(trade)
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, status: newStatus } = body

  if (!id || !newStatus) {
    return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
  }

  // Only commissioner can approve/reject
  const { MANAGERS } = await import('@/data/managers')
  const manager = MANAGERS.find(m => m.email?.toLowerCase() === user.email?.toLowerCase())
  
  if (!manager || manager.role !== 'commissioner') {
    return NextResponse.json({ error: 'Only the commissioner can approve/reject trades' }, { status: 403 })
  }

  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'approved') {
    updateData.approved_by = user.email
    updateData.approved_at = new Date().toISOString()
  }

  const { data: trade, error } = await supabase
    .from('trade_offers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(trade)
}
