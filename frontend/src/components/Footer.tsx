import Link from 'next/link'
import { LogoMark } from '@/components/Logo'

export default function Footer() {
  return (
    <footer className="mt-10 rounded-t-5xl bg-coal px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-14 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <LogoMark className="h-14 w-14" />
            <p className="mt-4 max-w-sm text-lg font-medium leading-snug text-white/85">
              Lista želja za bebu i dječji rođendan. Pokloni se kupuju u dućanu, ovdje se ništa ne plaća.
            </p>
          </div>
          <nav aria-label="Stranice">
            <ul className="space-y-2.5 font-semibold">
              <li><Link href="/katalog" className="transition-colors hover:text-sun">Katalog</Link></li>
              <li><Link href="/pronadi-listu" className="transition-colors hover:text-sun">Pronađi listu</Link></li>
              <li><Link href="/blog" className="transition-colors hover:text-sun">Blog</Link></li>
              <li><Link href="/registracija" className="transition-colors hover:text-sun">Napravi listu</Link></li>
              <li><Link href="/prijava" className="transition-colors hover:text-sun">Prijava</Link></li>
            </ul>
          </nav>
          <nav aria-label="Pravne informacije">
            <ul className="space-y-2.5 font-semibold">
              <li><Link href="/privatnost" className="transition-colors hover:text-sun">Politika privatnosti</Link></li>
              <li><Link href="/uvjeti" className="transition-colors hover:text-sun">Uvjeti korištenja</Link></li>
            </ul>
          </nav>
        </div>

        <p aria-hidden className="display mt-12 select-none overflow-hidden whitespace-nowrap text-[17.5vw] text-white/[0.09] lg:text-[11.5rem]">bebina lista</p>

        <div className="mt-6 flex flex-col justify-between gap-2 border-t border-white/15 pt-5 text-[13px] text-white/65 sm:flex-row">
          <p>Babaroga, vl. Tvrtko Kračun · OIB: 72128351309 · Poljski put 16, Novalja</p>
          <p>© {new Date().getFullYear()} Bebina Lista</p>
        </div>
      </div>
    </footer>
  )
}
