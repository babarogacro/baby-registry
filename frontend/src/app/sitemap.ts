import type { MetadataRoute } from 'next'
import { getBlogPosts } from '@/lib/server'
import { SITE_URL, TOPIC_PAGES } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Catalog filters (?kategorija=) canonicalise to /katalog, so only the page itself is listed.
  const posts = await getBlogPosts(50)
  const now = new Date()
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly', lastModified: Date = now) =>
    ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency, priority })
  const guides = new Set(TOPIC_PAGES.map(t => t.href))

  return [
    page('/', 1, 'daily'),
    page('/katalog', 0.8, 'daily'),
    page('/pronadi-listu', 0.6, 'monthly'),
    page('/blog', 0.7, 'weekly'),
    ...posts.map(p => {
      const path = `/blog/${p.slug}`
      return page(path, guides.has(path) ? 0.9 : 0.7, 'monthly', new Date(p.updatedAt))
    }),
    page('/privatnost', 0.2, 'yearly'),
    page('/uvjeti', 0.2, 'yearly'),
  ]
}
