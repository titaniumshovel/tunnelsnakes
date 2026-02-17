'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  // Auto-focus first OTP input when step changes
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

  async function handleVerifyOtp(code: string) {
    setVerifying(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    setVerifying(false)

    if (error) {
      setError('Invalid or expired code. Please try again.')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } else {
      // Success — redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    }
  }

  function handleOtpChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const fullCode = newOtp.join('')
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode)
      }
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return

    const newOtp = [...otp]
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || ''
    }
    setOtp(newOtp)

    // Focus the next empty slot or last
    const nextEmpty = newOtp.findIndex(d => !d)
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()

    // Auto-submit if full
    if (pasted.length === 6) {
      handleVerifyOtp(pasted)
    }
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
            /* OTP Code Entry */
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
                  Check your inbox (and spam folder)
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={verifying}
                    className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-mono font-bold rounded-lg border-2 bg-background text-foreground transition-all duration-150 focus:outline-none ${
                      digit
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-primary/20'
                    } focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50`}
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
                  onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(null) }}
                  className="text-xs font-mono text-primary/60 hover:text-primary transition-colors"
                >
                  ← Different email
                </button>
                <button
                  onClick={() => { setOtp(['', '', '', '', '', '']); setError(null); handleEmailSubmit(new Event('submit') as unknown as React.FormEvent) }}
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
                League members only — we&apos;ll email you a 6-digit code
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
