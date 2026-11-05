import Link from 'next/link'
import { LogoSymbol, Wordmark } from '@/components/Logo'
import { TOPIC_PAGES } from '@/lib/site'

export default function Footer() {
  return (
    <footer className="mt-10 rounded-t-5xl bg-coal px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-14 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <LogoSymbol className="h-12 w-12" />
              <Wordmark className="text-[2.2rem] text-white" />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold leading-tight">Mala lista za velike želje.</p>
            <p className="mt-2 max-w-sm text-lg font-medium leading-snug text-white/80">
              Listica želja za bebu i dječji rođendan. Pokloni se kupuju u dućanu, ovdje se ništa ne plaća.
            </p>
          </div>
          <nav aria-label="Stranice">
            <ul className="space-y-2.5 font-semibold">
              <li><Link href="/katalog" className="transition-colors hover:text-sun">Katalog</Link></li>
              <li><Link href="/pronadi-listu" className="transition-colors hover:text-sun">Pronađi Listicu</Link></li>
              <li><Link href="/blog" className="transition-colors hover:text-sun">Blog</Link></li>
              <li><Link href="/registracija" className="transition-colors hover:text-sun">Napravi Listicu</Link></li>
              <li><Link href="/prijava" className="transition-colors hover:text-sun">Prijava</Link></li>
            </ul>
          </nav>
          <nav aria-label="Teme i pravne informacije">
            <ul className="space-y-2.5 font-semibold">
              {TOPIC_PAGES.map(t => (
                <li key={t.href}><Link href={t.href} className="transition-colors hover:text-sun">{t.label}</Link></li>
              ))}
              <li className="pt-3"><Link href="/privatnost" className="transition-colors hover:text-sun">Politika privatnosti</Link></li>
              <li><Link href="/uvjeti" className="transition-colors hover:text-sun">Uvjeti korištenja</Link></li>
            </ul>
          </nav>
        </div>

        <p aria-hidden className="display mt-12 select-none overflow-hidden whitespace-nowrap text-[17.5vw] text-white/[0.09] lg:text-[11.5rem]">listica</p>

        <div className="mt-6 flex flex-col justify-between gap-2 border-t border-white/15 pt-5 text-[13px] text-white/65 sm:flex-row">
          <p>Babaroga, vl. Tvrtko Kračun · OIB: 72128351309 · Poljski put 16, Novalja</p>
          <p>© {new Date().getFullYear()} Listica</p>
        </div>
      </div>
    </footer>
  )
}
