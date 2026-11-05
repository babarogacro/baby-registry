import { ImageResponse } from 'next/og'
import { BRAND, COAL, OgSymbol } from '@/lib/og'

// Home-screen icon from the brand book: the lemon tag on ink, the tag's hole showing the ink through.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COAL }}>
        <OgSymbol size={124} tag={BRAND.lemon} ink={COAL} hole={COAL} />
      </div>
    ),
    size,
  )
}
