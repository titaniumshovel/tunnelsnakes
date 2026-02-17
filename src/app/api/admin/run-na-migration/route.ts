import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const secret = process.env.IMPORT_SECRET
  const provided = req.headers.get('x-import-secret')
  if (provided !== secret) return new NextResponse('Unauthorized', { status: 401 })

  // Try to find a direct database connection string
  const dbUrl = process.env.POSTGRES_URL_NON_POOLING 
    || process.env.POSTGRES_URL 
    || process.env.DATABASE_URL
    || process.env.SUPABASE_DB_URL

  if (!dbUrl) {
    return NextResponse.json({ 
      ok: false, 
      error: 'No direct database URL found',
      available_env: Object.keys(process.env).filter(k => 
        k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('SUPABASE_DB')
      )
    })
  }

  // Dynamic import pg
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
    await client.connect()

    const sql = `
      ALTER TABLE public.players
        ADD COLUMN IF NOT EXISTS mlb_person_id integer,
        ADD COLUMN IF NOT EXISTS mlb_debut_date date,
        ADD COLUMN IF NOT EXISTS career_ab integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS career_ip numeric(6,1) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_na_eligible boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS na_eligibility_reason text,
        ADD COLUMN IF NOT EXISTS na_updated_at timestamptz;
      
      CREATE INDEX IF NOT EXISTS idx_players_na_eligible 
        ON public.players(is_na_eligible) WHERE is_na_eligible = true;
    `

    await client.query(sql)
    await client.end()

    return NextResponse.json({ ok: true, message: 'NA eligibility columns added successfully' })
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json({ ok: false, error: error.message })
  }
}
