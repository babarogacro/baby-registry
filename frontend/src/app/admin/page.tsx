'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Modal from '@/components/Modal'
import { Toast, useToast } from '@/components/Toast'
import { adminApi, productsApi, apiError } from '@/lib/api'
import { formatPrice, plural } from '@/lib/format'
import { useAuthStore } from '@/lib/store'
import { Product, AdminUser, CategoryMapping, Category } from '@/types'
import { RefreshCw, Search, Shield, ArrowRight, Trash2 } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'overview' | 'users' | 'scraper' | 'featured' | 'categories' | 'settings'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Pregled', icon: '📊' },
  { key: 'users', label: 'Korisnici', icon: '👥' },
  { key: 'scraper', label: 'Scraper', icon: '🕷️' },
  { key: 'featured', label: 'Istaknuti', icon: '⭐' },
  { key: 'categories', label: 'Kategorije', icon: '📁' },
  { key: 'settings', label: 'Postavke', icon: '⚙️' },
]

interface Shop {
  id: string; name: string; slug: string; isActive: boolean
  lastStatus?: string; lastRun?: string; productsCount?: number; errorMsg?: string; isRunning?: boolean
}

interface UserDetail {
  id: string; name: string; email: string
  lists: { id: string; name: string; shareSlug: string; _count?: { items: number }; items: { reservation?: { status: string } | null }[] }[]
}

function UserCard({ u, onOpen, onToggleRole, isSelf }: { u: AdminUser; onOpen: () => void; onToggleRole?: () => void; isSelf: boolean }) {
  return (
    <li className="bg-white rounded-2xl border border-blush/30 p-4 flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 bg-blush/40 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden>
        <span className="text-sm font-medium text-rose">{u.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-charcoal">{u.name}</p>
          {u.role === 'ADMIN' && <span className="px-2 py-0.5 bg-rose/10 text-rose text-xs rounded-full font-medium">Admin</span>}
        </div>
        <p className="text-sm text-warm-gray break-all">{u.email}</p>
        <p className="text-xs text-warm-gray/70 mt-0.5">{u._count.lists} {plural(u._count.lists, 'lista', 'liste', 'lista')} · registriran {new Date(u.createdAt).toLocaleDateString('hr-HR')}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onOpen} className="px-3 py-1.5 text-xs font-medium bg-sage-light/60 text-sage rounded-full hover:bg-sage-light transition-colors">Vidi liste</button>
        {onToggleRole && !isSelf && (
          <button onClick={onToggleRole}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              u.role === 'ADMIN' ? 'bg-rose/10 text-rose hover:bg-rose/20' : 'bg-cream text-warm-gray hover:text-charcoal')}>
            <Shield size={12} /> {u.role === 'ADMIN' ? 'Ukloni admin' : 'Postavi admin'}
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
  }, 'Scraping pokrenut — traje nekoliko minuta.')

  const handleToggleShop = (slug: string) => attempt(async () => {
    const { data } = await adminApi.toggleShop(slug)
    setShops(prev => prev.map(s => s.slug === slug ? { ...s, ...data } : s))
    showToast(data.isActive ? `${data.name} uključen — proizvodi su vidljivi u katalogu` : `${data.name} isključen — proizvodi su skriveni iz kataloga`)
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
      showToast('Dodano u istaknute ⭐')
    }
  })

  const handleRoleToggle = (u: AdminUser) => attempt(async () => {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
    await adminApi.setUserRole(u.id, newRole)
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    showToast(`${u.name} je sada ${newRole === 'ADMIN' ? 'administrator' : 'obični korisnik'}`)
  })

  const openUser = (id: string) => attempt(async () => setUserDetail((await adminApi.getUser(id)).data))

  const createMapping = (data: { externalName: string; shopSlug?: string; categoryId: string }) => attempt(async () => {
    const res = await adminApi.createCategoryMapping(data)
    setMappings(prev => [...prev, res.data])
    setUnmapped(prev => prev.filter(u => u.externalName !== data.externalName || u.shopSlug !== (data.shopSlug || '')))
  }, 'Mapiranje dodano!')

  const saveSetting = (key: string, value: string, success = 'Spremljeno!') => attempt(async () => {
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
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl text-charcoal">Admin panel</h1>
              <p className="text-warm-gray text-sm mt-1">Upravljanje Bebinom Listom</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose/10 text-rose rounded-full text-sm"><Shield size={14} /> Admin</div>
          </div>

          <div className="flex gap-1 bg-white rounded-2xl p-1 border border-blush/30 mb-8 overflow-x-auto" role="tablist">
            {TABS.map(t => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
                  tab === t.key ? 'bg-rose text-white' : 'text-warm-gray hover:text-charcoal')}>
                <span aria-hidden>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="space-y-6">
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: '👥', label: 'Korisnici', value: stats.usersCount },
                    { icon: '📋', label: 'Liste', value: stats.listsCount },
                    { icon: '📦', label: 'Proizvodi', value: stats.productsCount },
                    { icon: '🎁', label: 'Rezervacije', value: stats.reservationsCount },
                  ].map(card => (
                    <div key={card.label} className="bg-white rounded-2xl p-5 border border-blush/30">
                      <div className="text-3xl mb-2" aria-hidden>{card.icon}</div>
                      <p className="text-2xl font-serif text-charcoal">{card.value?.toLocaleString('hr-HR')}</p>
                      <p className="text-xs text-warm-gray mt-0.5">{card.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white rounded-2xl border border-blush/30 p-5">
                <h2 className="font-serif text-xl text-charcoal mb-4">Zadnji korisnici</h2>
                <ul className="space-y-3">
                  {recentUsers.slice(0, 10).map(u => <UserCard key={u.id} u={u} isSelf={u.id === user.id} onOpen={() => openUser(u.id)} />)}
                </ul>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div>
              <div className="flex gap-3 mb-5 items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" aria-hidden />
                  <input type="search" aria-label="Pretraži korisnike" placeholder="Pretraži po imenu ili emailu..." value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setUserPage(1) }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-blush/40 rounded-xl text-sm focus:outline-none focus:border-rose" />
                </div>
                <span className="text-sm text-warm-gray">{usersTotal} {plural(usersTotal, 'korisnik', 'korisnika', 'korisnika')}</span>
              </div>
              <ul className="space-y-3">
                {users.map(u => (
                  <UserCard key={u.id} u={u} isSelf={u.id === user.id} onOpen={() => openUser(u.id)} onToggleRole={() => handleRoleToggle(u)} />
                ))}
              </ul>
              {usersTotal > 20 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}
                    className="px-4 py-2 border border-blush/40 rounded-full text-sm disabled:opacity-40">← Prethodna</button>
                  <span className="px-4 py-2 text-sm text-warm-gray">Str. {userPage} od {Math.ceil(usersTotal / 20)}</span>
                  <button onClick={() => setUserPage(p => p + 1)} disabled={userPage * 20 >= usersTotal}
                    className="px-4 py-2 border border-blush/40 rounded-full text-sm disabled:opacity-40">Sljedeća →</button>
                </div>
              )}
            </div>
          )}

          {tab === 'scraper' && (
            <div className="space-y-4">
              {shops.map(shop => (
                <div key={shop.id} className={clsx('bg-white rounded-2xl border p-5 transition-all', shop.isActive ? 'border-blush/30' : 'border-warm-gray/20 opacity-70')}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-2.5 h-2.5 rounded-full',
                        shop.isRunning ? 'bg-gold animate-pulse' : shop.lastStatus === 'success' ? 'bg-sage' : shop.lastStatus === 'error' ? 'bg-rose' : 'bg-warm-gray/30')} aria-hidden />
                      <div>
                        <h3 className="font-medium text-charcoal">{shop.name}</h3>
                        <p className="text-xs text-warm-gray">
                          {shop.productsCount?.toLocaleString('hr-HR')} proizvoda ·{' '}
                          {shop.isRunning || shop.lastStatus === 'running' ? 'upravo radi...' : shop.lastStatus === 'success' ? 'uspješno' : shop.lastStatus === 'error' ? 'greška' : 'nije pokrenut'}
                          {shop.lastRun && ` · ${new Date(shop.lastRun).toLocaleString('hr-HR')}`}
                        </p>
                        {shop.errorMsg && <p className="text-xs text-rose mt-0.5">{shop.errorMsg}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button role="switch" aria-checked={shop.isActive} aria-label={`Prikaz proizvoda: ${shop.name}`} onClick={() => handleToggleShop(shop.slug)}
                        className={clsx('relative inline-flex h-7 w-12 items-center rounded-full transition-colors', shop.isActive ? 'bg-sage' : 'bg-warm-gray/30')}>
                        <span className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform', shop.isActive ? 'translate-x-6' : 'translate-x-1')} />
                      </button>
                      <span className="text-xs text-warm-gray w-8">{shop.isActive ? 'ON' : 'OFF'}</span>
                      <button onClick={() => handleScrape(shop.slug)} disabled={shop.isRunning}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-light/60 text-sage text-sm font-medium rounded-full hover:bg-sage-light transition-colors disabled:opacity-50">
                        <RefreshCw size={14} className={shop.isRunning ? 'animate-spin' : ''} />
                        {shop.isRunning ? 'Radi...' : 'Pokreni scraper'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <p className="p-4 bg-cream rounded-2xl text-sm text-warm-gray">
                Scraperi automatski rade svake noći (Baby Center u <strong>02:00</strong>, Svijet Beba u <strong>03:00</strong>).
                Kad je shop isključen, njegovi proizvodi se ne prikazuju u katalogu.
              </p>
            </div>
          )}

          {tab === 'featured' && (
            <div>
              <h2 className="font-serif text-xl text-charcoal mb-6">Istaknuti proizvodi ({featured.length}/12)</h2>
              {featured.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-warm-gray uppercase tracking-wide mb-3">Trenutno istaknuti</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {featured.map(f => (
                      <div key={f.id} className="bg-white rounded-2xl border border-gold/30 p-3 relative">
                        <button aria-label="Ukloni iz istaknutih"
                          onClick={() => attempt(async () => { await adminApi.removeFeatured(f.id); setFeatured(prev => prev.filter(x => x.id !== f.id)) }, 'Uklonjeno')}
                          className="absolute top-2 right-2 p-1 bg-rose/10 text-rose rounded-full hover:bg-rose/20">
                          <Trash2 size={12} />
                        </button>
                        {f.product?.imageUrl && <img src={f.product.imageUrl} alt="" className="w-full h-24 object-contain mb-2" />}
                        <p className="text-xs font-medium text-charcoal line-clamp-2">{f.product?.name}</p>
                        {f.product && <p className="text-xs text-rose mt-0.5">{formatPrice(f.product.price, f.product.currency)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <h3 className="text-sm font-medium text-warm-gray uppercase tracking-wide mb-3">Dodaj proizvod</h3>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" aria-hidden />
                <input type="search" aria-label="Pretraži proizvode" placeholder="Pretraži proizvode..." value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-blush/40 rounded-xl text-sm focus:outline-none focus:border-rose" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map(product => {
                  const isFeatured = featured.some(f => f.productId === product.id)
                  return (
                    <button key={product.id} onClick={() => handleToggleFeatured(product)} aria-pressed={isFeatured}
                      className={clsx('bg-white rounded-2xl border p-3 text-left transition-all hover:shadow-md', isFeatured ? 'border-gold/40 bg-gold/5' : 'border-blush/30')}>
                      {product.imageUrl && <img src={product.imageUrl} alt="" className="w-full h-20 object-contain mb-2" />}
                      <p className="text-xs font-medium text-charcoal line-clamp-2">{product.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-rose">{formatPrice(product.price, product.currency)}</p>
                        <span className={clsx('text-xs', isFeatured ? 'text-gold' : 'text-warm-gray/50')}>{isFeatured ? '⭐' : '+'}</span>
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
                <div className="bg-white rounded-2xl border border-blush/30 p-5">
                  <h2 className="font-serif text-xl text-charcoal mb-2">Nemapirane kategorije ({unmapped.length})</h2>
                  <p className="text-sm text-warm-gray mb-4">Ove kategorije iz shopova još nemaju mapiranje na našu kategoriju.</p>
                  <ul className="space-y-3">
                    {unmapped.slice(0, 20).map(u => (
                      <li key={`${u.externalName}-${u.shopSlug}`} className="flex items-center gap-3 p-3 border border-blush/20 rounded-xl flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-charcoal">{u.externalName}</p>
                          <p className="text-xs text-warm-gray">{u.shopSlug} · {u.count} proizvoda</p>
                        </div>
                        <ArrowRight size={14} className="text-warm-gray/50" aria-hidden />
                        <select aria-label={`Mapiraj ${u.externalName}`} defaultValue=""
                          onChange={e => { if (e.target.value) createMapping({ externalName: u.externalName, shopSlug: u.shopSlug || undefined, categoryId: e.target.value }) }}
                          className="px-3 py-1.5 bg-cream border border-blush/40 rounded-lg text-xs focus:outline-none min-w-[180px]">
                          <option value="" disabled>Odaberi kategoriju...</option>
                          {categoryOptions}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-blush/30 p-5">
                <h2 className="font-serif text-xl text-charcoal mb-4">Postojeća mapiranja ({mappings.length})</h2>
                <form className="flex items-end gap-2 mb-4 flex-wrap"
                  onSubmit={e => {
                    e.preventDefault()
                    if (!newMapping.externalName || !newMapping.categoryId) return
                    createMapping({ externalName: newMapping.externalName, shopSlug: newMapping.shopSlug || undefined, categoryId: newMapping.categoryId })
                      .then(() => setNewMapping({ externalName: '', shopSlug: '', categoryId: '' }))
                  }}>
                  <div className="flex-1 min-w-[150px]">
                    <label htmlFor="map-ext" className="text-xs text-warm-gray uppercase tracking-wide block mb-1">Eksterni naziv</label>
                    <input id="map-ext" type="text" placeholder="npr. Kolica" value={newMapping.externalName}
                      onChange={e => setNewMapping(p => ({ ...p, externalName: e.target.value }))}
                      className="w-full px-3 py-2 bg-cream border border-blush/40 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="min-w-[120px]">
                    <label htmlFor="map-shop" className="text-xs text-warm-gray uppercase tracking-wide block mb-1">Shop (opcionalno)</label>
                    <input id="map-shop" type="text" placeholder="babycenter" value={newMapping.shopSlug}
                      onChange={e => setNewMapping(p => ({ ...p, shopSlug: e.target.value }))}
                      className="w-full px-3 py-2 bg-cream border border-blush/40 rounded-lg text-sm focus:outline-none" />
                  </div>
                  <div className="min-w-[180px]">
                    <label htmlFor="map-cat" className="text-xs text-warm-gray uppercase tracking-wide block mb-1">Naša kategorija</label>
                    <select id="map-cat" value={newMapping.categoryId} onChange={e => setNewMapping(p => ({ ...p, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 bg-cream border border-blush/40 rounded-lg text-sm focus:outline-none">
                      <option value="">Odaberi...</option>
                      {categoryOptions}
                    </select>
                  </div>
                  <button type="submit" disabled={!newMapping.externalName || !newMapping.categoryId}
                    className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-lg hover:bg-sage/90 disabled:opacity-50 transition-colors">
                    Dodaj
                  </button>
                </form>

                {mappings.length === 0 ? (
                  <p className="text-sm text-warm-gray text-center py-8">Nema mapiranja. Dodaj prvo mapiranje iznad.</p>
                ) : (
                  <ul className="space-y-2">
                    {mappings.map(m => (
                      <li key={m.id} className="flex items-center gap-3 p-3 border border-blush/20 rounded-xl">
                        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-medium text-charcoal">{m.externalName}</span>
                          {m.shopSlug && <span className="text-xs px-1.5 py-0.5 bg-cream rounded text-warm-gray">{m.shopSlug}</span>}
                          <ArrowRight size={12} className="text-warm-gray/50" aria-hidden />
                          <span className="text-sage font-medium">{m.category?.name || m.categoryId}</span>
                        </div>
                        <button aria-label="Obriši mapiranje"
                          onClick={() => attempt(async () => { await adminApi.deleteCategoryMapping(m.id); setMappings(prev => prev.filter(x => x.id !== m.id)) }, 'Mapiranje uklonjeno')}
                          className="p-1.5 text-warm-gray hover:text-rose transition-colors">
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
              <div className="bg-white rounded-2xl border border-blush/30 p-6">
                <h2 className="font-serif text-xl text-charcoal mb-4">Hero slika na početnoj</h2>
                <div className="space-y-3">
                  <input type="url" aria-label="URL hero slike" placeholder="https://..." value={heroUrl} onChange={e => setHeroUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-cream border border-blush/40 rounded-xl text-sm focus:outline-none focus:border-rose" />
                  {heroUrl && (
                    <div className="rounded-xl overflow-hidden border border-blush/30 h-40">
                      <img src={heroUrl} alt="Pregled hero slike" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                  <button onClick={async () => { setHeroSaving(true); await saveSetting('heroImage', heroUrl.trim(), 'Hero slika spremljena (vidljiva za do 5 min)'); setHeroSaving(false) }}
                    disabled={heroSaving} className="px-5 py-2.5 bg-rose text-white rounded-full text-sm font-medium hover:bg-rose/90 disabled:opacity-50">
                    {heroSaving ? 'Spremam...' : 'Spremi hero sliku'}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-blush/30 p-6">
                <h2 className="font-serif text-xl text-charcoal mb-4">Opće postavke</h2>
                {[
                  { key: 'siteName', label: 'Naziv stranice', placeholder: 'Bebina Lista' },
                  { key: 'contactEmail', label: 'Kontakt email', placeholder: 'info@bebinalista.hr' },
                ].map(s => (
                  <div key={s.key} className="mb-4">
                    <label htmlFor={`setting-${s.key}`} className="block text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide">{s.label}</label>
                    <input id={`setting-${s.key}`} type="text" placeholder={s.placeholder} defaultValue={settings[s.key] || ''} key={settings[s.key] || s.key}
                      onBlur={e => { if (e.target.value !== (settings[s.key] || '')) saveSetting(s.key, e.target.value.trim()) }}
                      className="w-full px-4 py-2.5 bg-cream border border-blush/40 rounded-xl text-sm focus:outline-none focus:border-rose" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {userDetail && (
        <Modal title={`Liste: ${userDetail.name}`} onClose={() => setUserDetail(null)} wide>
          <div className="px-5 sm:px-6 pb-6">
            <p className="text-sm text-warm-gray mb-4 break-all">{userDetail.email}</p>
            {userDetail.lists.length === 0 ? (
              <p className="text-warm-gray text-sm text-center py-8">Korisnik nema lista.</p>
            ) : (
              <ul className="space-y-3">
                {userDetail.lists.map(list => {
                  const reserved = list.items.filter(i => i.reservation).length
                  return (
                    <li key={list.id}>
                      <a href={`/lista/${list.shareSlug}`} target="_blank" rel="noopener noreferrer"
                        className="block p-4 border border-blush/30 rounded-2xl hover:border-blush-mid transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-charcoal">{list.name}</p>
                            <p className="text-xs text-warm-gray mt-0.5">{list._count?.items ?? list.items.length} {plural(list._count?.items ?? list.items.length, 'stavka', 'stavke', 'stavki')}{reserved > 0 && ` · ${reserved} rezervirano`}</p>
                          </div>
                          <span className="text-xs text-rose">/lista/{list.shareSlug.slice(0, 8)}…</span>
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

      <Toast message={toast} />
    </>
  )
}
