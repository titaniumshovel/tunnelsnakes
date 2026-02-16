import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getManagerByEmail } from '@/data/managers'

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
  const { comment } = body

  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  }

  if (comment.length > 500) {
    return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })
  }

  const manager = getManagerByEmail(user.email)

  const { data, error } = await supabase
    .from('trade_comments')
    .insert({
      trade_offer_id: id,
      user_email: user.email,
      user_name: manager?.displayName ?? user.email.split('@')[0],
      comment: comment.trim(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
