/**
 * Tests for API route existence and configuration.
 * These verify the route files exist and have correct exports,
 * without requiring a running server or database.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

function routeExists(routePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), routePath))
}

function readRoute(routePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), routePath), 'utf-8')
}

describe('API route files exist', () => {
  it('/api/offers route exists', () => {
    expect(routeExists('src/app/api/offers/route.ts')).toBe(true)
  })

  it('/api/chat route exists', () => {
    expect(routeExists('src/app/api/chat/route.ts')).toBe(true)
  })

  it('/api/keepers route exists', () => {
    expect(routeExists('src/app/api/keepers/route.ts')).toBe(true)
  })

  it('/api/editions (news) route exists', () => {
    expect(routeExists('src/app/api/editions/route.ts')).toBe(true)
  })

  it('/api/trades route exists', () => {
    expect(routeExists('src/app/api/trades/route.ts')).toBe(true)
  })
})

describe('/api/offers route', () => {
  const content = readRoute('src/app/api/offers/route.ts')

  it('exports a POST handler', () => {
    expect(content).toContain('export async function POST')
  })

  it('uses Zod for validation', () => {
    expect(content).toContain("from 'zod'")
    expect(content).toContain('BodySchema')
    expect(content).toContain('safeParse')
  })

  it('validates teamName, offerText required', () => {
    expect(content).toContain('teamName: z.string().min(1)')
    expect(content).toContain('offerText: z.string().min(3).max(5000)')
  })

  it('inserts into trade_offers table', () => {
    expect(content).toContain("from('trade_offers')")
    expect(content).toContain('.insert(')
  })

  it('sends Telegram notification', () => {
    expect(content).toContain('notifyTelegram')
    expect(content).toContain('api.telegram.org')
  })

  it('returns 400 for invalid input', () => {
    expect(content).toContain('status: 400')
  })

  it('returns 500 for server errors', () => {
    expect(content).toContain('status: 500')
  })
})

describe('/api/chat route', () => {
  const content = readRoute('src/app/api/chat/route.ts')

  it('exports a POST handler', () => {
    expect(content).toContain('export async function POST')
  })

  it('has rate limiting', () => {
    expect(content).toContain('checkRateLimit')
    expect(content).toContain('MAX_REQUESTS_PER_DAY')
  })
})

describe('/api/keepers route', () => {
  const content = readRoute('src/app/api/keepers/route.ts')

  it('exports a GET handler', () => {
    expect(content).toContain('export async function GET')
  })

  it('exports a PATCH handler for updates', () => {
    expect(content).toContain('export async function PATCH')
  })

  it('queries my_roster_players table', () => {
    expect(content).toContain("from('my_roster_players')")
  })

  it('validates keeper status values', () => {
    expect(content).toContain("'undecided'")
    expect(content).toContain("'keeping'")
    expect(content).toContain("'not-keeping'")
    expect(content).toContain("'keeping-na'")
  })

  it('requires auth for PATCH (updates)', () => {
    expect(content).toContain('Unauthorized')
    expect(content).toContain('auth.getUser')
  })

  it('gates NA keepers to eligible players', () => {
    expect(content).toContain("'NA'")
    expect(content).toContain('not minor league')
  })
})

describe('/api/editions (news) route', () => {
  const content = readRoute('src/app/api/editions/route.ts')

  it('exports a GET handler', () => {
    expect(content).toContain('export async function GET')
  })

  it('supports ?date= parameter for single edition', () => {
    expect(content).toContain("searchParams.get('date')")
  })

  it('supports ?dates=true parameter for date list', () => {
    expect(content).toContain("searchParams.get('dates')")
    expect(content).toContain("datesOnly === 'true'")
  })

  it('queries editions table with status=published', () => {
    expect(content).toContain("from('editions')")
    expect(content).toContain("'published'")
  })

  it('has ISR revalidation (300s)', () => {
    expect(content).toContain('export const revalidate = 300')
  })
})
