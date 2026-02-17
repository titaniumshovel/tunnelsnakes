/**
 * Tests for the trade report (offer) Zod schema validation.
 * Tests the schema directly without needing the API route.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Re-create the schema from /api/offers/route.ts
const BodySchema = z.object({
  teamName: z.string().min(1).max(80),
  displayName: z.string().max(80).optional().or(z.literal('')),
  email: z.string().email().max(254).optional().or(z.literal('')),
  offerText: z.string().min(3).max(5000),
  message: z.string().max(5000).optional().or(z.literal('')),
  requestedPlayerId: z.string().uuid().optional(),
})

const LEAGUE_TEAMS = [
  'Alex in Chains',
  'Bleacher Creatures',
  'ClutchHutch',
  "Goin' Yahdgoats",
  'Greasy Cap Advisors',
  'Lollygaggers',
  'Red Stagz',
  'Runs-N-Roses',
  'The Dirty Farm',
  'Lake Monsters',
  "Tyler's Slugfest",
  'Tunnel Snakes',
]

describe('Trade Report (Offer) Schema', () => {
  it('accepts valid full submission', () => {
    const result = BodySchema.safeParse({
      teamName: 'Tunnel Snakes',
      displayName: 'Chris',
      email: 'cjm91792@gmail.com',
      offerText: 'My Pick #7 for your Pick #3 + Player X',
      message: 'Good deal for both sides',
    })
    expect(result.success).toBe(true)
  })

  it('accepts minimal required fields', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'Player X for Player Y',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string for optional fields', () => {
    const result = BodySchema.safeParse({
      teamName: 'ClutchHutch',
      displayName: '',
      email: '',
      offerText: 'Some trade details',
      message: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing teamName', () => {
    const result = BodySchema.safeParse({
      offerText: 'Player X for Player Y',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty teamName', () => {
    const result = BodySchema.safeParse({
      teamName: '',
      offerText: 'Player X for Player Y',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing offerText', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
    })
    expect(result.success).toBe(false)
  })

  it('rejects offerText shorter than 3 characters', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'Hi',
    })
    expect(result.success).toBe(false)
  })

  it('rejects offerText longer than 5000 characters', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'x'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts offerText exactly at 5000 characters', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'x'.repeat(5000),
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'Player X for Player Y',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid UUID for requestedPlayerId', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'Player X for Player Y',
      requestedPlayerId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID for requestedPlayerId', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'Player X for Player Y',
      requestedPlayerId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects teamName longer than 80 characters', () => {
    const result = BodySchema.safeParse({
      teamName: 'x'.repeat(81),
      offerText: 'Player X for Player Y',
    })
    expect(result.success).toBe(false)
  })

  it('rejects message longer than 5000 characters', () => {
    const result = BodySchema.safeParse({
      teamName: 'Red Stagz',
      offerText: 'Player X for Player Y',
      message: 'x'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects completely invalid input (null)', () => {
    const result = BodySchema.safeParse(null)
    expect(result.success).toBe(false)
  })

  it('rejects completely invalid input (number)', () => {
    const result = BodySchema.safeParse(42)
    expect(result.success).toBe(false)
  })

  it('all league team names pass validation', () => {
    for (const team of LEAGUE_TEAMS) {
      const result = BodySchema.safeParse({
        teamName: team,
        offerText: 'Test trade',
      })
      expect(result.success).toBe(true)
    }
  })
})
