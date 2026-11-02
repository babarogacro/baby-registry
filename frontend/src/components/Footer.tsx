import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-blush/30 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span aria-hidden>🍼</span>
            <span className="font-serif text-charcoal">Bebina Lista</span>
          </div>
          <p className="text-xs text-warm-gray">© {new Date().getFullYear()} Bebina Lista. Napravljeno s ljubavlju. 💕</p>
        </div>
        <div className="mt-4 pt-4 border-t border-blush/20 flex flex-col sm:flex-row justify-between items-center gap-2 text-center">
          <p className="text-xs text-warm-gray/70">
            Babaroga, vl. Tvrtko Kračun · OIB: 72128351309 · Poljski put 16, Novalja
          </p>
          <div className="flex items-center gap-3 text-xs text-warm-gray/70">
            <Link href="/privatnost" className="hover:text-warm-gray transition-colors">Politika privatnosti</Link>
            <span aria-hidden>·</span>
            <Link href="/uvjeti" className="hover:text-warm-gray transition-colors">Uvjeti korištenja</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
