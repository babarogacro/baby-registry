import type { ReactNode } from 'react'

// The whole visual language: flat wooden-toy shapes built from circles, arcs and pills.
export interface ArtColors { MAIN: string; PAPER: string; ACCENT: string }

// On the page the colours follow the surrounding tone; share images pass plain hex instead.
const CSS_COLORS: ArtColors = { MAIN: 'rgb(var(--on-tone))', PAPER: 'rgb(var(--art-paper, 255 255 255))', ACCENT: 'rgb(var(--accent))' }

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return <svg viewBox="0 0 120 120" aria-hidden="true" className={className}>{children}</svg>
}

const shapes = ({ MAIN, PAPER, ACCENT }: ArtColors) => ({
  pram: (
    <>
      <path d="M26 58a36 36 0 0 1 36-36v36z" fill={MAIN} />
      <path d="M96 60l12-24" stroke={MAIN} strokeWidth="7" strokeLinecap="round" />
      <path d="M26 62h70a35 35 0 0 1-70 0z" fill={PAPER} />
      <circle cx="42" cy="104" r="10" fill={MAIN} />
      <circle cx="82" cy="104" r="10" fill={MAIN} />
      <circle cx="42" cy="104" r="3.5" fill={ACCENT} />
      <circle cx="82" cy="104" r="3.5" fill={ACCENT} />
    </>
  ),
  carseat: (
    <>
      <rect x="18" y="100" width="88" height="11" rx="5.5" fill={MAIN} />
      <path d="M40 12h14a12 12 0 0 1 12 12v42h26a14 14 0 0 1 14 14v8a12 12 0 0 1-12 12H40a14 14 0 0 1-14-14V26a14 14 0 0 1 14-14z" fill={PAPER} />
      <rect x="26" y="26" width="40" height="14" fill={ACCENT} />
      <path d="M46 40v30l26 12" stroke={MAIN} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="58" cy="72" r="6" fill={ACCENT} />
    </>
  ),
  carrier: (
    <>
      <path d="M38 54 28 18M82 54l10-36" stroke={MAIN} strokeWidth="8" strokeLinecap="round" />
      <circle cx="60" cy="38" r="16" fill={ACCENT} />
      <path d="M30 52h60v30a30 30 0 0 1-60 0z" fill={PAPER} />
      <path d="M46 68a14 14 0 0 0 28 0" stroke={MAIN} strokeWidth="5" strokeLinecap="round" fill="none" />
    </>
  ),
  crib: (
    <>
      <rect x="12" y="24" width="9" height="84" rx="4.5" fill={MAIN} />
      <rect x="99" y="24" width="9" height="84" rx="4.5" fill={MAIN} />
      <rect x="18" y="36" width="84" height="7" rx="3.5" fill={MAIN} />
      {[29, 41, 53, 65, 77, 89].map(x => <rect key={x} x={x} y="40" width="4" height="36" fill={MAIN} />)}
      <rect x="18" y="72" width="84" height="16" rx="6" fill={PAPER} />
      <circle cx="34" cy="66" r="8" fill={ACCENT} />
      <path d="M60 18a8 8 0 1 0 8 10 6.5 6.5 0 0 1-8-10z" fill={ACCENT} />
    </>
  ),
  bottle: (
    <>
      <path d="M50 30c0-13 4-20 10-20s10 7 10 20z" fill={ACCENT} />
      <rect x="40" y="27" width="40" height="13" rx="6" fill={MAIN} />
      <rect x="37" y="40" width="46" height="70" rx="15" fill={PAPER} />
      <path d="M37 72h46v23a15 15 0 0 1-15 15H52a15 15 0 0 1-15-15z" fill={ACCENT} />
      <path d="M68 52h15M72 62h11" stroke={MAIN} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  rings: (
    <>
      <rect x="18" y="92" width="84" height="17" rx="8.5" fill={MAIN} />
      <rect x="27" y="73" width="66" height="17" rx="8.5" fill={PAPER} />
      <rect x="36" y="54" width="48" height="17" rx="8.5" fill={ACCENT} />
      <rect x="44" y="35" width="32" height="17" rx="8.5" fill={MAIN} />
      <circle cx="60" cy="21" r="12" fill={PAPER} />
    </>
  ),
  heart: (
    <>
      <path d="M60 106C22 78 12 54 24 34c10-16 30-14 36 4 6-18 26-20 36-4 12 20 2 44-36 72z" fill={MAIN} />
      <circle cx="40" cy="44" r="8" fill={PAPER} />
    </>
  ),
  bodysuit: (
    <>
      <path d="M40 16c4 12 36 12 40 0l26 16-12 22-10-6v38c0 10-8 20-18 24H54c-10-4-18-14-18-24V48l-10 6-12-22z" fill={PAPER} />
      <path d="M36 62h48v12H36z" fill={ACCENT} />
      <circle cx="54" cy="106" r="3" fill={MAIN} />
      <circle cx="66" cy="106" r="3" fill={MAIN} />
      <path d="M46 20c6 8 22 8 28 0" stroke={MAIN} strokeWidth="4" strokeLinecap="round" fill="none" />
    </>
  ),
  bear: (
    <>
      <circle cx="30" cy="34" r="18" fill={MAIN} />
      <circle cx="90" cy="34" r="18" fill={MAIN} />
      <circle cx="30" cy="34" r="8" fill={ACCENT} />
      <circle cx="90" cy="34" r="8" fill={ACCENT} />
      <circle cx="60" cy="66" r="42" fill={MAIN} />
      <ellipse cx="60" cy="82" rx="20" ry="15" fill={PAPER} />
      <circle cx="44" cy="58" r="5.5" fill={PAPER} />
      <circle cx="76" cy="58" r="5.5" fill={PAPER} />
      <circle cx="60" cy="76" r="5.5" fill={MAIN} />
    </>
  ),
  blanket: (
    <>
      <rect x="18" y="18" width="84" height="84" rx="16" fill={PAPER} />
      <path d="M18 44h84M18 70h84" stroke={ACCENT} strokeWidth="11" />
      <path d="M44 18v84M70 18v84" stroke={MAIN} strokeWidth="4" />
    </>
  ),
  bath: (
    <>
      <path d="M12 58h96v8a32 32 0 0 1-32 32H44a32 32 0 0 1-32-32z" fill={PAPER} />
      <rect x="8" y="50" width="104" height="12" rx="6" fill={MAIN} />
      <circle cx="38" cy="32" r="10" fill={ACCENT} />
      <circle cx="60" cy="22" r="6" fill={ACCENT} />
      <circle cx="74" cy="36" r="8" fill={ACCENT} />
      <path d="M34 98l-6 12M86 98l6 12" stroke={MAIN} strokeWidth="7" strokeLinecap="round" />
    </>
  ),
  monitor: (
    <>
      <path d="M38 16 52 36M82 16 68 36" stroke={MAIN} strokeWidth="6" strokeLinecap="round" />
      <rect x="16" y="34" width="88" height="70" rx="18" fill={PAPER} />
      <circle cx="48" cy="68" r="15" fill={ACCENT} />
      <circle cx="48" cy="68" r="6" fill={MAIN} />
      <circle cx="86" cy="54" r="5" fill={MAIN} />
      <circle cx="86" cy="72" r="5" fill={MAIN} />
    </>
  ),
  gift: (
    <>
      <rect x="18" y="52" width="84" height="56" rx="10" fill={PAPER} />
      <rect x="12" y="38" width="96" height="22" rx="8" fill={MAIN} />
      <rect x="51" y="38" width="18" height="70" fill={ACCENT} />
      <path d="M60 38C44 36 30 28 36 16c6-10 20-4 24 22zM60 38c16-2 30-10 24-22-6-10-20-4-24 22z" fill={ACCENT} />
    </>
  ),
  moon: <path d="M78 14a48 48 0 1 0 28 66A40 40 0 0 1 78 14z" fill={MAIN} />,
  star: <path d="M60 10l14 32 34 4-26 22 8 34-30-18-30 18 8-34-26-22 34-4z" fill={MAIN} strokeLinejoin="round" />,
  cloud: (
    <>
      <circle cx="40" cy="68" r="24" fill={PAPER} />
      <circle cx="68" cy="52" r="30" fill={PAPER} />
      <circle cx="92" cy="72" r="18" fill={PAPER} />
      <rect x="30" y="66" width="70" height="26" rx="13" fill={PAPER} />
    </>
  ),
  mix: (
    <>
      <circle cx="36" cy="36" r="24" fill={MAIN} />
      <path d="M60 60a26 26 0 0 1 52 0z" fill={ACCENT} transform="translate(-2 -8)" />
      <rect x="12" y="66" width="44" height="44" rx="12" fill={ACCENT} />
      <path d="M66 110a44 44 0 0 1 44-44v44z" fill={MAIN} />
    </>
  ),
}) satisfies Record<string, ReactNode>

const ART = shapes(CSS_COLORS)

export type ArtName = keyof typeof ART

export function Art({ name, className }: { name: ArtName; className?: string }) {
  return <Svg className={className}>{ART[name]}</Svg>
}

/** The same shape with explicit colours, for next/og share images where CSS variables don't exist. */
export function ArtPlain({ name, size, colors }: { name: ArtName; size: number; colors: ArtColors }) {
  return <svg viewBox="0 0 120 120" width={size} height={size}>{shapes(colors)[name]}</svg>
}
