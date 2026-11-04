import Link from 'next/link'
import clsx from 'clsx'

/** A tiny mobile: three toy shapes on a bar. They swing when you hover the logo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={clsx('logo-mark', className)}>
      <path d="M20 1v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="4" y="5" width="32" height="4" rx="2" fill="currentColor" />
      <g className="logo-piece" style={{ transformOrigin: '9px 8px' }}>
        <path d="M9 8v8" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="9" cy="21" r="6" fill="rgb(var(--tomato))" />
      </g>
      <g className="logo-piece logo-piece-2" style={{ transformOrigin: '20px 8px' }}>
        <path d="M20 8v15" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 37a7 7 0 0 1 14 0z" transform="translate(0 -8)" fill="rgb(var(--cobalt))" />
        <path d="M13 29h14v3a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill="rgb(var(--cobalt))" />
      </g>
      <g className="logo-piece logo-piece-3" style={{ transformOrigin: '31px 8px' }}>
        <path d="M31 8v6" stroke="currentColor" strokeWidth="1.6" />
        <rect x="26" y="14" width="10" height="10" rx="3" fill="rgb(var(--mint))" />
      </g>
    </svg>
  )
}

export default function Logo({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <Link href="/" aria-label="Bebina Lista, početna" className={clsx('group inline-flex items-center gap-2 text-ink', className)}>
      <LogoMark className={size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'} />
      <span className={clsx('font-display font-extrabold tracking-[-0.04em]', size === 'lg' ? 'text-3xl' : 'text-[1.35rem]')}>bebina lista</span>
    </Link>
  )
}
