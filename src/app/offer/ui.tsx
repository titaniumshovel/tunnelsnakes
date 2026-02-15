'use client'

import { useState } from 'react'

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
]

export function OfferForm() {
  const [teamName, setTeamName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [offerText, setOfferText] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)

    const url = new URL(window.location.href)
    const requestedPlayerId = url.searchParams.get('player') || undefined

    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ teamName, displayName, email, offerText, message, requestedPlayerId }),
    })

    if (!res.ok) {
      const text = await res.text()
      setStatus('error')
      setError(text || 'Transmission failed. The wasteland is unforgiving.')
      return
    }

    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="dashboard-card text-center py-8">
        <div className="text-4xl mb-3">☢️</div>
        <div className="font-bold text-primary text-lg uppercase tracking-wider">Trade Transmitted</div>
        <p className="mt-2 text-sm text-muted-foreground font-mono">
          The Overseer will review your proposal. Stand by, wastelander.
        </p>
      </div>
    )
  }

  const inputClasses = "mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">Your Faction</label>
        <select
          className={inputClasses}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          required
        >
          <option value="">Select your team…</option>
          {LEAGUE_TEAMS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">
          Your Name <span className="normal-case text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          className={inputClasses}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Vault Dweller"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">
          Pip-Boy Mail <span className="normal-case text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          className={inputClasses}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="dweller@vault101.com"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">Your Offer</label>
        <textarea
          className={`${inputClasses} min-h-[120px]`}
          value={offerText}
          onChange={(e) => setOfferText(e.target.value)}
          required
          placeholder="I'll trade you Pick #3 + Player X for Player Y. Throw in some Nuka-Cola and we've got a deal."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-primary/80">
          Additional Intel <span className="normal-case text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          className={`${inputClasses} min-h-[80px]`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything else the Overseer should know..."
        />
      </div>

      {status === 'error' ? (
        <p className="text-sm text-red-500 font-mono">&gt; ERROR: {error}</p>
      ) : null}

      <button type="submit" disabled={status === 'submitting'} className="btn-trade w-full">
        {status === 'submitting' ? '⏳ TRANSMITTING...' : '⚡ SUBMIT TRADE PROPOSAL'}
      </button>
    </form>
  )
}
