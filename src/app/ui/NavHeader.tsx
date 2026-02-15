'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getManagerByEmail, type Manager } from '@/data/managers'

const NAV_LINKS = [
  { href: '/', label: 'HOME', icon: '⚾' },
  { href: '/teams', label: 'TEAMS', icon: '👥' },
  { href: '/draft-board', label: 'DRAFT', icon: '🎯' },
  { href: '/offer', label: 'TRADE', icon: '🤝' },
]

export function NavHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [manager, setManager] = useState<Manager | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setIsLoggedIn(true)
        const mgr = getManagerByEmail(user.email)
        setManager(mgr ?? null)
      }
      setAuthLoaded(true)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setIsLoggedIn(true)
        const mgr = getManagerByEmail(session.user.email)
        setManager(mgr ?? null)
      } else {
        setIsLoggedIn(false)
        setManager(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setManager(null)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-primary/20">
      <div className="mx-auto max-w-[1400px] px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">⚾</span>
            <div className="leading-tight">
              <span className="text-lg font-bold text-primary vault-glow font-mono tracking-wider group-hover:text-primary/80 transition-colors">
                THE SANDLOT
              </span>
              <span className="hidden sm:block text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                Fantasy Baseball League Hub
              </span>
            </div>
          </Link>

          {/* Nav Links + Auth */}
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150 ${
                      isActive
                        ? 'bg-primary/15 text-primary vault-glow border border-primary/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                    }`}
                  >
                    <span className="hidden sm:inline">{link.icon}</span>
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Auth section */}
            {authLoaded && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-primary/15">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150 ${
                        pathname === '/dashboard'
                          ? 'bg-primary/15 text-primary vault-glow border border-primary/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                      }`}
                    >
                      <span className="hidden sm:inline">📊</span>
                      {manager ? (
                        <span className="hidden md:inline">{manager.teamName}</span>
                      ) : null}
                      <span className={manager ? 'md:hidden' : ''}>DASH</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent transition-all duration-150"
                    >
                      <span className="hidden sm:inline">🚪</span>
                      OUT
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider transition-all duration-150 ${
                      pathname === '/login'
                        ? 'bg-primary/15 text-primary vault-glow border border-primary/30'
                        : 'text-accent hover:text-accent/80 hover:bg-accent/10 border border-transparent'
                    }`}
                  >
                    <span className="hidden sm:inline">🔐</span>
                    LOGIN
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
