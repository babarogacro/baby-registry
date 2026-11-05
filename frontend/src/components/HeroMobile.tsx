'use client'
import Vrtuljak, { type Hanger } from '@/components/Vrtuljak'
import { Art } from '@/components/art'
import { useTheme } from '@/lib/theme'
import clsx from 'clsx'

const CIRCLE = 'rounded-full'
const ARCH = 'rounded-t-full rounded-b-[18%]'
const SQUARE = 'rounded-[26%]'
const PILL = 'rounded-[40%]'

function Block({ tone, shape, art, inset = 'p-[17%]' }: { tone: string; shape: string; art: Parameters<typeof Art>[0]['name']; inset?: string }) {
  return (
    <span className={clsx(`tone-${tone}`, shape, inset, 'block aspect-square bg-tone shadow-float')}>
      <Art name={art} className="block h-full w-full" />
    </span>
  )
}

/** The signature of the home page: pull a piece, or follow one to its category. */
export default function HeroMobile({ heroImage }: { heroImage?: string | null }) {
  const { theme } = useTheme()
  const night = theme === 'night'

  const hangers: Hanger[] = [
    { key: 'igracke', x: 0.1, drop: 150, size: 112, href: '/katalog?kategorija=igracke', label: 'Igračke', className: 'hidden sm:block', children: <Block tone="sky" shape={PILL} art="rings" /> },
    { key: 'autosjedalice', x: 0.27, drop: 270, size: 136, href: '/katalog?kategorija=autosjedalice', label: 'Autosjedalice', children: <Block tone="cobalt" shape={ARCH} art="carseat" /> },
    {
      // The centrepiece is the admin's hero photo (no category), or a heart/moon when there is none.
      key: 'srce', x: 0.5, drop: 90, size: 196,
      children: heroImage ? (
        <span className="block aspect-square overflow-hidden rounded-full bg-white shadow-float">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" draggable={false} className="h-full w-full object-cover" />
        </span>
      ) : night ? <Block tone="sun" shape={CIRCLE} art="moon" inset="p-[20%]" /> : <Block tone="bubble" shape={CIRCLE} art="heart" inset="p-[20%]" />,
    },
    { key: 'hranjenje', x: 0.73, drop: 310, size: 120, href: '/katalog?kategorija=hranjenje-njega', label: 'Hranjenje', children: <Block tone="mint" shape={SQUARE} art="bottle" /> },
    { key: 'kolica', x: 0.9, drop: 120, size: 112, href: '/katalog?kategorija=kolica', label: 'Kolica', children: <Block tone="tomato" shape={SQUARE} art="pram" inset="p-[15%]" /> },
  ]

  return (
    <div className="relative h-full">
      {night && (
        <div aria-hidden className="absolute inset-0">
          {[[12, 18], [30, 8], [62, 12], [88, 22], [8, 48], [94, 52], [46, 74], [20, 86], [76, 82]].map(([left, top], i) => (
            <span key={i} className="twinkle absolute h-1.5 w-1.5 rounded-full bg-white" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
      )}
      <Vrtuljak hangers={hangers} heightClass="h-[335px] sm:h-[470px] lg:h-[640px]" stringVar={night ? '247 243 255' : undefined} />
      <p className="note absolute right-[6%] top-[72%] hidden rotate-[-5deg] lg:block" aria-hidden>
        slobodno povuci
        <svg viewBox="0 0 60 40" className="ml-6 mt-1 h-8 w-12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M54 34C40 34 20 28 10 8" />
          <path d="M4 18 9 7l11 4" />
        </svg>
      </p>
    </div>
  )
}
