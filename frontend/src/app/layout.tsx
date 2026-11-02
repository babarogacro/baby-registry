import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import './globals.css'

const sans = DM_Sans({ subsets: ['latin', 'latin-ext'], weight: ['300', '400', '500'], style: ['normal', 'italic'], variable: '--font-sans', display: 'swap' })
const serif = DM_Serif_Display({ subsets: ['latin', 'latin-ext'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'https://bebinalista.hr'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Bebina Lista — Baby wish lista za nove roditelje',
  description: 'Napravi svoju baby wish listu i podijeli je s prijateljima. Neka pokloni budu točno ono što trebaš.',
  openGraph: {
    title: 'Bebina Lista',
    description: 'Baby wish lista za nove roditelje',
    siteName: 'Bebina Lista',
    locale: 'hr_HR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#FAF7F2',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
