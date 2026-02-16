import type { Metadata } from 'next'
import './globals.css'
import { AppToaster } from '@/app/ui/toaster'
import { NavHeader } from '@/app/ui/NavHeader'
import { Footer } from '@/app/ui/Footer'

export const metadata: Metadata = {
  title: {
    default: 'The Sandlot — Fantasy Baseball League Hub',
    template: '%s | The Sandlot',
  },
  description: 'The Sandlot fantasy baseball league hub. 12 teams, 27 rounds, bad trades, and questionable decisions since 2020.',
  metadataBase: new URL('https://tunnelsnakes.vercel.app'),
  openGraph: {
    title: 'The Sandlot — Fantasy Baseball League Hub',
    description: '12 teams. 27 rounds. Bad trades and questionable decisions since 2020.',
    siteName: 'The Sandlot',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Sandlot — Fantasy Baseball League Hub',
    description: '12 teams. 27 rounds. Bad trades and questionable decisions since 2020.',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('sandlot-theme') === 'dark') {
              document.documentElement.classList.add('dark')
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <NavHeader />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
        <AppToaster />
      </body>
    </html>
  )
}
