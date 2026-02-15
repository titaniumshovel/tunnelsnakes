import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const secret = process.env.IMPORT_SECRET
  const provided = req.headers.get('x-import-secret')
  if (provided !== secret) return new NextResponse('Unauthorized', { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'public' }
  })

  // Test if columns exist by trying to select them
  const { error: testErr } = await supabase
    .from('players')
    .select('keeper_cost_round')
    .limit(1)

  if (testErr && testErr.message.includes('keeper_cost_round')) {
    return NextResponse.json({
      ok: false,
      error: 'Columns do not exist yet. Please run this SQL in the Supabase dashboard SQL editor:',
      sql: `ALTER TABLE public.players ADD COLUMN IF NOT EXISTS keeper_cost_round integer;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS keeper_cost_label text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS keeper_cost_source text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS keeper_cost_updated_at timestamptz;`
    })
  }

  // Columns exist — update keeper costs
  const costs: Record<number, { label: string; round: number | null }> = {
    10883: { label: '5th yr keeper — ECR', round: null },
    9124:  { label: '3rd yr keeper — ECR', round: null },
    10420: { label: '5th yr keeper — ECR', round: null },
    10918: { label: '5th yr keeper — ECR', round: null },
    8780:  { label: '2nd yr keeper — ECR', round: null },
    12522: { label: '2nd yr keeper — ECR', round: null },
    11370: { label: 'Drafted Rd 1', round: 1 },
    9902:  { label: 'Drafted Rd 6', round: 6 },
    63640: { label: 'Drafted Rd 7', round: 7 },
    12363: { label: 'Drafted Rd 8', round: 8 },
    11531: { label: 'Drafted Rd 9', round: 9 },
    10514: { label: 'Drafted Rd 11', round: 11 },
    12314: { label: 'Drafted Rd 13', round: 13 },
    11597: { label: 'Drafted Rd 15', round: 15 },
    11750: { label: 'Drafted Rd 22', round: 22 },
    11526: { label: 'Trade — Rd 8', round: 8 },
    10683: { label: 'Trade — Rd 17', round: 17 },
    11789: { label: 'Trade — Rd 23', round: 23 },
    8861:  { label: 'FA — Rd 23 ⚠️', round: 23 },
    9573:  { label: 'FA — Rd 23', round: 23 },
    9691:  { label: 'FA — Rd 23', round: 23 },
    8758:  { label: 'FA — Rd 23', round: 23 },
    10185: { label: 'FA — Rd 23', round: 23 },
    10465: { label: 'FA — Rd 23', round: 23 },
    11375: { label: 'FA — Rd 23', round: 23 },
    11914: { label: 'FA — Rd 23', round: 23 },
    60368: { label: 'NA (minor leaguer)', round: null },
    63576: { label: 'NA (minor leaguer)', round: null },
    64329: { label: 'NA (minor leaguer)', round: null },
    64350: { label: 'NA (minor leaguer)', round: null },
  }

  let updated = 0
  const now = new Date().toISOString()

  for (const [yahooId, cost] of Object.entries(costs)) {
    const { error } = await supabase
      .from('players')
      .update({
        keeper_cost_label: cost.label,
        keeper_cost_round: cost.round,
        keeper_cost_source: 'yahoo-api-analysis',
        keeper_cost_updated_at: now,
      })
      .eq('yahoo_player_id', parseInt(yahooId))

    if (!error) updated++
    else console.error(`Failed ${yahooId}:`, error.message)
  }

  return NextResponse.json({ ok: true, updated })
}
