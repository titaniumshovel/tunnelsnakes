import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-4">⚾</div>
        <h1 className="text-4xl font-display text-primary mb-2">
          YOU'RE KILLING ME, SMALLS!
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          That page got lost somewhere in the outfield.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          ← Back to The Sandlot
        </Link>
      </div>
    </main>
  )
}