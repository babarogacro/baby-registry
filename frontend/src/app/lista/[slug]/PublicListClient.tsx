'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { publicApi, addRefToUrl, apiError } from '@/lib/api'
import { getMyReservations, rememberReservation, forgetReservation, lastUsedName, MyReservation } from '@/lib/myReservations'
import { formatPrice, parseAmount, formatDateHR, plural, shopLabel } from '@/lib/format'
import Modal from '@/components/Modal'
import { BabyList, ListItem, GroupContributor, Product } from '@/types'
import { ExternalLink, Heart, Gift, Check, User, MessageSquare, Users, ShoppingBag, Undo2 } from 'lucide-react'
import clsx from 'clsx'

const PRIORITY = {
  HIGH: { label: '❤️ Jako želi', cls: 'priority-HIGH' },
  MEDIUM: { label: '🌿 Bilo bi lijepo', cls: 'priority-MEDIUM' },
  LOW: { label: '✨ Luksuz', cls: 'priority-LOW' },
} as const

const inputCls = 'w-full px-4 py-3 bg-cream border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-blush-mid transition-colors'
const labelCls = 'flex items-center gap-1.5 text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide'

type Flow = { step: 'choose' | 'solo' | 'group' | 'join'; item: ListItem } | null
type MyMap = Record<string, MyReservation>

function shopLink(product: Product) {
  return product.productUrl ? addRefToUrl(product.productUrl) : undefined
}

function Thumb({ product, className }: { product: Product; className: string }) {
  return (
    <div className={clsx('bg-cream rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0', className)}>
      {product.imageUrl
        ? <img src={product.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain p-1" />
        : <span className="text-2xl opacity-20">🍼</span>}
    </div>
  )
}

function ProductSummary({ item }: { item: ListItem }) {
  const { product } = item
  return (
    <div className="flex gap-3 p-3 bg-cream rounded-2xl mb-5">
      <Thumb product={product} className="w-14 h-14 bg-white" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal line-clamp-2 leading-snug">{product.name}</p>
        {item.note && <p className="text-xs text-warm-gray mt-0.5">📝 {item.note}</p>}
        {product.price > 0 && <p className="text-sm text-rose font-medium mt-0.5">{formatPrice(product.price, product.currency)}</p>}
        <p className="text-xs text-warm-gray">{shopLabel(product)}</p>
      </div>
    </div>
  )
}

function ChooseStep({ item, onPick }: { item: ListItem; onPick: (step: 'solo' | 'group') => void }) {
  return (
    <div className="px-5 sm:px-6 pb-6">
      <ProductSummary item={item} />
      <div className="space-y-3">
        <button onClick={() => onPick('solo')}
          className="w-full p-4 border border-blush/40 rounded-2xl text-left hover:border-rose hover:bg-blush/10 transition-all group active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose/10 rounded-xl flex items-center justify-center flex-shrink-0"><Gift size={18} className="text-rose" /></div>
            <div>
              <p className="font-medium text-charcoal group-hover:text-rose transition-colors">Kupujem sam/a</p>
              <p className="text-xs text-warm-gray mt-0.5">Rezerviraj cijeli poklon za sebe</p>
            </div>
          </div>
        </button>
        <button onClick={() => onPick('group')}
          className="w-full p-4 border border-blush/40 rounded-2xl text-left hover:border-sage hover:bg-sage-light/20 transition-all group active:scale-[0.98]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sage-light/60 rounded-xl flex items-center justify-center flex-shrink-0"><Users size={18} className="text-sage" /></div>
            <div>
              <p className="font-medium text-charcoal group-hover:text-sage transition-colors">Skupljamo zajedno 👥</p>
              <p className="text-xs text-warm-gray mt-0.5">Više osoba može doprinijeti za ovaj poklon</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

function SuccessStep({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 bg-sage-light/60 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check size={28} className="text-sage" />
      </div>
      <h3 className="font-serif text-2xl text-charcoal mb-2">{title}</h3>
      {children}
      <button onClick={onClose} className="block mx-auto mt-4 text-sm text-warm-gray hover:text-charcoal transition-colors">Zatvori</button>
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
      <SuccessStep title="Rezervirano!" onClose={onClose}>
        <p className="text-warm-gray text-sm mb-6">
          Hvala, <strong>{name}</strong>! Poklon je označen kao tvoj — kupi ga direktno u shopu.
          Rezervaciju možeš otkazati s ovog uređaja.
        </p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sage text-white rounded-full text-sm font-medium hover:bg-sage/90 transition-colors">
            <ExternalLink size={14} /> Idi na {shopLabel(item.product)}
          </a>
        )}
      </SuccessStep>
    )
  }

  return (
    <form onSubmit={submit} className="px-5 sm:px-6 pb-6">
      <ProductSummary item={item} />
      <div className="space-y-4">
        <div>
          <label htmlFor="reserve-name" className={labelCls}><User size={11} /> Tvoje ime *</label>
          <input id="reserve-name" type="text" autoComplete="name" maxLength={100} placeholder='npr. "Teta Ana" ili "Obitelj Kovač"'
            value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          <p className="text-xs text-warm-gray/70 mt-1.5">Mama će vidjeti tko je rezervirao ovaj poklon</p>
        </div>
        <div>
          <label htmlFor="reserve-note" className={labelCls}><MessageSquare size={11} /> Poruka za mamu (opcionalno)</label>
          <textarea id="reserve-note" rows={2} maxLength={500} placeholder="Čestitke! Jedva čekamo upoznati bebu"
            value={note} onChange={e => setNote(e.target.value)} className={clsx(inputCls, 'resize-none')} />
        </div>
        {error && <p role="alert" className="text-sm text-rose">{error}</p>}
      </div>
      <button type="submit" disabled={loading}
        className="w-full mt-5 py-3 bg-rose text-white text-sm font-medium rounded-full hover:bg-rose/90 transition-colors disabled:opacity-50 active:scale-[0.98]">
        {loading ? 'Rezerviram...' : '🎁 Rezerviraj'}
      </button>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Upiši svoje ime (najmanje 2 znaka)'); return }
    const amountNum = parseAmount(amount)
    if (!(amountNum > 0)) { setError('Unesi ispravan iznos doprinosa'); return }
    const targetNum = parseAmount(target)
    if (!isJoin && !(targetNum > 0)) { setError('Unesi ispravan ciljni iznos'); return }

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
      <SuccessStep title={isJoin ? 'Pridružio/la si se!' : 'Grupna kupovina pokrenuta!'} onClose={onClose}>
        <p className="text-warm-gray text-sm">
          Hvala, <strong>{name}</strong>! Tvoj doprinos od <strong>{formatPrice(parseAmount(amount))}</strong> je zabilježen.
        </p>
      </SuccessStep>
    )
  }

  return (
    <form onSubmit={submit} className="px-5 sm:px-6 pb-6">
      <ProductSummary item={item} />
      <div className="space-y-4">
        <div>
          <label htmlFor="group-name" className={labelCls}><User size={11} /> Tvoje ime *</label>
          <input id="group-name" type="text" autoComplete="name" maxLength={100} placeholder='npr. "Teta Ana"'
            value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>
        <fieldset>
          <legend className={labelCls}>Tvoja uloga</legend>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'ORDERER', icon: '🛒', label: 'Ja naručujem i plaćam', active: 'border-rose bg-blush/20' },
              { value: 'CONTRIBUTOR', icon: '💰', label: 'Dajem novce, netko drugi naručuje', active: 'border-sage bg-sage-light/30' },
            ] as const).map(opt => (
              <button key={opt.value} type="button" aria-pressed={role === opt.value} onClick={() => setRole(opt.value)}
                className={clsx('p-3 rounded-xl border text-left transition-all text-sm active:scale-[0.97]',
                  role === opt.value ? `${opt.active} text-charcoal` : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                <span className="text-lg block mb-1">{opt.icon}</span>
                <span className="font-medium block text-xs leading-snug">{opt.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {!isJoin && (
          <div>
            <label htmlFor="group-target" className={labelCls}>Ciljni iznos (EUR) *</label>
            <input id="group-target" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} className={inputCls} />
            {item.product.price > 0 && <p className="text-xs text-warm-gray/70 mt-1">Cijena proizvoda: {formatPrice(item.product.price, item.product.currency)}</p>}
          </div>
        )}
        <div>
          <label htmlFor="group-amount" className={labelCls}>Tvoj doprinos (EUR) *</label>
          <input id="group-amount" inputMode="decimal" placeholder="npr. 50" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="group-note" className={labelCls}><MessageSquare size={11} /> Poruka (opcionalno)</label>
          <textarea id="group-note" rows={2} maxLength={500} placeholder="Sretno s bebom!" value={note} onChange={e => setNote(e.target.value)} className={clsx(inputCls, 'resize-none')} />
        </div>
        {error && <p role="alert" className="text-sm text-rose">{error}</p>}
      </div>
      <button type="submit" disabled={loading}
        className="w-full mt-5 py-3 bg-sage text-white text-sm font-medium rounded-full hover:bg-sage/90 transition-colors disabled:opacity-50 active:scale-[0.98]">
        {loading ? 'Šaljem...' : isJoin ? '👥 Pridruži se' : '👥 Pokreni skupljanje'}
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
    <div className="mt-2 p-3 bg-sage-light/20 rounded-xl border border-sage/10">
      <div className="flex items-center justify-between text-xs text-warm-gray mb-1.5">
        <span>{formatPrice(total)} / {formatPrice(target)} · {contributors.length} {plural(contributors.length, 'osoba', 'osobe', 'osoba')}</span>
        <span className="font-medium text-sage">{progress}%</span>
      </div>
      <div className="h-2.5 bg-white/80 rounded-full border border-sage/20 overflow-hidden mb-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className={clsx('h-full rounded-full transition-all duration-700 ease-out', progress >= 100 ? 'bg-gradient-to-r from-sage to-[#6B9B68]' : 'bg-gradient-to-r from-gold to-[#D4B87A]')}
          style={{ width: `${progress}%` }} />
      </div>
      {progress >= 100 && <p className="text-xs text-sage font-medium mb-2">🎉 Cilj je dostignut!</p>}
      <ul className="space-y-1">
        {contributors.map(c => (
          <li key={c.id} className="flex items-center gap-2 text-xs flex-wrap">
            <span aria-hidden>{c.role === 'ORDERER' ? '🛒' : '💰'}</span>
            <span className="font-medium text-charcoal">{c.name}</span>
            <span className="text-warm-gray">{formatPrice(c.amount)}</span>
            {c.note && <span className="text-warm-gray/70 italic truncate max-w-[140px]">„{c.note}"</span>}
            {mine?.contributorId === c.id && (
              <button onClick={() => onLeave(c)} className="ml-auto text-warm-gray hover:text-rose underline underline-offset-2">Odustani</button>
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
    <div className="mt-3 p-3 rounded-xl bg-gold/10 border border-gold/20">
      <p className="text-xs font-medium text-charcoal mb-2">⭐ Ovo je tvoja rezervacija</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => onPurchased(!purchased)}
          className={clsx('flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors disabled:opacity-50',
            purchased ? 'bg-sage text-white' : 'bg-white border border-sage/30 text-sage hover:bg-sage-light/40')}>
          {purchased ? <><Check size={12} /> Kupljeno</> : <><ShoppingBag size={12} /> Označi kao kupljeno</>}
        </button>
        {confirming ? (
          <>
            <button disabled={busy} onClick={onCancel} className="px-3 py-2 text-xs font-medium rounded-xl bg-rose text-white disabled:opacity-50">Da, otkaži</button>
            <button onClick={() => setConfirming(false)} className="px-3 py-2 text-xs text-warm-gray">Ne</button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs text-warm-gray hover:text-rose transition-colors">
            <Undo2 size={12} /> Otkaži rezervaciju
          </button>
        )}
      </div>
    </div>
  )
}

function PublicListItem({ item, mine, busy, onStart, onPurchased, onCancel, onLeave }: {
  item: ListItem
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
  const priority = PRIORITY[item.priority]

  return (
    <li className={clsx('bg-white rounded-2xl border p-3 sm:p-4 flex gap-3 sm:gap-4 transition-all',
      isMineSolo ? 'border-gold/50' : isSolo ? 'border-gold/30 opacity-75' : isGroupBuy ? 'border-sage/30' : 'border-blush/30 hover:border-blush-mid hover:shadow-sm')}>
      <a href={link} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="relative">
        <Thumb product={product} className="w-16 h-16 sm:w-20 sm:h-20" />
        {isSolo && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gold rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>
          </div>
        )}
        {isGroupBuy && (
          <div className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-sage rounded-full flex items-center justify-center"><Users size={10} className="text-white" /></div>
        )}
      </a>

      <div className="flex-1 min-w-0">
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-charcoal line-clamp-2 leading-snug hover:text-rose transition-colors">
            {product.name}
          </a>
        ) : (
          <p className="text-sm font-medium text-charcoal line-clamp-2 leading-snug">{product.name}</p>
        )}
        {item.note && <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blush/30 text-charcoal/80 rounded-full font-medium">📝 {item.note}</span>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {product.price > 0 && <span className="text-sm font-medium text-rose">{formatPrice(product.price, product.currency)}</span>}
          {product.price > 0 && <span className="text-xs text-warm-gray/50">·</span>}
          <span className="text-xs text-warm-gray">{shopLabel(product)}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', priority.cls)}>{priority.label}</span>
          {isSolo && (
            <span className="text-xs px-2 py-0.5 bg-gold/15 text-[#9A7B3F] rounded-full font-medium">
              {purchased ? '✅ Kupljeno' : '🎁 Rezervirano'} · {reservation!.reservedBy}
            </span>
          )}
          {isGroupBuy && (
            <span className="text-xs px-2 py-0.5 bg-sage-light/60 text-sage rounded-full font-medium">
              👥 Grupna{purchased ? ' · kupljeno' : ''}
            </span>
          )}
        </div>

        {isGroupBuy && reservation && <GroupBuyInfo reservation={reservation} mine={mine} onLeave={onLeave} />}

        {isMineSolo && <MyReservationActions item={item} busy={busy} onPurchased={onPurchased} onCancel={onCancel} />}

        <div className="flex items-center gap-2 mt-3">
          {!reservation && (
            <button onClick={() => onStart('choose')}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose text-white text-xs font-medium rounded-xl hover:bg-rose/90 transition-colors active:scale-[0.97]">
              <Gift size={12} /> Kupit ću ovo
            </button>
          )}
          {isGroupBuy && !purchased && !mine && (
            <button onClick={() => onStart('join')}
              className="flex items-center gap-1.5 px-4 py-2 bg-sage text-white text-xs font-medium rounded-xl hover:bg-sage/90 transition-colors active:scale-[0.97]">
              <Users size={12} /> Pridruži se
            </button>
          )}
          {isGroupBuy && mine && (
            <button disabled={busy} onClick={() => onPurchased(!purchased)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-sage/30 text-sage hover:bg-sage-light/40 disabled:opacity-50">
              {purchased ? <><Check size={12} /> Kupljeno</> : <><ShoppingBag size={12} /> Označi kao kupljeno</>}
            </button>
          )}
          {isSolo && !isMineSolo && <span className="text-xs text-warm-gray italic">{purchased ? 'Već kupljeno' : 'Već rezervirano'}</span>}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-xs text-warm-gray hover:text-sage border border-blush/30 rounded-xl transition-colors">
              <ExternalLink size={11} /> Shop
            </a>
          )}
        </div>
      </div>
    </li>
  )
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
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'available' | 'reserved'>('all')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const hasList = useRef(!!initialList)
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

  // Drop remembered reservations that no longer exist (cancelled by mama or expired).
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
    refresh()
  }

  const setPurchased = async (item: ListItem, purchased: boolean) => {
    const entry = mine[item.id]
    if (!entry) return
    setBusyItem(item.id)
    try {
      await publicApi.setReservationStatus(slug, item.id, entry.token, purchased ? 'PURCHASED' : 'RESERVED')
      showToast(purchased ? 'Označeno kao kupljeno 🎉' : 'Vraćeno na "rezervirano"')
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
      showToast('Rezervacija je otkazana')
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
      showToast('Napustio/la si grupnu kupovinu')
      await refresh()
    } catch (err) {
      showToast(apiError(err))
    } finally {
      setBusyItem(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center"><span className="text-5xl animate-bounce block mb-4">🍼</span><p className="text-warm-gray">Učitavanje liste...</p></div>
      </div>
    )
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">😔</span>
          <h1 className="font-serif text-2xl text-charcoal mb-2">Lista nije dostupna</h1>
          <p className="text-warm-gray text-sm mb-6">{error}</p>
          <Link href="/pronadi-listu" className="text-sm text-rose hover:underline">Pretraži liste po imenu →</Link>
        </div>
      </div>
    )
  }

  const owner = list.user!
  const dueDate = owner.dueDate ? new Date(owner.dueDate) : null
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000) : null

  const total = list.items.length
  const reservedCount = list.items.filter(i => i.reservation).length
  const progress = total > 0 ? Math.round((reservedCount / total) * 100) : 0
  const myCount = list.items.filter(i => mine[i.id]).length

  const visible = list.items.filter(i => filter === 'available' ? !i.reservation : filter === 'reserved' ? !!i.reservation : true)

  return (
    <div className="min-h-screen bg-cream">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="absolute top-0 right-0 w-64 sm:w-96 h-48 sm:h-64 bg-blush/50 rounded-full blur-3xl translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 sm:w-80 h-36 sm:h-48 bg-sage-light/40 rounded-full blur-3xl -translate-x-1/4" />
        </div>
        <div className="max-w-2xl mx-auto px-4 pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full text-warm-gray text-xs mb-4 sm:mb-5 border border-blush/30">
            <Heart size={11} className="text-rose" /> Baby lista
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-charcoal mb-2 sm:mb-3 px-2 break-words">{list.name}</h1>
          <p className="text-warm-gray mb-2 text-sm sm:text-base">Lista od <strong>{owner.name}</strong></p>

          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap mt-3 sm:mt-4">
            {dueDate && (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm text-warm-gray bg-white/70 px-2.5 sm:px-3 py-1.5 rounded-full border border-blush/30">
                🗓️ {formatDateHR(dueDate)}
                {daysUntilDue !== null && daysUntilDue > 0 && <span className="text-rose font-medium">(još {daysUntilDue} {plural(daysUntilDue, 'dan', 'dana', 'dana')})</span>}
              </span>
            )}
            {owner.babyGender && (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm text-warm-gray bg-white/70 px-2.5 sm:px-3 py-1.5 rounded-full border border-blush/30">
                {owner.babyGender === 'boy' ? '💙 Dječak' : owner.babyGender === 'girl' ? '💗 Djevojčica' : '🎀 Iznenađenje'}
              </span>
            )}
          </div>

          {list.description && <p className="mt-3 sm:mt-4 text-warm-gray text-sm italic max-w-md mx-auto px-2 whitespace-pre-line">{list.description}</p>}

          <dl className="flex justify-center gap-6 mt-5 sm:mt-6">
            <div className="text-center"><dd className="text-xl sm:text-2xl font-serif text-charcoal">{total}</dd><dt className="text-xs text-warm-gray">ukupno</dt></div>
            <div className="text-center"><dd className="text-xl sm:text-2xl font-serif text-rose">{total - reservedCount}</dd><dt className="text-xs text-warm-gray">slobodno</dt></div>
            <div className="text-center"><dd className="text-xl sm:text-2xl font-serif text-gold">{reservedCount}</dd><dt className="text-xs text-warm-gray">rezervirano</dt></div>
          </dl>

          {total > 0 && (
            <div className="mt-5 sm:mt-6 max-w-sm mx-auto px-2">
              <div className="h-3 bg-white/80 rounded-full border border-blush/30 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Rezervirano">
                <div className={clsx('h-full rounded-full transition-all duration-700 ease-out', progress === 100 ? 'bg-gradient-to-r from-sage to-[#6B9B68]' : 'bg-gradient-to-r from-gold to-[#D4B87A]')}
                  style={{ width: `${progress}%` }} />
              </div>
              {progress === 100 && <p className="text-xs text-sage font-medium mt-1.5">🎉 Svi pokloni su rezervirani!</p>}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 pb-16">
        {myCount > 0 && (
          <p className="mb-4 p-3 bg-white rounded-2xl border border-gold/30 text-sm text-charcoal text-center">
            ⭐ Ovdje imaš {myCount} {plural(myCount, 'rezervaciju', 'rezervacije', 'rezervacija')} — {myCount === 1 ? 'možeš je označiti kao kupljenu ili otkazati' : 'možeš ih označiti kao kupljene ili otkazati'}.
          </p>
        )}

        <div className="flex gap-2 mb-4 sm:mb-5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
          {([
            { key: 'all', label: 'Sve' },
            { key: 'available', label: '✓ Slobodno' },
            { key: 'reserved', label: '🎁 Rezervirano' },
          ] as const).map(f => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
              className={clsx('px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
                filter === f.key ? 'bg-charcoal text-white' : 'bg-white text-warm-gray border border-blush/40 hover:border-blush-mid')}>
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">{filter === 'reserved' ? '🎁' : '🔍'}</span>
            <p className="text-warm-gray text-sm">
              {total === 0 ? 'Lista je još prazna.' : filter === 'reserved' ? 'Još ništa nije rezervirano' : 'Sve je već rezervirano 🎉'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map(item => (
              <PublicListItem key={item.id} item={item} mine={mine[item.id]} busy={busyItem === item.id}
                onStart={step => setFlow({ step, item })}
                onPurchased={purchased => setPurchased(item, purchased)}
                onCancel={() => cancelReservation(item)}
                onLeave={c => leaveGroup(item, c)} />
            ))}
          </ul>
        )}

        <div className="mt-10 p-4 sm:p-5 bg-white/60 rounded-2xl border border-blush/20 text-center">
          <p className="text-xs sm:text-sm text-warm-gray">
            🎀 Lista je napravljena na <Link href="/" className="text-rose hover:underline font-medium">Bebinoj Listi</Link>.
            Kupuješ direktno u shopu — ovdje se ništa ne plaća.
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-warm-gray/60">
          <Link href="/privatnost" className="hover:text-warm-gray transition-colors">Politika privatnosti</Link>
          {' · '}
          <Link href="/uvjeti" className="hover:text-warm-gray transition-colors">Uvjeti korištenja</Link>
        </p>
      </main>

      {flow && (
        <Modal
          onClose={closeFlow}
          title={flow.step === 'choose' ? 'Kako želiš kupiti?' : flow.step === 'solo' ? 'Rezerviraj poklon' : flow.step === 'join' ? 'Pridruži se 👥' : 'Grupna kupovina 👥'}
        >
          {flow.step === 'choose' && <ChooseStep item={flow.item} onPick={step => setFlow({ step, item: flow.item })} />}
          {flow.step === 'solo' && <ReserveStep item={flow.item} slug={slug} onDone={onReserved} onConflict={refresh} onClose={closeFlow} />}
          {(flow.step === 'group' || flow.step === 'join') && (
            <GroupStep item={flow.item} slug={slug} isJoin={flow.step === 'join'} onDone={onReserved} onConflict={refresh} onClose={closeFlow} />
          )}
        </Modal>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-charcoal text-white text-sm rounded-full shadow-2xl fade-in whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
