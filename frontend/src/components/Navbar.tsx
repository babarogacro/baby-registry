'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { Heart, User, LogOut, Menu, X, Shield, Search } from 'lucide-react'
import clsx from 'clsx'

export default function Navbar() {
  const { user, logout, loadFromStorage } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    loadFromStorage()
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [loadFromStorage])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = () => { logout(); router.push('/') }
  const isActive = (href: string) => pathname === href

  const navLink = (href: string, label: string, icon?: React.ReactNode) => (
    <Link href={href} aria-current={isActive(href) ? 'page' : undefined} className={clsx('text-sm font-medium transition-colors flex items-center gap-1.5',
      isActive(href) ? 'text-rose' : 'text-warm-gray hover:text-charcoal')}>
      {icon}{label}
    </Link>
  )

  return (
    <nav className={clsx('fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-blush/40' : 'bg-cream/80 backdrop-blur-sm')}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🍼</span>
            <span className="font-serif text-xl text-charcoal">Bebina Lista</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-5">
            {navLink('/katalog', 'Katalog')}
            {navLink('/pronadi-listu', 'Pronađi listu', <Search size={13} />)}
            {user ? (
              <>
                {navLink('/moja-lista', 'Moja lista', <Heart size={13} />)}
                {user.role === 'ADMIN' && navLink('/admin', 'Admin', <Shield size={13} />)}
                <div className="flex items-center gap-3 ml-2 pl-3 border-l border-blush/40">
                  <Link href="/profil" className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-charcoal transition-colors">
                    <User size={13} /> {user.name.split(' ')[0]}
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-warm-gray hover:text-rose transition-colors">
                    <LogOut size={13} /> Odjava
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link href="/prijava" className="text-sm font-medium text-warm-gray hover:text-charcoal transition-colors">Prijava</Link>
                <Link href="/registracija" className="px-4 py-2 bg-rose text-white text-sm font-medium rounded-full hover:bg-rose/90 transition-colors">
                  Kreiraj listu
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-2 -mr-2 text-warm-gray" onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'} aria-expanded={menuOpen} aria-controls="mobile-menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="md:hidden bg-white border-t border-blush/40 px-4 py-4 space-y-1">
          {[
            { href: '/katalog', label: 'Katalog' },
            { href: '/pronadi-listu', label: '🔍 Pronađi listu' },
            ...(user ? [
              { href: '/moja-lista', label: '❤️ Moja lista' },
              ...(user.role === 'ADMIN' ? [{ href: '/admin', label: '🛡️ Admin panel' }] : []),
              { href: '/profil', label: '👤 Profil' },
            ] : [
              { href: '/prijava', label: 'Prijava' },
              { href: '/registracija', label: '🎀 Kreiraj listu' },
            ])
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="block text-sm font-medium text-charcoal py-2.5 px-2 rounded-xl hover:bg-cream transition-colors"
              onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          {user && (
            <button onClick={handleLogout} className="block w-full text-left text-sm font-medium text-rose py-2.5 px-2 rounded-xl hover:bg-rose/5 transition-colors">
              Odjava
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
