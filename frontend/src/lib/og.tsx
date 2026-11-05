import { readFile } from 'fs/promises'
import { join } from 'path'
import { ArtPlain, type ArtName } from '@/components/art'
import { TONE_HEX } from '@/lib/listTone'

// Share images (WhatsApp, Viber, Facebook previews) are drawn by next/og, which needs TTF files and plain colours.
export const OG_SIZE = { width: 1200, height: 630 }
export const COAL = '#1E1537'

export async function ogFonts() {
  const dir = join(process.cwd(), 'assets', 'fonts')
  const [display, sans, sansBold] = await Promise.all([
    readFile(join(dir, 'BricolageGrotesque-ExtraBold.ttf')),
    readFile(join(dir, 'Figtree-SemiBold.ttf')),
    readFile(join(dir, 'Figtree-ExtraBold.ttf')),
  ])
  return [
    { name: 'Display', data: display, weight: 800 as const, style: 'normal' as const },
    { name: 'Sans', data: sans, weight: 600 as const, style: 'normal' as const },
    { name: 'Sans', data: sansBold, weight: 800 as const, style: 'normal' as const },
  ]
}

export interface Piece { art: ArtName; tone: string; radius: string; x: number; drop: number; size: number }

/** The hanging mobile from the site, flattened into one frame: a bar, strings and toy blocks. */
export function OgMobile({ pieces, left, width, barTop = 54 }: { pieces: Piece[]; left: number; width: number; barTop?: number }) {
  return (
    <div style={{ position: 'absolute', left, top: 0, width, height: 630, display: 'flex' }}>
      <div style={{ position: 'absolute', left: 0, top: barTop, width, height: 14, borderRadius: 7, background: COAL }} />
      {pieces.map(p => {
        const cx = p.x * width
        const top = barTop + 7 + p.drop
        return (
          <div key={p.art} style={{ position: 'absolute', left: 0, top: 0, width, height: 630, display: 'flex' }}>
            <div style={{ position: 'absolute', left: cx - 2, top: barTop + 7, width: 4, height: p.drop, background: COAL }} />
            <div style={{
              position: 'absolute', left: cx - p.size / 2, top, width: p.size, height: p.size, borderRadius: p.radius,
              background: TONE_HEX[p.tone], display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 18px 36px -18px rgba(30,21,55,0.45)',
            }}>
              <ArtPlain name={p.art} size={Math.round(p.size * 0.66)} colors={{ MAIN: COAL, PAPER: '#FFFFFF', ACCENT: p.tone === 'sun' ? '#FF5A36' : '#FFC933' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function OgLogo({ color = COAL }: { color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ display: 'flex', width: 46, height: 46, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 24, height: 24, borderRadius: 12, background: '#FF5A36' }} />
        <div style={{ position: 'absolute', right: 0, top: 4, width: 20, height: 20, borderRadius: 6, background: '#2F4BFF' }} />
        <div style={{ position: 'absolute', left: 10, bottom: 0, width: 28, height: 20, borderRadius: '14px 14px 6px 6px', background: '#28C892' }} />
      </div>
      <div style={{ fontFamily: 'Sans', fontWeight: 800, fontSize: 34, color, letterSpacing: -0.5 }}>bebina lista</div>
    </div>
  )
}
