import { NextRequest, NextResponse } from 'next/server'
import { buildLeagueContext, getSystemPrompt } from '@/lib/league-knowledge'
import { getManagerByEmail } from '@/data/managers'

// ─── Rate Limiting (in-memory, resets on deploy/restart) ──
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_DAY = 20

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const existing = rateLimits.get(ip)

  // Reset at midnight ET
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0)
  const resetAt = midnight.getTime()

  if (!existing || now > existing.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - 1 }
  }

  if (existing.count >= MAX_REQUESTS_PER_DAY) {
    return { allowed: false, remaining: 0 }
  }

  existing.count++
  return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - existing.count }
}

// ─── POST handler ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { allowed, remaining } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You get 20 questions per day — come back tomorrow! 🧢' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  try {
    const body = await req.json()
    const { messages, userEmail } = body as {
      messages: Array<{ role: string; content: string }>
      userEmail?: string
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 })
    }

    // Build knowledge context
    const leagueContext = await buildLeagueContext()

    // Personalize if user is logged in
    let userTeamName: string | undefined
    if (userEmail) {
      const manager = getManagerByEmail(userEmail)
      if (manager) userTeamName = manager.teamName
    }

    const systemPrompt = getSystemPrompt(leagueContext, userTeamName)

    // Call RDSec LiteLLM proxy
    const apiKey = process.env.RDSEC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI backend not configured' }, { status: 500 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(
      'https://api.rdsec.trendmicro.com/prod/aiendpoint/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'claude-4.5-sonnet',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10), // Keep last 10 messages for context
          ],
          stream: true,
          max_tokens: 2048,
          temperature: 0.7,
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error')
      console.error('RDSec API error:', response.status, errText)
      return NextResponse.json(
        { error: `AI backend error (${response.status})` },
        { status: 502 }
      )
    }

    // Stream the response back to the client
    const stream = new ReadableStream({
      async start(streamController) {
        const reader = response.body?.getReader()
        if (!reader) {
          streamController.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith('data: ')) continue
              const data = trimmed.slice(6)
              if (data === '[DONE]') {
                streamController.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                continue
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  streamController.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                  )
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err)
        } finally {
          streamController.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-RateLimit-Remaining': String(remaining),
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
