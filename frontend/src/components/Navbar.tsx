'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useAuthStore, leaveToHome } from '@/lib/store'
import { setTheme, useTheme } from '@/lib/theme'
import Logo from '@/components/Logo'
import { LogOut, Menu, Moon, Shield, Sun, X } from 'lucide-react'
import clsx from 'clsx'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const night = theme === 'night'
  return (
    <button onClick={toggle} className={clsx('icon-btn', className)} aria-pressed={night}
      aria-label={night ? 'Uključi svijetli prikaz' : 'Uključi tamni prikaz'} title={night ? 'Svijetli prikaz' : 'Tamni prikaz'}>
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={theme} initial={{ rotate: -50, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 50, opacity: 0, scale: 0.6, transition: { duration: 0.1 } }}>
          {night ? <Sun size={19} /> : <Moon size={19} />}
        </m.span>
      </AnimatePresence>
    </button>
  )
}

/** Between midnight and five, the app politely offers to stop blinding you. */
function NightShiftTip() {
  const { theme } = useTheme()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    let seen = true
    try { seen = !!sessionStorage.getItem('night-tip') } catch {}
    if (hour < 5 && !seen) setShow(true)
  }, [])

  const dismiss = () => {
    setShow(false)
    try { sessionStorage.setItem('night-tip', '1') } catch {}
  }

  return (
    <AnimatePresence>
      {show && theme !== 'night' && (
        <m.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="pointer-events-auto mx-auto mt-2 flex max-w-md items-center gap-3 rounded-3xl bg-coal px-4 py-3 text-sm text-white shadow-lift">
          <Moon size={18} className="flex-shrink-0 text-sun" aria-hidden />
          <p className="flex-1">Kasno je. Da prigušimo ekran?</p>
          <button onClick={() => { setTheme('night'); dismiss() }} className="rounded-full bg-sun px-3 py-1.5 text-[13px] font-bold text-coal">Može</button>
          <button onClick={dismiss} aria-label="Ne treba" className="p-1 opacity-70 hover:opacity-100"><X size={16} /></button>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export default function Navbar() {
  const { user, logout, loadFromStorage } = useAuthStore()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    loadFromStorage()
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [loadFromStorage])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const handleLogout = () => { leaveToHome(); logout() }

  const links = [
    { href: '/katalog', label: 'Katalog' },
    { href: '/pronadi-listu', label: 'Pronađi listu' },
    { href: '/blog', label: 'Blog' },
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const mobileLinks = [
    ...links,
    ...(user ? [{ href: '/moja-lista', label: 'Moja lista' }, { href: '/profil', label: 'Profil' }] : [{ href: '/prijava', label: 'Prijava' }, { href: '/registracija', label: 'Napravi listu' }]),
  ]

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-nav px-3 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-5">
        <nav aria-label="Glavna navigacija"
          className={clsx('pointer-events-auto mx-auto flex h-[60px] max-w-6xl items-center justify-between gap-2 rounded-full bg-surface/90 pl-4 pr-2 backdrop-blur-md transition-shadow duration-300 sm:pl-5',
            scrolled ? 'shadow-float' : 'shadow-none')}>
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            {links.map(link => {
              const active = pathname === link.href
              return (
                <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined}
                  className={clsx('relative rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors', active ? 'text-ink' : 'text-muted hover:text-ink')}>
                  {active && <m.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-line/[0.08]" />}
                  <span className="relative flex items-center gap-1.5">
                    {link.href === '/admin' && <Shield size={14} aria-hidden />}
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <div className="hidden items-center gap-1 md:flex">
                <Link href="/profil" aria-label="Moj profil" title={user.name}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-bubble font-display text-[15px] font-extrabold text-coal transition-transform duration-200 hover:scale-105">
                  {user.name.charAt(0).toUpperCase()}
                </Link>
                <button onClick={handleLogout} aria-label="Odjava" title="Odjava" className="icon-btn text-muted"><LogOut size={18} /></button>
                <Link href="/moja-lista" className="btn btn-sm btn-ink ml-1">Moja lista</Link>
              </div>
            ) : (
              <div className="hidden items-center gap-1 md:flex">
                <Link href="/prijava" className="rounded-full px-4 py-2.5 text-[15px] font-semibold text-muted transition-colors hover:text-ink">Prijava</Link>
                <Link href="/registracija" className="btn btn-sm btn-ink">Napravi listu</Link>
              </div>
            )}
            <button className="icon-btn md:hidden" onClick={() => setMenuOpen(true)} aria-label="Otvori izbornik" aria-expanded={menuOpen} aria-controls="mobile-menu">
              <Menu size={22} />
            </button>
          </div>
        </nav>
        <NightShiftTip />
      </header>

      <AnimatePresence>
        {menuOpen && (
          <m.div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Izbornik"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed inset-0 z-modal flex flex-col overflow-y-auto bg-coal px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-white md:hidden">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-extrabold tracking-tight">bebina lista</span>
              <button autoFocus onClick={() => setMenuOpen(false)} aria-label="Zatvori izbornik" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X size={22} /></button>
            </div>
            <m.ul className="mt-10 flex-1 space-y-1" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
              {mobileLinks.map(link => (
                <m.li key={link.href} variants={{ hidden: { opacity: 0, x: -18 }, show: { opacity: 1, x: 0 } }}>
                  <Link href={link.href} onClick={() => setMenuOpen(false)} aria-current={pathname === link.href ? 'page' : undefined}
                    className={clsx('display block py-2 text-[2.6rem]', pathname === link.href && 'text-sun')}>
                    {link.label}
                  </Link>
                </m.li>
              ))}
            </m.ul>
            {user && (
              <button onClick={handleLogout} className="mt-8 flex min-h-[48px] items-center gap-2 self-start rounded-full bg-white/10 px-5 font-semibold">
                <LogOut size={18} aria-hidden /> Odjava
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
