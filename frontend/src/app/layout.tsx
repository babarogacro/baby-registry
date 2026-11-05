import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Caveat, Figtree } from 'next/font/google'
import Providers from '@/components/Providers'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, jsonLd } from '@/lib/site'
import './globals.css'

const display = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], axes: ['opsz', 'wdth'], variable: '--font-display', display: 'swap' })
const sans = Figtree({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' })
const note = Caveat({ subsets: ['latin', 'latin-ext'], variable: '--font-note', display: 'swap', preload: false })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Bebina Lista: lista želja za bebu bez duplih poklona',
  description: 'Napravi listu onoga što ti treba za bebu i pošalji link obitelji i prijateljima. Kad netko odabere poklon, ostali odmah vide da je zauzet. Besplatno je.',
  applicationName: SITE_NAME,
  openGraph: {
    title: 'Bebina Lista: izbjegni duple poklone',
    description: 'Besplatna lista želja za bebu i dječji rođendan. Gosti vide što je već zauzeto, pa nitko ne kupi isto.',
    siteName: SITE_NAME,
    locale: 'hr_HR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

// Who we are, for search engines and AI answers; the search action points at "Pronađi listu".
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organizacija`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/opengraph-image`,
      email: 'info@bebinalista.hr',
      areaServed: 'HR',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#web`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'hr-HR',
      publisher: { '@id': `${SITE_URL}/#organizacija` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/pronadi-listu?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      inLanguage: 'hr-HR',
      description: SITE_DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    },
  ],
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
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(SITE_JSON_LD)} />
      </head>
      <body>
        <a href="#sadrzaj" className="skip-link">Preskoči na sadržaj</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
