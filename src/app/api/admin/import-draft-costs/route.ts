import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'nodejs'

const BodySchema = z.object({
  text: z.string().min(50),
  defaultRoundIfUndrafted: z.number().int().min(1).max(50).optional().default(24),
})

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export async function POST(req: Request) {
  try {
    const secret = process.env.IMPORT_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!secret) return new NextResponse('Missing IMPORT_SECRET env', { status: 500 })
    if (!supabaseUrl || !serviceKey) return new NextResponse('Missing Supabase service env', { status: 500 })

    const provided = req.headers.get('x-import-secret')
    if (provided !== secret) return new NextResponse('Unauthorized', { status: 401 })

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return new NextResponse(parsed.error.message, { status: 400 })

    const { text, defaultRoundIfUndrafted } = parsed.data

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

    let currentRound: number | null = null
    const nameToRound = new Map<string, number>()

    for (const line of lines) {
      const mRound = line.match(/^Round\s+(\d+)/i)
      if (mRound) {
        currentRound = Number(mRound[1])
        continue
      }

      const mPick = line.match(/^\d+\.\s+(.+?)\s+(?:\uE03E|\(|[A-Z]{2,3}\s*-|$)/)
      if (mPick && currentRound) {
        let rawName = mPick[1]
        rawName = rawName.replace(/\([^)]*\)/g, '').trim()
        rawName = rawName.replace(/\bDTD\b/g, '').trim()
        if (rawName.length < 3) continue
        const key = normalizeName(rawName)
        if (!nameToRound.has(key)) nameToRound.set(key, currentRound)
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: players, error } = await supabase.from('players').select('id, full_name')
    if (error) return new NextResponse(error.message, { status: 500 })

    let matched = 0
    let undraftedSet = 0

    for (const p of players ?? []) {
      const key = normalizeName(p.full_name)
      const round = nameToRound.get(key)
      const payload = {
        keeper_cost_round: round ?? defaultRoundIfUndrafted,
        keeper_cost_label: `keeper @ ${ordinal(round ?? defaultRoundIfUndrafted)}`,
        keeper_cost_source: round ? 'yahoo_draft_results_2025' : 'default_undrafted',
        keeper_cost_updated_at: new Date().toISOString(),
      }

      const { error: upErr } = await supabase.from('players').update(payload).eq('id', p.id)
      if (!upErr) {
        if (round) matched++
        else undraftedSet++
      }
    }

    return NextResponse.json({ ok: true, matched, undraftedSet, parsedCount: nameToRound.size })
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'Unknown error', { status: 500 })
  }
}
