import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 300 // Cache for 5 minutes

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const datesOnly = searchParams.get('dates')

  // Return just the list of available dates (lightweight)
  if (datesOnly === 'true') {
    const { data, error } = await supabase
      .from('editions')
      .select('date')
      .eq('status', 'published')
      .order('date', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to fetch edition dates:', error)
      return NextResponse.json({ error: 'Failed to fetch dates' }, { status: 500 })
    }

    return NextResponse.json((data ?? []).map((d) => d.date))
  }

  // Fetch a single edition by date
  if (date) {
    const { data, error } = await supabase
      .from('editions')
      .select('*')
      .eq('status', 'published')
      .eq('date', date)
      .limit(1)
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows found
      return NextResponse.json(null)
    }

    if (error) {
      console.error('Failed to fetch edition:', error)
      return NextResponse.json({ error: 'Failed to fetch edition' }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // Default: return all published editions (existing behavior)
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
