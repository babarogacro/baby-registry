// https://listica.hr/api/konverzija: the address shops put in their "Listica: kupnja" tag or call from
// their server (see the merchant presentation). The API lives on its own host, so this passes the
// report on and answers right away; a shop's checkout page never waits on us.
export const dynamic = 'force-dynamic'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')
const PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0))

function forwardHeaders(request: Request) {
  const headers: Record<string, string> = {}
  for (const name of ['user-agent', 'x-shop-key', 'content-type', 'x-forwarded-for']) {
    const value = request.headers.get(name)
    if (value) headers[name] = value
  }
  return headers
}

export async function GET(request: Request) {
  const { search } = new URL(request.url)
  try {
    await fetch(`${API_URL}/konverzija${search}`, { headers: forwardHeaders(request), cache: 'no-store', signal: AbortSignal.timeout(5000) })
  } catch {}
  return new Response(PIXEL, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  try {
    const res = await fetch(`${API_URL}/konverzija`, {
      method: 'POST',
      headers: forwardHeaders(request),
      body: await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
  } catch {
    return Response.json({ ok: false, error: 'Listica trenutno ne može primiti narudžbu, pokušajte ponovno' }, { status: 503 })
  }
}
