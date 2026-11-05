'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'motion/react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Modal from '@/components/Modal'
import Segmented from '@/components/Segmented'
import { Toast, useToast } from '@/components/Toast'
import { adminApi, productsApi, apiError } from '@/lib/api'
import { formatPrice, plural } from '@/lib/format'
import { useAuthStore } from '@/lib/store'
import { Product, AdminUser, CategoryMapping, Category } from '@/types'
import { ArrowRight, BarChart3, FolderTree, Gift, LineChart, ListChecks, Newspaper, Package, RefreshCw, Search, Settings, Shield, Star, Trash2, Users } from 'lucide-react'
import StatsPanel from './StatsPanel'
import BlogAdmin from './BlogAdmin'
import clsx from 'clsx'

type Tab = 'overview' | 'stats' | 'users' | 'blog' | 'scraper' | 'featured' | 'categories' | 'settings'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Pregled', icon: <BarChart3 size={16} /> },
  { key: 'stats', label: 'Statistike', icon: <LineChart size={16} /> },
  { key: 'users', label: 'Korisnici', icon: <Users size={16} /> },
  { key: 'blog', label: 'Blog', icon: <Newspaper size={16} /> },
  { key: 'scraper', label: 'Scraper', icon: <RefreshCw size={16} /> },
  { key: 'featured', label: 'Istaknuti', icon: <Star size={16} /> },
  { key: 'categories', label: 'Kategorije', icon: <FolderTree size={16} /> },
  { key: 'settings', label: 'Postavke', icon: <Settings size={16} /> },
]

interface Shop {
  id: string; name: string; slug: string; isActive: boolean
  lastStatus?: string; lastRun?: string; productsCount?: number; errorMsg?: string; isRunning?: boolean
}

interface UserDetail {
  id: string; name: string; email: string
  lists: { id: string; name: string; shareSlug: string; _count?: { items: number }; items: { reservation?: { status: string } | null }[] }[]
}

function UserCard({ u, onOpen, onToggleRole, onDelete, isSelf }: { u: AdminUser; onOpen: () => void; onToggleRole?: () => void; onDelete?: () => void; isSelf: boolean }) {
  return (
    <li className="card p-4 flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 bg-bubble rounded-full flex items-center justify-center flex-shrink-0" aria-hidden>
        <span className="text-sm font-medium text-tomato-ink">{u.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-ink">{u.name}</p>
          {u.role === 'ADMIN' && <span className="px-2 py-0.5 bg-tomato-soft text-tomato-ink text-xs rounded-full font-medium">Admin</span>}
        </div>
        <p className="text-sm text-muted break-all">{u.email}</p>
        <p className="text-xs text-muted mt-0.5">{u._count.lists} {plural(u._count.lists, 'Listica', 'Listice', 'Listica')} · registriran {new Date(u.createdAt).toLocaleDateString('hr-HR')}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onOpen} className="px-3 py-1.5 text-xs font-medium bg-mint-soft text-mint-ink rounded-full hover:bg-mint-soft transition-colors">Vidi Listice</button>
        {onToggleRole && !isSelf && (
          <button onClick={onToggleRole}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              u.role === 'ADMIN' ? 'bg-tomato-soft text-tomato-ink hover:bg-tomato-soft' : 'bg-sunken text-muted hover:text-ink')}>
            <Shield size={12} /> {u.role === 'ADMIN' ? 'Ukloni admin' : 'Postavi admin'}
          </button>
        )}
        {onDelete && !isSelf && (
          <button onClick={onDelete} aria-label={`Obriši korisnika ${u.name}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sunken text-muted hover:bg-tomato-soft hover:text-tomato-ink transition-colors">
            <Trash2 size={12} aria-hidden /> Obriši
          </button>
        )}
      </div>
    </li>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isLoading, sessionVerified, loadFromStorage } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const [tab, setTab] = useState<Tab>('overview')
  const { toast, showToast } = useToast()

  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [featured, setFeatured] = useState<{ id: string; productId: string; product?: Product }[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [heroUrl, setHeroUrl] = useState('')
  const [heroSaving, setHeroSaving] = useState(false)

  const [mappings, setMappings] = useState<CategoryMapping[]>([])
  const [unmapped, setUnmapped] = useState<{ externalName: string; shopSlug: string; count: number }[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [newMapping, setNewMapping] = useState({ externalName: '', shopSlug: '', categoryId: '' })
  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace('/prijava?next=/admin')
    else if (!isAdmin && sessionVerified) router.replace('/')
  }, [user, isAdmin, isLoading, sessionVerified, router])

  const loadShops = useCallback(() => adminApi.getShops().then(r => setShops(r.data)).catch(() => {}), [])

  useEffect(() => {
    if (!isAdmin) return
    adminApi.getStats().then(r => setStats(r.data)).catch(() => {})
    adminApi.getUsers({ page: 1 }).then(r => setRecentUsers(r.data.users || [])).catch(() => {})
    adminApi.getFeatured().then(r => setFeatured(r.data)).catch(() => {})
    adminApi.getSettings().then(r => { setSettings(r.data); setHeroUrl(r.data.heroImage || '') }).catch(() => {})
    loadShops()
  }, [isAdmin, loadShops])

  useEffect(() => {
    if (!isAdmin || tab !== 'users') return
    const t = setTimeout(() => {
      adminApi.getUsers({ page: userPage, q: userSearch || undefined })
        .then(r => { setUsers(r.data.users); setUsersTotal(r.data.total) }).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [isAdmin, tab, userPage, userSearch])

  useEffect(() => {
    if (!isAdmin || tab !== 'featured') return
    const t = setTimeout(() => {
      productsApi.getAll({ q: productSearch || undefined, limit: 12 }).then(r => setProducts(r.data.products)).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [isAdmin, tab, productSearch])

  useEffect(() => {
    if (!isAdmin || tab !== 'categories') return
    adminApi.getCategoryMappings().then(r => setMappings(r.data)).catch(() => {})
    adminApi.getUnmappedCategories().then(r => setUnmapped(r.data)).catch(() => {})
    adminApi.getCategories().then(r => setAllCategories(r.data)).catch(() => {})
  }, [isAdmin, tab])

  // While any scraper is running, refresh its status every few seconds.
  useEffect(() => {
    if (!shops.some(s => s.isRunning)) return
    const t = setInterval(loadShops, 5000)
    return () => clearInterval(t)
  }, [shops, loadShops])

  const attempt = async (fn: () => Promise<unknown>, success?: string) => {
    try { await fn(); if (success) showToast(success) } catch (err) { showToast(apiError(err)) }
  }

  const handleScrape = (slug: string) => attempt(async () => {
    await adminApi.triggerScrape(slug)
    setShops(prev => prev.map(s => s.slug === slug ? { ...s, isRunning: true, lastStatus: 'running' } : s))
  }, 'Scraping pokrenut, traje nekoliko minuta.')

  const handleToggleShop = (slug: string) => attempt(async () => {
    const { data } = await adminApi.toggleShop(slug)
    setShops(prev => prev.map(s => s.slug === slug ? { ...s, ...data } : s))
    showToast(data.isActive ? `${data.name} uključen, proizvodi su vidljivi u katalogu` : `${data.name} isključen, proizvodi su skriveni iz kataloga`)
  })

  const handleToggleFeatured = (product: Product) => attempt(async () => {
    const existing = featured.find(f => f.productId === product.id)
    if (existing) {
      await adminApi.removeFeatured(existing.id)
      setFeatured(f => f.filter(x => x.id !== existing.id))
      showToast('Uklonjeno iz istaknutih')
    } else {
      const res = await adminApi.addFeatured(product.id)
      setFeatured(f => [...f, res.data])
      showToast('Dodano u istaknute')
    }
  })

  const handleRoleToggle = (u: AdminUser) => attempt(async () => {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
    await adminApi.setUserRole(u.id, newRole)
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    showToast(`${u.name} je sada ${newRole === 'ADMIN' ? 'administrator' : 'obični korisnik'}`)
  })

  const openUser = (id: string) => attempt(async () => setUserDetail((await adminApi.getUser(id)).data))

  const confirmDeleteUser = async () => {
    if (!deletingUser) return
    const target = deletingUser
    setDeleteBusy(true)
    await attempt(async () => {
      await adminApi.deleteUser(target.id)
      setUsers(prev => prev.filter(x => x.id !== target.id))
      setRecentUsers(prev => prev.filter(x => x.id !== target.id))
      setUsersTotal(t => Math.max(0, t - 1))
      setDeletingUser(null)
    }, `Korisnik ${target.name} je obrisan`)
    setDeleteBusy(false)
  }

  const createMapping = (data: { externalName: string; shopSlug?: string; categoryId: string }) => attempt(async () => {
    const res = await adminApi.createCategoryMapping(data)
    setMappings(prev => [...prev, res.data])
    setUnmapped(prev => prev.filter(u => u.externalName !== data.externalName || u.shopSlug !== (data.shopSlug || '')))
  }, 'Mapiranje dodano.')

  const saveSetting = (key: string, value: string, success = 'Spremljeno.') => attempt(async () => {
    await adminApi.setSetting(key, value)
    setSettings(prev => ({ ...prev, [key]: value }))
  }, success)

  if (isLoading || !isAdmin) return null

  const categoryOptions = allCategories.map(c => (
    <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ''}{c.name}</option>
  ))

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in min-h-screen px-4 pb-16 pt-[92px]">
        <div className="max-w-6xl mx-auto">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="display text-[2.9rem] sm:text-6xl">Admin</h1>
              
            </div>
            
          </div>

          <Segmented className="mb-8 w-fit" label="Odjeljak" value={tab} onChange={setTab}
            options={TABS.map(t => ({ value: t.key, label: <span className="flex items-center gap-2"><span aria-hidden>{t.icon}</span> {t.label}</span> }))} />

          {tab === 'overview' && (
            <div className="space-y-6">
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: <Users size={22} />, tone: 'tone-bubble', label: 'Korisnici', value: stats.usersCount },
                    { icon: <ListChecks size={22} />, tone: 'tone-sun', label: 'Listice', value: stats.listsCount },
                    { icon: <Package size={22} />, tone: 'tone-sky', label: 'Proizvodi', value: stats.productsCount },
                    { icon: <Gift size={22} />, tone: 'tone-mint', label: 'Rezervacije', value: stats.reservationsCount },
                  ].map(card => (
                    <div key={card.label} className={clsx(card.tone, 'rounded-3xl bg-tone p-5 text-on-tone')}>
                      <div className="mb-2" aria-hidden>{card.icon}</div>
                      <p className="display text-4xl tabular-nums">{card.value?.toLocaleString('hr-HR')}</p>
                      <p className="mt-1 text-sm font-semibold">{card.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="card p-5">
                <h2 className="font-display font-extrabold text-xl text-ink mb-4">Zadnji korisnici</h2>
                <ul className="space-y-3">
                  {recentUsers.slice(0, 10).map(u => <UserCard key={u.id} u={u} isSelf={u.id === user.id} onOpen={() => openUser(u.id)} />)}
                </ul>
              </div>
            </div>
          )}

          {tab === 'stats' && <StatsPanel />}
          {tab === 'blog' && <BlogAdmin notify={showToast} />}

          {tab === 'users' && (
            <div>
              <div className="flex gap-3 mb-5 items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                  <input type="search" aria-label="Pretraži korisnike" placeholder="Pretraži po imenu ili emailu..." value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
                    className="w-full pl-9 pr-4 py-2.5 bg-surface border border-line/15 rounded-xl text-sm focus:outline-none focus:border-[rgb(var(--focus))]" />
                </div>
                <span className="text-sm text-muted">{usersTotal} {plural(usersTotal, 'korisnik', 'korisnika', 'korisnika')}</span>
              </div>
              <ul className="space-y-3">
                {users.map(u => (
                  <UserCard key={u.id} u={u} isSelf={u.id === user.id} onOpen={() => openUser(u.id)} onToggleRole={() => handleRoleToggle(u)} onDelete={() => setDeletingUser(u)} />
                ))}
              </ul>
              {usersTotal > 20 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}
                    className="px-4 py-2 border border-line/15 rounded-full text-sm disabled:opacity-40">Prethodna</button>
                  <span className="px-4 py-2 text-sm text-muted">Str. {userPage} od {Math.ceil(usersTotal / 20)}</span>
                  <button onClick={() => setUserPage(p => p + 1)} disabled={userPage * 20 >= usersTotal}
                    className="px-4 py-2 border border-line/15 rounded-full text-sm disabled:opacity-40">Sljedeća</button>
                </div>
              )}
            </div>
          )}

          {tab === 'scraper' && (
            <div className="space-y-4">
              {shops.map(shop => (
                <div key={shop.id} className={clsx('bg-surface rounded-2xl border p-5 transition-all', shop.isActive ? 'border-line/10' : 'border-line/15 opacity-70')}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-2.5 h-2.5 rounded-full',
                        shop.isRunning ? 'bg-sun animate-pulse' : shop.lastStatus === 'success' ? 'bg-mint' : shop.lastStatus === 'error' ? 'bg-tomato' : 'bg-line/20')} aria-hidden />
                      <div>
                        <h3 className="font-medium text-ink">{shop.name}</h3>
                        <p className="text-xs text-muted">
                          {shop.productsCount?.toLocaleString('hr-HR')} proizvoda ·{' '}
                          {shop.isRunning || shop.lastStatus === 'running' ? 'upravo radi...' : shop.lastStatus === 'success' ? 'uspješno' : shop.lastStatus === 'error' ? 'greška' : 'nije pokrenut'}
                          {shop.lastRun && ` · ${new Date(shop.lastRun).toLocaleString('hr-HR')}`}
                        </p>
                        {shop.errorMsg && <p className="text-xs text-tomato-ink mt-0.5">{shop.errorMsg}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button role="switch" aria-checked={shop.isActive} aria-label={`Prikaz proizvoda: ${shop.name}`} onClick={() => handleToggleShop(shop.slug)} className="switch"><span /></button>
                      <span className="text-xs text-muted w-8">{shop.isActive ? 'ON' : 'OFF'}</span>
                      <button onClick={() => handleScrape(shop.slug)} disabled={shop.isRunning}
                        className="flex items-center gap-2 px-4 py-2 bg-mint-soft text-mint-ink text-sm font-medium rounded-full hover:bg-mint-soft transition-colors disabled:opacity-50">
                        <RefreshCw size={14} className={shop.isRunning ? 'animate-spin' : ''} />
                        {shop.isRunning ? 'Radi...' : 'Pokreni scraper'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <p className="p-4 bg-sunken rounded-2xl text-sm text-muted">
                Scraperi automatski rade svake noći (Baby Center u <strong>02:00</strong>, Svijet Beba u <strong>03:00</strong>).
                Kad je shop isključen, njegovi proizvodi se ne prikazuju u katalogu.
              </p>
            </div>
          )}

          {tab === 'featured' && (
            <div>
              <h2 className="font-display font-extrabold text-xl text-ink mb-6">Istaknuti proizvodi ({featured.length}/12)</h2>
              {featured.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Trenutno istaknuti</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {featured.map(f => (
                      <div key={f.id} className="bg-surface rounded-2xl border border-sun p-3 relative">
                        <button aria-label="Ukloni iz istaknutih"
                          onClick={() => attempt(async () => { await adminApi.removeFeatured(f.id); setFeatured(prev => prev.filter(x => x.id !== f.id)) }, 'Uklonjeno')}
                          className="absolute top-2 right-2 p-1 bg-tomato-soft text-tomato-ink rounded-full hover:bg-tomato-soft">
                          <Trash2 size={12} />
                        </button>
                        {f.product?.imageUrl && <img src={f.product.imageUrl} alt="" className="w-full h-24 object-contain mb-2" />}
                        <p className="text-xs font-medium text-ink line-clamp-2">{f.product?.name}</p>
                        {f.product && <p className="text-xs text-tomato-ink mt-0.5">{formatPrice(f.product.price, f.product.currency)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <h3 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Dodaj proizvod</h3>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
                <input type="search" aria-label="Pretraži proizvode" placeholder="Pretraži proizvode..." value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-surface border border-line/15 rounded-xl text-sm focus:outline-none focus:border-[rgb(var(--focus))]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map(product => {
                  const isFeatured = featured.some(f => f.productId === product.id)
                  return (
                    <button key={product.id} onClick={() => handleToggleFeatured(product)} aria-pressed={isFeatured}
                      className={clsx('bg-surface rounded-2xl border p-3 text-left transition-all hover:shadow-md', isFeatured ? 'border-sun bg-sun-soft' : 'border-line/10')}>
                      {product.imageUrl && <img src={product.imageUrl} alt="" className="w-full h-20 object-contain mb-2" />}
                      <p className="text-xs font-medium text-ink line-clamp-2">{product.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-tomato-ink">{formatPrice(product.price, product.currency)}</p>
                        <span className={clsx('text-xs', isFeatured ? 'text-sun-ink' : 'text-muted')}>{isFeatured ? <Star size={14} className="fill-current" aria-label="Istaknuto" /> : '+'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'categories' && (
            <div className="space-y-6">
              {unmapped.length > 0 && (
                <div className="card p-5">
                  <h2 className="font-display font-extrabold text-xl text-ink mb-2">Nemapirane kategorije ({unmapped.length})</h2>
                  <p className="text-sm text-muted mb-4">Ove kategorije iz shopova još nemaju mapiranje na našu kategoriju.</p>
                  <ul className="space-y-3">
                    {unmapped.slice(0, 20).map(u => (
                      <li key={`${u.externalName}-${u.shopSlug}`} className="flex items-center gap-3 p-3 border border-line/10 rounded-xl flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{u.externalName}</p>
                          <p className="text-xs text-muted">{u.shopSlug} · {u.count} proizvoda</p>
                        </div>
                        <ArrowRight size={14} className="text-muted" aria-hidden />
                        <select aria-label={`Mapiraj ${u.externalName}`} defaultValue=""
                          onChange={e => { if (e.target.value) createMapping({ externalName: u.externalName, shopSlug: u.shopSlug || undefined, categoryId: e.target.value }) }}
                          className="px-3 py-1.5 bg-sunken border border-line/15 rounded-lg text-xs focus:outline-none min-w-[180px]">
                          <option value="" disabled>Odaberi kategoriju...</option>
                          {categoryOptions}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card p-5">
                <h2 className="font-display font-extrabold text-xl text-ink mb-4">Postojeća mapiranja ({mappings.length})</h2>
                <form className="flex items-end gap-2 mb-4 flex-wrap"
                  onSubmit={e => {
                    e.preventDefault()
                    if (!newMapping.externalName || !newMapping.categoryId) return
                    createMapping({ externalName: newMapping.externalName, shopSlug: newMapping.shopSlug || undefined, categoryId: newMapping.categoryId })
                      .then(() => setNewMapping({ externalName: '', shopSlug: '', categoryId: '' }))
                  }}>
                  <div className="flex-1 min-w-[150px]">
                    <label htmlFor="map-ext" className="text-xs text-muted uppercase tracking-wide block mb-1">Eksterni naziv</label>
                    <input id="map-ext" type="text" placeholder="npr. Kolica" value={newMapping.externalName}
                      onChange={e => setNewMapping(p => ({ ...p, externalName: e.target.value }))}
                      className="w-full px-3 py-2 bg-sunken border border-line/15 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="min-w-[120px]">
                    <label htmlFor="map-shop" className="text-xs text-muted uppercase tracking-wide block mb-1">Shop (opcionalno)</label>
                    <input id="map-shop" type="text" placeholder="babycenter" value={newMapping.shopSlug}
                      onChange={e => setNewMapping(p => ({ ...p, shopSlug: e.target.value }))}
                      className="w-full px-3 py-2 bg-sunken border border-line/15 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="min-w-[180px]">
                    <label htmlFor="map-cat" className="text-xs text-muted uppercase tracking-wide block mb-1">Naša kategorija</label>
                    <select id="map-cat" value={newMapping.categoryId} onChange={e => setNewMapping(p => ({ ...p, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 bg-sunken border border-line/15 rounded-lg text-sm focus:outline-none">
                      <option value="">Odaberi...</option>
                      {categoryOptions}
                    </select>
                  </div>
                  <button type="submit" disabled={!newMapping.externalName || !newMapping.categoryId}
                    className="px-4 py-2 bg-mint text-coal text-sm font-medium rounded-lg hover:bg-mint/90 disabled:opacity-50 transition-colors">
                    Dodaj
                  </button>
                </form>

                {mappings.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">Nema mapiranja. Dodaj prvo mapiranje iznad.</p>
                ) : (
                  <ul className="space-y-2">
                    {mappings.map(m => (
                      <li key={m.id} className="flex items-center gap-3 p-3 border border-line/10 rounded-xl">
                        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-medium text-ink">{m.externalName}</span>
                          {m.shopSlug && <span className="text-xs px-1.5 py-0.5 bg-sunken rounded text-muted">{m.shopSlug}</span>}
                          <ArrowRight size={12} className="text-muted" aria-hidden />
                          <span className="text-mint-ink font-medium">{m.category?.name || m.categoryId}</span>
                        </div>
                        <button aria-label="Obriši mapiranje"
                          onClick={() => attempt(async () => { await adminApi.deleteCategoryMapping(m.id); setMappings(prev => prev.filter(x => x.id !== m.id)) }, 'Mapiranje uklonjeno')}
                          className="p-1.5 text-muted hover:text-tomato-ink transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <div className="card p-6">
                <h2 className="font-display font-extrabold text-xl text-ink mb-4">Hero slika na početnoj</h2>
                <div className="space-y-3">
                  <input type="url" aria-label="URL hero slike" placeholder="https://..." value={heroUrl} onChange={e => setHeroUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-sunken border border-line/15 rounded-xl text-sm focus:outline-none focus:border-[rgb(var(--focus))]" />
                  {heroUrl && (
                    <div className="rounded-xl overflow-hidden border border-line/10 h-40">
                      <img src={heroUrl} alt="Pregled hero slike" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                  <button onClick={async () => { setHeroSaving(true); await saveSetting('heroImage', heroUrl.trim(), 'Hero slika spremljena (vidljiva za do 5 min)'); setHeroSaving(false) }}
                    disabled={heroSaving} className="btn btn-sm btn-primary">
                    {heroSaving ? 'Spremam...' : 'Spremi hero sliku'}
                  </button>
                </div>
              </div>
              <div className="card p-6">
                <h2 className="font-display font-extrabold text-xl text-ink mb-4">Opće postavke</h2>
                {[
                  { key: 'siteName', label: 'Naziv stranice', placeholder: 'Listica' },
                  { key: 'contactEmail', label: 'Kontakt email', placeholder: 'info@listica.hr' },
                ].map(s => (
                  <div key={s.key} className="mb-4">
                    <label htmlFor={`setting-${s.key}`} className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">{s.label}</label>
                    <input id={`setting-${s.key}`} type="text" placeholder={s.placeholder} defaultValue={settings[s.key] || ''} key={settings[s.key] || s.key}
                      onBlur={e => { if (e.target.value !== (settings[s.key] || '')) saveSetting(s.key, e.target.value.trim()) }}
                      className="w-full px-4 py-2.5 bg-sunken border border-line/15 rounded-xl text-sm focus:outline-none focus:border-[rgb(var(--focus))]" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <AnimatePresence>
      {userDetail && (
        <Modal key="user" title={`Listice: ${userDetail.name}`} onClose={() => setUserDetail(null)} wide>
          <div className="px-5 sm:px-6 pb-6">
            <p className="text-sm text-muted mb-4 break-all">{userDetail.email}</p>
            {userDetail.lists.length === 0 ? (
              <p className="text-muted text-sm text-center py-8">Korisnik nema Listica.</p>
            ) : (
              <ul className="space-y-3">
                {userDetail.lists.map(list => {
                  const reserved = list.items.filter(i => i.reservation).length
                  return (
                    <li key={list.id}>
                      <a href={`/lista/${list.shareSlug}`} target="_blank" rel="noopener noreferrer"
                        className="block p-4 border border-line/10 rounded-2xl hover:border-line/30 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-ink">{list.name}</p>
                            <p className="text-xs text-muted mt-0.5">{list._count?.items ?? list.items.length} {plural(list._count?.items ?? list.items.length, 'stavka', 'stavke', 'stavki')}{reserved > 0 && ` · ${reserved} rezervirano`}</p>
                          </div>
                          <span className="text-xs text-tomato-ink">/lista/{list.shareSlug.slice(0, 8)}…</span>
                        </div>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Modal>
      )}
      {deletingUser && (
        <Modal key="delete-user" title="Obrisati korisnika?" onClose={() => !deleteBusy && setDeletingUser(null)}>
          <div className="px-5 pb-6 sm:px-6">
            <p className="font-semibold text-ink">{deletingUser.name}</p>
            <p className="mb-4 break-all text-sm text-muted">{deletingUser.email}</p>
            <p className="mb-5 rounded-2xl bg-tomato-soft p-3 text-sm font-medium text-tomato-ink">
              {deletingUser._count.lists > 0
                ? `Brišu se i Listice ovog korisnika (${deletingUser._count.lists}), sa stavkama i rezervacijama gostiju. `
                : 'Korisnik nema nijednu Listicu. '}
              Ovo se ne može poništiti.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={confirmDeleteUser} disabled={deleteBusy} className="btn btn-sm btn-danger">
                <Trash2 size={15} aria-hidden /> {deleteBusy ? 'Brišem...' : 'Obriši korisnika'}
              </button>
              <button onClick={() => setDeletingUser(null)} disabled={deleteBusy} className="btn btn-sm btn-soft">Odustani</button>
            </div>
          </div>
        </Modal>
      )}
      </AnimatePresence>

      <Toast message={toast} />
    </>
  )
}
