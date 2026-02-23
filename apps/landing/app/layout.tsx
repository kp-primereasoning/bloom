import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import SmoothScroll from '@/components/SmoothScroll'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif'
})

export const metadata: Metadata = {
  title: 'Bloom - Fresh Flowers Delivered',
  description: 'Artisan floral arrangements delivered to your doorstep. Fresh. Beautiful. Effortless.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${playfair.variable}`} suppressHydrationWarning>
        <SmoothScroll>
          <Navigation />
          <main>{children}</main>
        </SmoothScroll>
      </body>
    </html>
  )
}