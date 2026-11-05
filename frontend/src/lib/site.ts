/** The public address of the site; canonical links, the sitemap and share images are built from it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'https://listica.hr').replace(/\/$/, '')

export const SITE_NAME = 'Listica'

export const SITE_DESCRIPTION = 'Besplatna lista želja za bebu i dječji rođendan. Upiši što ti treba, pošalji link obitelji i prijateljima, a oni vide što je već zauzeto, pa se pokloni ne ponavljaju.'

/** Topic pages written for what people search for; listed in the sitemap, footer and llms.txt. */
export const TOPIC_PAGES = [
  { href: '/lista-zelja-za-bebu', label: 'Lista želja za bebu' },
  { href: '/lista-za-djecji-rodendan', label: 'Lista za dječji rođendan' },
  { href: '/baby-shower-lista', label: 'Lista za baby shower' },
]

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}
