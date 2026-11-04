import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Caveat, Figtree } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const display = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], axes: ['opsz', 'wdth'], variable: '--font-display', display: 'swap' })
const sans = Figtree({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' })
const note = Caveat({ subsets: ['latin', 'latin-ext'], variable: '--font-note', display: 'swap', preload: false })

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'https://bebinalista.hr'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Bebina Lista: lista želja za bebu bez duplih poklona',
  description: 'Napravi listu onoga što ti treba za bebu i pošalji link obitelji i prijateljima. Kad netko odabere poklon, ostali odmah vide da je zauzet. Besplatno je.',
  openGraph: {
    title: 'Bebina Lista',
    description: 'Izbjegni duple poklone. Besplatna lista želja za bebu.',
    siteName: 'Bebina Lista',
    locale: 'hr_HR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFBF3' },
    { media: '(prefers-color-scheme: dark)', color: '#130F26' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Runs before first paint, so night-shift parents never get flashed with a bright page.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='night'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.dataset.theme='night'}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={`${display.variable} ${sans.variable} ${note.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#sadrzaj" className="skip-link">Preskoči na sadržaj</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
