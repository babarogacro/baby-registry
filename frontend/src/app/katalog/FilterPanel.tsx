'use client'
import { useEffect, useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { plural } from '@/lib/format'
import type { CatalogFacets } from '@/types'
import clsx from 'clsx'

const BRANDS_COLLAPSED = 8

// The budgets guests actually think in; each is one tap instead of dragging the slider.
const PRICE_PRESETS = [
  { label: 'do 20 €', min: '', max: '20' },
  { label: '20 do 50 €', min: '20', max: '50' },
  { label: '50 do 100 €', min: '50', max: '100' },
]

function Group({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-line/10 pt-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-extrabold tracking-tight">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function BrandFacet({ brands, selected, onChange }: { brands: CatalogFacets['brands']; selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('hr-HR')
    if (needle) return brands.filter(b => b.name.toLocaleLowerCase('hr-HR').includes(needle))
    // Ticked brands stay on top, also when the other filters leave them with no products.
    const ticked = selected.map(name => brands.find(b => b.name === name) ?? { name, count: 0 })
    const rest = brands.filter(b => !selected.includes(b.name))
    return expanded ? [...ticked, ...rest] : [...ticked, ...rest.slice(0, Math.max(0, BRANDS_COLLAPSED - ticked.length))]
  }, [brands, expanded, query, selected])

  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter(b => b !== name) : [...selected, name])

  return (
    <Group title="Brend" action={selected.length > 0 && (
      <button onClick={() => onChange([])} className="text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink">Poništi</button>
    )}>
      {brands.length > BRANDS_COLLAPSED && (
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" aria-label="Pretraži brendove" placeholder={`Među ${brands.length} brendova...`} value={query} onChange={e => setQuery(e.target.value)}
            className="field !min-h-[42px] !rounded-full !py-2 !pl-9 !text-sm" />
        </div>
      )}
      <ul className={clsx('space-y-0.5', expanded && 'max-h-72 overflow-y-auto pr-1')}>
        {visible.map(brand => {
          const checked = selected.includes(brand.name)
          return (
            <li key={brand.name}>
              <label className="group flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-xl px-1.5 transition-colors hover:bg-line/[0.05]">
                <input type="checkbox" checked={checked} onChange={() => toggle(brand.name)} className="peer sr-only" />
                <span className={clsx('flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-150 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:[outline-color:rgb(var(--focus))]',
                  checked ? 'border-ink bg-ink text-canvas' : 'border-line/25 group-hover:border-line/50')}>
                  {checked && <Check size={14} strokeWidth={3.5} aria-hidden />}
                </span>
                <span className={clsx('min-w-0 flex-1 truncate text-[15px]', checked ? 'font-semibold' : 'font-medium')}>{brand.name}</span>
                <span className="flex-shrink-0 text-xs font-medium tabular-nums text-muted">{brand.count.toLocaleString('hr-HR')}</span>
              </label>
            </li>
          )
        })}
        {visible.length === 0 && <li className="px-1.5 py-2 text-sm text-muted">Nema takvog brenda.</li>}
      </ul>
      {!query && brands.length > BRANDS_COLLAPSED && (
        <button onClick={() => setExpanded(v => !v)} className="mt-2 min-h-[36px] px-1.5 text-sm font-semibold underline underline-offset-2">
          {expanded ? 'Prikaži manje' : `Prikaži sve (${brands.length})`}
        </button>
      )}
    </Group>
  )
}

function PriceFacet({ buckets, min, max, onChange }: {
  buckets: CatalogFacets['priceBuckets']
  min: string
  max: string
  onChange: (min: string, max: string) => void
}) {
  const edges = useMemo(() => [...buckets.map(b => b.from), Infinity], [buckets])
  const last = edges.length - 1

  const indexOf = (value: string, fallback: number) => {
    const n = parseFloat(value)
    if (isNaN(n)) return fallback
    let i = 0
    while (i < last && edges[i + 1] <= n) i++
    return i
  }

  const [lo, setLo] = useState(() => indexOf(min, 0))
  const [hi, setHi] = useState(() => (max ? Math.min(last, indexOf(max, last) + (edges.includes(parseFloat(max)) ? 0 : 1)) : last))

  useEffect(() => {
    setLo(indexOf(min, 0))
    setHi(max ? Math.min(last, indexOf(max, last) + (edges.includes(parseFloat(max)) ? 0 : 1)) : last)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, last])

  const commit = (nextLo = lo, nextHi = hi) => {
    onChange(nextLo === 0 ? '' : String(edges[nextLo]), nextHi === last ? '' : String(edges[nextHi]))
  }

  const peak = Math.max(1, ...buckets.map(b => b.count))
  const filtered = !!(min || max)

  return (
    <Group title="Cijena" action={filtered && (
      <button onClick={() => onChange('', '')} className="text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-ink">Poništi</button>
    )}>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Brzi odabir cijene">
        {PRICE_PRESETS.map(preset => {
          const active = min === preset.min && max === preset.max
          return (
            <button key={preset.label} type="button" aria-pressed={active}
              onClick={() => (active ? onChange('', '') : onChange(preset.min, preset.max))}
              className="choice min-h-[40px] px-3 text-[13px] font-semibold">
              {preset.label}
            </button>
          )
        })}
      </div>
      <div className="flex h-16 items-end gap-[3px]" role="group" aria-label="Raspodjela cijena">
        {buckets.map((bucket, i) => {
          const inRange = i >= lo && i < hi
          const range = bucket.to === null ? `od ${bucket.from} €` : `od ${bucket.from} do ${bucket.to} €`
          return (
            <button key={bucket.from} type="button" disabled={bucket.count === 0} onClick={() => { setLo(i); setHi(i + 1); commit(i, i + 1) }}
              aria-label={`${range}, ${bucket.count} ${plural(bucket.count, 'proizvod', 'proizvoda', 'proizvoda')}`} title={range}
              className="group flex h-full min-w-0 flex-1 items-end disabled:cursor-default">
              <span className={clsx('block w-full rounded-t-[4px] transition-all duration-200', inRange ? 'bg-ink group-hover:bg-cobalt-ink' : 'bg-line/15 group-hover:bg-line/30')}
                style={{ height: `${Math.max(bucket.count ? 8 : 3, (Math.sqrt(bucket.count) / Math.sqrt(peak)) * 100)}%` }} />
            </button>
          )
        })}
      </div>
      <div className="dual-range -mt-[13px]">
        <input type="range" aria-label="Najniža cijena" min={0} max={last} step={1} value={lo}
          onChange={e => setLo(Math.min(Number(e.target.value), hi - 1))}
          onPointerUp={() => commit()} onKeyUp={() => commit()} />
        <input type="range" aria-label="Najviša cijena" min={0} max={last} step={1} value={hi}
          onChange={e => setHi(Math.max(Number(e.target.value), lo + 1))}
          onPointerUp={() => commit()} onKeyUp={() => commit()} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="price-min" className="mb-1 block text-[13px] font-semibold text-muted">Od (€)</label>
          <input id="price-min" type="number" inputMode="decimal" min={0} placeholder="0" defaultValue={min} key={`min-${min}`}
            onBlur={e => { if (e.target.value !== min) onChange(e.target.value, max) }}
            onKeyDown={e => { if (e.key === 'Enter') onChange(e.currentTarget.value, max) }}
            className="field !min-h-[42px] !rounded-xl !py-2" />
        </div>
        <div>
          <label htmlFor="price-max" className="mb-1 block text-[13px] font-semibold text-muted">Do (€)</label>
          <input id="price-max" type="number" inputMode="decimal" min={0} placeholder="max" defaultValue={max} key={`max-${max}`}
            onBlur={e => { if (e.target.value !== max) onChange(min, e.target.value) }}
            onKeyDown={e => { if (e.key === 'Enter') onChange(min, e.currentTarget.value) }}
            className="field !min-h-[42px] !rounded-xl !py-2" />
        </div>
      </div>
    </Group>
  )
}

export default function FilterPanel({ facets, brands, min, max, sale, onBrands, onPrice, onSale }: {
  facets: CatalogFacets | null
  brands: string[]
  min: string
  max: string
  sale: boolean
  onBrands: (next: string[]) => void
  onPrice: (min: string, max: string) => void
  onSale: (next: boolean) => void
}) {
  if (!facets) {
    return (
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => <div key={i} className="shimmer h-7 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="flex items-center justify-between gap-3">
        <label htmlFor="sale-switch" className="cursor-pointer">
          <span className="block font-display text-base font-extrabold tracking-tight">Samo na akciji</span>
          <span className="block text-[13px] font-medium text-muted">{facets.onSale.toLocaleString('hr-HR')} {plural(facets.onSale, 'proizvod', 'proizvoda', 'proizvoda')}</span>
        </label>
        <button id="sale-switch" role="switch" aria-checked={sale} onClick={() => onSale(!sale)} className="switch"><span /></button>
      </section>
      <BrandFacet brands={facets.brands} selected={brands} onChange={onBrands} />
      <PriceFacet buckets={facets.priceBuckets} min={min} max={max} onChange={onPrice} />
    </div>
  )
}
