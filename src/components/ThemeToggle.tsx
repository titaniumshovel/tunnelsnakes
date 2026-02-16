'use client'

import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load theme on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sandlot-theme')
    const isDark = saved === 'dark'
    setDark(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  function toggle() {
    const nextDark = !dark
    setDark(nextDark)
    document.documentElement.classList.toggle('dark', nextDark)
    localStorage.setItem('sandlot-theme', nextDark ? 'dark' : 'light')
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="w-10 h-10 flex items-center justify-center">
        <div className="w-6 h-6 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-accent/10 transition-colors"
      title={dark ? 'Day Game' : 'Night Game'}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      <span className="text-lg">
        {dark ? '☀️' : '🌙'}
      </span>
    </button>
  )
}