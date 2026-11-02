'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Modal from '@/components/Modal'
import { listsApi, authApi, addRefToUrl, apiError } from '@/lib/api'
import { formatPrice, parseAmount, parseDMY, maskDMY, formatDateHR } from '@/lib/format'
import { useAuthStore } from '@/lib/store'
import { BabyList, ListItem, Priority, SmartPasteResult, GroupContributor } from '@/types'
import {
  Plus, Trash2, ExternalLink, Check, X, ChevronDown, ChevronUp, ShoppingBag, Calendar, Edit3,
  Share2, MessageSquare, QrCode, Download, LinkIcon, Loader2, Lock, Globe, Settings2, Undo2,
} from 'lucide-react'
import clsx from 'clsx'

const PRIORITY_CONFIG: Record<Priority, { label: string; short: string; cls: string }> = {
  HIGH: { label: '❤️ Jako želim', short: 'Jako želim', cls: 'priority-HIGH' },
  MEDIUM: { label: '🌿 Bilo bi lijepo', short: 'Bilo bi lijepo', cls: 'priority-MEDIUM' },
  LOW: { label: '✨ Luksuz', short: 'Luksuz', cls: 'priority-LOW' },
}
const PRIORITY_ORDER: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

const OCCASIONS = [
  { value: 'birth', emoji: '🍼', label: 'Rođenje djeteta', dateLabel: 'Planirani termin poroda' },
  { value: 'birthday', emoji: '🎂', label: 'Dječji rođendan', dateLabel: 'Datum rođendana' },
]

const inputCls = 'w-full px-4 py-3 bg-cream border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-rose'
const labelCls = 'block text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide'

function sortItems(items: ListItem[]) {
  return [...items].sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt.localeCompare(a.createdAt))
}

function SmartPasteModal({ listId, onClose, onAdded }: {
  listId: string
  onClose: () => void
  onAdded: (item: ListItem) => void
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SmartPasteResult | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchInfo = async (value = url) => {
    const target = value.trim()
    if (!target) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await listsApi.smartPaste(target)
      const data = res.data as SmartPasteResult
      setResult(data)
      setTitle(data.title || '')
      setPrice(data.price ? data.price.toFixed(2).replace('.', ',') : '')
    } catch (err) {
      setError(apiError(err, 'Nije moguće dohvatiti podatke s tog linka'))
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!result) return
    if (!title.trim()) { setError('Upiši naziv proizvoda'); return }
    const priceNum = price ? parseAmount(price) : undefined
    if (price && !(priceNum! >= 0)) { setError('Cijena nije ispravna'); return }
    setSaving(true); setError('')
    try {
      const res = await listsApi.addCustomItem(listId, {
        name: title.trim(),
        price: priceNum,
        imageUrl: result.imageUrl,
        productUrl: result.productUrl,
        description: result.description,
      }, priority, note.trim() || undefined)
      onAdded(res.data)
    } catch (err) {
      setError(apiError(err, 'Greška pri spremanju'))
      setSaving(false)
    }
  }

  return (
    <Modal title="Dodaj s linka 🔗" onClose={onClose}>
      <div className="px-5 sm:px-6 pb-6">
        <label htmlFor="paste-url" className={labelCls}>Link proizvoda iz bilo kojeg shopa</label>
        <form className="flex gap-2 mb-4" onSubmit={e => { e.preventDefault(); fetchInfo() }}>
          <input id="paste-url" type="url" inputMode="url" placeholder="Zalijepi link ovdje..." value={url}
            onChange={e => setUrl(e.target.value)}
            onPaste={e => {
              const pasted = e.clipboardData.getData('text').trim()
              if (/^https?:\/\//i.test(pasted)) { e.preventDefault(); setUrl(pasted); fetchInfo(pasted) }
            }}
            className={clsx(inputCls, 'flex-1 min-w-0')} />
          <button type="submit" disabled={!url.trim() || loading}
            className="px-4 py-3 bg-rose text-white rounded-xl text-sm font-medium hover:bg-rose/90 disabled:opacity-50 transition-colors flex-shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" aria-label="Dohvaćam" /> : 'Dohvati'}
          </button>
        </form>

        {error && <p role="alert" className="text-sm text-rose mb-4">{error}</p>}

        {result && (
          <div className="space-y-4">
            <div className="flex gap-3 p-3 bg-cream rounded-2xl border border-blush/30">
              <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                {result.imageUrl ? <img src={result.imageUrl} alt="" className="w-full h-full object-contain" /> : <span className="text-3xl opacity-30">🛍️</span>}
              </div>
              <div className="min-w-0 text-xs text-warm-gray">
                {result.shopName && <p className="font-medium text-charcoal">{result.shopName}</p>}
                {result.description && <p className="mt-1 line-clamp-3">{result.description}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="paste-title" className={labelCls}>Naziv</label>
              <input id="paste-title" type="text" maxLength={300} value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="paste-price" className={labelCls}>Cijena (€)</label>
                <input id="paste-price" inputMode="decimal" placeholder="npr. 49,99" value={price} onChange={e => setPrice(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="paste-note" className={labelCls}>Napomena</label>
                <input id="paste-note" type="text" maxLength={200} placeholder="vel., boja..." value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
              </div>
            </div>
            <fieldset>
              <legend className={labelCls}>Prioritet</legend>
              <div className="flex gap-2">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
                  <button key={p} type="button" aria-pressed={priority === p} onClick={() => setPriority(p)}
                    className={clsx('flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                      priority === p ? 'border-rose bg-blush/20' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </fieldset>
            <button onClick={save} disabled={saving}
              className="w-full py-3 bg-rose text-white font-medium rounded-full hover:bg-rose/90 transition-colors disabled:opacity-50">
              {saving ? 'Dodajem...' : 'Dodaj na listu'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ListItemRow({ item, onDelete, onPriorityChange, onNoteChange, onClearReservation }: {
  item: ListItem
  onDelete: () => Promise<unknown>
  onPriorityChange: (p: Priority) => void
  onNoteChange: (note: string) => Promise<unknown>
  onClearReservation: () => Promise<unknown>
}) {
  const [busy, setBusy] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteValue, setNoteValue] = useState(item.note || '')
  const [confirmClear, setConfirmClear] = useState(false)
  const { product, reservation } = item
  const shopUrl = product.productUrl ? addRefToUrl(product.productUrl) : undefined

  const isGroupBuy = !!reservation?.isGroupBuy
  const purchased = reservation?.status === 'PURCHASED'
  const contributors = reservation?.contributors || []
  const collected = contributors.reduce((sum: number, c: GroupContributor) => sum + c.amount, 0)
  const target = reservation?.targetAmount || 0
  const progress = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  const saveNote = async () => {
    const trimmed = noteValue.trim()
    if (trimmed !== (item.note || '')) await run(() => onNoteChange(trimmed))
    setEditingNote(false)
  }

  return (
    <li className={clsx('flex gap-3 p-3 bg-white rounded-2xl border transition-all',
      reservation && !isGroupBuy ? 'border-gold/40 bg-gold/5' : isGroupBuy ? 'border-sage/30 bg-sage-light/5' : 'border-blush/30',
      busy && 'opacity-60')}>
      <a href={shopUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden
        className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-cream rounded-xl overflow-hidden flex items-center justify-center">
        {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain p-1" /> : <span className="text-lg opacity-20">🍼</span>}
      </a>

      <div className="flex-1 min-w-0">
        {shopUrl ? (
          <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 group">
            <span className="text-sm font-medium text-charcoal line-clamp-2 group-hover:text-rose transition-colors">{product.name}</span>
            <ExternalLink size={11} className="text-warm-gray/50 group-hover:text-rose flex-shrink-0 mt-1" />
          </a>
        ) : <p className="text-sm font-medium text-charcoal line-clamp-2">{product.name}</p>}
        <p className="text-xs text-warm-gray mt-0.5">{product.shopName}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {product.price > 0 && <span className="text-sm font-medium text-rose">{formatPrice(product.price, product.currency)}</span>}
          <label className="sr-only" htmlFor={`prio-${item.id}`}>Prioritet</label>
          <select id={`prio-${item.id}`} value={item.priority} onChange={e => onPriorityChange(e.target.value as Priority)}
            className={clsx('text-xs px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose/30 font-medium', PRIORITY_CONFIG[item.priority].cls)}>
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].short}</option>)}
          </select>
          {reservation && !isGroupBuy && (
            <span className="text-xs px-2 py-0.5 bg-gold/20 text-[#9A7B3F] rounded-full font-medium">
              {purchased ? '✅ Kupljeno' : '🎁 Rezervirano'} · {reservation.reservedBy}
            </span>
          )}
          {isGroupBuy && (
            <span className="text-xs px-2 py-0.5 bg-sage-light/60 text-sage rounded-full font-medium">
              👥 Grupna ({contributors.length}){purchased ? ' · kupljeno' : ''}
            </span>
          )}
          {!reservation && <span className="text-xs px-2 py-0.5 status-available rounded-full">✓ Slobodno</span>}
        </div>

        {editingNote ? (
          <div className="mt-2 flex items-center gap-1.5">
            <input type="text" autoFocus maxLength={200} value={noteValue} aria-label="Napomena"
              onChange={e => setNoteValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') { setEditingNote(false); setNoteValue(item.note || '') } }}
              placeholder="npr. vel. 62, plava boja..."
              className="flex-1 px-2.5 py-1.5 bg-cream border border-blush/40 rounded-lg focus:outline-none focus:border-rose text-charcoal min-w-0 text-base sm:text-xs" />
            <button onClick={saveNote} aria-label="Spremi napomenu" className="text-sage hover:text-sage/80 p-1"><Check size={14} /></button>
            <button onClick={() => { setEditingNote(false); setNoteValue(item.note || '') }} aria-label="Odustani" className="text-warm-gray hover:text-rose p-1"><X size={14} /></button>
          </div>
        ) : item.note ? (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-xs px-2 py-0.5 bg-blush/30 text-charcoal/80 rounded-full font-medium">📝 {item.note}</span>
            <button onClick={() => { setEditingNote(true); setNoteValue(item.note || '') }} aria-label="Uredi napomenu" className="text-warm-gray/50 hover:text-rose p-1"><Edit3 size={11} /></button>
          </div>
        ) : (
          <button onClick={() => setEditingNote(true)} className="mt-1.5 text-xs text-warm-gray/60 hover:text-rose transition-colors flex items-center gap-1">
            <Plus size={10} /> Dodaj napomenu (veličina, boja...)
          </button>
        )}

        {reservation?.note && !isGroupBuy && (
          <div className="mt-2 flex items-start gap-1.5 p-2 bg-sage-light/20 rounded-lg border border-sage/10">
            <MessageSquare size={11} className="text-sage flex-shrink-0 mt-0.5" />
            <p className="text-xs text-charcoal/70 italic leading-relaxed">„{reservation.note}"</p>
          </div>
        )}

        {isGroupBuy && (
          <div className="mt-2 p-3 bg-sage-light/20 rounded-xl border border-sage/10">
            <div className="flex items-center justify-between text-xs text-warm-gray mb-1.5">
              <span>{formatPrice(collected)} / {formatPrice(target)}</span>
              <span className="font-medium text-sage">{progress}%</span>
            </div>
            <div className="h-2 bg-white/80 rounded-full border border-sage/20 overflow-hidden mb-2">
              <div className={clsx('h-full rounded-full transition-all duration-700', progress >= 100 ? 'bg-gradient-to-r from-sage to-[#6B9B68]' : 'bg-gradient-to-r from-gold to-[#D4B87A]')}
                style={{ width: `${progress}%` }} />
            </div>
            <ul className="space-y-1">
              {contributors.map(c => (
                <li key={c.id} className="flex items-center gap-2 text-xs flex-wrap">
                  <span aria-hidden>{c.role === 'ORDERER' ? '🛒' : '💰'}</span>
                  <span className="font-medium text-charcoal">{c.name}</span>
                  <span className="text-warm-gray">{formatPrice(c.amount)}</span>
                  {c.note && <span className="text-warm-gray/70 italic">„{c.note}"</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reservation && (
          confirmClear ? (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-warm-gray">Osloboditi poklon za druge?</span>
              <button onClick={() => run(onClearReservation)} className="px-2.5 py-1 bg-rose text-white rounded-full">Da</button>
              <button onClick={() => setConfirmClear(false)} className="px-2.5 py-1 text-warm-gray">Ne</button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)} className="mt-2 text-xs text-warm-gray/70 hover:text-rose flex items-center gap-1">
              <Undo2 size={11} /> Oslobodi rezervaciju
            </button>
          )
        )}
      </div>

      <button onClick={() => run(onDelete)} aria-label={`Ukloni ${product.name} s liste`}
        className="p-2 text-warm-gray hover:text-rose transition-colors flex-shrink-0 self-start -mr-1">
        <Trash2 size={14} />
      </button>
    </li>
  )
}

function EditableListName({ name, onSave }: { name: string; onSave: (newName: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  const save = async () => {
    const trimmed = value.trim()
    setEditing(false)
    if (trimmed.length < 2 || trimmed === name) { setValue(name); return }
    if (!(await onSave(trimmed))) setValue(name)
  }

  if (editing) {
    return (
      <input type="text" autoFocus maxLength={120} value={value} aria-label="Naziv liste"
        onChange={e => setValue(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setValue(name) } }}
        className="w-full text-base sm:text-sm font-medium text-charcoal bg-cream border border-rose/40 rounded-lg px-2 py-1 focus:outline-none" />
    )
  }

  return (
    <button onClick={() => setEditing(true)} title="Klikni za uređivanje naziva"
      className="flex items-center gap-1.5 font-medium text-charcoal hover:text-rose transition-colors group min-w-0 text-left max-w-full">
      <span className="truncate text-sm">{name}</span>
      <Edit3 size={12} className="text-warm-gray/50 group-hover:text-rose transition-colors flex-shrink-0" />
    </button>
  )
}

function ListSettings({ list, onSave }: { list: BabyList; onSave: (data: { description?: string | null; isPublic?: boolean }) => Promise<boolean> }) {
  const [description, setDescription] = useState(list.description || '')
  const [saving, setSaving] = useState(false)
  const dirty = description.trim() !== (list.description || '')

  return (
    <div className="p-4 bg-cream/60 rounded-2xl border border-blush/30 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-charcoal flex items-center gap-1.5">
            {list.isPublic ? <Globe size={14} className="text-sage" /> : <Lock size={14} className="text-warm-gray" />}
            {list.isPublic ? 'Lista je javna' : 'Lista je privatna'}
          </p>
          <p className="text-xs text-warm-gray mt-0.5">
            {list.isPublic ? 'Svatko s linkom može je vidjeti i rezervirati poklone.' : 'Link ne radi dok je ponovno ne uključiš.'}
          </p>
        </div>
        <button role="switch" aria-checked={list.isPublic} aria-label="Javna lista" onClick={() => onSave({ isPublic: !list.isPublic })}
          className={clsx('relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors', list.isPublic ? 'bg-sage' : 'bg-warm-gray/30')}>
          <span className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform', list.isPublic ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>
      <div>
        <label htmlFor={`desc-${list.id}`} className={labelCls}>Poruka za goste (prikazuje se na listi)</label>
        <textarea id={`desc-${list.id}`} rows={3} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="npr. Hvala vam što ste dio našeg putovanja! Baby shower je 12.5. kod nas doma."
          className={clsx(inputCls, 'resize-none bg-white')} />
        {dirty && (
          <button disabled={saving} onClick={async () => { setSaving(true); await onSave({ description: description.trim() || null }).finally(() => setSaving(false)) }}
            className="mt-2 px-4 py-2 bg-charcoal text-white text-xs font-medium rounded-full disabled:opacity-50">
            {saving ? 'Spremam...' : 'Spremi poruku'}
          </button>
        )}
      </div>
    </div>
  )
}

function ShareModal({ slug, listName, isPublic, onClose }: { slug: string; listName: string; isPublic: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [canShare, setCanShare] = useState(false)
  const shareUrl = `${window.location.origin}/lista/${slug}`
  const shareText = `Pogledaj moju baby listu „${listName}" 🎀`

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function')
    import('qrcode').then(QRCode => QRCode.toDataURL(shareUrl, { width: 280, margin: 2, color: { dark: '#2C2320', light: '#FAF7F2' } }))
      .then(setQrDataUrl)
      .catch(() => {})
  }, [shareUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const nativeShare = () => navigator.share({ title: listName, text: shareText, url: shareUrl }).catch(() => {})

  return (
    <Modal title="Podijeli listu" onClose={onClose}>
      <div className="px-5 sm:px-6 pb-6">
        {!isPublic && (
          <p className="mb-4 p-3 bg-rose/10 border border-rose/20 rounded-xl text-xs text-rose">
            🔒 Lista je trenutno privatna — gosti neće moći otvoriti link dok je ne uključiš u postavkama liste.
          </p>
        )}
        <div className="flex gap-2 mb-5">
          <input type="text" value={shareUrl} readOnly aria-label="Link liste" onFocus={e => e.target.select()}
            className="flex-1 px-3 py-2.5 bg-cream border border-blush/40 rounded-xl text-xs text-charcoal font-mono truncate min-w-0" />
          <button onClick={copyLink}
            className="px-4 py-2.5 bg-charcoal text-white text-xs font-medium rounded-xl hover:bg-charcoal/90 transition-colors whitespace-nowrap flex-shrink-0">
            {copied ? '✓ Kopirano!' : 'Kopiraj'}
          </button>
        </div>

        {canShare && (
          <button onClick={nativeShare}
            className="w-full mb-3 flex items-center justify-center gap-2 py-3 bg-rose text-white rounded-xl text-sm font-medium hover:bg-rose/90 transition-colors">
            <Share2 size={15} /> Podijeli...
          </button>
        )}

        <div className="grid grid-cols-3 gap-2 mb-5">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-3 bg-[#25D366]/10 text-[#128C4A] border border-[#25D366]/20 rounded-xl text-sm font-medium hover:bg-[#25D366]/20 transition-colors">
            WhatsApp
          </a>
          <a href={`viber://forward?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
            className="flex items-center justify-center px-3 py-3 bg-[#7360F2]/10 text-[#5A48D6] border border-[#7360F2]/20 rounded-xl text-sm font-medium hover:bg-[#7360F2]/20 transition-colors">
            Viber
          </a>
          <a href={`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`}
            className="flex items-center justify-center px-3 py-3 bg-[#0084FF]/10 text-[#006ACC] border border-[#0084FF]/20 rounded-xl text-sm font-medium hover:bg-[#0084FF]/20 transition-colors">
            Messenger
          </a>
        </div>

        {qrDataUrl && (
          <div className="text-center border-t border-blush/20 pt-5">
            <p className="text-xs font-medium text-warm-gray uppercase tracking-wide mb-3 flex items-center justify-center gap-1.5">
              <QrCode size={12} /> QR kod za pozivnicu
            </p>
            <div className="inline-block bg-cream p-3 rounded-2xl border border-blush/30">
              <img src={qrDataUrl} alt="QR kod za listu" className="w-40 h-40 sm:w-48 sm:h-48" />
            </div>
            <p className="text-xs text-warm-gray/70 mt-2 mb-3">Skeniraj ili stavi na baby shower pozivnicu</p>
            <a href={qrDataUrl} download={`bebina-lista-${slug.slice(0, 8)}-qr.png`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cream border border-blush/40 rounded-full text-xs font-medium text-charcoal hover:bg-blush/30 transition-colors">
              <Download size={12} /> Preuzmi QR kod
            </a>
          </div>
        )}
      </div>
    </Modal>
  )
}

function NewListModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: { name: string; occasion: string; date: Date | null; babyGender: string }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [babyGender, setBabyGender] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedOcc = OCCASIONS.find(o => o.value === occasion)
  const parsedDate = dateInput.length === 10 ? parseDMY(dateInput) : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Naziv mora imati najmanje 2 znaka'); return }
    if (dateInput && !parsedDate) { setError('Datum nije ispravan. Format: dd/mm/gggg'); return }
    setLoading(true); setError('')
    try {
      await onCreate({ name: name.trim(), occasion, date: parsedDate, babyGender })
      onClose()
    } catch (err) {
      setError(apiError(err))
      setLoading(false)
    }
  }

  return (
    <Modal title="Nova lista" onClose={onClose}>
      <form onSubmit={submit} className="px-5 sm:px-6 pb-6 space-y-4">
        <div>
          <label htmlFor="new-list-name" className={labelCls}>Naziv liste *</label>
          <input id="new-list-name" type="text" maxLength={120} placeholder='npr. „Lista za Mateja"' value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>

        <fieldset>
          <legend className={labelCls}>Za što je lista?</legend>
          <div className="grid grid-cols-2 gap-2">
            {OCCASIONS.map(o => (
              <button key={o.value} type="button" aria-pressed={occasion === o.value}
                onClick={() => { setOccasion(oc => oc === o.value ? '' : o.value); setDateInput(''); setBabyGender('') }}
                className={clsx('flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border transition-all',
                  occasion === o.value ? 'border-rose bg-blush/30 text-charcoal' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                <span className="text-xl">{o.emoji}</span> {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {selectedOcc && (
          <div>
            <label htmlFor="new-list-date" className={labelCls}><Calendar size={11} className="inline mr-1" />{selectedOcc.dateLabel}</label>
            <div className="relative">
              <input id="new-list-date" type="text" inputMode="numeric" placeholder="15/06/2026" value={dateInput} maxLength={10}
                onChange={e => setDateInput(maskDMY(e.target.value))} className={clsx(inputCls, 'font-mono tracking-wider')} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-warm-gray/60 pointer-events-none">dd/mm/gggg</span>
            </div>
            {parsedDate && <p className="text-xs text-sage mt-1">✓ {formatDateHR(parsedDate)}</p>}
            {dateInput.length === 10 && !parsedDate && <p className="text-xs text-rose mt-1">Datum nije ispravan</p>}
          </div>
        )}

        {occasion === 'birth' && (
          <fieldset>
            <legend className={labelCls}>Spol bebe</legend>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'boy', emoji: '💙', label: 'Dječak' }, { value: 'girl', emoji: '💗', label: 'Djevojčica' }, { value: 'surprise', emoji: '🎀', label: 'Iznenađenje' }].map(opt => (
                <button key={opt.value} type="button" aria-pressed={babyGender === opt.value}
                  onClick={() => setBabyGender(g => g === opt.value ? '' : opt.value)}
                  className={clsx('flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-all',
                    babyGender === opt.value ? 'border-rose bg-blush/30' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                  <span className="text-lg">{opt.emoji}</span> {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p role="alert" className="text-sm text-rose">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-rose text-white font-medium rounded-full hover:bg-rose/90 transition-colors disabled:opacity-50">
          {loading ? 'Kreiram...' : 'Kreiraj listu'}
        </button>
      </form>
    </Modal>
  )
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose }: {
  title: string; message: string; confirmLabel: string
  onConfirm: () => Promise<unknown>; onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={title} onClose={onClose}>
      <div className="px-5 sm:px-6 pb-6">
        <p className="text-sm text-warm-gray mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-blush/40 text-warm-gray text-sm font-medium rounded-full hover:bg-cream">Odustani</button>
          <button disabled={busy} onClick={async () => { setBusy(true); await onConfirm().finally(() => setBusy(false)) }}
            className="flex-1 py-3 bg-rose text-white text-sm font-medium rounded-full hover:bg-rose/90 disabled:opacity-50">
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function MojaListaPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, loadFromStorage } = useAuthStore()
  const [lists, setLists] = useState<BabyList[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [expandedList, setExpandedList] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [shareList, setShareList] = useState<BabyList | null>(null)
  const [smartPasteListId, setSmartPasteListId] = useState<string | null>(null)
  const [deleteList, setDeleteList] = useState<BabyList | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/prijava?next=/moja-lista'); return }
    listsApi.getAll()
      .then(res => {
        setLists(res.data)
        setExpandedList(prev => prev ?? res.data[0]?.id ?? null)
      })
      .catch(err => setLoadError(apiError(err, 'Liste se trenutno ne mogu učitati.')))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const patchList = (listId: string, fn: (l: BabyList) => BabyList) => setLists(prev => prev.map(l => l.id === listId ? fn(l) : l))

  const withToast = async (fn: () => Promise<unknown>, success?: string) => {
    try {
      await fn()
      if (success) showToast(success)
      return true
    } catch (err) {
      showToast(apiError(err))
      return false
    }
  }

  const handleCreate = async ({ name, occasion, date, babyGender }: { name: string; occasion: string; date: Date | null; babyGender: string }) => {
    if (date || babyGender) {
      await authApi.updateProfile({ dueDate: date ? date.toISOString() : undefined, babyGender: babyGender || undefined }).catch(() => {})
    }
    const res = await listsApi.create({ name, occasion: occasion || undefined })
    const newList: BabyList = { ...res.data, items: [], _count: { items: 0 } }
    setLists(prev => [newList, ...prev])
    setExpandedList(newList.id)
    showToast('Lista kreirana! Dodaj prve proizvode 🎉')
  }

  const updateListFields = (list: BabyList, data: { name?: string; description?: string | null; isPublic?: boolean }) =>
    withToast(async () => {
      await listsApi.update(list.id, data)
      patchList(list.id, l => ({ ...l, ...data, description: data.description === undefined ? l.description : data.description ?? undefined }))
    }, data.isPublic === undefined ? 'Spremljeno' : data.isPublic ? 'Lista je sada javna' : 'Lista je sada privatna')

  const confirmDeleteList = async () => {
    if (!deleteList) return
    await withToast(async () => {
      await listsApi.delete(deleteList.id)
      setLists(prev => prev.filter(l => l.id !== deleteList.id))
    }, 'Lista obrisana.')
    setDeleteList(null)
  }

  const addItemToState = (listId: string, item: ListItem) => {
    patchList(listId, l => ({ ...l, items: sortItems([...l.items, item]), _count: { items: (l._count?.items ?? l.items.length) + 1 } }))
  }

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20 flex items-center justify-center">
          <div className="text-center"><span className="text-4xl animate-bounce block mb-4">🍼</span><p className="text-warm-gray">Učitavanje...</p></div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          <div className="py-6 sm:py-8 flex items-end justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="font-serif text-2xl sm:text-3xl text-charcoal truncate">Hej, {user?.name?.split(' ')[0]}! 👋</h1>
              <p className="text-warm-gray text-sm mt-1">
                {lists.length === 0 ? 'Kreiraj svoju prvu listu' : `Imaš ${lists.length} ${lists.length === 1 ? 'listu' : lists.length < 5 ? 'liste' : 'lista'}`}
              </p>
            </div>
            <button onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 bg-rose text-white text-sm font-medium rounded-full hover:bg-rose/90 transition-colors flex-shrink-0">
              <Plus size={16} /> <span className="hidden sm:inline">Nova</span> lista
            </button>
          </div>

          {loadError && <p role="alert" className="mb-4 p-4 bg-rose/10 border border-rose/20 rounded-2xl text-sm text-rose">{loadError}</p>}

          {lists.length === 0 && !loadError && (
            <div className="text-center py-16 sm:py-20 bg-white rounded-3xl border border-blush/30 px-6">
              <span className="text-5xl sm:text-6xl block mb-4">💝</span>
              <h2 className="font-serif text-xl sm:text-2xl text-charcoal mb-3">Tvoja prva lista te čeka</h2>
              <p className="text-warm-gray mb-8 max-w-sm mx-auto text-sm">Kreiraj listu, dodaj proizvode i podijeli je s obitelji i prijateljima</p>
              <button onClick={() => setShowNewModal(true)} className="px-6 py-3 bg-rose text-white font-medium rounded-full hover:bg-rose/90 transition-colors">Kreiraj listu</button>
            </div>
          )}

          <div className="space-y-4">
            {lists.map(list => {
              const isExpanded = expandedList === list.id
              const total = list.items.length
              const reserved = list.items.filter(i => i.reservation).length
              const purchased = list.items.filter(i => i.reservation?.status === 'PURCHASED').length
              const occ = OCCASIONS.find(o => o.value === list.occasion)

              return (
                <section key={list.id} className="bg-white rounded-3xl border border-blush/30 overflow-hidden" aria-label={list.name}>
                  <div className="p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blush/40 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg" aria-hidden>{occ ? occ.emoji : '💝'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <EditableListName name={list.name} onSave={name => updateListFields(list, { name })} />
                      <p className="text-xs text-warm-gray mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{total} stavki · {reserved} rez.{purchased > 0 && ` · ${purchased} kupljeno`}</span>
                        {!list.isPublic && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-warm-gray/10 rounded-full"><Lock size={9} /> privatna</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button onClick={() => setShareList(list)}
                        className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-sage bg-sage-light/50 rounded-full hover:bg-sage-light transition-colors">
                        <Share2 size={12} /> <span className="hidden sm:inline">Dijeli</span>
                      </button>
                      <button onClick={() => { setExpandedList(list.id); setSettingsOpen(s => s === list.id ? null : list.id) }}
                        aria-label="Postavke liste" aria-expanded={settingsOpen === list.id}
                        className={clsx('p-1.5 transition-colors', settingsOpen === list.id ? 'text-rose' : 'text-warm-gray hover:text-charcoal')}>
                        <Settings2 size={15} />
                      </button>
                      <button onClick={() => setDeleteList(list)} aria-label="Obriši listu" className="p-1.5 text-warm-gray hover:text-rose transition-colors">
                        <Trash2 size={15} />
                      </button>
                      <button onClick={() => setExpandedList(isExpanded ? null : list.id)} aria-label={isExpanded ? 'Sakrij stavke' : 'Prikaži stavke'} aria-expanded={isExpanded}
                        className="p-1.5 text-warm-gray">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-blush/20 p-3 sm:p-4 space-y-2">
                      {settingsOpen === list.id && <ListSettings list={list} onSave={data => updateListFields(list, data)} />}

                      {total === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-warm-gray text-sm mb-3">Lista je prazna</p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <Link href="/katalog" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blush/40 text-charcoal text-sm rounded-full hover:bg-blush transition-colors w-full sm:w-auto justify-center">
                              <ShoppingBag size={14} /> Dodaj iz kataloga
                            </Link>
                            <button onClick={() => setSmartPasteListId(list.id)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sage-light/60 text-sage text-sm rounded-full hover:bg-sage-light transition-colors w-full sm:w-auto justify-center">
                              <LinkIcon size={14} /> Dodaj s linka (bilo koji shop)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <ul className="space-y-2">
                            {list.items.map(item => (
                              <ListItemRow key={item.id} item={item}
                                onDelete={() => withToast(async () => {
                                  await listsApi.removeItem(list.id, item.id)
                                  patchList(list.id, l => ({ ...l, items: l.items.filter(i => i.id !== item.id), _count: { items: Math.max(0, (l._count?.items ?? 1) - 1) } }))
                                }, 'Uklonjeno s liste')}
                                onPriorityChange={priority => withToast(async () => {
                                  await listsApi.updateItem(list.id, item.id, { priority })
                                  patchList(list.id, l => ({ ...l, items: sortItems(l.items.map(i => i.id === item.id ? { ...i, priority } : i)) }))
                                })}
                                onNoteChange={note => withToast(async () => {
                                  await listsApi.updateItem(list.id, item.id, { note: note || null })
                                  patchList(list.id, l => ({ ...l, items: l.items.map(i => i.id === item.id ? { ...i, note: note || undefined } : i) }))
                                })}
                                onClearReservation={() => withToast(async () => {
                                  await listsApi.clearReservation(list.id, item.id)
                                  patchList(list.id, l => ({ ...l, items: l.items.map(i => i.id === item.id ? { ...i, reservation: undefined } : i) }))
                                }, 'Poklon je ponovno slobodan')} />
                            ))}
                          </ul>
                          <div className="flex flex-col sm:flex-row gap-2 mt-1">
                            <Link href="/katalog" className="flex items-center justify-center gap-2 flex-1 py-3 border-2 border-dashed border-blush/40 rounded-2xl text-sm text-warm-gray hover:border-blush-mid hover:text-charcoal transition-colors">
                              <Plus size={14} /> Iz kataloga
                            </Link>
                            <button onClick={() => setSmartPasteListId(list.id)}
                              className="flex items-center justify-center gap-2 flex-1 py-3 border-2 border-dashed border-sage/30 rounded-2xl text-sm text-sage hover:border-sage transition-colors">
                              <LinkIcon size={14} /> S linka
                            </button>
                          </div>
                        </>
                      )}
                      <div className="pt-2 border-t border-blush/20 flex items-center justify-between gap-2">
                        <p className="text-xs text-warm-gray font-mono truncate">/lista/{list.shareSlug.slice(0, 10)}…</p>
                        <a href={`/lista/${list.shareSlug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-sage hover:underline flex-shrink-0">
                          Pogledaj kao gost <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      </main>

      {showNewModal && <NewListModal onClose={() => setShowNewModal(false)} onCreate={handleCreate} />}
      {shareList && <ShareModal slug={shareList.shareSlug} listName={shareList.name} isPublic={shareList.isPublic} onClose={() => setShareList(null)} />}
      {smartPasteListId && (
        <SmartPasteModal listId={smartPasteListId} onClose={() => setSmartPasteListId(null)}
          onAdded={item => { addItemToState(smartPasteListId, item); setSmartPasteListId(null); showToast('Proizvod dodan s linka!') }} />
      )}
      {deleteList && (
        <ConfirmModal title="Obrisati listu?" confirmLabel="Obriši"
          message={`Lista „${deleteList.name}" i sve rezervacije na njoj bit će trajno obrisane. Link više neće raditi.`}
          onConfirm={confirmDeleteList} onClose={() => setDeleteList(null)} />
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-charcoal text-white text-sm rounded-full shadow-2xl fade-in whitespace-nowrap">
          {toast}
        </div>
      )}
    </>
  )
}
