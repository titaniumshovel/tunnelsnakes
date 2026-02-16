import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { emoji } = body

  const ALLOWED_EMOJI = ['🔥', '💀', '👍', '👎', '😂', '🤔']
  if (!emoji || !ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
  }

  // Check if reaction already exists — if so, remove it (toggle)
  const { data: existing } = await supabase
    .from('trade_reactions')
    .select('id')
    .eq('trade_offer_id', id)
    .eq('user_email', user.email)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('trade_reactions')
      .delete()
      .eq('id', existing.id)
    return NextResponse.json({ action: 'removed' })
  }

  const { error } = await supabase
    .from('trade_reactions')
    .insert({
      trade_offer_id: id,
      user_email: user.email,
      emoji,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ action: 'added' })
}
