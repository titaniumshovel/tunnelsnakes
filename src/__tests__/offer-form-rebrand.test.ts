/**
 * Tests to verify the "Propose Trade" → "Report Trade" rebrand.
 * Ensures no Fallout references remain and the new branding is in place.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

function readFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8')
}

describe('Offer form rebrand (ui.tsx)', () => {
  const content = readFile('src/app/offer/ui.tsx')

  it('has "Trade Reported" success message instead of "Trade Transmitted"', () => {
    expect(content).toContain('Trade Reported')
    expect(content).not.toContain('Trade Transmitted')
  })

  it('uses "SUBMIT TRADE REPORT" button instead of "SUBMIT TRADE PROPOSAL"', () => {
    expect(content).toContain('SUBMIT TRADE REPORT')
    expect(content).not.toContain('SUBMIT TRADE PROPOSAL')
  })

  it('uses "Your Team" label instead of "Your Faction"', () => {
    expect(content).toContain('Your Team')
    expect(content).not.toContain('Your Faction')
  })

  it('uses "Email" label instead of "Pip-Boy Mail"', () => {
    // The label has "Email <span..." with a line break between > and Email in JSX
    expect(content).toContain('Email')
    expect(content).not.toContain('Pip-Boy Mail')
  })

  it('uses "Your name" placeholder instead of "Vault Dweller"', () => {
    expect(content).toContain('Your name')
    expect(content).not.toContain('Vault Dweller')
  })

  it('has no Fallout references', () => {
    expect(content).not.toContain('wastelander')
    expect(content).not.toContain('Overseer')
    expect(content).not.toContain('Nuka-Cola')
    expect(content).not.toContain('vault101')
    expect(content).not.toContain('☢️')
  })

  it('uses bg-background instead of bg-secondary for inputs', () => {
    expect(content).toContain('bg-background')
    expect(content).not.toContain('bg-secondary')
  })

  it('uses 📋 emoji for submit button', () => {
    expect(content).toContain('📋')
  })

  it('refers to Commissioner instead of Overseer', () => {
    expect(content).toContain('Commissioner')
    expect(content).not.toContain('Overseer')
  })
})

describe('Offer page metadata rebrand', () => {
  const content = readFile('src/app/offer/page.tsx')

  it('title says "Report Trade" not "Trade Portal"', () => {
    expect(content).toContain('Report Trade')
  })
})

describe('TradesUI rebrand', () => {
  const content = readFile('src/app/trades/TradesUI.tsx')

  it('CTA button says "Report a Trade" not "Propose a Trade"', () => {
    expect(content).toContain('Report a Trade')
  })

  it('section header says "Report a Trade"', () => {
    expect(content).toContain('Report a Trade')
  })

  it('success message says "Trade Reported!"', () => {
    expect(content).toContain('Trade Reported!')
  })

  it('submit button says "SUBMIT TRADE REPORT"', () => {
    expect(content).toContain('SUBMIT TRADE REPORT')
  })

  it('close button says "Close Trade Report Form"', () => {
    expect(content).toContain('Close Trade Report Form')
  })
})

describe('API offers route rebrand', () => {
  const content = readFile('src/app/api/offers/route.ts')

  it('Telegram notification says "TRADE REPORT" not "TRADE OFFER"', () => {
    expect(content).toContain('TRADE REPORT')
    expect(content).not.toContain('TRADE OFFER')
  })
})
