export function Footer() {
  return (
    <footer className="bg-amber-900 text-amber-100 dark:bg-slate-900 dark:text-slate-300 mt-12">
      <div className="mx-auto max-w-[1400px] px-4 py-8 text-center">
        <div className="mb-4">
          <p className="text-lg font-serif">
            &quot;You&apos;re killing me, Smalls!&quot;
          </p>
        </div>
        <div className="flex justify-center items-center gap-4 text-sm mb-4">
          <a 
            href="#" 
            className="hover:text-amber-200 dark:hover:text-slate-100 transition-colors"
          >
            League Rules
          </a>
          <span>|</span>
          <a 
            href="https://baseball.fantasysports.yahoo.com/b1/24701" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-amber-200 dark:hover:text-slate-100 transition-colors"
          >
            Yahoo League
          </a>
        </div>
        <p className="text-xs">
          THE SANDLOT — Est. 2020 • 12 Teams • $200 Buy-in • Powered by ⚾️ and bad trades
        </p>
      </div>
    </footer>
  )
}
