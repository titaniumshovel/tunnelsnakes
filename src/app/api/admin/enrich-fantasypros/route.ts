import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function extractEcrData(html: string): any {
  const marker = 'var ecrData = '
  const idx = html.indexOf(marker)
  if (idx < 0) throw new Error('FantasyPros: could not find ecrData')

  const start = html.indexOf('{', idx)
  if (start < 0) throw new Error('FantasyPros: could not find object start')

  let level = 0
  let end = -1
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (ch === '{') level++
    else if (ch === '}') {
      level--
      if (level === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end < 0) throw new Error('FantasyPros: could not find object end')

  const jsonText = html.slice(start, end)
  return JSON.parse(jsonText)
}

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

  const { data: roster, error: rosterErr } = await supabase
    .from('my_roster_players')
    .select('player_id')
    .eq('yahoo_league_key', leagueKey)
    .eq('yahoo_team_key', teamKey)

  if (rosterErr) return new NextResponse(rosterErr.message, { status: 500 })
  const playerIds = (roster ?? []).map((r: any) => r.player_id)

  if (playerIds.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, note: 'No roster players found. Run import-keepers first.' })
  }

  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, full_name')
    .in('id', playerIds)

  if (playersErr) return new NextResponse(playersErr.message, { status: 500 })

  const htmlRes = await fetch('https://www.fantasypros.com/mlb/rankings/overall.php', {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; tunnel-snakes/1.0; +https://tunnel-snakes.vercel.app)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  })

  if (!htmlRes.ok) {
    return new NextResponse(`FantasyPros fetch failed: ${htmlRes.status}`, { status: 502 })
  }

  const html = await htmlRes.text()
  const ecrData = extractEcrData(html)
  const fpPlayers: any[] = ecrData.players ?? []

  const fpMap = new Map<string, any>()
  for (const p of fpPlayers) {
    const key = normalizeName(String(p.player_name ?? ''))
    if (!key) continue
    const existing = fpMap.get(key)
    if (!existing || (p.rank_ecr && p.rank_ecr < existing.rank_ecr)) fpMap.set(key, p)
  }

  let updated = 0
  const now = new Date().toISOString()

  for (const p of players ?? []) {
    const key = normalizeName(p.full_name)
    const fp = fpMap.get(key)
    if (!fp) continue

    const patch = {
      fantasypros_ecr: fp.rank_ecr ?? null,
      fantasypros_pos_rank: fp.pos_rank ?? null,
      fantasypros_url: fp.player_page_url ?? null,
      fantasypros_updated_at: now,
    }

    const { error: upErr } = await supabase.from('players').update(patch).eq('id', p.id)
    if (!upErr) updated++
  }

  return NextResponse.json({ ok: true, updated })
}
