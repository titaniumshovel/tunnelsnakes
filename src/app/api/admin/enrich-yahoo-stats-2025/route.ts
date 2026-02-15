import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function pickFromYahooList(list: any[], key: string) {
  for (const it of list) {
    if (it && typeof it === 'object' && key in it) return it[key]
  }
  return null
}

async function refreshYahooAccessToken() {
  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET
  const refreshToken = process.env.YAHOO_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing YAHOO_CLIENT_ID/YAHOO_CLIENT_SECRET/YAHOO_REFRESH_TOKEN env')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Yahoo token refresh failed: ${res.status} ${t}`)
  }
  const json = await res.json()
  return json.access_token as string
}

async function yahooGet(accessToken: string, path: string) {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/${path}${path.includes('?') ? '' : '?format=json'}`
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'user-agent': 'tunnel-snakes/1.0',
      accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Yahoo API error ${res.status} for ${path}: ${t.slice(0, 200)}`)
  }
  return res.json()
}

export async function POST(req: Request) {
  try {
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
      .select('id, full_name, mlb_team')
      .in('id', playerIds)

    if (playersErr) return new NextResponse(playersErr.message, { status: 500 })

    const accessToken = await refreshYahooAccessToken()

    // Pull league stat category mappings
    const settingsJson = await yahooGet(accessToken, `league/${leagueKey}/settings?format=json`)
    const league = settingsJson.fantasy_content.league
    const settings = league?.[1]?.settings?.[0]
    const statCats = settings?.stat_categories?.stats ?? []

    const statIdToName: Record<string, string> = {}
    for (const s of statCats) {
      const st = s?.stat
      if (!st) continue
      statIdToName[String(st.stat_id)] = String(st.display_name ?? st.name ?? st.stat_id)
    }

    let updated = 0
    const now = new Date().toISOString()

    for (const p of players ?? []) {
      const search = encodeURIComponent(p.full_name)
      const searchJson = await yahooGet(accessToken, `league/${leagueKey}/players;search=${search}?format=json`)
      const playersNode = searchJson.fantasy_content.league?.[1]?.players
      const count = Number(playersNode?.count ?? 0)
      if (!count) continue

      let best: any[] | null = null
      for (let i = 0; i < count; i++) {
        const node = playersNode[String(i)]?.player
        if (!node || !Array.isArray(node) || !Array.isArray(node[0])) continue
        const arr = node[0]
        const nameObj = pickFromYahooList(arr, 'name')
        const full = nameObj?.full ? String(nameObj.full) : ''
        const teamAbbr = pickFromYahooList(arr, 'editorial_team_abbr')

        if (normalizeName(full) !== normalizeName(p.full_name)) continue
        if (p.mlb_team && teamAbbr && String(teamAbbr).toUpperCase() !== String(p.mlb_team).toUpperCase()) {
          continue
        }
        best = arr
        break
      }

      if (!best) {
        const node = playersNode['0']?.player
        if (node && Array.isArray(node) && Array.isArray(node[0])) best = node[0]
      }
      if (!best) continue

      const yahooPlayerKey = pickFromYahooList(best, 'player_key')
      const yahooPlayerId = pickFromYahooList(best, 'player_id')
      if (!yahooPlayerKey) continue

      const statsJson = await yahooGet(
        accessToken,
        `player/${encodeURIComponent(String(yahooPlayerKey))}/stats;type=season;season=2025?format=json`,
      )

      const pl = statsJson.fantasy_content.player
      let playerStats: any = null
      for (const it of pl?.slice?.(1) ?? []) {
        if (it && typeof it === 'object' && 'player_stats' in it) {
          playerStats = (it as any).player_stats
          break
        }
      }

      const rawStats: Array<{ stat_id: string; value: string }> = []
      const labeled: Record<string, string> = {}
      const statsArr = playerStats?.stats ?? []
      for (const s of statsArr) {
        const st = s?.stat
        if (!st) continue
        const statId = String(st.stat_id)
        const val = String(st.value ?? '')
        rawStats.push({ stat_id: statId, value: val })
        const label = statIdToName[statId]
        if (label) labeled[label] = val
      }

      const payload = {
        season: 2025,
        statMap: statIdToName,
        labeled,
        raw: rawStats,
      }

      const headshot = pickFromYahooList(best, 'headshot')
      const headshotUrl = headshot?.url ? String(headshot.url) : null
      const imageUrl = (() => {
        const v = pickFromYahooList(best, 'image_url')
        return v ? String(v) : null
      })()
      const finalHeadshotUrl = headshotUrl ?? imageUrl

      const { error: upErr } = await supabase
        .from('players')
        .update({
          yahoo_player_key: String(yahooPlayerKey),
          yahoo_player_id: yahooPlayerId ? String(yahooPlayerId) : null,
          headshot_url: finalHeadshotUrl,
          stats_2025: payload,
          stats_2025_updated_at: now,
        })
        .eq('id', p.id)

      if (!upErr) updated++
    }

    return NextResponse.json({ ok: true, updated })
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'Unknown error', { status: 500 })
  }
}
