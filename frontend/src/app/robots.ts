import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Search engines and AI assistants may read the public pages; lists hold private names and dates, so they stay out.
const PRIVATE = ['/lista/', '/moja-lista', '/profil', '/admin', '/prijava', '/registracija']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended']
        .map(userAgent => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
