'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, apiError } from '@/lib/api'
import { SITE_URL } from '@/lib/site'
import BillingPanel from './BillingPanel'
import Segmented from '@/components/Segmented'
import { Copy, Download, KeyRound, Loader2, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

// Mirrors backend/src/services/stats.ts
interface Named { name: string; visits?: number; count?: number }
interface TopProduct { id: string; name: string; shop: string; count: number }
interface Stats {
  period: { from: string; to: string; shop: string | null }
  traffic: {
    visits: number; sessions: number; pageviews: number; pagesPerVisit: number; avgTimePerVisitMs: number; bounceRate: number
    topPages: { path: string; views: number; avgMs: number | null }[]
    referrers: Named[]; devices: Named[]; campaigns: Named[]
  }
  users: { total: number; new: number; withList: number }
  lists: {
    total: number; new: number; occasions: Named[]
    itemsPerList: { avg: number; median: number; buckets: Named[] }
    views: number; viewedLists: number; listVisits: number
  }
  items: { added: number; total: number; addedValue: number }
  reservations: {
    count: number; value: number; total: number; starts: number; purchased: number; purchasedValue: number; purchasedTotal: number
    groupBuys: number; groupPledged: number; groupContributors: number
  }
  outbound: { clicks: number; clickers: number; clickRate: number; bySource: Named[] }
  engagement: { shares: number; searches: number; emptySearches: number }
  conversions: { count: number; value: number; matched: number }
  shops: { slug: string; name: string; clicks: number; added: number; reserved: number; purchased: number; reservedValue: number; conversions: number; conversionValue: number }[]
  top: { clicked: TopProduct[]; added: TopProduct[]; reserved: TopProduct[]; categories: Named[]; brands: Named[] }
  series: { date: string; visits: number; pageviews: number; users: number; lists: number; items: number; reservations: number; purchased: number; clicks: number }[]
}

interface Shop { slug: string; name: string; conversionKey?: string | null }

const nf = new Intl.NumberFormat('hr-HR')
const dec = (v: number, d = 1) => new Intl.NumberFormat('hr-HR', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v)
const eur = (v: number) => new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(v)
const pct = (v: number) => `${dec(v * 100)} %`
const dur = (ms: number) => {
  const s = Math.round(ms / 1000)
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`
}
const zagrebDay = (offsetDays = 0) => new Date(Date.now() - offsetDays * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' })
const shortDate = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)}. ${Number(m)}.` }

const OCCASION_LABEL: Record<string, string> = { birth: 'Rođenje', birthday: 'Dječji rođendan', other: 'Ostalo', 'bez prigode': 'Bez prigode' }
const DEVICE_LABEL: Record<string, string> = { mobile: 'Mobitel', desktop: 'Računalo', tablet: 'Tablet' }
const SOURCE_LABEL: Record<string, string> = { katalog: 'Katalog', lista: 'Javna Listica (gosti)', 'moja-lista': 'Moje Listice (roditelji)', naslovnica: 'Naslovnica', blog: 'Blog', dodaj: 'Dodavanje' }

type Range = '7' | '30' | '90' | '365' | 'custom'
type Metric = 'visits' | 'pageviews' | 'reservations' | 'purchased' | 'clicks' | 'items' | 'lists' | 'users'
const METRICS: { value: Metric; label: string }[] = [
  { value: 'visits', label: 'Posjeti' },
  { value: 'pageviews', label: 'Prikazi' },
  { value: 'clicks', label: 'Klikovi u dućan' },
  { value: 'items', label: 'Dodano na Listice' },
  { value: 'reservations', label: 'Rezervacije' },
  { value: 'purchased', label: 'Kupljeno' },
  { value: 'lists', label: 'Nove Listice' },
  { value: 'users', label: 'Novi korisnici' },
]

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl bg-sunken/70 p-4">
      <p className="display text-[1.9rem] leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card min-w-0 p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
      {note && <p className="mt-1 text-[13px] text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Ranked list with a thin bar per row; the number sits in ink, the bar only carries size. */
function Bars({ rows, empty = 'Nema podataka u ovom razdoblju.', format = (v: number) => nf.format(v) }: {
  rows: { label: string; value: number; sub?: string }[]
  empty?: string
  format?: (v: number) => string
}) {
  if (rows.length === 0) return <p className="py-3 text-sm text-muted">{empty}</p>
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-ink" title={r.label}>{r.label}{r.sub && <span className="font-medium text-muted"> · {r.sub}</span>}</span>
            <span className="flex-shrink-0 tabular-nums text-muted">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-line/[0.07]">
            <div className="h-full rounded-full bg-cobalt" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** One measure per chart, bars from a zero baseline, a tooltip on hover or tap. */
function DailyChart({ series, metric }: { series: Stats['series']; metric: Metric }) {
  const [hover, setHover] = useState<number | null>(null)
  const values = series.map(s => s[metric])
  const max = Math.max(1, ...values)
  const total = values.reduce((a, b) => a + b, 0)
  const H = 180
  const W = Math.max(series.length * 14, 320)
  const slot = W / series.length
  const barW = Math.max(2, Math.min(16, slot - 2))
  const ticks = [0, Math.round(max / 2), max]
  const labelStep = Math.ceil(series.length / 8)
  const label = METRICS.find(m => m.value === metric)?.label

  return (
    <div>
      <p className="mb-2 text-[13px] text-muted">Ukupno u razdoblju: <strong className="text-ink">{nf.format(total)}</strong></p>
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${W + 36} ${H + 26}`} className="h-[220px] w-full min-w-[480px]" role="img" aria-label={`${label} po danu`} onMouseLeave={() => setHover(null)}>
          {ticks.map(t => {
            const y = H - (t / max) * (H - 10)
            return (
              <g key={t}>
                <line x1={36} x2={W + 36} y1={y} y2={y} stroke="rgb(var(--line) / 0.1)" strokeWidth={1} />
                <text x={30} y={y + 4} textAnchor="end" fontSize={10} fill="rgb(var(--muted))">{nf.format(t)}</text>
              </g>
            )
          })}
          {series.map((s, i) => {
            const v = s[metric]
            const h = (v / max) * (H - 10)
            const x = 36 + i * slot + (slot - barW) / 2
            return (
              <g key={s.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
                <rect x={36 + i * slot} y={0} width={slot} height={H} fill="transparent" />
                {v > 0 && <rect x={x} y={H - h} width={barW} height={h} rx={Math.min(3, barW / 2)} fill={hover === i ? 'rgb(var(--ink))' : 'rgb(var(--cobalt))'} />}
                {i % labelStep === 0 && <text x={36 + i * slot + slot / 2} y={H + 16} textAnchor="middle" fontSize={10} fill="rgb(var(--muted))">{shortDate(s.date)}</text>}
              </g>
            )
          })}
        </svg>
        {hover !== null && series[hover] && (
          <div className="pointer-events-none absolute top-0 rounded-xl bg-ink px-3 py-2 text-xs text-canvas shadow-float"
            style={{ left: `clamp(0px, calc(${((hover + 0.5) / series.length) * 100}% - 60px), calc(100% - 140px))` }}>
            <p className="font-semibold">{shortDate(series[hover].date)}{series[hover].date.slice(0, 4)}.</p>
            <p>{label}: <strong>{nf.format(series[hover][metric])}</strong></p>
          </div>
        )}
      </div>
    </div>
  )
}

/** The two Tag Manager tags from the merchant presentation, ready to copy, plus the server-side call. */
const TAG_A = `<script>
(function () {
  var m = location.search.match(/[?&]lc_click=([^&]+)/);
  if (!m) return;
  document.cookie = '_lc_click=' + m[1] +
    '; max-age=2592000; path=/; SameSite=Lax'; // 30 dana
})();
</script>`

const tagB = (site: string) => `<script>
(function () {
  var c = document.cookie.match(/_lc_click=([^;]+)/);
  if (!c) return; // narudžba nije s Listice
  var e = {{DLV - ecommerce}};
  new Image().src = '${site}/api/konverzija' +
    '?click=' + c[1] +
    '&order=' + encodeURIComponent(e.transaction_id) +
    '&value=' + e.value + '&currency=' + (e.currency || 'EUR');
})();
</script>`

const serverCall = (site: string) => `POST ${site}/api/konverzija
Content-Type: application/json

{"click": "lc_8f3a2b91c4d5e6f7", "order": "100234", "value": 449.00, "currency": "EUR", "items": ["1313865"]}`

function ConversionKeys({ shops, onUpdate }: { shops: Shop[]; onUpdate: (slug: string, key: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500) } catch {}
  }
  const generate = async (slug: string) => {
    setBusy(slug); setError('')
    try { onUpdate(slug, (await adminApi.createConversionKey(slug)).data.conversionKey) } catch (err) { setError(apiError(err)) } finally { setBusy(null) }
  }
  const blocks = [
    { id: 'tag-a', label: 'Tag A: Listica, spremi klik (Custom HTML, okidač All Pages)', text: TAG_A },
    { id: 'tag-b', label: 'Tag B: Listica, kupnja (Custom HTML, okidač Custom Event purchase)', text: tagB(SITE_URL) },
    { id: 'server', label: 'Ili javljanje sa servera, nakon potvrde narudžbe (WooCommerce, Shopify)', text: serverCall(SITE_URL) },
  ]

  return (
    <Section title="Praćenje kupnji u dućanu"
      note="Ovo dućan postavlja na svoj web, kao u prezentaciji za trgovce. Oba taga se pokreću tek uz privolu za marketinške kolačiće. Narudžba se prihvaća samo ako nosi pravi lc_click s Listice, a pripisuje se Listici do 30 dana od klika.">
      <div className="space-y-3">
        {blocks.map(block => (
          <div key={block.id}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted">{block.label}</p>
              <button onClick={() => copy(block.text, block.id)} className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold underline underline-offset-2">
                <Copy size={12} aria-hidden /> {copied === block.id ? 'Kopirano' : 'Kopiraj'}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-sunken p-3 text-[11px] leading-relaxed">{block.text}</pre>
          </div>
        ))}
      </div>

      <p className="mb-2 mt-6 text-sm font-bold">Ključ dućana (nije obavezan)</p>
      <p className="mb-3 text-[13px] text-muted">Bez ključa vrijedi prva prijava narudžbe. Dućan koji šalje zaglavlje x-shop-key sa svojim ključem može i ispraviti iznos narudžbe koju je već javio. Novi ključ poništava stari.</p>
      <ul className="space-y-2">
        {shops.map(shop => (
          <li key={shop.slug} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line/10 p-3">
            <p className="font-semibold">{shop.name}</p>
            {shop.conversionKey && (
              <button onClick={() => copy(shop.conversionKey!, shop.slug)} className="flex min-w-0 items-center gap-1 text-xs text-muted">
                <Copy size={12} aria-hidden /> <span className="truncate font-mono">{copied === shop.slug ? 'Kopirano' : `${shop.conversionKey.slice(0, 10)}...`}</span>
              </button>
            )}
            <button onClick={() => generate(shop.slug)} disabled={busy === shop.slug} className="btn btn-sm btn-soft ml-auto">
              {busy === shop.slug ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <KeyRound size={15} aria-hidden />}
              {shop.conversionKey ? 'Novi ključ' : 'Napravi ključ'}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="field-error mt-3">{error}</p>}
    </Section>
  )
}

export default function StatsPanel() {
  const [range, setRange] = useState<Range>('30')
  const [from, setFrom] = useState(zagrebDay(29))
  const [to, setTo] = useState(zagrebDay(0))
  const [shop, setShop] = useState('')
  const [shops, setShops] = useState<Shop[]>([])
  const [metric, setMetric] = useState<Metric>('visits')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => { adminApi.getShops().then(r => setShops(r.data)).catch(() => {}) }, [])

  const pickRange = (value: Range) => {
    setRange(value)
    if (value !== 'custom') { setFrom(zagrebDay(Number(value) - 1)); setTo(zagrebDay(0)) }
  }

  const params = useMemo(() => ({ from, to, ...(shop ? { shop } : {}) }), [from, to, shop])

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await adminApi.getAnalytics(params)
      setStats(res.data)
      setError('')
      setUpdatedAt(new Date())
    } catch (err) {
      setError(apiError(err, 'Statistike se ne mogu učitati.'))
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { load() }, [load])
  // Live: refresh quietly every minute while the tab is open and visible.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(true) }, 60_000)
    return () => clearInterval(t)
  }, [load])

  const downloadPdf = async () => {
    setPdfBusy(true)
    try {
      const res = await adminApi.getStatsPdf(params)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `listica-statistike-${from}-${to}${shop ? `-${shop}` : ''}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (err) {
      setError(apiError(err, 'PDF se ne može izraditi.'))
    } finally {
      setPdfBusy(false)
    }
  }

  const s = stats
  const shopName = shops.find(x => x.slug === shop)?.name

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Segmented label="Razdoblje" value={range} onChange={pickRange}
          options={[{ value: '7', label: '7 dana' }, { value: '30', label: '30 dana' }, { value: '90', label: '90 dana' }, { value: '365', label: 'Godina' }, { value: 'custom', label: 'Od do' }]} />
        {range === 'custom' && (
          <div className="flex items-end gap-2">
            <label className="text-xs font-semibold text-muted">Od
              <input type="date" value={from} max={to} onChange={e => e.target.value && setFrom(e.target.value)} className="field !mt-1 !min-h-[42px] !py-1.5 !text-sm" />
            </label>
            <label className="text-xs font-semibold text-muted">Do
              <input type="date" value={to} min={from} max={zagrebDay(0)} onChange={e => e.target.value && setTo(e.target.value)} className="field !mt-1 !min-h-[42px] !py-1.5 !text-sm" />
            </label>
          </div>
        )}
        <label className="text-xs font-semibold text-muted">Dućan
          <select value={shop} onChange={e => setShop(e.target.value)} className="field !mt-1 !min-h-[42px] !py-1.5 !text-sm">
            <option value="">Svi dućani</option>
            {shops.map(x => <option key={x.slug} value={x.slug}>{x.name}</option>)}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => load()} className="icon-btn" aria-label="Osvježi"><RefreshCw size={17} className={clsx(loading && 'animate-spin')} aria-hidden /></button>
          <button onClick={downloadPdf} disabled={pdfBusy || !s} className="btn btn-sm btn-primary">
            {pdfBusy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />} Preuzmi PDF
          </button>
        </div>
        <p className="w-full text-xs text-muted">
          {updatedAt ? `Osvježeno u ${updatedAt.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}. Podaci se osvježavaju svake minute.` : 'Učitavam...'}
          {shop && ' Filtar po dućanu vrijedi za proizvode, rezervacije, kupnje i klikove; promet weba je za cijeli web.'}
        </p>
      </div>

      {error && <p role="alert" className="field-error rounded-2xl bg-tomato-soft p-3">{error}</p>}
      {!s && loading && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-28 rounded-3xl" />)}</div>}

      {s && (
        <>
          <Section title="Promet weba" note="Bez kolačića: posjetitelj se prepoznaje samo unutar jednog dana, pa je posjet jedna osoba u jednom danu.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile label="Posjeti" value={nf.format(s.traffic.visits)} />
              <Tile label="Sesije" value={nf.format(s.traffic.sessions)} hint="nova nakon 30 min pauze" />
              <Tile label="Prikazi stranica" value={nf.format(s.traffic.pageviews)} />
              <Tile label="Stranica po posjetu" value={dec(s.traffic.pagesPerVisit)} />
              <Tile label="Vrijeme po posjetu" value={dur(s.traffic.avgTimePerVisitMs)} hint="dok je stranica na ekranu" />
              <Tile label="Samo jedna stranica" value={pct(s.traffic.bounceRate)} />
            </div>
          </Section>

          <Section title="Po danima">
            <Segmented className="mb-4" label="Mjera" value={metric} onChange={setMetric} options={METRICS} />
            <DailyChart series={s.series} metric={metric} />
          </Section>

          <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-2">
            <Section title="Korisnici i Listice">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Tile label="Novi korisnici" value={nf.format(s.users.new)} hint={`ukupno ${nf.format(s.users.total)}`} />
                <Tile label="Korisnika s Listicom" value={nf.format(s.users.withList)} hint={s.users.total ? `${pct(s.users.withList / s.users.total)} svih` : undefined} />
                <Tile label="Nove Listice" value={nf.format(s.lists.new)} hint={`ukupno ${nf.format(s.lists.total)}`} />
                <Tile label="Proizvoda po Listici" value={dec(s.lists.itemsPerList.avg)} hint={`medijan ${nf.format(s.lists.itemsPerList.median)}`} />
                <Tile label="Prikazi javnih Listica" value={nf.format(s.lists.views)} hint={`${nf.format(s.lists.viewedLists)} različitih Listica`} />
                <Tile label="Dijeljenja" value={nf.format(s.engagement.shares)} hint="otvoren prozor Podijeli" />
              </div>
              <div className="mt-5 grid gap-5 [&>*]:min-w-0 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold">Proizvoda na Listici</p>
                  <Bars rows={s.lists.itemsPerList.buckets.map(b => ({ label: b.name, value: b.count ?? 0 }))} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Prigoda</p>
                  <Bars rows={s.lists.occasions.map(o => ({ label: OCCASION_LABEL[o.name] ?? o.name, value: o.count ?? 0 }))} />
                </div>
              </div>
            </Section>

            <Section title="Pokloni" note={shop ? `Samo proizvodi iz dućana ${shopName}.` : undefined}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Tile label="Dodano na Listice" value={nf.format(s.items.added)} hint={eur(s.items.addedValue)} />
                <Tile label="Rezervirano" value={nf.format(s.reservations.count)} hint={eur(s.reservations.value)} />
                <Tile label="Kupljeno" value={nf.format(s.reservations.purchased)} hint={eur(s.reservations.purchasedValue)} />
                <Tile label="Skupljanja zajedno" value={nf.format(s.reservations.groupBuys)} hint={`${nf.format(s.reservations.groupContributors)} sudionika`} />
                <Tile label="Upisano u skupljanjima" value={eur(s.reservations.groupPledged)} />
                <Tile label="Na Listicama ukupno" value={nf.format(s.items.total)} hint={`${nf.format(s.reservations.total)} rezervirano`} />
              </div>
              <p className="mb-2 mt-5 text-sm font-bold">Od otvaranja Listice do kupnje</p>
              <Bars rows={[
                { label: 'Posjeti javnim Listicama', value: s.lists.listVisits },
                { label: 'Klik na Rezerviraj', value: s.reservations.starts },
                { label: 'Rezervirano', value: s.reservations.count },
                { label: 'Označeno kao kupljeno', value: s.reservations.purchased },
              ]} />
            </Section>
          </div>

          <Section title="Odlasci u dućan" note="Svaki link prema dućanu ide preko nas s oznakama utm_source=listica i utm_medium=wishlist, pa dućan taj promet u svom Google Analyticsu vidi kao listica / wishlist. Oznaka lc_click povezuje kupnju s klikom.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Klikovi u dućan" value={nf.format(s.outbound.clicks)} />
              <Tile label="Posjeta s klikom u dućan" value={pct(s.outbound.clickRate)} />
              <Tile label="Kupnje koje su javili dućani" value={nf.format(s.conversions.count)} hint={eur(s.conversions.value)} />
              <Tile label="Povezano s našim klikom" value={nf.format(s.conversions.matched)} hint="kupnja nosi lc_click" />
            </div>
            <div className="mt-5 grid gap-5 [&>*]:min-w-0 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold">Odakle se klika</p>
                <Bars rows={s.outbound.bySource.map(x => ({ label: SOURCE_LABEL[x.name] ?? x.name, value: x.count ?? 0 }))} />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Najviše klikova</p>
                <Bars rows={s.top.clicked.map(p => ({ label: p.name, sub: p.shop, value: p.count }))} />
              </div>
            </div>
          </Section>

          <Section title="Po dućanima">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line/10 text-left text-xs text-muted">
                    {['Dućan', 'Klikovi', 'Dodano', 'Rezervirano', 'Kupljeno', 'Vrijednost rezerviranog', 'Javljene kupnje'].map((h, i) => (
                      <th key={h} className={clsx('py-2 pr-3 font-semibold', i > 0 && 'text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.shops.map(x => (
                    <tr key={x.slug} className="border-b border-line/[0.06] tabular-nums">
                      <td className="py-2.5 pr-3 font-semibold">{x.name}</td>
                      <td className="py-2.5 pr-3 text-right">{nf.format(x.clicks)}</td>
                      <td className="py-2.5 pr-3 text-right">{nf.format(x.added)}</td>
                      <td className="py-2.5 pr-3 text-right">{nf.format(x.reserved)}</td>
                      <td className="py-2.5 pr-3 text-right">{nf.format(x.purchased)}</td>
                      <td className="py-2.5 pr-3 text-right">{eur(x.reservedValue)}</td>
                      <td className="py-2.5 text-right">{nf.format(x.conversions)} · {eur(x.conversionValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-3">
            <Section title="Najčešće dodano"><Bars rows={s.top.added.map(p => ({ label: p.name, sub: p.shop, value: p.count }))} /></Section>
            <Section title="Najčešće rezervirano"><Bars rows={s.top.reserved.map(p => ({ label: p.name, sub: p.shop, value: p.count }))} /></Section>
            <Section title="Kategorije i brendovi">
              <Bars rows={s.top.categories.map(c => ({ label: c.name, value: c.count ?? 0 }))} />
              <p className="mb-2 mt-5 text-sm font-bold">Brendovi</p>
              <Bars rows={s.top.brands.map(c => ({ label: c.name, value: c.count ?? 0 }))} />
            </Section>
          </div>

          <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-3">
            <Section title="Najposjećenije stranice">
              <Bars rows={s.traffic.topPages.map(p => ({ label: p.path, sub: p.avgMs ? dur(p.avgMs) : undefined, value: p.views }))} />
            </Section>
            <Section title="Odakle dolaze">
              <Bars rows={[...s.traffic.referrers, ...s.traffic.campaigns].map(r => ({ label: r.name, value: r.visits ?? 0 }))} empty="Još nema dolazaka s drugih stranica." />
            </Section>
            <Section title="Uređaji i pretraga">
              <Bars rows={s.traffic.devices.map(d => ({ label: DEVICE_LABEL[d.name] ?? d.name, value: d.visits ?? 0 }))} />
              <p className="mb-2 mt-5 text-sm font-bold">Pronađi Listicu</p>
              <Bars rows={[
                { label: 'Pretrage', value: s.engagement.searches },
                { label: 'Bez rezultata', value: s.engagement.emptySearches },
              ]} />
            </Section>
          </div>

          <BillingPanel shop={shop} />

          <ConversionKeys shops={shops} onUpdate={(slug, key) => setShops(prev => prev.map(x => (x.slug === slug ? { ...x, conversionKey: key } : x)))} />
        </>
      )}
    </div>
  )
}
