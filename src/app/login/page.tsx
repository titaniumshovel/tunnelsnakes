'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CODE_LENGTH = 6

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const submittedRef = useRef(false)

  // Auto-focus first box when step changes
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [step])

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setStep('code')
    }
  }

  const handleVerifyOtp = useCallback(async (token: string) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setVerifying(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    setVerifying(false)
    submittedRef.current = false

    if (error) {
      setError('Invalid or expired code. Please try again.')
      setDigits(Array(CODE_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }, [email, router])

  // Fill digits from a string (typed or pasted) starting at an index
  const fillDigits = useCallback((value: string, startIdx: number) => {
    const cleaned = value.replace(/\D/g, '')
    if (!cleaned) return

    setDigits(prev => {
      const next = [...prev]
      for (let i = 0; i < cleaned.length && startIdx + i < CODE_LENGTH; i++) {
        next[startIdx + i] = cleaned[i]
      }
      // If all filled, auto-submit
      if (next.every(d => d !== '')) {
        setTimeout(() => handleVerifyOtp(next.join('')), 50)
      } else {
        // Focus next empty box
        const nextEmpty = startIdx + cleaned.length
        if (nextEmpty < CODE_LENGTH) {
          setTimeout(() => inputRefs.current[nextEmpty]?.focus(), 0)
        }
      }
      return next
    })
  }, [handleVerifyOtp])

  function handleBoxChange(idx: number, value: string) {
    // If pasting multiple digits
    if (value.length > 1) {
      fillDigits(value, idx)
      return
    }
    const digit = value.replace(/\D/g, '')
    if (!digit) return

    setDigits(prev => {
      const next = [...prev]
      next[idx] = digit
      if (next.every(d => d !== '')) {
        setTimeout(() => handleVerifyOtp(next.join('')), 50)
      }
      return next
    })
    // Advance to next box
    if (idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  function handleBoxKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      setDigits(prev => {
        const next = [...prev]
        if (next[idx]) {
          next[idx] = ''
        } else if (idx > 0) {
          next[idx - 1] = ''
          setTimeout(() => inputRefs.current[idx - 1]?.focus(), 0)
        }
        return next
      })
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowRight' && idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    fillDigits(pasted, 0)
  }

  function resetCode() {
    setDigits(Array(CODE_LENGTH).fill(''))
    setError(null)
    submittedRef.current = false
  }

  return (
    <main className="min-h-[60vh] flex items-start md:items-center justify-center px-4 pt-6 md:pt-0">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary">
            🔐 OWNER LOGIN
          </h1>
          <p className="mt-1 text-xs md:text-sm font-mono text-muted-foreground">
            THE SANDLOT — SECURE ACCESS
          </p>
        </div>

        <div className="dashboard-card p-4 md:p-6">
          {step === 'code' ? (
            /* OTP Code Entry — 6 boxes */
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-4xl mb-3">📬</div>
                <h2 className="text-lg font-serif font-bold text-primary">
                  ENTER YOUR CODE
                </h2>
                <p className="text-sm font-mono text-muted-foreground mt-2">
                  We sent a 6-digit code to{' '}
                  <span className="text-primary">{email}</span>
                </p>
                <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                  Check your inbox — paste or type the code below
                </p>
              </div>

              {/* 6 individual digit boxes */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    value={digit}
                    onChange={(e) => handleBoxChange(idx, e.target.value)}
                    onKeyDown={(e) => handleBoxKeyDown(idx, e)}
                    onFocus={(e) => e.target.select()}
                    disabled={verifying}
                    maxLength={CODE_LENGTH}
                    className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-bold rounded-lg border-2 bg-background text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${
                      digit
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-primary/20 focus:border-primary'
                    }`}
                  />
                ))}
              </div>

              {verifying && (
                <div className="text-center">
                  <span className="text-sm font-mono text-primary animate-pulse">Verifying...</span>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-xs font-mono text-destructive text-center">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => { setStep('email'); resetCode() }}
                  className="text-xs font-mono text-primary/60 hover:text-primary transition-colors"
                >
                  ← Different email
                </button>
                <button
                  onClick={() => { resetCode(); handleEmailSubmit(new Event('submit') as unknown as React.FormEvent) }}
                  disabled={loading}
                  className="text-xs font-mono text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
                >
                  Resend code →
                </button>
              </div>
            </div>
          ) : (
            /* Email Entry */
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                    SENDING...
                  </span>
                ) : (
                  '⚡ SEND LOGIN CODE'
                )}
              </button>

              <p className="text-center text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
                League members only — we&apos;ll email you a login code
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
