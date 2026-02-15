import { OfferForm } from './ui'

export const metadata = {
  title: 'Trade Portal — The Sandlot',
  description: 'Propose a trade to the Tunnel Snakes.',
}

export default function OfferPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-lg">
          🤝
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary uppercase tracking-wider">Propose a Trade</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Tunnel Snakes Trade Terminal</p>
        </div>
      </div>
      <div className="dashboard-card mb-4">
        <p className="text-sm text-primary/60 font-mono">
          &gt; Put your offer in plain English. Include picks, players, bottle caps... whatever you&apos;ve got.
          <br />
          &gt; The Overseer will review and respond if interested.
        </p>
      </div>
      <div className="mt-6">
        <OfferForm />
      </div>
    </main>
  )
}
