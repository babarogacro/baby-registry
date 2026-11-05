import { readFile } from 'fs/promises'
import { join } from 'path'
import { ArtPlain, type ArtName } from '@/components/art'
import { TONE_HEX } from '@/lib/listTone'

// Share images (WhatsApp, Viber, Facebook previews) are drawn by next/og, which needs TTF files and plain colours.
export const OG_SIZE = { width: 1200, height: 630 }
export const COAL = '#1E1537'

export const BRAND = { ink: COAL, lemon: '#FFC83D', pink: '#FF9FCE', vanilla: '#FFF8EF', mint: '#19B38E', blue: '#2F57F0', tangerine: '#FF5A2E' }

/** Fredoka 600 (with č ć đ added) for headings and the logo, Nunito for text, as in the brand book. */
export async function ogFonts() {
  const dir = join(process.cwd(), 'assets', 'fonts')
  const [display, sans, sansBold, sansBlack] = await Promise.all([
    readFile(join(dir, 'Fredoka-HR-600.otf')),
    readFile(join(dir, 'Nunito-400.ttf')),
    readFile(join(dir, 'Nunito-700.ttf')),
    readFile(join(dir, 'Nunito-800.ttf')),
  ])
  return [
    { name: 'Display', data: display, weight: 600 as const, style: 'normal' as const },
    { name: 'Sans', data: sans, weight: 400 as const, style: 'normal' as const },
    { name: 'Sans', data: sansBold, weight: 700 as const, style: 'normal' as const },
    { name: 'Sans', data: sansBlack, weight: 800 as const, style: 'normal' as const },
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
              <ArtPlain name={p.art} size={Math.round(p.size * 0.66)} colors={{ MAIN: COAL, PAPER: '#FFFFFF', ACCENT: p.tone === 'sun' ? BRAND.tangerine : BRAND.lemon }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** The Listica symbol: a lemon gift tag with a short list, the first item ticked. */
export function OgSymbol({ size, tag = BRAND.lemon, ink = COAL, hole = BRAND.vanilla }: { size: number; tag?: string; ink?: string; hole?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M34 8 H82 C88.6 8 94 13.4 94 20 V80 C94 86.6 88.6 92 82 92 H18 C11.4 92 6 86.6 6 80 V36 Z" fill={tag} />
      <circle cx="27" cy="31" r="6" fill={hole} />
      <path d="M31 50 l7 7 l13 -14" fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="58" y="47" width="20" height="7" rx="3.5" fill={ink} />
      <rect x="31" y="64" width="47" height="7" rx="3.5" fill={ink} />
      <rect x="31" y="78" width="30" height="7" rx="3.5" fill={ink} />
    </svg>
  )
}

/** "listica" with the lemon and pink dots over the i's; satori has no inline-block, so each i is its own box. */
export function OgWordmark({ size, color = COAL, dots = [BRAND.lemon, BRAND.pink] }: { size: number; color?: string; dots?: [string, string] }) {
  const dot = Math.round(size * 0.17)
  const i = (bg: string) => (
    <div style={{ display: 'flex', position: 'relative' }}>
      ı
      <div style={{ position: 'absolute', left: '50%', marginLeft: -dot / 2, top: Math.round(size * 0.07), width: dot, height: dot, borderRadius: dot, background: bg }} />
    </div>
  )
  return (
    <div style={{ display: 'flex', fontFamily: 'Display', fontWeight: 600, fontSize: size, lineHeight: 1, letterSpacing: -0.025 * size, color }}>
      <div style={{ display: 'flex' }}>l</div>
      {i(dots[0])}
      <div style={{ display: 'flex' }}>st</div>
      {i(dots[1])}
      <div style={{ display: 'flex' }}>ca</div>
    </div>
  )
}

/**
 * Symbol and wordmark side by side. `on` is the background: on lemon the brand book inverts the tag
 * (ink tag, lemon details) and turns the dots ink, so nothing melts into the background.
 */
export function OgLogo({ size = 44, on = BRAND.vanilla }: { size?: number; on?: string }) {
  const lemon = on.toUpperCase() === BRAND.lemon
  const dark = on.toUpperCase() === COAL
  // A dot in the background's own colour would vanish, so on lemon or pink both dots go ink.
  const inkDots = lemon || on.toUpperCase() === BRAND.pink
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.28) }}>
      {lemon
        ? <OgSymbol size={Math.round(size * 1.15)} tag={COAL} ink={BRAND.lemon} hole={on} />
        : <OgSymbol size={Math.round(size * 1.15)} hole={on} />}
      <OgWordmark size={size} color={dark ? BRAND.vanilla : COAL} dots={inkDots ? [COAL, COAL] : [BRAND.lemon, BRAND.pink]} />
    </div>
  )
}
