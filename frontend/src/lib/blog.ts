const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/** Images uploaded in the admin are stored as /blog/images/<id>, served by the API. */
export function blogImageUrl(src?: string | null) {
  if (!src) return ''
  return src.startsWith('/blog/images/') ? `${API_URL}${src}` : src
}

export type BlogSegment = { kind: 'markdown'; text: string } | { kind: 'product'; id: string }

/** Splits an article at [[proizvod:<id>]] markers, which become product cards. */
export function splitBlogContent(content: string): BlogSegment[] {
  const segments: BlogSegment[] = []
  const pattern = /\[\[proizvod:([a-z0-9]{10,40})\]\]/gi
  let last = 0
  for (const match of content.matchAll(pattern)) {
    const before = content.slice(last, match.index)
    if (before.trim()) segments.push({ kind: 'markdown', text: before })
    segments.push({ kind: 'product', id: match[1] })
    last = (match.index ?? 0) + match[0].length
  }
  const rest = content.slice(last)
  if (rest.trim()) segments.push({ kind: 'markdown', text: rest })
  return segments
}

export function blogDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zagreb' })
}

/** Rough reading time at 200 words a minute, at least one. */
export function readingMinutes(content: string) {
  return Math.max(1, Math.round(content.replace(/\[\[[^\]]+\]\]|[#*_>`[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length / 200))
}
