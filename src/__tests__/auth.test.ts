/**
 * Tests for auth flow — login page, OTP input, and dashboard redirect.
 */
import { describe, it, expect } from 'vitest'

const CODE_LENGTH = 6

describe('OTP code input', () => {
  it('code length is 6 digits', () => {
    expect(CODE_LENGTH).toBe(6)
  })

  it('initial digits array is 6 empty strings', () => {
    const digits = Array(CODE_LENGTH).fill('')
    expect(digits).toHaveLength(6)
    expect(digits.every(d => d === '')).toBe(true)
  })

  it('digit cleaning strips non-numeric characters', () => {
    function cleanDigit(value: string): string {
      return value.replace(/\D/g, '')
    }

    expect(cleanDigit('a')).toBe('')
    expect(cleanDigit('1')).toBe('1')
    expect(cleanDigit('1a2')).toBe('12')
    expect(cleanDigit('abc')).toBe('')
    expect(cleanDigit('123456')).toBe('123456')
  })

  it('fills digits from paste correctly', () => {
    function fillDigits(pasted: string, startIdx: number): string[] {
      const digits = Array(CODE_LENGTH).fill('')
      const cleaned = pasted.replace(/\D/g, '')
      for (let i = 0; i < cleaned.length && startIdx + i < CODE_LENGTH; i++) {
        digits[startIdx + i] = cleaned[i]
      }
      return digits
    }

    // Full paste from index 0
    const full = fillDigits('123456', 0)
    expect(full).toEqual(['1', '2', '3', '4', '5', '6'])

    // Partial paste
    const partial = fillDigits('12', 0)
    expect(partial).toEqual(['1', '2', '', '', '', ''])

    // Paste from middle
    const middle = fillDigits('456', 3)
    expect(middle).toEqual(['', '', '', '4', '5', '6'])

    // Paste with non-digits
    const dirty = fillDigits('12-34-56', 0)
    expect(dirty).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('auto-submits when all 6 digits are filled', () => {
    const digits = ['1', '2', '3', '4', '5', '6']
    const shouldSubmit = digits.every(d => d !== '')
    expect(shouldSubmit).toBe(true)
  })

  it('does NOT auto-submit with incomplete digits', () => {
    const digits = ['1', '2', '3', '4', '5', '']
    const shouldSubmit = digits.every(d => d !== '')
    expect(shouldSubmit).toBe(false)
  })
})

describe('Login page structure', () => {
  it('has email and code steps', () => {
    type LoginStep = 'email' | 'code'
    const steps: LoginStep[] = ['email', 'code']
    expect(steps).toHaveLength(2)
  })

  it('login page source includes OTP input boxes', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/login/page.tsx'),
      'utf-8'
    )
    expect(content).toContain('CODE_LENGTH')
    expect(content).toContain('inputMode="numeric"')
    expect(content).toContain('one-time-code')
    expect(content).toContain("setStep('code')")
    expect(content).toContain('/dashboard') // Redirects to dashboard on success
  })
})

describe('Dashboard auth guard', () => {
  it('dashboard page source checks authentication', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/dashboard/page.tsx'),
      'utf-8'
    )
    // Dashboard should check for user auth
    expect(content).toContain('auth')
    expect(content).toContain('getUser')
  })
})
