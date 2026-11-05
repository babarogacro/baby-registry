import { ImageResponse } from 'next/og'
import { COAL, OG_SIZE, OgLogo, OgMobile, ogFonts, type Piece } from '@/lib/og'

export const alt = 'Bebina Lista: izbjegni duple poklone. Besplatna lista želja za bebu i dječji rođendan.'
export const size = OG_SIZE
export const contentType = 'image/png'

const PIECES: Piece[] = [
  { art: 'carseat', tone: 'cobalt', radius: '90px 90px 22px 22px', x: 0.14, drop: 260, size: 124 },
  { art: 'pram', tone: 'tomato', radius: '50%', x: 0.48, drop: 70, size: 190 },
  { art: 'bottle', tone: 'mint', radius: '32px', x: 0.8, drop: 310, size: 112 },
  { art: 'heart', tone: 'bubble', radius: '30px', x: 0.95, drop: 120, size: 90 },
]

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#FFC933', fontFamily: 'Sans' }}>
        <OgMobile pieces={PIECES} left={730} width={430} />
        <div style={{ position: 'absolute', left: 72, top: 60, bottom: 60, width: 660, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <OgLogo />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Display', fontWeight: 800, fontSize: 92, lineHeight: 0.95, letterSpacing: -3, color: COAL }}>Izbjegni</div>
            <div style={{ fontFamily: 'Display', fontWeight: 800, fontSize: 92, lineHeight: 0.95, letterSpacing: -3, color: '#2F4BFF' }}>duple poklone.</div>
            <div style={{ marginTop: 24, fontSize: 30, lineHeight: 1.28, color: COAL, maxWidth: 600 }}>
              Lista želja za bebu i dječji rođendan. Gosti vide što je već zauzeto, pa nitko ne kupi isto.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Besplatno', 'Gosti se ne registriraju'].map(t => (
              <div key={t} style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, background: 'rgba(30,21,55,0.1)', fontSize: 22, fontWeight: 800, color: COAL }}>{t}</div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  )
}
