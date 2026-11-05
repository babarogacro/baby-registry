import { ImageResponse } from 'next/og'
import { BRAND, OgLogo, ogFonts } from '@/lib/og'

// The logo in the lemon header of every email; mail apps can't load Fredoka, so it goes out as a picture (shown at 150 x 42).
export const dynamic = 'force-static'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.lemon }}>
        <OgLogo size={60} on={BRAND.lemon} />
      </div>
    ),
    { width: 300, height: 84, fonts: await ogFonts() },
  )
}
