'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import Modal from '@/components/Modal'
import { Toast, useToast } from '@/components/Toast'
import { productsApi, listsApi, apiError } from '@/lib/api'
import { formatPrice, plural } from '@/lib/format'
import { useAuthStore } from '@/lib/store'
import { Product, Category, BabyList, Priority } from '@/types'
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

const PRICE_PRESETS = [
  { label: 'Do 30 €', min: '', max: '30' },
  { label: 'Do 50 €', min: '', max: '50' },
  { label: '50–150 €', min: '50', max: '150' },
  { label: '150–500 €', min: '150', max: '500' },
  { label: '500 €+', min: '500', max: '' },
]

const SHOPS = [
  { slug: 'babycenter', name: 'Baby Center' },
  { slug: 'svijetbeba', name: 'Svijet Beba' },
]

const PRIORITIES: { value: Priority; label: string; cls: string }[] = [
  { value: 'HIGH', label: '❤️ Jako', cls: 'priority-HIGH' },
  { value: 'MEDIUM', label: '🌿 Srednje', cls: 'priority-MEDIUM' },
  { value: 'LOW', label: '✨ Luksuz', cls: 'priority-LOW' },
]

const listCount = (list: BabyList) => list._count?.items ?? list.items?.length ?? 0

function AddToListModal({ product, lists, onClose, onAdded }: {
  product: Product
  lists: BabyList[]
  onClose: () => void
  onAdded: (message: string) => void
}) {
  const [listId, setListId] = useState(lists[0]?.id || '')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const add = async () => {
    setSaving(true); setError('')
    try {
      await listsApi.addItem(listId, product.id, priority, note.trim() || undefined)
      onAdded('Dodano na listu! 💕')
    } catch (err: any) {
      setError(err?.response?.status === 409 ? 'Ovaj proizvod je već na toj listi.' : apiError(err))
      setSaving(false)
    }
  }

  return (
    <Modal title="Dodaj na listu" onClose={onClose} sheet>
      <div className="px-5 sm:px-6 pb-6">
        <div className="flex gap-3 mb-5 p-3 bg-cream rounded-2xl">
          <div className="w-14 h-14 bg-white rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center">
            {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-contain p-1" /> : <span className="text-2xl">🍼</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-charcoal line-clamp-2">{product.name}</p>
            <p className="text-sm text-rose font-medium mt-0.5">{formatPrice(product.price, product.currency)}</p>
          </div>
        </div>
        {lists.length === 0 ? (
          <p className="text-sm text-warm-gray text-center py-4">
            Još nemaš listu. <Link href="/moja-lista" className="text-rose underline">Kreiraj listu</Link> pa se vrati.
          </p>
        ) : (
          <>
            {lists.length > 1 && (
              <fieldset className="mb-4">
                <legend className="block text-xs font-medium text-warm-gray mb-2 uppercase tracking-wide">Odaberi listu</legend>
                <div className="space-y-2">
                  {lists.map(list => (
                    <button key={list.id} type="button" aria-pressed={listId === list.id} onClick={() => setListId(list.id)}
                      className={clsx('w-full text-left px-4 py-3 rounded-2xl border text-sm transition-all',
                        listId === list.id ? 'border-rose bg-blush/20 text-charcoal font-medium' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                      {list.name} <span className="opacity-60 text-xs">({listCount(list)} {plural(listCount(list), 'stavka', 'stavke', 'stavki')})</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="mb-4">
              <legend className="block text-xs font-medium text-warm-gray mb-2 uppercase tracking-wide">Koliko ti treba?</legend>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button" aria-pressed={priority === p.value} onClick={() => setPriority(p.value)}
                    className={clsx('px-2 py-2.5 rounded-xl text-xs font-medium transition-all border text-center',
                      priority === p.value ? `${p.cls} border-current` : 'border-blush/30 text-warm-gray hover:border-blush-mid')}>
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mb-5">
              <label htmlFor="add-note" className="block text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide">Napomena (opcionalno)</label>
              <input id="add-note" type="text" maxLength={200} value={note} onChange={e => setNote(e.target.value)}
                placeholder="npr. veličina 62, plava boja"
                className="w-full px-4 py-3 bg-cream border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-rose" />
            </div>
            {error && <p role="alert" className="text-sm text-rose mb-3">{error}</p>}
            <button onClick={add} disabled={saving || !listId}
              className="w-full py-3 bg-rose text-white font-medium rounded-full hover:bg-rose/90 transition-colors disabled:opacity-50">
              {saving ? 'Dodajem...' : 'Dodaj na listu'}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function KatalogClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { user, loadFromStorage } = useAuthStore()

  const filters = useMemo(() => ({
    q: searchParams.get('q') || '',
    category: searchParams.get('kategorija') || '',
    shop: searchParams.get('shop') || '',
    sort: searchParams.get('sort') || 'price_asc',
    min: searchParams.get('min') || '',
    max: searchParams.get('max') || '',
    page: Math.max(1, parseInt(searchParams.get('str') || '1', 10) || 1),
  }), [searchParams])

  const [queryInput, setQueryInput] = useState(filters.q)
  const debouncedQuery = useDebounced(queryInput, 350)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [userLists, setUserLists] = useState<BabyList[]>([])
  const [listProductIds, setListProductIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { toast, showToast } = useToast()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const setParams = useCallback((patch: Record<string, string | number | undefined>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || (key === 'str' && value === 1)) next.delete(key)
      else next.set(key, String(value))
    }
    if (resetPage && !('str' in patch)) next.delete('str')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  useEffect(() => {
    if (debouncedQuery.trim() !== filters.q) setParams({ q: debouncedQuery.trim() || undefined })
  }, [debouncedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the search box in sync when the URL changes from outside (back button, reset).
  useEffect(() => {
    setQueryInput(prev => (prev.trim() === filters.q ? prev : filters.q))
  }, [filters.q])

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    productsApi.getAll({
      q: filters.q || undefined,
      categorySlug: filters.category || undefined,
      shopSlug: filters.shop || undefined,
      sortBy: filters.sort,
      page: filters.page,
      limit: 24,
      minPrice: filters.min ? parseFloat(filters.min) : undefined,
      maxPrice: filters.max ? parseFloat(filters.max) : undefined,
    }).then(res => {
      if (cancelled) return
      setProducts(res.data.products)
      setPagination(res.data.pagination)
    }).catch(err => {
      if (!cancelled) setLoadError(apiError(err, 'Katalog se trenutno ne može učitati.'))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [filters, reloadKey])

  useEffect(() => {
    productsApi.getCategories().then(res => setCategories(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const parent = categories.find(c => c.children?.some(ch => ch.slug === filters.category))
    if (parent) setExpandedCats(prev => prev.has(parent.id) ? prev : new Set(prev).add(parent.id))
  }, [categories, filters.category])

  const loadLists = useCallback(() => {
    listsApi.getAll().then(res => {
      const lists = res.data as BabyList[]
      setUserLists(lists)
      setListProductIds(new Set(lists.flatMap(l => l.items?.map(i => i.productId) ?? [])))
    }).catch(() => {})
  }, [])

  useEffect(() => { if (user) loadLists() }, [user, loadLists])
  const handleAddClick = (product: Product) => {
    if (!user) {
      router.push(`/prijava?next=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`)
      return
    }
    setSelectedProduct(product)
  }

  const resetAll = () => { setQueryInput(''); router.replace(pathname, { scroll: false }) }
  const presetActive = (min: string, max: string) => filters.min === min && filters.max === max
  const hasFilters = !!(filters.q || filters.category || filters.shop || filters.min || filters.max)

  const filterSidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-medium text-warm-gray uppercase tracking-wide mb-3">Kategorija</h3>
        <div className="space-y-0.5">
          <button onClick={() => setParams({ kategorija: undefined })}
            className={clsx('w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
              !filters.category ? 'bg-blush/50 text-rose font-medium' : 'text-warm-gray hover:bg-cream')}>
            Sve kategorije
          </button>
          {categories.filter(c => (c.totalCount ?? 0) > 0).map(cat => {
            const children = cat.children?.filter(ch => (ch.totalCount ?? 0) > 0) ?? []
            const expanded = expandedCats.has(cat.id)
            return (
              <div key={cat.id}>
                <div className="flex items-center">
                  <button onClick={() => setParams({ kategorija: cat.slug })}
                    className={clsx('flex-1 text-left px-3 py-2 rounded-xl text-sm transition-colors',
                      filters.category === cat.slug ? 'bg-blush/50 text-rose font-medium' : 'text-charcoal hover:bg-cream')}>
                    {cat.name}
                    <span className={clsx('ml-1.5 text-xs', filters.category === cat.slug ? 'text-rose/60' : 'text-warm-gray/60')}>({cat.totalCount})</span>
                  </button>
                  {children.length > 0 && (
                    <button aria-label={expanded ? `Sakrij podkategorije: ${cat.name}` : `Prikaži podkategorije: ${cat.name}`} aria-expanded={expanded}
                      onClick={() => setExpandedCats(prev => { const n = new Set(prev); if (n.has(cat.id)) n.delete(cat.id); else n.add(cat.id); return n })}
                      className="p-1.5 text-warm-gray hover:text-charcoal">
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
                {expanded && children.map(sub => (
                  <button key={sub.id} onClick={() => setParams({ kategorija: sub.slug })}
                    className={clsx('w-full text-left pl-7 pr-3 py-1.5 rounded-xl text-xs transition-colors',
                      filters.category === sub.slug ? 'text-rose font-medium' : 'text-warm-gray hover:text-charcoal')}>
                    {sub.name} ({sub.totalCount})
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-warm-gray uppercase tracking-wide mb-3">Cijena</h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PRICE_PRESETS.map(p => (
            <button key={p.label} aria-pressed={presetActive(p.min, p.max)}
              onClick={() => presetActive(p.min, p.max) ? setParams({ min: undefined, max: undefined }) : setParams({ min: p.min, max: p.max })}
              className={clsx('px-2.5 py-1 rounded-full text-xs transition-colors border',
                presetActive(p.min, p.max) ? 'bg-rose text-white border-rose' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="price-min" className="text-xs text-warm-gray mb-1 block">Od (€)</label>
            <input id="price-min" type="number" inputMode="decimal" min={0} placeholder="0" defaultValue={filters.min} key={`min-${filters.min}`}
              onBlur={e => setParams({ min: e.target.value })} onKeyDown={e => e.key === 'Enter' && setParams({ min: e.currentTarget.value })}
              className="w-full px-3 py-2 bg-white border border-blush/40 rounded-lg text-base sm:text-sm focus:outline-none focus:border-rose" />
          </div>
          <div>
            <label htmlFor="price-max" className="text-xs text-warm-gray mb-1 block">Do (€)</label>
            <input id="price-max" type="number" inputMode="decimal" min={0} placeholder="∞" defaultValue={filters.max} key={`max-${filters.max}`}
              onBlur={e => setParams({ max: e.target.value })} onKeyDown={e => e.key === 'Enter' && setParams({ max: e.currentTarget.value })}
              className="w-full px-3 py-2 bg-white border border-blush/40 rounded-lg text-base sm:text-sm focus:outline-none focus:border-rose" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-warm-gray uppercase tracking-wide mb-3">Dućan</h3>
        <div className="space-y-0.5">
          <button onClick={() => setParams({ shop: undefined })}
            className={clsx('w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
              !filters.shop ? 'bg-blush/50 text-rose font-medium' : 'text-warm-gray hover:bg-cream')}>
            Svi dućani
          </button>
          {SHOPS.map(shop => (
            <button key={shop.slug} onClick={() => setParams({ shop: filters.shop === shop.slug ? undefined : shop.slug })}
              className={clsx('w-full text-left px-3 py-2 rounded-xl text-sm transition-colors',
                filters.shop === shop.slug ? 'bg-blush/50 text-rose font-medium' : 'text-charcoal hover:bg-cream')}>
              {shop.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="py-6">
            <h1 className="font-serif text-3xl text-charcoal mb-5">Katalog proizvoda</h1>
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[14rem]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray" aria-hidden />
                <input type="search" aria-label="Pretraži proizvode" placeholder="Pretraži proizvode..." value={queryInput}
                  onChange={e => setQueryInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-blush/40 rounded-full text-base sm:text-sm focus:outline-none focus:border-rose transition-colors" />
                {queryInput && (
                  <button aria-label="Očisti pretragu" onClick={() => setQueryInput('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                    <X size={14} className="text-warm-gray" />
                  </button>
                )}
              </div>
              <select aria-label="Sortiranje" value={filters.sort} onChange={e => setParams({ sort: e.target.value === 'price_asc' ? undefined : e.target.value })}
                className="px-4 py-3 bg-white border border-blush/40 rounded-full text-sm text-charcoal focus:outline-none cursor-pointer">
                <option value="price_asc">Cijena ↑</option>
                <option value="price_desc">Cijena ↓</option>
                <option value="newest">Najnovije</option>
                <option value="name">Po nazivu</option>
              </select>
              <button className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white border border-blush/40 rounded-full text-sm text-charcoal"
                onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={16} /> Filteri{hasFilters && <span className="w-2 h-2 rounded-full bg-rose" aria-label="aktivni filteri" />}
              </button>
            </div>
          </div>

          <div className="flex gap-8">
            <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">
              {filterSidebar}
            </aside>

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" aria-busy>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl overflow-hidden border border-blush/30">
                      <div className="aspect-square shimmer" />
                      <div className="p-4 space-y-2"><div className="h-3 shimmer rounded-full w-3/4" /><div className="h-3 shimmer rounded-full w-1/2" /></div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="text-center py-20">
                  <span className="text-5xl block mb-4">😕</span>
                  <p className="text-warm-gray text-sm mb-4">{loadError}</p>
                  <button onClick={() => setReloadKey(k => k + 1)} className="px-5 py-2 bg-blush/40 text-charcoal rounded-full text-sm hover:bg-blush transition-colors">Pokušaj ponovno</button>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20">
                  <span className="text-5xl block mb-4">🔍</span>
                  <h2 className="font-serif text-xl text-charcoal mb-2">Nema rezultata</h2>
                  <p className="text-warm-gray text-sm mb-4">Pokušaj s drugačijim filterima</p>
                  {hasFilters && (
                    <button onClick={resetAll} className="px-5 py-2 bg-blush/40 text-charcoal rounded-full text-sm hover:bg-blush transition-colors">Resetiraj filtere</button>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-warm-gray mb-4" aria-live="polite">
                    {pagination.total.toLocaleString('hr-HR')} {plural(pagination.total, 'proizvod', 'proizvoda', 'proizvoda')}
                    {filters.q && <> za „<strong>{filters.q}</strong>"</>}
                    {(filters.min || filters.max) && <> · {filters.min || '0'} € – {filters.max || '∞'} €</>}
                    {hasFilters && <button onClick={resetAll} className="ml-2 text-rose hover:underline">Očisti filtere</button>}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map(product => (
                      <ProductCard key={product.id} product={product} onAddToList={handleAddClick} isOnList={listProductIds.has(product.id)} />
                    ))}
                  </div>
                  {pagination.totalPages > 1 && (
                    <nav className="flex justify-center items-center gap-2 mt-10" aria-label="Stranice">
                      <button aria-label="Prethodna stranica" onClick={() => setParams({ str: filters.page - 1 }, false)} disabled={filters.page <= 1}
                        className="p-2 rounded-full border border-blush/40 disabled:opacity-40 hover:bg-blush/20 transition-colors">
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-sm text-warm-gray px-4">Str. {filters.page} od {pagination.totalPages}</span>
                      <button aria-label="Sljedeća stranica" onClick={() => { setParams({ str: filters.page + 1 }, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={filters.page >= pagination.totalPages}
                        className="p-2 rounded-full border border-blush/40 disabled:opacity-40 hover:bg-blush/20 transition-colors">
                        <ChevronRight size={18} />
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {filtersOpen && (
        <Modal title="Filteri" onClose={() => setFiltersOpen(false)} sheet>
          <div className="px-5 sm:px-6 pb-6">
            {filterSidebar}
            <button onClick={() => setFiltersOpen(false)} className="mt-6 w-full py-3 bg-charcoal text-white rounded-full text-sm font-medium">
              Prikaži {pagination.total.toLocaleString('hr-HR')} {plural(pagination.total, 'proizvod', 'proizvoda', 'proizvoda')}
            </button>
          </div>
        </Modal>
      )}

      {selectedProduct && (
        <AddToListModal product={selectedProduct} lists={userLists} onClose={() => setSelectedProduct(null)}
          onAdded={msg => {
            setListProductIds(prev => new Set(prev).add(selectedProduct.id))
            setSelectedProduct(null)
            showToast(msg)
            loadLists()
          }} />
      )}

      <Toast message={toast} />
    </>
  )
}
