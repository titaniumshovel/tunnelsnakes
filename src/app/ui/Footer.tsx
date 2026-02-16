import Link from 'next/link'

const NAV_LINKS = [
  { href: '/teams', label: 'Teams' },
  { href: '/draft-board', label: 'Draft Board' },
  { href: '/keepers', label: 'Keepers' },
  { href: '/trades', label: 'Trade Center' },
  { href: '/ask-smalls', label: 'Ask Smalls' },
  { href: '/news', label: 'Sandlot Times' },
]

export function Footer() {
  return (
    <footer className="bg-amber-900 text-amber-100 dark:bg-slate-900 dark:text-slate-300 mt-12">
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        {/* Quote */}
        <div className="text-center mb-6">
          <p className="text-lg font-serif">
            &quot;You&apos;re killing me, Smalls!&quot;
          </p>
        </div>

        {/* Nav Links */}
        <div className="flex justify-center items-center gap-3 flex-wrap text-sm mb-4">
          {NAV_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center gap-3">
              {i > 0 && <span className="text-amber-400/40 dark:text-slate-500">|</span>}
              <Link
                href={link.href}
                className="hover:text-amber-200 dark:hover:text-slate-100 transition-colors"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </div>

        {/* External Links */}
        <div className="flex justify-center items-center gap-4 text-sm mb-4">
          <a
            href="#"
            className="hover:text-amber-200 dark:hover:text-slate-100 transition-colors"
          >
            League Rules
          </a>
          <span className="text-amber-400/40 dark:text-slate-500">|</span>
          <a
            href="https://baseball.fantasysports.yahoo.com/b1/24701"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-200 dark:hover:text-slate-100 transition-colors"
          >
            Yahoo League
          </a>
        </div>

        {/* Tagline */}
        <p className="text-xs text-center">
          THE SANDLOT — Est. 2020 • 12 Teams • $200 Buy-in • Powered by ⚾️ and bad trades
        </p>
      </div>
    </footer>
  )
}
