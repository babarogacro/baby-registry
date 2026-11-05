import { ImageResponse } from 'next/og'
import { COAL, OG_SIZE, OgLogo, OgMobile, ogFonts, type Piece } from '@/lib/og'
import { listTone, TONE_HEX } from '@/lib/listTone'
import { formatDateHR } from '@/lib/format'
import type { BabyList } from '@/types'

export const alt = 'Listica s poklonima: odaberi poklon i rezerviraj ga'
export const size = OG_SIZE
export const contentType = 'image/png'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const PIECES: Piece[] = [
  { art: 'heart', tone: 'bubble', radius: '30px', x: 0.06, drop: 40, size: 92 },
  { art: 'bottle', tone: 'cobalt', radius: '28px', x: 0.28, drop: 96, size: 104 },
  { art: 'pram', tone: 'tomato', radius: '50%', x: 0.5, drop: 34, size: 136 },
  { art: 'rings', tone: 'mint', radius: '70px 70px 20px 20px', x: 0.72, drop: 80, size: 108 },
  { art: 'bear', tone: 'sky', radius: '50%', x: 0.94, drop: 30, size: 94 },
]

/** Long names shrink so they never run off the card. */
function nameSize(text: string) {
  if (text.length <= 12) return 132
  if (text.length <= 18) return 108
  if (text.length <= 26) return 86
  return 68
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let list: BabyList | null = null
  try {
    const res = await fetch(`${API_URL}/public/lista/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (res.ok) list = await res.json()
  } catch {}

  const tone = listTone(slug)
  const bg = TONE_HEX[tone]
  // A toy in the same colour as the card would disappear into it.
  const pieces = PIECES.map(p => (p.tone === tone ? { ...p, tone: tone === 'sun' ? 'cobalt' : 'sun' } : p))
  const child = list?.childName?.trim()
  const title = child || list?.name || 'Listica želja'
  // "Listica želja" above a name that already says "Listica za Lanu" would say it twice.
  const lead = child ? 'Listica želja za' : /^listic/i.test(title) ? null : 'Listica želja'
  const due = list?.user?.dueDate ? new Date(list.user.dueDate) : null
  const chips = [
    due && `${list?.occasion === 'birthday' ? 'Rođendan' : 'Termin'}: ${formatDateHR(due)}`,
    list?.user?.name && `od ${list.user.name}`,
  ].filter(Boolean) as string[]

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: bg, fontFamily: 'Sans' }}>
        <OgMobile pieces={pieces} left={110} width={980} barTop={-4} />
        <div style={{ position: 'absolute', left: 60, right: 60, top: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {lead && <div style={{ fontSize: 40, fontWeight: 800, color: COAL }}>{lead}</div>}
          <div style={{ marginTop: lead ? 8 : 40, fontFamily: 'Display', fontWeight: 600, fontSize: nameSize(title), lineHeight: 0.98, letterSpacing: -2.5, color: COAL, maxWidth: 1080, textAlign: 'center' }}>
            {title}
          </div>
          {chips.length > 0 && (
            <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
              {chips.map(c => (
                <div key={c} style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, background: 'rgba(30,21,55,0.12)', fontSize: 26, color: COAL }}>{c}</div>
              ))}
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', left: 60, bottom: 40, display: 'flex' }}><OgLogo size={38} on={bg} /></div>
        <div style={{ position: 'absolute', right: 60, bottom: 50, display: 'flex', fontSize: 26, fontWeight: 800, color: COAL }}>Odaberi poklon i rezerviraj ga</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  )
}
