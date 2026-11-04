'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, m } from 'motion/react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import Modal from '@/components/Modal'
import Segmented from '@/components/Segmented'
import { Art } from '@/components/art'
import { Toast, useToast } from '@/components/Toast'
import AddToListModal from './AddToListModal'
import FilterPanel from './FilterPanel'
import { productsApi, listsApi, apiError, type ProductFilters } from '@/lib/api'
import { categoryMeta, sortRootCategories } from '@/lib/categories'
import { plural } from '@/lib/format'
import { useAuthStore } from '@/lib/store'
import { Product, Category, BabyList, CatalogFacets } from '@/types'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'

const PAGE_SIZE = 24
/** The API serves at most 100 rows per call, which also caps how much a reload can restore. */
const MAX_RESTORED_PAGES = 4

const SORTS = [
  { value: '', label: 'Izmiješano' },
  { value: 'price_asc', label: 'Cijena: od niže' },
  { value: 'price_desc', label: 'Cijena: od više' },
  { value: 'newest', label: 'Najnovije' },
  { value: 'name', label: 'Po nazivu' },
]

const proizvoda = (n: number) => plural(n, 'proizvod', 'proizvoda', 'proizvoda')

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function CategoryRail({ tree, active, onPick }: { tree: Category[]; active: string; onPick: (slug?: string) => void }) {
  const roots = sortRootCategories(tree)
  const openRoot = tree.find(c => c.slug === active || c.children?.some(ch => ch.slug === active))
  const children = openRoot?.children?.filter(ch => (ch.totalCount ?? 0) > 0 || ch.slug === active) ?? []
  const allCount = tree.reduce((sum, c) => sum + (c.totalCount ?? 0), 0)

  const tile = (key: string, label: string, count: number, tone: string, art: Parameters<typeof Art>[0]['name'], isActive: boolean, slug?: string) => (
    <li key={key} className="w-[108px] flex-shrink-0 snap-start lg:w-auto lg:flex-shrink">
      <button onClick={() => onPick(slug)} aria-pressed={isActive} disabled={count === 0 && !isActive}
        className={clsx(`tone-${tone}`, 'group h-full w-full rounded-3xl p-1.5 pb-2.5 text-left transition-[background-color,transform,opacity] duration-200 active:scale-[0.97] disabled:opacity-40',
          isActive ? 'bg-ink text-canvas' : 'bg-surface hover:-translate-y-0.5')}>
        <span className="block aspect-[5/4] overflow-hidden rounded-[1.1rem] bg-tone p-2.5">
          <Art name={art} className="mx-auto h-full w-auto transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-hover:scale-110" />
        </span>
        <span className="mt-2 block px-1 text-[13px] font-bold leading-tight">{label}</span>
        <span className={clsx('block px-1 text-xs font-medium tabular-nums', isActive ? 'opacity-70' : 'text-muted')}>{count.toLocaleString('hr-HR')}</span>
      </button>
    </li>
  )

  return (
    <div>
      <ul className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 pb-1 pt-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-9 lg:overflow-visible lg:px-0">
        {tile('all', 'Sve', allCount, 'sun', 'mix', !active)}
        {roots.map(cat => {
          const meta = categoryMeta(cat.slug)
          return tile(cat.id, cat.name, cat.totalCount ?? 0, meta.tone, meta.art, openRoot?.id === cat.id, cat.slug)
        })}
      </ul>

      <AnimatePresence initial={false}>
        {children.length > 0 && openRoot && (
          <m.div key={openRoot.id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }} className="overflow-hidden">
            <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pt-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:px-0">
              <li className="flex-shrink-0">
                <button onClick={() => onPick(openRoot.slug)} aria-pressed={active === openRoot.slug}
                  className={clsx('chip min-h-[40px] whitespace-nowrap px-4 transition-colors', active === openRoot.slug ? 'bg-ink text-canvas' : 'chip-neutral hover:bg-line/[0.13]')}>
                  Sve iz kategorije {openRoot.name}
                </button>
              </li>
              {children.map(child => (
                <li key={child.id} className="flex-shrink-0">
                  <button onClick={() => onPick(child.slug)} aria-pressed={active === child.slug}
                    className={clsx('chip min-h-[40px] whitespace-nowrap px-4 transition-colors', active === child.slug ? 'bg-ink text-canvas' : 'chip-neutral hover:bg-line/[0.13]')}>
                    {child.name}
                    <span className="text-xs font-medium tabular-nums opacity-65">{(child.totalCount ?? 0).toLocaleString('hr-HR')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function findCategory(tree: Category[], slug: string): Category | undefined {
  for (const cat of tree) {
    if (cat.slug === slug) return cat
    const child = cat.children?.find(ch => ch.slug === slug)
    if (child) return child
  }
}

function SortSelect({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div className={clsx('relative', className)}>
      <select aria-label="Sortiranje" value={value} onChange={e => onChange(e.target.value)}
        className="min-h-[44px] w-full appearance-none rounded-full bg-line/[0.07] pl-4 pr-9 text-sm font-semibold text-ink transition-colors hover:bg-line/[0.12]">
        {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
    </div>
  )
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
    sort: searchParams.get('sort') || '',
    min: searchParams.get('min') || '',
    max: searchParams.get('max') || '',
    brands: (searchParams.get('brend') || '').split('|').filter(Boolean),
    sale: searchParams.get('akcija') === '1',
  }), [searchParams])
  const startPage = Math.max(1, parseInt(searchParams.get('str') || '1', 10) || 1)

  const [queryInput, setQueryInput] = useState(filters.q)
  const debouncedQuery = useDebounced(queryInput, 320)

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [facets, setFacets] = useState<CatalogFacets | null>(null)
  const [userLists, setUserLists] = useState<BabyList[]>([])
  const [listProductIds, setListProductIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [everLoaded, setEverLoaded] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { toast, showToast } = useToast()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)
  const restoredPages = useRef(Math.min(startPage, MAX_RESTORED_PAGES))

  const setParams = useCallback((patch: Record<string, string | number | undefined>, keepPage = false) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === '' || (key === 'str' && value === 1)) next.delete(key)
      else next.set(key, String(value))
    }
    if (!keepPage) next.delete('str')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    if (!keepPage) {
      // Changing a filter while deep in the grid would otherwise leave you looking at nothing familiar.
      const top = resultsRef.current ? resultsRef.current.getBoundingClientRect().top + window.scrollY - 90 : 0
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [pathname, router, searchParams])

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  useEffect(() => {
    if (debouncedQuery.trim() !== filters.q) setParams({ q: debouncedQuery.trim() || undefined })
  }, [debouncedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the search box in sync when the URL changes from outside (back button, reset).
  useEffect(() => {
    setQueryInput(prev => (prev.trim() === filters.q ? prev : filters.q))
  }, [filters.q])

  const apiFilters: ProductFilters = useMemo(() => ({
    q: filters.q || undefined,
    categorySlug: filters.category || undefined,
    shopSlug: filters.shop || undefined,
    brand: filters.brands.join('|') || undefined,
    onSale: filters.sale ? '1' : undefined,
    minPrice: filters.min ? parseFloat(filters.min) : undefined,
    maxPrice: filters.max ? parseFloat(filters.max) : undefined,
  }), [filters])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    const pages = restoredPages.current
    restoredPages.current = 1
    Promise.all([
      productsApi.getAll({ ...apiFilters, sortBy: filters.sort || undefined, page: 1, limit: PAGE_SIZE * pages }),
      productsApi.getFacets(apiFilters),
    ]).then(([list, facetData]) => {
      if (cancelled) return
      setProducts(list.data.products)
      setTotal(list.data.pagination.total)
      setFacets(facetData.data)
      setEverLoaded(true)
    }).catch(err => {
      if (!cancelled) setLoadError(apiError(err, 'Katalog se trenutno ne može učitati.'))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [apiFilters, filters.sort, reloadKey])

  const loadMore = async () => {
    const nextPage = Math.floor(products.length / PAGE_SIZE) + 1
    setLoadingMore(true)
    try {
      const res = await productsApi.getAll({ ...apiFilters, sortBy: filters.sort || undefined, page: nextPage, limit: PAGE_SIZE })
      setProducts(prev => {
        const known = new Set(prev.map(p => p.id))
        return [...prev, ...(res.data.products as Product[]).filter(p => !known.has(p.id))]
      })
      setTotal(res.data.pagination.total)
      setParams({ str: nextPage }, true)
    } catch (err) {
      showToast(apiError(err, 'Ne mogu učitati još proizvoda.'))
    } finally {
      setLoadingMore(false)
    }
  }

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
  const setBrands = (next: string[]) => setParams({ brend: next.join('|') || undefined })
  const setPrice = (min: string, max: string) => setParams({ min, max })
  const setSale = (next: boolean) => setParams({ akcija: next ? '1' : undefined })

  const activeCategory = facets ? findCategory(facets.categories, filters.category) : undefined
  const activeShop = facets?.shops.find(s => s.slug === filters.shop)

  const applied: { key: string; label: string; clear: () => void }[] = [
    ...(filters.q ? [{ key: 'q', label: `„${filters.q}"`, clear: () => { setQueryInput(''); setParams({ q: undefined }) } }] : []),
    ...(activeShop ? [{ key: 'shop', label: activeShop.name, clear: () => setParams({ shop: undefined }) }] : []),
    ...(filters.category ? [{ key: 'category', label: activeCategory?.name ?? filters.category, clear: () => setParams({ kategorija: undefined }) }] : []),
    ...filters.brands.map(brand => ({ key: `brand-${brand}`, label: brand, clear: () => setBrands(filters.brands.filter(b => b !== brand)) })),
    ...(filters.min || filters.max ? [{
      key: 'price',
      label: filters.min && filters.max ? `${filters.min} do ${filters.max} €` : filters.min ? `od ${filters.min} €` : `do ${filters.max} €`,
      clear: () => setPrice('', ''),
    }] : []),
    ...(filters.sale ? [{ key: 'sale', label: 'Na akciji', clear: () => setSale(false) }] : []),
  ]

  const panelFilterCount = filters.brands.length + (filters.min || filters.max ? 1 : 0) + (filters.sale ? 1 : 0)
  const shopTotal = facets ? facets.shops.reduce((sum, s) => sum + s.count, 0) : 0

  const panel = (
    <FilterPanel facets={facets} brands={filters.brands} min={filters.min} max={filters.max} sale={filters.sale}
      onBrands={setBrands} onPrice={setPrice} onSale={setSale} />
  )

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in min-h-screen pb-24 pt-[92px] lg:pb-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <header className="flex flex-col gap-5 pb-6 pt-3 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="display text-[3.2rem] sm:text-7xl">Katalog</h1>
            <div className="relative w-full lg:max-w-md">
              <Search size={19} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input type="search" aria-label="Pretraži proizvode" placeholder="Kolica, Cybex, bočica..." value={queryInput} onChange={e => setQueryInput(e.target.value)}
                className="min-h-[54px] w-full rounded-full border-2 border-transparent bg-surface pl-12 pr-11 text-base shadow-float transition-colors placeholder:text-muted/70 focus:border-[rgb(var(--focus))] focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
              {queryInput && (
                <button aria-label="Očisti pretragu" onClick={() => setQueryInput('')} className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2"><X size={17} /></button>
              )}
            </div>
          </header>

          {/* Shop first, then categories: it scopes everything below it. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4">
            <span className="font-display text-base font-extrabold tracking-tight">Dućan</span>
            {facets ? (
              <Segmented label="Dućan" value={filters.shop} onChange={slug => setParams({ shop: slug || undefined })}
                options={[{ value: '', label: 'Svi', count: shopTotal }, ...facets.shops.map(s => ({ value: s.slug, label: s.name, count: s.count }))]} />
            ) : <div className="shimmer h-12 w-80 max-w-full rounded-full" />}
          </div>

          {facets ? (
            <CategoryRail tree={facets.categories} active={filters.category} onPick={slug => setParams({ kategorija: slug })} />
          ) : <div className="shimmer h-36 rounded-3xl" />}

          <div className="mt-8 flex gap-10" ref={resultsRef}>
            <aside className="no-scrollbar sticky top-[92px] hidden max-h-[calc(100dvh-108px)] w-64 flex-shrink-0 self-start overflow-y-auto pb-4 pl-0.5 pr-1 lg:block" aria-label="Filteri">
              {panel}
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="font-display text-lg font-extrabold tabular-nums tracking-tight" aria-live="polite">
                  {everLoaded ? <>{total.toLocaleString('hr-HR')} {proizvoda(total)}</> : <span className="shimmer inline-block h-6 w-32 rounded-lg align-middle" />}
                </p>
                <ul className="flex flex-wrap items-center gap-1.5">
                  <AnimatePresence initial={false}>
                    {applied.map(item => (
                      <m.li key={item.key} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}>
                        <button onClick={item.clear} aria-label={`Ukloni filter: ${item.label}`}
                          className="chip min-h-[34px] bg-sun-soft pr-2 text-ink transition-colors hover:bg-sun hover:text-coal">
                          <span className="max-w-[12rem] truncate">{item.label}</span><X size={14} strokeWidth={3} aria-hidden />
                        </button>
                      </m.li>
                    ))}
                  </AnimatePresence>
                  {applied.length > 1 && (
                    <li><button onClick={resetAll} className="min-h-[34px] px-2 text-[13px] font-semibold underline underline-offset-2">Očisti sve</button></li>
                  )}
                </ul>
                <SortSelect value={filters.sort} onChange={value => setParams({ sort: value || undefined })} className="ml-auto hidden lg:block" />
              </div>

              {!everLoaded && loading ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-5" aria-busy="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i}>
                      <div className="shimmer aspect-square rounded-3xl" />
                      <div className="shimmer mt-3 h-3.5 w-1/2 rounded-full" />
                      <div className="shimmer mt-2 h-3.5 w-5/6 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="py-16 text-center">
                  <Art name="moon" className="tone-cobalt mx-auto h-20 w-20" />
                  <h2 className="mt-3 text-2xl font-extrabold">Katalog se nije učitao.</h2>
                  <p className="mx-auto mt-2 max-w-sm text-muted">{loadError}</p>
                  <button onClick={() => setReloadKey(k => k + 1)} className="btn btn-ink mt-5">Pokušaj ponovno</button>
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center">
                  <span className="tone-bubble mx-auto block w-24"><Art name="bear" /></span>
                  <h2 className="mt-3 text-2xl font-extrabold">Nema proizvoda s tim filterima.</h2>
                  <p className="mx-auto mt-2 max-w-sm text-muted">Makni koji filter ili promijeni pretragu.</p>
                  {applied.length > 0 && <button onClick={resetAll} className="btn btn-ink mt-5">Očisti sve filtere</button>}
                </div>
              ) : (
                <>
                  <div className={clsx('grid grid-cols-2 gap-x-3 gap-y-7 transition-opacity duration-200 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-5', loading && 'opacity-50')} aria-busy={loading}>
                    {products.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={i} onAddToList={handleAddClick} isOnList={listProductIds.has(product.id)} />
                    ))}
                  </div>

                  <div className="mx-auto mt-12 max-w-xs text-center">
                    <p className="text-sm font-medium text-muted">Pregledano {products.length.toLocaleString('hr-HR')} od {total.toLocaleString('hr-HR')}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/10" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={products.length} aria-label="Pregledano proizvoda">
                      <m.div className="h-full rounded-full bg-tomato" animate={{ width: `${total ? (products.length / total) * 100 : 0}%` }} />
                    </div>
                    {products.length < total && (
                      <button onClick={loadMore} disabled={loadingMore} className="btn btn-ink mt-5 w-full">{loadingMore ? 'Učitavam...' : 'Prikaži još'}</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Phones: filters stay one thumb away. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 bg-gradient-to-t from-canvas via-canvas/90 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-5 lg:hidden">
        <button onClick={() => setFiltersOpen(true)} className="btn btn-ink flex-1 shadow-float">
          <SlidersHorizontal size={17} aria-hidden /> Filteri
          {panelFilterCount > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sun px-1.5 text-[13px] text-coal">{panelFilterCount}</span>}
        </button>
        <SortSelect value={filters.sort} onChange={value => setParams({ sort: value || undefined })} className="flex-1 rounded-full bg-surface shadow-float [&_select]:min-h-[48px]" />
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <Modal key="filters" title="Filteri" onClose={() => setFiltersOpen(false)} sheet>
            <div className="px-5 pb-4 sm:px-7">{panel}</div>
            <div className="sticky bottom-0 border-t border-line/10 bg-surface px-5 py-3 sm:px-7">
              <button onClick={() => setFiltersOpen(false)} className="btn btn-primary w-full">
                Prikaži {total.toLocaleString('hr-HR')} {proizvoda(total)}
              </button>
            </div>
          </Modal>
        )}
        {selectedProduct && (
          <AddToListModal key="add" product={selectedProduct} lists={userLists} onClose={() => setSelectedProduct(null)}
            onAdded={msg => {
              setListProductIds(prev => new Set(prev).add(selectedProduct.id))
              setSelectedProduct(null)
              showToast(msg)
              loadLists()
            }} />
        )}
      </AnimatePresence>

      <Toast message={toast} />
    </>
  )
}
