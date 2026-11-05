import Link from 'next/link'
import clsx from 'clsx'

/** Brand colours of the logo (brand book: Tinta, Limun, Ružičasta, Vanilija). */
export const BRAND = { ink: '#1E1537', lemon: '#FFC83D', pink: '#FF9FCE', vanilla: '#FFF8EF' }

/**
 * The Listica symbol: a gift tag holding a short list, the first item already ticked off.
 * Below 48 px the hole and the bottom lines go, so the tag and the tick stay readable.
 * The hole is cut out of the tag, so whatever is behind shows through, in either theme.
 */
export function LogoSymbol({ className, tag = BRAND.lemon, ink = BRAND.ink, small = false, title }: {
  className?: string
  tag?: string
  ink?: string
  small?: boolean
  title?: string
}) {
  return (
    <svg viewBox="0 0 100 100" className={clsx('logo-tag', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {small ? (
        <path d="M34 8 H82 C88.6 8 94 13.4 94 20 V80 C94 86.6 88.6 92 82 92 H18 C11.4 92 6 86.6 6 80 V36 Z" fill={tag} />
      ) : (
        <path fillRule="evenodd" d="M34 8 H82 C88.6 8 94 13.4 94 20 V80 C94 86.6 88.6 92 82 92 H18 C11.4 92 6 86.6 6 80 V36 Z M21 31 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z" fill={tag} />
      )}
      {small ? (
        <>
          <path d="M30 50 l8 8 l15 -16" fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="30" y="66" width="48" height="9" rx="4.5" fill={ink} />
        </>
      ) : (
        <>
          <path d="M31 50 l7 7 l13 -14" fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="58" y="47" width="20" height="7" rx="3.5" fill={ink} />
          <rect x="31" y="64" width="47" height="7" rx="3.5" fill={ink} />
          <rect x="31" y="78" width="30" height="7" rx="3.5" fill={ink} />
        </>
      )}
    </svg>
  )
}

/** "listica" set in Fredoka, the dots on the i's in lemon and pink, as in the brand book. */
export function Wordmark({ className, firstDot = BRAND.lemon, secondDot = BRAND.pink }: { className?: string; firstDot?: string; secondDot?: string }) {
  return (
    <span role="img" aria-label="listica" className={clsx('wordmark', className)}>
      <span aria-hidden>
        l<span className="wordmark-i">ı<i style={{ background: firstDot }} /></span>st<span className="wordmark-i">ı<i style={{ background: secondDot }} /></span>ca
      </span>
    </span>
  )
}

export default function Logo({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <Link href="/" aria-label="Listica, početna" className={clsx('group inline-flex items-center gap-2 text-ink', className)}>
      <LogoSymbol className={size === 'lg' ? 'h-11 w-11' : 'h-8 w-8'} />
      <Wordmark className={size === 'lg' ? 'text-[2rem]' : 'text-[1.6rem]'} />
    </Link>
  )
}
