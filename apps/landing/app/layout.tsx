import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/navigation'
import SmoothScroll from '@/components/SmoothScroll'

export const metadata: Metadata = {
  title: 'Bloom — Flowers for your building',
  description: 'Fresh flowers every two weeks from a local florist, delivered to your apartment door.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SmoothScroll>
          <Navigation />
          <main>{children}</main>
        </SmoothScroll>
      </body>
    </html>
  )
}