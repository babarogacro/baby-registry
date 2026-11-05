import { NextResponse, type NextRequest } from 'next/server'

// One address for people and search engines: www.<domain> and the old Railway address send
// visitors to the canonical domain from NEXT_PUBLIC_FRONTEND_URL. While that variable still
// points at the Railway address, nothing here redirects, so it is safe to deploy before DNS works.
const canonical = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || '') } catch { return null }
})()

export function proxy(request: NextRequest) {
  if (!canonical || canonical.hostname.endsWith('.up.railway.app')) return
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0].toLowerCase()
  const moved = host === `www.${canonical.hostname}` || host.endsWith('.up.railway.app')
  if (!moved) return
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical)
  return NextResponse.redirect(target, 308)
}

export const config = {
  // Static files and images are left alone; pages, share images and llms.txt follow the redirect.
  matcher: ['/((?!_next/static|_next/image).*)'],
}
