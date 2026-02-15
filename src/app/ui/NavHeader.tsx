'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'HOME', icon: '⚾' },
  { href: '/teams', label: 'TEAMS', icon: '👥' },
  { href: '/draft-board', label: 'DRAFT', icon: '🎯' },
  { href: '/offer', label: 'TRADE', icon: '🤝' },
]

export function NavHeader() {
  const pathname = usePathname()

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

          {/* Nav Links */}
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
        </div>
      </div>
    </header>
  )
}
