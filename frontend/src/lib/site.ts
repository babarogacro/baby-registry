/** The public address of the site; canonical links, the sitemap and share images are built from it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'https://listica.hr').replace(/\/$/, '')

export const SITE_NAME = 'Listica'

export const SITE_DESCRIPTION = 'Besplatna lista želja za bebu i dječji rođendan. Upiši što ti treba, pošalji link obitelji i prijateljima, a oni vide što je već zauzeto, pa se pokloni ne ponavljaju.'

/**
 * Gift guides written for what people search for: blog posts that the footer and llms.txt link to
 * and the sitemap ranks above other posts. The old topic pages redirect here (next.config.js).
 */
export const TOPIC_PAGES = [
  { href: '/blog/pokloni-za-bebu', label: 'Pokloni za bebu' },
  { href: '/blog/pokloni-za-djecji-rodendan', label: 'Pokloni za dječji rođendan' },
  { href: '/blog/pokloni-za-baby-shower', label: 'Pokloni za baby shower' },
]

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}
