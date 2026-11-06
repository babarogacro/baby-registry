'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, apiError } from '@/lib/api'
import { Download, FileSpreadsheet, Loader2, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'

/**
 * Monthly statement for shops, by the merchant price list: every click into a shop with the
 * product price and what the click costs, purchases with the 10 % commission, and the prepaid
 * balance clicks are paid from. Mirrors backend/src/services/billing.ts.
 */

interface Tier { label: string; cpc: number; clicks: number; amount: number }
interface ProductRow { productId: string | null; name: string; sku: string | null; price: number; cpc: number; clicks: number; repeat: number; amount: number }
interface Order { id: string; createdAt: string; orderId: string | null; clickId: string | null; clickAt: string | null; value: number; currency: string; status: string; channel: string | null; items: string | null; commission: number }
interface ShopBill {
  slug: string; name: string
  clicks: { total: number; billable: number; repeat: number; amount: number }
  tiers: Tier[]
  products: ProductRow[]
  orders: Order[]
  orderTotals: { count: number; value: number; commission: number; excluded: number }
  total: number
  balance: { paid: number; spent: number; balance: number; hasTopUps: boolean }
  topUps: { id: string; amount: number; note: string | null; paidAt: string }[]
}
interface Billing { month: string; commissionRate: number; shops: ShopBill[]; totals: { clicks: number; commission: number; total: number } }

const nf = new Intl.NumberFormat('hr-HR')
const eur = (v: number) => new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(v)
const MONTHS = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac']
const monthLabel = (m: string) => { const [y, mm] = m.split('-').map(Number); return `${MONTHS[mm - 1]} ${y}.` }
const thisMonth = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' }).slice(0, 7)
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' })
const dateTime = (iso: string) => new Date(iso).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
const STATUS = [
  { value: 'reported', label: 'Naplaćuje se' },
  { value: 'returned', label: 'Vraćeno' },
  { value: 'rejected', label: 'Odbijeno' },
  { value: 'expired', label: 'Izvan 30 dana' },
]

function lastMonths(n: number) {
  const [y, m] = thisMonth().split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className={clsx('rounded-3xl p-4', tone === 'bad' ? 'bg-tomato-soft' : tone === 'warn' ? 'bg-sun-soft' : 'bg-sunken/70')}>
      <p className="display text-[1.7rem] leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function Table({ head, rows, total, empty = 'Nema stavki u ovom mjesecu.', minWidth = 520 }: {
  head: string[]; rows: React.ReactNode[][]; total?: React.ReactNode[]; empty?: string; minWidth?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line/10 text-left text-xs text-muted">
            {head.map((h, i) => <th key={h} className={clsx('py-2 pr-3 font-semibold', i > 0 && 'text-right')}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.length === 0 && <tr><td colSpan={head.length} className="py-3 text-muted">{empty}</td></tr>}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/[0.06]">
              {r.map((c, j) => <td key={j} className={clsx('py-2 pr-3', j > 0 && 'text-right')}>{c}</td>)}
            </tr>
          ))}
          {total && (
            <tr className="border-t-2 border-ink font-bold">
              {total.map((c, j) => <td key={j} className={clsx('py-2 pr-3', j > 0 && 'text-right')}>{c}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

async function download(format: 'pdf' | 'csv', month: string, shop: string) {
  const res = await adminApi.getStatement(format, { month, shop })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `listica-obracun-${shop}-${month}.${format}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function TopUps({ shop, onChange }: { shop: ShopBill; onChange: () => void }) {
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(today())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!(value > 0)) { setError('Upiši iznos uplate'); return }
    setBusy(true); setError('')
    try {
      await adminApi.addTopUp({ shopSlug: shop.slug, amount: value, note: note.trim() || undefined, paidAt })
      setAmount(''); setNote('')
      onChange()
    } catch (err) { setError(apiError(err)) } finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); return }
    setBusy(true)
    try { await adminApi.deleteTopUp(id); setConfirmId(null); onChange() } catch (err) { setError(apiError(err)) } finally { setBusy(false) }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-bold">Uplate na saldo za klikove</p>
      {shop.topUps.length === 0 ? <p className="mb-3 text-sm text-muted">Još nema uplata.</p> : (
        <ul className="mb-3 divide-y divide-line/[0.06] text-sm">
          {shop.topUps.map(t => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span className="w-24 tabular-nums text-muted">{new Date(t.paidAt).toLocaleDateString('hr-HR', { timeZone: 'Europe/Zagreb' })}</span>
              <span className="flex-1 truncate">{t.note || 'Uplata'}</span>
              <span className="font-semibold tabular-nums">{eur(t.amount)}</span>
              <button onClick={() => remove(t.id)} disabled={busy} className={clsx('btn btn-sm', confirmId === t.id ? 'btn-danger' : 'btn-soft')} aria-label="Obriši uplatu">
                {confirmId === t.id ? 'Sigurno?' : <Trash2 size={14} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">Iznos (€)
          <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="npr. 100" className="field !mt-1 !min-h-[42px] w-28 !py-1.5 !text-sm" />
        </label>
        <label className="text-xs font-semibold text-muted">Datum uplate
          <input type="date" value={paidAt} max={today()} onChange={e => setPaidAt(e.target.value)} className="field !mt-1 !min-h-[42px] !py-1.5 !text-sm" />
        </label>
        <label className="min-w-[10rem] flex-1 text-xs font-semibold text-muted">Napomena
          <input value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="npr. račun 12/2026" className="field !mt-1 !min-h-[42px] !py-1.5 !text-sm" />
        </label>
        <button type="submit" disabled={busy} className="btn btn-sm btn-primary"><Plus size={15} aria-hidden /> Dodaj uplatu</button>
      </form>
      {error && <p role="alert" className="field-error mt-2">{error}</p>}
    </div>
  )
}

function ShopStatement({ shop, month, rate, onChange }: { shop: ShopBill; month: string; rate: number; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [allProducts, setAllProducts] = useState(false)
  const [error, setError] = useState('')
  const low = shop.balance.hasTopUps && shop.balance.balance < 10
  const products = allProducts ? shop.products : shop.products.slice(0, 15)

  const get = async (format: 'pdf' | 'csv') => {
    setBusy(format); setError('')
    try { await download(format, month, shop.slug) } catch (err) { setError(apiError(err, 'Obračun se ne može izraditi.')) } finally { setBusy(null) }
  }
  const setStatus = async (id: string, status: string) => {
    setError('')
    try { await adminApi.setConversionStatus(id, status); onChange() } catch (err) { setError(apiError(err)) }
  }

  return (
    <div className="rounded-3xl border border-line/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{shop.name}</h3>
        <div className="flex gap-2">
          <button onClick={() => get('pdf')} disabled={!!busy} className="btn btn-sm btn-primary">
            {busy === 'pdf' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />} Obračun PDF
          </button>
          <button onClick={() => get('csv')} disabled={!!busy} className="btn btn-sm btn-soft">
            {busy === 'csv' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <FileSpreadsheet size={15} aria-hidden />} CSV
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Klikovi koji se naplaćuju" value={nf.format(shop.clicks.billable)} hint={shop.clicks.repeat ? `+${nf.format(shop.clicks.repeat)} ponovljenih, bez naplate` : undefined} />
        <Tile label="Iznos klikova" value={eur(shop.clicks.amount)} hint="sa salda" />
        <Tile label="Narudžbe s Listice" value={nf.format(shop.orderTotals.count)} hint={eur(shop.orderTotals.value)} />
        <Tile label={`Provizija ${nf.format(rate * 100)} %`} value={eur(shop.orderTotals.commission)} hint={shop.orderTotals.excluded ? `${nf.format(shop.orderTotals.excluded)} narudžbi se ne naplaćuje` : undefined} />
        <Tile label="Ukupno za mjesec" value={eur(shop.total)} hint="klikovi + provizija" />
        <Tile label="Saldo za klikove" value={eur(shop.balance.balance)}
          hint={shop.balance.hasTopUps ? `uplaćeno ${eur(shop.balance.paid)}, potrošeno ${eur(shop.balance.spent)}` : `još nema uplata, potrošeno ${eur(shop.balance.spent)}`}
          tone={shop.balance.hasTopUps && shop.balance.balance < 0 ? 'bad' : low ? 'warn' : undefined} />
      </div>

      <details className="group mt-4">
        <summary className="cursor-pointer select-none text-sm font-bold underline decoration-2 underline-offset-4">Detalji: klikovi, proizvodi, narudžbe i uplate</summary>
        <div className="mt-4 space-y-6">
          <div>
            <p className="mb-2 text-sm font-bold">Klikovi po cijeni proizvoda</p>
            <Table head={['Cijena proizvoda', 'Cijena klika', 'Klikova', 'Iznos']}
              rows={shop.tiers.map(t => [<span key="l" className={clsx(!t.clicks && 'text-muted')}>{t.label}</span>, eur(t.cpc), nf.format(t.clicks), eur(t.amount)])}
              total={['Ukupno', '', nf.format(shop.clicks.billable), eur(shop.clicks.amount)]} minWidth={420} />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">Klikovi po proizvodu</p>
            <Table head={['Proizvod', 'Cijena', 'Klik', 'Klikova', 'Ponovljeni', 'Iznos']}
              rows={products.map(p => [
                <span key="n" className="block max-w-[22rem] truncate" title={p.name}>{p.name}{p.sku && <span className="text-muted"> · {p.sku}</span>}</span>,
                eur(p.price), eur(p.cpc), nf.format(p.clicks), nf.format(p.repeat), eur(p.amount),
              ])} minWidth={640} />
            {shop.products.length > 15 && (
              <button onClick={() => setAllProducts(v => !v)} className="mt-2 text-sm font-semibold underline underline-offset-2">
                {allProducts ? 'Prikaži manje' : `Prikaži svih ${nf.format(shop.products.length)}`}
              </button>
            )}
          </div>
          <div>
            <p className="mb-1 text-sm font-bold">Narudžbe s Listice</p>
            <p className="mb-2 text-xs text-muted">Provizija se računa samo za narudžbe sa statusom „Naplaćuje se“. Vraćenu ili lažnu narudžbu prebaci na „Vraćeno“ ili „Odbijeno“.</p>
            <Table head={['Vrijeme', 'Broj narudžbe', 'Klik', 'Vrijednost', 'Status', 'Provizija']}
              rows={shop.orders.map(o => [
                dateTime(o.createdAt),
                <span key="o" className="font-semibold">{o.orderId ?? 'bez broja'}</span>,
                <span key="c" className="text-xs text-muted" title={o.clickAt ? `klik ${dateTime(o.clickAt)}` : undefined}>{o.clickId ?? ''}</span>,
                eur(o.value),
                <select key="s" value={o.status} onChange={e => setStatus(o.id, e.target.value)} aria-label={`Status narudžbe ${o.orderId ?? ''}`}
                  className="rounded-lg border border-line/15 bg-surface px-2 py-1 text-xs font-semibold">
                  {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>,
                eur(o.commission),
              ])}
              total={['Ukupno', '', '', eur(shop.orderTotals.value), '', eur(shop.orderTotals.commission)]} minWidth={720} />
          </div>
          <TopUps shop={shop} onChange={onChange} />
        </div>
      </details>
      {error && <p role="alert" className="field-error mt-3">{error}</p>}
    </div>
  )
}

export default function BillingPanel({ shop }: { shop: string }) {
  const [month, setMonth] = useState(thisMonth())
  const [data, setData] = useState<Billing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const months = useMemo(() => lastMonths(12), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData((await adminApi.getBilling({ month, ...(shop ? { shop } : {}) })).data)
      setError('')
    } catch (err) {
      setError(apiError(err, 'Obračun se ne može učitati.'))
    } finally {
      setLoading(false)
    }
  }, [month, shop])

  useEffect(() => { load() }, [load])

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">Obračun za dućane</h2>
          <p className="mt-1 max-w-2xl text-[13px] text-muted">
            Po cjeniku za trgovce: klik u dućan stoji od 0,02 do 0,32 € ovisno o cijeni proizvoda i plaća se unaprijed sa salda, a na narudžbe s Listice ide {data ? nf.format(data.commissionRate * 100) : '10'} % provizije. Sve je bez PDV-a.
          </p>
        </div>
        <label className="text-xs font-semibold text-muted">Mjesec
          <select value={month} onChange={e => setMonth(e.target.value)} className="field !mt-1 !min-h-[42px] !py-1.5 !text-sm">
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="field-error mt-4 rounded-2xl bg-tomato-soft p-3">{error}</p>}
      {!data && loading && <div className="shimmer mt-4 h-40 rounded-3xl" />}
      {data && (
        <>
          {data.shops.length > 1 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Tile label="Klikovi, svi dućani" value={eur(data.totals.clicks)} />
              <Tile label="Provizija, svi dućani" value={eur(data.totals.commission)} />
              <Tile label={`Ukupno za ${monthLabel(data.month)}`} value={eur(data.totals.total)} />
            </div>
          )}
          <div className={clsx('mt-4 space-y-4', loading && 'opacity-60')}>
            {data.shops.map(s => <ShopStatement key={s.slug} shop={s} month={data.month} rate={data.commissionRate} onChange={load} />)}
          </div>
        </>
      )}
    </section>
  )
}
