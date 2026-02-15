import type { Metadata } from 'next'
import './globals.css'
import { AppToaster } from '@/app/ui/toaster'

export const metadata: Metadata = {
  title: 'Tunnel Snakes — Trade Terminal',
  description: 'Vault 101 Fantasy Baseball trade terminal. War never changes... but your lineup should.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
        <AppToaster />
      </body>
    </html>
  )
}
