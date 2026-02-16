import { Suspense } from 'react'
import { TradesUI } from './TradesUI'

export const metadata = {
  title: 'Trade Center',
  description: 'League trade feed, proposals, and reactions.',
}

export default function TradesPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">🤝</div>
          <p className="text-sm font-semibold text-primary">Loading trade center</p>
        </div>
      </main>
    }>
      <TradesUI />
    </Suspense>
  )
}
