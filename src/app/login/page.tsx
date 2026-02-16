'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <main className="min-h-[60vh] flex items-start md:items-center justify-center px-4 pt-6 md:pt-0">
      <div className="w-full max-w-md">
        {/* Terminal header */}
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-primary vault-glow font-mono">
            🔐 OWNER LOGIN
          </h1>
          <p className="mt-1 text-xs md:text-sm font-mono text-muted-foreground">
            THE SANDLOT — SECURE TERMINAL ACCESS
          </p>
        </div>

        <div className="dashboard-card p-4 md:p-6">
          {sent ? (
            /* Success state */
            <div className="text-center space-y-4">
              <div className="text-4xl">📬</div>
              <h2 className="text-lg font-bold text-primary font-mono vault-glow">
                CHECK YOUR EMAIL
              </h2>
              <p className="text-sm font-mono text-muted-foreground">
                We sent a magic link to{' '}
                <span className="text-primary">{email}</span>
              </p>
              <p className="text-xs font-mono text-muted-foreground/60">
                Click the link in the email to sign in. It may take a minute to arrive.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-4 text-xs font-mono text-primary/60 hover:text-primary transition-colors"
              >
                ← Try a different email
              </button>
            </div>
          ) : (
            /* Login form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-mono font-bold text-primary/80 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-md border border-primary/20 bg-background px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-xs font-mono text-destructive">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-trade w-full text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="terminal-cursor" />
                    SENDING...
                  </span>
                ) : (
                  '⚡ SEND MAGIC LINK'
                )}
              </button>

              <p className="text-center text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
                League members only — use the email your commissioner has on file
              </p>
            </form>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-4 md:mt-6">
          <Link href="/" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
            ← Back to The Sandlot
          </Link>
        </div>
      </div>
    </main>
  )
}
