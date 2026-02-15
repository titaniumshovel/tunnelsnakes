'use client'

import { Toaster } from 'sonner'

export function AppToaster() {
  return (
    <Toaster
      richColors
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          background: 'hsl(140 12% 8%)',
          color: 'hsl(120 20% 85%)',
          border: '1px solid hsl(121 99% 54% / 0.2)',
          fontFamily: 'Roboto Condensed, system-ui, sans-serif',
        },
      }}
    />
  )
}
