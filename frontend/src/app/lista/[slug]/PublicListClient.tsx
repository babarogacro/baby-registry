'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, m } from 'motion/react'
import { publicApi, addRefToUrl, apiError } from '@/lib/api'
import { getMyReservations, rememberReservation, forgetReservation, lastUsedName, MyReservation } from '@/lib/myReservations'
import { categoryMeta, type Tone } from '@/lib/categories'
import { displayName, formatPrice, parseAmount, formatDateHR, plural, shopLabel } from '@/lib/format'
import { genderLabel } from '@/lib/occasions'
import { priorityLabel } from '@/lib/priorities'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Modal from '@/components/Modal'
import Loader from '@/components/Loader'
import Burst from '@/components/Burst'
import ProgressBar from '@/components/ProgressBar'
import Segmented from '@/components/Segmented'
import Vrtuljak, { type Hanger, type VrtuljakHandle } from '@/components/Vrtuljak'
import { Art, type ArtName } from '@/components/art'
import { Toast, useToast } from '@/components/Toast'
import { BabyList, ListItem, GroupContributor, Product } from '@/types'
import { AlertTriangle, ArrowUpRight, Check, Gift, ShoppingBag, StickyNote, Undo2, Users, Wallet } from 'lucide-react'
import clsx from 'clsx'

type Flow = { step: 'choose' | 'solo' | 'group' | 'join'; item: ListItem } | null
type MyMap = Record<string, MyReservation>

function shopLink(product: Product) {
  return product.productUrl ? addRefToUrl(product.productUrl) : undefined
}

function Thumb({ product, className, children }: { product: Product; className: string; children?: React.ReactNode }) {
  const meta = categoryMeta(product.category?.slug)
  return (
    <div className={clsx(`tone-${meta.tone}`, 'photo-tile relative flex flex-shrink-0 items-center justify-center overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain p-2" /> : <Art name={meta.art} className="h-3/5 w-3/5" />}
      {children}
    </div>
  )
}

function ProductSummary({ item }: { item: ListItem }) {
  const { product } = item
  return (
    <div className="mb-5 flex gap-3 rounded-3xl bg-sunken/70 p-3">
      <Thumb product={product} className="h-16 w-16 rounded-2xl" />
      <div className="min-w-0">
        {product.brand && <p className="text-[13px] font-bold text-muted">{product.brand}</p>}
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{displayName(product)}</p>
        {item.note && <p className="mt-0.5 text-[13px] text-muted">Napomena: {item.note}</p>}
        <p className="mt-0.5 text-[13px] text-muted">
          {product.price > 0 && <span className="font-display font-extrabold tracking-tight text-ink">{formatPrice(product.price, product.currency)}</span>}
          {product.price > 0 && ' · '}{shopLabel(product)}
        </p>
      </div>
    </div>
  )
}

function ChooseStep({ item, onPick }: { item: ListItem; onPick: (step: 'solo' | 'group') => void }) {
  return (
    <div className="px-5 pb-6 sm:px-7 sm:pb-7">
      <ProductSummary item={item} />
      <div className="space-y-2.5">
        <button onClick={() => onPick('solo')} className="tone-tomato choice flex w-full items-center gap-3 p-3 text-left">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-tone p-1.5"><Art name="gift" /></span>
          <span>
            <span className="block font-display text-lg font-extrabold leading-tight tracking-tight text-ink">Kupujem cijeli poklon</span>
            <span className="block text-[13px]">Poklon je tvoj, nitko ga drugi neće uzeti</span>
          </span>
        </button>
        <button onClick={() => onPick('group')} className="tone-mint choice flex w-full items-center gap-3 p-3 text-left">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-tone text-coal"><Users size={22} aria-hidden /></span>
          <span>
            <span className="block font-display text-lg font-extrabold leading-tight tracking-tight text-ink">Dajem dio, skupljamo zajedno</span>
            <span className="block text-[13px]">Više vas daje po dio, jedna osoba ga naruči</span>
          </span>
        </button>
      </div>
    </div>
  )
}

function SuccessStep({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="relative overflow-hidden px-6 pb-7 pt-10 text-center">
      <Burst className="!top-20" />
      <m.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 14 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-mint text-coal">
        <Check size={38} strokeWidth={3} aria-hidden />
      </m.div>
      <h2 className="display mt-4 text-4xl">{title}</h2>
      <div className="mt-2">{children}</div>
      <button onClick={onClose} className="btn btn-sm btn-soft mt-4">Zatvori</button>
    </div>
  )
}

function ReserveStep({ item, slug, onDone, onConflict, onClose }: {
  item: ListItem; slug: string
  onDone: (itemId: string, entry: MyReservation) => void
  onConflict: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(lastUsedName)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const link = shopLink(item.product)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Upiši svoje ime (najmanje 2 znaka)'); return }
    setLoading(true); setError('')
    try {
      const res = await publicApi.reserve(slug, item.id, name.trim(), note.trim() || undefined)
      onDone(item.id, { token: res.data.ownerToken, name: name.trim() })
      setDone(true)
    } catch (err: any) {
      setError(apiError(err))
      if (err?.response?.status === 409) onConflict()
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <SuccessStep title="Poklon je rezerviran." onClose={onClose}>
        <p className="mx-auto max-w-xs text-muted">
          Hvala, <strong className="text-ink">{name}</strong>. Nitko drugi ovo neće kupiti. Ništa ti nije naplaćeno: poklon sad kupi u dućanu {shopLabel(item.product)}, preko gumba ispod ili u trgovini. Ako se predomisliš, otvori ovaj link na istom mobitelu i klikni Otkaži.
        </p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5">
            Otvori u dućanu {shopLabel(item.product)} <ArrowUpRight size={17} aria-hidden />
          </a>
        )}
      </SuccessStep>
    )
  }

  return (
    <form onSubmit={submit} className="px-5 pb-6 sm:px-7 sm:pb-7">
      <ProductSummary item={item} />
      <div className="space-y-4">
        <div>
          <label htmlFor="reserve-name" className="field-label">Tvoje ime</label>
          <input id="reserve-name" type="text" autoComplete="name" maxLength={100} placeholder="npr. Teta Ana ili Obitelj Kovač"
            value={name} onChange={e => setName(e.target.value)} className="field" />
          <p className="field-hint">Vidjet će ga roditelji i ostali s linkom.</p>
        </div>
        <div>
          <label htmlFor="reserve-note" className="field-label">Poruka za roditelje <span className="font-medium text-muted">(ako želiš)</span></label>
          <textarea id="reserve-note" rows={2} maxLength={500} placeholder="Jedva čekamo upoznati bebu."
            value={note} onChange={e => setNote(e.target.value)} className="field resize-none" />
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary mt-5 w-full">{loading ? 'Rezerviram...' : 'Rezerviraj'}</button>
    </form>
  )
}

function GroupStep({ item, slug, isJoin, onDone, onConflict, onClose }: {
  item: ListItem; slug: string; isJoin: boolean
  onDone: (itemId: string, entry: MyReservation) => void
  onConflict: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(lastUsedName)
  const [role, setRole] = useState<'ORDERER' | 'CONTRIBUTOR'>('CONTRIBUTOR')
  const [amount, setAmount] = useState('')
  const [target, setTarget] = useState(item.product.price > 0 ? item.product.price.toFixed(2).replace('.', ',') : '')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Shares never add up past the gift: when joining, only what is still missing can be given.
  const price = item.product.price
  const poolTarget = item.reservation?.targetAmount || 0
  const collected = (item.reservation?.contributors || []).reduce((sum, c) => sum + c.amount, 0)
  const remaining = Math.max(0, Math.round((poolTarget - collected) * 100) / 100)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Upiši svoje ime (najmanje 2 znaka)'); return }
    const amountNum = parseAmount(amount)
    if (!(amountNum > 0)) { setError('Unesi ispravan iznos doprinosa'); return }
    const targetNum = parseAmount(target)
    if (!isJoin && !(targetNum > 0)) { setError('Unesi ispravan ciljni iznos'); return }
    if (!isJoin && price > 0 && targetNum > price) { setError(`Iznos koji se skuplja ne može biti veći od cijene proizvoda (${formatPrice(price, item.product.currency)})`); return }
    if (!isJoin && amountNum > targetNum) { setError('Tvoj dio ne može biti veći od iznosa koji se skuplja'); return }
    if (isJoin && amountNum > remaining) { setError(`Preostalo je još ${formatPrice(remaining)}. Upiši najviše toliko.`); return }

    setLoading(true); setError('')
    try {
      if (isJoin) {
        const res = await publicApi.joinGroupBuy(slug, item.id, { name: name.trim(), role, amount: amountNum, note: note.trim() || undefined })
        onDone(item.id, { token: res.data.ownerToken, name: name.trim(), contributorId: res.data.contributor.id })
      } else {
        const res = await publicApi.reserveGroupBuy(slug, item.id, {
          reservedBy: name.trim(), isGroupBuy: true, targetAmount: targetNum, amount: amountNum, role, note: note.trim() || undefined,
        })
        onDone(item.id, { token: res.data.ownerToken, name: name.trim(), contributorId: res.data.contributorId })
      }
      setDone(true)
    } catch (err: any) {
      setError(apiError(err))
      if (err?.response?.status === 409) onConflict()
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <SuccessStep title={isJoin ? 'Tvoj dio je upisan.' : 'Skupljanje je pokrenuto.'} onClose={onClose}>
        <p className="mx-auto max-w-xs text-muted">
          Hvala, <strong className="text-ink">{name}</strong>. Zapisali smo da daješ <strong className="text-ink">{formatPrice(parseAmount(amount))}</strong>. Ništa ti nije naplaćeno: svoj dio daj osobi koja naručuje, njezino ime piše na kartici poklona.
        </p>
      </SuccessStep>
    )
  }

  return (
    <form onSubmit={submit} className="px-5 pb-6 sm:px-7 sm:pb-7">
      <ProductSummary item={item} />
      <p className="mb-4 rounded-2xl bg-mint-soft p-3 text-[13px] font-medium leading-snug">Novac ne ide preko ove stranice. Ovdje samo zapišeš koliko daješ, a tko naručuje poklon dogovorite među sobom.</p>
      <div className="space-y-4">
        <div>
          <label htmlFor="group-name" className="field-label">Tvoje ime</label>
          <input id="group-name" type="text" autoComplete="name" maxLength={100} placeholder="npr. Teta Ana" value={name} onChange={e => setName(e.target.value)} className="field" />
        </div>
        <fieldset>
          <legend className="field-label">Tvoja uloga</legend>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'ORDERER', icon: <ShoppingBag size={18} aria-hidden />, label: 'Ja ću naručiti u dućanu' },
              { value: 'CONTRIBUTOR', icon: <Wallet size={18} aria-hidden />, label: 'Dat ću svoj dio onome tko naručuje' },
            ] as const).map(opt => (
              <button key={opt.value} type="button" aria-pressed={role === opt.value} onClick={() => setRole(opt.value)} className="choice p-3 text-left">
                {opt.icon}
                <span className="mt-1.5 block text-[13px] font-semibold leading-snug">{opt.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {!isJoin && (
          <div>
            <label htmlFor="group-target" className="field-label">Koliko treba skupiti (€)</label>
            <input id="group-target" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} className="field" />
            {price > 0 && <p className="field-hint">Cijena proizvoda: {formatPrice(price, item.product.currency)}. Skuplja se najviše toliko.</p>}
          </div>
        )}
        <div>
          <label htmlFor="group-amount" className="field-label">Koliko daješ (€)</label>
          <input id="group-amount" inputMode="decimal" placeholder="npr. 50" value={amount} onChange={e => setAmount(e.target.value)} className="field" />
          {isJoin && <p className="field-hint">Preostalo još {formatPrice(remaining)} od {formatPrice(poolTarget)}.</p>}
        </div>
        <div>
          <label htmlFor="group-note" className="field-label">Poruka <span className="font-medium text-muted">(ako želiš)</span></label>
          <textarea id="group-note" rows={2} maxLength={500} placeholder="Sretno s bebom." value={note} onChange={e => setNote(e.target.value)} className="field resize-none" />
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary mt-5 w-full">
        {loading ? 'Šaljem...' : isJoin ? 'Dodaj svoj dio' : 'Pokreni skupljanje'}
      </button>
    </form>
  )
}

function GroupBuyInfo({ reservation, mine, onLeave }: {
  reservation: NonNullable<ListItem['reservation']>
  mine?: MyReservation
  onLeave: (contributor: GroupContributor) => void
}) {
  const contributors = reservation.contributors || []
  const total = contributors.reduce((sum, c) => sum + c.amount, 0)
  const target = reservation.targetAmount || 0
  const progress = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0

  return (
    <div className="mt-3 rounded-2xl bg-mint-soft p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px] font-semibold">
        <span>Skupljeno {formatPrice(total)} od {formatPrice(target)}</span>
        <span className="flex-shrink-0">{progress} %</span>
      </div>
      <ProgressBar value={progress} label="Skupljeno" className="mb-2" barClass={progress >= 100 ? 'bg-mint' : 'bg-sun'} />
      {progress >= 100 && <p className="mb-2 text-[13px] font-bold text-mint-ink">Iznos je skupljen. Još samo naručiti.</p>}
      <p className="mb-1 text-xs font-semibold text-muted">Dosad {plural(contributors.length, 'daje', 'daju', 'daje')}:</p>
      <ul className="space-y-1">
        {contributors.map(c => (
          <li key={c.id} className="flex flex-wrap items-center gap-1.5 text-[13px]">
            {c.role === 'ORDERER' ? <ShoppingBag size={13} aria-label="Naručuje" /> : <Wallet size={13} aria-label="Daje novac" />}
            <span className="font-semibold">{c.name}</span>
            <span className="text-muted">{formatPrice(c.amount)}</span>
            {c.note && <span className="max-w-[140px] truncate text-muted">„{c.note}"</span>}
            {mine?.contributorId === c.id && (
              <button onClick={() => onLeave(c)} className="ml-auto font-semibold underline underline-offset-2">Odustani</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MyReservationActions({ item, onPurchased, onCancel, busy }: {
  item: ListItem
  onPurchased: (purchased: boolean) => void
  onCancel: () => void
  busy: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const purchased = item.reservation?.status === 'PURCHASED'
  return (
    <div className="mt-3 rounded-2xl bg-sun-soft p-3">
      <p className="mb-2 text-[13px] font-bold">Ovo je tvoja rezervacija</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => onPurchased(!purchased)} className={clsx('btn btn-sm', purchased ? 'btn-ink' : 'btn-outline')}>
          {purchased ? <><Check size={15} strokeWidth={3} aria-hidden /> Kupljeno</> : <><ShoppingBag size={15} aria-hidden /> Označi kao kupljeno</>}
        </button>
        {confirming ? (
          <>
            <button disabled={busy} onClick={onCancel} className="btn btn-sm btn-danger">Da, otkaži</button>
            <button onClick={() => setConfirming(false)} className="btn btn-sm btn-soft">Ne</button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn btn-sm btn-soft"><Undo2 size={15} aria-hidden /> Otkaži</button>
        )}
      </div>
    </div>
  )
}

function PublicListItem({ item, index, mine, busy, onStart, onPurchased, onCancel, onLeave }: {
  item: ListItem
  index: number
  mine?: MyReservation
  busy: boolean
  onStart: (step: 'choose' | 'join') => void
  onPurchased: (purchased: boolean) => void
  onCancel: () => void
  onLeave: (c: GroupContributor) => void
}) {
  const { product, reservation } = item
  const isGroupBuy = !!reservation?.isGroupBuy
  const isSolo = !!reservation && !isGroupBuy
  const isMineSolo = isSolo && !!mine && !mine.contributorId
  const purchased = reservation?.status === 'PURCHASED'
  const link = shopLink(product)
  const meta = categoryMeta(product.category?.slug)
  const taken = isSolo && !isMineSolo
  const poolTarget = reservation?.targetAmount || 0
  const poolFull = isGroupBuy && poolTarget > 0
    && (reservation?.contributors || []).reduce((sum, c) => sum + c.amount, 0) >= poolTarget - 0.005

  return (
    <m.li layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: Math.min(index, 10) * 0.03 }}
      className={clsx(`tone-${meta.tone}`, 'card flex gap-3 p-2.5 sm:gap-5 sm:p-3', isMineSolo && '!border-sun ring-2 ring-sun')}>
      <a href={link} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="self-start">
        <Thumb product={product} className={clsx('h-24 w-24 rounded-2xl transition-[filter,opacity] duration-300 sm:h-36 sm:w-36', taken && 'opacity-60 grayscale')}>
          {isSolo && (
            <span className="stamp stamp-in absolute left-1/2 top-1/2 -ml-[46px] -mt-3 w-[92px] border-coal bg-white/90 text-center text-[10px] text-coal">
              {purchased ? 'Kupljeno' : 'Rezervirano'}
            </span>
          )}
          {isGroupBuy && <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-mint text-coal"><Users size={14} aria-hidden /></span>}
        </Thumb>
      </a>

      <div className="min-w-0 flex-1 py-0.5 pr-1">
        {product.brand && <p className="text-[13px] font-bold text-tone-ink">{product.brand}</p>}
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-[15px] font-semibold leading-snug hover:underline sm:text-base">{displayName(product)}</a>
        ) : (
          <p className="line-clamp-2 text-[15px] font-semibold leading-snug sm:text-base">{displayName(product)}</p>
        )}
        <p className="mt-0.5 text-[13px] text-muted">
          {product.price > 0 && <span className="font-display text-base font-extrabold tracking-tight text-ink">{formatPrice(product.price, product.currency)}</span>}
          {product.price > 0 && ' · '}{shopLabel(product)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={clsx('chip', `priority-${item.priority}`)}>{priorityLabel(item.priority)}</span>
          {item.note && <span className="chip chip-neutral"><StickyNote size={12} aria-hidden /> {item.note}</span>}
          {isSolo && <span className="chip bg-sun-soft text-sun-ink">{purchased ? 'Kupljeno' : 'Uzeto'}: {reservation!.reservedBy}</span>}
          {isGroupBuy && <span className="chip bg-mint-soft text-mint-ink"><Users size={12} aria-hidden /> Skupljamo zajedno{purchased ? ', kupljeno' : ''}</span>}
        </div>

        {!product.inStock && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-tomato-ink">
            <AlertTriangle size={14} aria-hidden /> Dućan ovo možda više nema. Provjeri prije kupnje.
          </p>
        )}

        {isGroupBuy && reservation && <GroupBuyInfo reservation={reservation} mine={mine} onLeave={onLeave} />}
        {isMineSolo && <MyReservationActions item={item} busy={busy} onPurchased={onPurchased} onCancel={onCancel} />}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!reservation && <button onClick={() => onStart('choose')} className="btn btn-sm btn-primary"><Gift size={15} aria-hidden /> Rezerviraj</button>}
          {isGroupBuy && !purchased && !mine && !poolFull && <button onClick={() => onStart('join')} className="btn btn-sm btn-ink"><Users size={15} aria-hidden /> Dodaj svoj dio</button>}
          {isGroupBuy && mine && (
            <button disabled={busy} onClick={() => onPurchased(!purchased)} className="btn btn-sm btn-outline">
              {purchased ? <><Check size={15} strokeWidth={3} aria-hidden /> Kupljeno</> : <><ShoppingBag size={15} aria-hidden /> Označi kao kupljeno</>}
            </button>
          )}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-soft">
              U dućan <ArrowUpRight size={15} aria-hidden /><span className="sr-only"> (otvara se u novoj kartici)</span>
            </a>
          )}
        </div>
      </div>
    </m.li>
  )
}

const LIST_TONES: Tone[] = ['sun', 'sky', 'mint', 'bubble']

const MOBILE_PIECES: { art: ArtName; tone: Tone; shape: string; x: number; drop: number; size: number; phone?: boolean }[] = [
  { art: 'pram', tone: 'tomato', shape: 'rounded-full', x: 0.5, drop: 70, size: 112, phone: true },
  { art: 'bottle', tone: 'cobalt', shape: 'rounded-[26%]', x: 0.3, drop: 120, size: 84, phone: true },
  { art: 'rings', tone: 'mint', shape: 'rounded-t-full rounded-b-[18%]', x: 0.7, drop: 100, size: 90, phone: true },
  { art: 'heart', tone: 'bubble', shape: 'rounded-[30%]', x: 0.13, drop: 60, size: 72, phone: true },
  { art: 'bear', tone: 'sky', shape: 'rounded-full', x: 0.87, drop: 56, size: 76, phone: true },
]

/** The list as a mobile: every share of reserved gifts hangs one more toy on it. */
function ListMobile({ progress, ref }: { progress: number; ref?: React.Ref<VrtuljakHandle> }) {
  const filled = Math.round((progress / 100) * MOBILE_PIECES.length)
  const hangers: Hanger[] = MOBILE_PIECES.map((piece, i) => ({
    key: piece.art,
    x: piece.x,
    drop: piece.drop,
    size: piece.size,
    children: i < filled ? (
      <m.span initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}
        className={clsx(`tone-${piece.tone}`, piece.shape, 'block aspect-square bg-tone p-[17%] shadow-float')}>
        <Art name={piece.art} className="block h-full w-full" />
      </m.span>
    ) : (
      <span className={clsx(piece.shape, 'block aspect-square border-[3px] border-dashed border-current opacity-35')} />
    ),
  }))
  return <Vrtuljak ref={ref} hangers={hangers} heightClass="h-[240px] sm:h-[280px]" breeze={0.1} />
}

export default function PublicListClient({ slug, initialList, initialError }: {
  slug: string
  initialList: BabyList | null
  initialError: string | null
}) {
  const [list, setList] = useState<BabyList | null>(initialList)
  const [error, setError] = useState<string | null>(initialError)
  const [loading, setLoading] = useState(!initialList && !initialError)
  const [flow, setFlow] = useState<Flow>(null)
  const [mine, setMine] = useState<MyMap>({})
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const { toast, showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'available' | 'reserved'>('all')
  const hasList = useRef(!!initialList)
  const mobileRef = useRef<VrtuljakHandle>(null)
  const refresh = useCallback(async () => {
    try {
      const res = await publicApi.getList(slug)
      hasList.current = true
      setList(res.data)
      setError(null)
    } catch (err) {
      if (!hasList.current) setError(apiError(err, 'Lista nije pronađena'))
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    setMine(getMyReservations())
    if (!initialList) refresh()
  }, [refresh, initialList])

  // Drop remembered reservations that no longer exist (cancelled by the parents or expired).
  useEffect(() => {
    if (!list) return
    setMine(prev => {
      let changed = false
      const next = { ...prev }
      for (const item of list.items) {
        const entry = next[item.id]
        if (!entry) continue
        const stillThere = entry.contributorId
          ? item.reservation?.contributors?.some(c => c.id === entry.contributorId)
          : !!item.reservation && !item.reservation.isGroupBuy && item.reservation.reservedBy === entry.name
        if (!stillThere) { delete next[item.id]; forgetReservation(item.id); changed = true }
      }
      return changed ? next : prev
    })
  }, [list])

  const closeFlow = () => setFlow(null)

  const onReserved = (itemId: string, entry: MyReservation) => {
    rememberReservation(itemId, entry)
    setMine(getMyReservations())
    refresh().then(() => MOBILE_PIECES.forEach(p => mobileRef.current?.nudge(p.art, 1.6)))
  }

  const setPurchased = async (item: ListItem, purchased: boolean) => {
    const entry = mine[item.id]
    if (!entry) return
    setBusyItem(item.id)
    try {
      await publicApi.setReservationStatus(slug, item.id, entry.token, purchased ? 'PURCHASED' : 'RESERVED')
      showToast(purchased ? 'Označeno kao kupljeno. Bravo.' : 'Vraćeno na rezervirano.')
      await refresh()
    } catch (err) {
      showToast(apiError(err))
    } finally {
      setBusyItem(null)
    }
  }

  const cancelReservation = async (item: ListItem) => {
    const entry = mine[item.id]
    if (!entry) return
    setBusyItem(item.id)
    try {
      await publicApi.cancelReservation(slug, item.id, entry.token)
      forgetReservation(item.id)
      setMine(getMyReservations())
      showToast('Rezervacija je otkazana.')
      await refresh()
    } catch (err) {
      showToast(apiError(err))
    } finally {
      setBusyItem(null)
    }
  }

  const leaveGroup = async (item: ListItem, contributor: GroupContributor) => {
    const entry = mine[item.id]
    if (!entry) return
    setBusyItem(item.id)
    try {
      await publicApi.leaveGroupBuy(slug, item.id, contributor.id, entry.token)
      forgetReservation(item.id)
      setMine(getMyReservations())
      showToast('Više nisi u grupnoj kupovini.')
      await refresh()
    } catch (err) {
      showToast(apiError(err))
    } finally {
      setBusyItem(null)
    }
  }

  const tone = useMemo(() => LIST_TONES[[...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % LIST_TONES.length], [slug])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center"><Loader label="Tražim listu." /></main>
      </>
    )
  }

  if (error || !list) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-[80vh] items-center justify-center p-5 pt-24">
          <div className="max-w-md text-center">
            <div className="tone-bubble mx-auto w-24"><Art name="moon" /></div>
            <h1 className="display mt-3 text-5xl">Ove liste nema.</h1>
            <p className="mt-3 text-muted">{error}</p>
            <Link href="/pronadi-listu" className="btn btn-ink mt-6">Potraži listu po imenu</Link>
          </div>
        </main>
      </>
    )
  }

  const owner = list.user!
  const dueDate = owner.dueDate ? new Date(owner.dueDate) : null
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000) : null

  const total = list.items.length
  const reservedCount = list.items.filter(i => i.reservation).length
  const progress = total > 0 ? Math.round((reservedCount / total) * 100) : 0
  const myCount = list.items.filter(i => mine[i.id]).length
  const gender = genderLabel(owner.babyGender)

  const visible = list.items.filter(i => filter === 'available' ? !i.reservation : filter === 'reserved' ? !!i.reservation : true)

  return (
    <>
      <Navbar />
      <header className={clsx(`tone-${tone}`, 'list-hero rounded-b-5xl px-5 pb-10 sm:px-8 sm:pb-14')}>
        <div className="mx-auto max-w-3xl pt-[72px]">
          <ListMobile ref={mobileRef} progress={progress} />
          <div className="page-in text-center">
            <p className="font-semibold">Lista od {owner.name}</p>
            <h1 className="display mt-1.5 break-words text-[clamp(2.9rem,9vw,5.6rem)]">{list.name}</h1>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {dueDate && (
                <span className="chip bg-coal/10 !px-3.5 !py-1.5 !text-sm">
                  {list.occasion === 'birthday' ? 'Rođendan' : 'Termin'}: {formatDateHR(dueDate)}{daysUntilDue !== null && daysUntilDue > 0 && <> (za {daysUntilDue} {plural(daysUntilDue, 'dan', 'dana', 'dana')})</>}
                </span>
              )}
              {gender && list.occasion !== 'birthday' && <span className="chip bg-coal/10 !px-3.5 !py-1.5 !text-sm">{owner.babyGender === 'surprise' ? 'Spol je iznenađenje' : gender}</span>}
            </div>
            {list.description && <p className="note mx-auto mt-5 max-w-lg whitespace-pre-line text-2xl">{list.description}</p>}
            {total > 0 && (
              <div className="mx-auto mt-6 max-w-sm">
                <p className="mb-2 font-display text-lg font-extrabold tracking-tight">
                  {progress === 100 ? 'Svi pokloni su rezervirani.' : `${reservedCount} od ${total} rezervirano`}
                </p>
                <ProgressBar value={progress} label="Rezervirano" className="!bg-coal/15" barClass="bg-coal" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="sadrzaj" className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        {myCount > 0 && (
          <p className="mb-4 rounded-3xl bg-sun-soft p-3.5 text-center text-[15px] font-medium">
            Ovdje imaš {myCount} {plural(myCount, 'rezervaciju', 'rezervacije', 'rezervacija')}. Možeš {myCount === 1 ? 'je' : 'ih'} označiti kao {myCount === 1 ? 'kupljenu' : 'kupljene'} ili otkazati.
          </p>
        )}

        {total > 0 && progress < 100 && (
          <p className="mb-5 rounded-3xl bg-sun-soft p-4 text-[15px] font-medium leading-snug">
            Klikni <strong>Rezerviraj</strong> kod poklona koji ćeš kupiti. Ostali će vidjeti da je zauzet. Ovdje ništa ne plaćaš i ne upisuješ karticu, poklon kupuješ u dućanu.
          </p>
        )}

        <Segmented className="mb-5 w-fit" label="Prikaz poklona" value={filter} onChange={setFilter}
          options={[
            { value: 'all', label: 'Sve', count: total },
            { value: 'available', label: 'Slobodno', count: total - reservedCount },
            { value: 'reserved', label: 'Rezervirano', count: reservedCount },
          ]} />

        {visible.length === 0 ? (
          <div className="py-12 text-center">
            <div className="tone-sun mx-auto w-20"><Art name="gift" /></div>
            <p className="mt-3 font-display text-xl font-extrabold tracking-tight">
              {total === 0 ? 'Lista je još prazna.' : filter === 'reserved' ? 'Još ništa nije rezervirano.' : 'Sve je već rezervirano.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((item, i) => (
                <PublicListItem key={item.id} item={item} index={i} mine={mine[item.id]} busy={busyItem === item.id}
                  onStart={step => setFlow({ step, item })}
                  onPurchased={purchased => setPurchased(item, purchased)}
                  onCancel={() => cancelReservation(item)}
                  onLeave={c => leaveGroup(item, c)} />
              ))}
            </AnimatePresence>
          </ul>
        )}

        <p className="mt-8 text-center text-[15px] font-medium text-muted">
          Ovdje se ništa ne plaća, kupuje se izravno u dućanu. <Link href="/" className="font-semibold text-ink underline underline-offset-2">Što je Bebina Lista?</Link>
        </p>
      </main>
      <Footer />

      <AnimatePresence>
        {flow && (
          <Modal key="flow" onClose={closeFlow}
            title={flow.step === 'choose' ? 'Cijeli poklon ili dio?' : flow.step === 'solo' ? 'Rezerviraj poklon' : flow.step === 'join' ? 'Dodaj svoj dio' : 'Skupljamo zajedno'}>
            {flow.step === 'choose' && <ChooseStep item={flow.item} onPick={step => setFlow({ step, item: flow.item })} />}
            {flow.step === 'solo' && <ReserveStep item={flow.item} slug={slug} onDone={onReserved} onConflict={refresh} onClose={closeFlow} />}
            {(flow.step === 'group' || flow.step === 'join') && (
              <GroupStep item={flow.item} slug={slug} isJoin={flow.step === 'join'} onDone={onReserved} onConflict={refresh} onClose={closeFlow} />
            )}
          </Modal>
        )}
      </AnimatePresence>

      <Toast message={toast} />
    </>
  )
}
