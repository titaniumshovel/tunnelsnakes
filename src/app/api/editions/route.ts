import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('editions')
    .select('*')
    .eq('status', 'published')
    .order('date', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Failed to fetch editions:', error)
    return NextResponse.json({ error: 'Failed to fetch editions' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
