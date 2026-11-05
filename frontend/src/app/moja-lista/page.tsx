'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, m } from 'motion/react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Modal from '@/components/Modal'
import ShareListModal from '@/components/ShareListModal'
import Loader from '@/components/Loader'
import ProgressBar from '@/components/ProgressBar'
import PriorityPicker from '@/components/PriorityPicker'
import { Art } from '@/components/art'
import { Toast, useToast } from '@/components/Toast'
import { listsApi, authApi, addRefToUrl, apiError } from '@/lib/api'
import { categoryMeta } from '@/lib/categories'
import { displayName, formatPrice, parseAmount, parseDMY, plural, shopLabel, toDMY } from '@/lib/format'
import DateField, { DATE_FORMAT_ERROR } from '@/components/DateField'
import { GENDERS, OCCASIONS } from '@/lib/occasions'
import { pregnancyStatus } from '@/lib/pregnancy'
import { PRIORITIES, PRIORITY_ORDER } from '@/lib/priorities'
import { useAuthStore } from '@/lib/store'
import { BabyList, ListItem, Priority, SmartPasteResult, GroupContributor } from '@/types'
import {
  AlertTriangle, ArrowUpRight, Check, ChevronDown, Copy, Download, Edit3, Eye, Gift, Globe, LinkIcon, Loader2, Lock,
  MessageSquare, Plus, QrCode, Settings2, Share2, ShoppingBag, StickyNote, Trash2, Undo2, Users, Wallet, X,
} from 'lucide-react'
import clsx from 'clsx'

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
      setError(apiError(err, 'S tog linka ne mogu ništa pročitati. Provjeri je li to stranica proizvoda.'))
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
        shopName: result.shopName,
      }, priority, note.trim() || undefined)
      onAdded(res.data)
    } catch (err) {
      setError(apiError(err, 'Greška pri spremanju'))
      setSaving(false)
    }
  }

  return (
    <Modal title="Dodaj s linka" onClose={onClose}>
      <div className="px-5 pb-6 sm:px-7 sm:pb-7">
        <label htmlFor="paste-url" className="field-label">Link proizvoda iz bilo kojeg web shopa</label>
        <form className="mb-4 flex gap-2" onSubmit={e => { e.preventDefault(); fetchInfo() }}>
          <input id="paste-url" type="url" inputMode="url" placeholder="Zalijepi link ovdje..." value={url}
            onChange={e => setUrl(e.target.value)}
            onPaste={e => {
              const pasted = e.clipboardData.getData('text').trim()
              if (/^https?:\/\//i.test(pasted)) { e.preventDefault(); setUrl(pasted); fetchInfo(pasted) }
            }}
            className="field min-w-0 flex-1" />
          <button type="submit" disabled={!url.trim() || loading} className="btn btn-ink flex-shrink-0 !rounded-2xl !px-4">
            {loading ? <Loader2 size={18} className="animate-spin" aria-label="Dohvaćam" /> : 'Dohvati'}
          </button>
        </form>

        {error && <p role="alert" className="field-error mb-4">{error}</p>}

        {result && (
          <m.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-3 rounded-3xl bg-sunken p-3">
              <div className="photo-tile flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {result.imageUrl ? <img src={result.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <Art name="gift" className="h-12 w-12" />}
              </div>
              <div className="min-w-0 text-[13px] text-muted">
                {result.shopName && <p className="font-bold text-ink">{result.shopName}</p>}
                {result.description && <p className="mt-1 line-clamp-3">{result.description}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="paste-title" className="field-label">Naziv</label>
              <input id="paste-title" type="text" maxLength={300} value={title} onChange={e => setTitle(e.target.value)} className="field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="paste-price" className="field-label">Cijena (€)</label>
                <input id="paste-price" inputMode="decimal" placeholder="npr. 49,99" value={price} onChange={e => setPrice(e.target.value)} className="field" />
              </div>
              <div>
                <label htmlFor="paste-note" className="field-label">Napomena</label>
                <input id="paste-note" type="text" maxLength={200} placeholder="veličina, boja..." value={note} onChange={e => setNote(e.target.value)} className="field" />
              </div>
            </div>
            <PriorityPicker value={priority} onChange={setPriority} />
            <button onClick={save} disabled={saving} className="btn btn-primary w-full">{saving ? 'Dodajem...' : 'Dodaj na listu'}</button>
          </m.div>
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
  const meta = categoryMeta(product.category?.slug)

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
    <m.li layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24, transition: { duration: 0.16 } }}
      className={clsx(`tone-${meta.tone}`, 'flex gap-3 rounded-3xl bg-sunken/60 p-2.5 sm:gap-4 sm:p-3', busy && 'opacity-60')}>
      <a href={shopUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden
        className="photo-tile flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:h-20 sm:w-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain p-1.5" /> : <Art name={meta.art} className="h-10 w-10" />}
      </a>

      <div className="min-w-0 flex-1 py-0.5">
        {product.brand && <p className="text-[13px] font-bold text-tone-ink">{product.brand}</p>}
        {shopUrl ? (
          <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex items-start gap-1">
            <span className="line-clamp-2 text-[15px] font-semibold leading-snug group-hover:underline">{displayName(product)}</span>
            <ArrowUpRight size={14} aria-hidden className="mt-0.5 flex-shrink-0 text-muted" />
          </a>
        ) : <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{displayName(product)}</p>}

        <p className="mt-0.5 text-[13px] text-muted">
          {product.price > 0 && <span className="font-display font-extrabold tracking-tight text-ink">{formatPrice(product.price, product.currency)}</span>}
          {product.price > 0 && ' · '}{shopLabel(product)}
        </p>

        {!product.inStock && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-tomato-ink">
            <AlertTriangle size={14} aria-hidden /> Dućan ovo možda više nema. Razmisli o zamjeni.
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <div className={clsx(`priority-${item.priority}`, 'relative rounded-full')}>
            <label className="sr-only" htmlFor={`prio-${item.id}`}>Prioritet</label>
            <select id={`prio-${item.id}`} value={item.priority} onChange={e => onPriorityChange(e.target.value as Priority)}
              className="min-h-[30px] appearance-none rounded-full bg-transparent pl-3 pr-7 text-[13px] font-semibold">
              {PRIORITIES.map(p => <option key={p.value} value={p.value} className="text-coal">{p.label}</option>)}
            </select>
            <ChevronDown size={13} aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
          </div>
          {reservation && !isGroupBuy && (
            <span className="chip bg-sun-soft text-sun-ink">
              {purchased ? <Check size={13} strokeWidth={3} aria-hidden /> : <Gift size={13} aria-hidden />}
              {purchased ? 'Kupljeno' : 'Rezervirano'} · {reservation.reservedBy}
            </span>
          )}
          {isGroupBuy && (
            <span className="chip bg-mint-soft text-mint-ink">
              <Users size={13} aria-hidden /> Skupljaju zajedno ({contributors.length}){purchased ? ' · kupljeno' : ''}
            </span>
          )}
          {!reservation && <span className="chip chip-neutral text-muted">Slobodno</span>}
        </div>

        {editingNote ? (
          <div className="mt-2 flex items-center gap-1">
            <input type="text" autoFocus maxLength={200} value={noteValue} aria-label="Napomena"
              onChange={e => setNoteValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') { setEditingNote(false); setNoteValue(item.note || '') } }}
              placeholder="npr. veličina 62, plava boja"
              className="field !min-h-[40px] min-w-0 flex-1 !rounded-xl !py-1.5" />
            <button onClick={saveNote} aria-label="Spremi napomenu" className="icon-btn text-mint-ink"><Check size={18} /></button>
            <button onClick={() => { setEditingNote(false); setNoteValue(item.note || '') }} aria-label="Odustani" className="icon-btn text-muted"><X size={18} /></button>
          </div>
        ) : item.note ? (
          <button onClick={() => { setEditingNote(true); setNoteValue(item.note || '') }} className="group mt-1.5 flex min-h-[30px] items-center gap-1.5 text-left text-[13px] font-medium">
            <StickyNote size={13} aria-hidden className="flex-shrink-0 text-muted" /> {item.note}
            <Edit3 size={12} aria-label="Uredi napomenu" className="flex-shrink-0 text-muted opacity-60 group-hover:opacity-100" />
          </button>
        ) : (
          <button onClick={() => setEditingNote(true)} className="mt-1 flex min-h-[30px] items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink">
            <Plus size={13} aria-hidden /> Dodaj napomenu
          </button>
        )}

        {reservation?.note && !isGroupBuy && (
          <div className="mt-2 flex items-start gap-2 rounded-2xl bg-mint-soft p-2.5 text-[13px]">
            <MessageSquare size={14} aria-hidden className="mt-0.5 flex-shrink-0 text-mint-ink" />
            <p className="leading-relaxed">„{reservation.note}"</p>
          </div>
        )}

        {isGroupBuy && (
          <div className="mt-2 rounded-2xl bg-mint-soft p-3">
            <div className="mb-1.5 flex items-center justify-between text-[13px] font-semibold">
              <span>Skupljeno {formatPrice(collected)} od {formatPrice(target)}</span>
              <span>{progress} %</span>
            </div>
            <ProgressBar value={progress} label="Skupljeno" className="mb-2" barClass={progress >= 100 ? 'bg-mint' : 'bg-sun'} />
            <ul className="space-y-1">
              {contributors.map(c => (
                <li key={c.id} className="flex flex-wrap items-center gap-1.5 text-[13px]">
                  {c.role === 'ORDERER' ? <ShoppingBag size={13} aria-label="Naručuje" /> : <Wallet size={13} aria-label="Daje novac" />}
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-muted">{formatPrice(c.amount)}</span>
                  {c.note && <span className="text-muted">„{c.note}"</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {reservation && (
          confirmClear ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-medium text-muted">Osloboditi poklon za druge?</span>
              <button onClick={() => run(onClearReservation)} className="rounded-full bg-ink px-3 py-1.5 font-semibold text-canvas">Da</button>
              <button onClick={() => setConfirmClear(false)} className="rounded-full px-3 py-1.5 font-semibold text-muted">Ne</button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)} className="mt-1.5 flex min-h-[30px] items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink">
              <Undo2 size={13} aria-hidden /> Oslobodi rezervaciju
            </button>
          )
        )}
      </div>

      <button onClick={() => run(onDelete)} aria-label={`Ukloni ${product.name} s liste`} className="icon-btn -mr-1 -mt-1 flex-shrink-0 self-start text-muted hover:text-tomato-ink">
        <Trash2 size={17} />
      </button>
    </m.li>
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
        className="field !min-h-[42px] !py-1.5 font-display !text-xl font-extrabold" />
    )
  }

  return (
    <button onClick={() => setEditing(true)} title="Klikni za uređivanje naziva" className="group flex max-w-full items-center gap-2 text-left">
      <h2 className="truncate text-2xl font-extrabold sm:text-[1.7rem]">{name}</h2>
      <Edit3 size={15} aria-hidden className="flex-shrink-0 text-muted opacity-50 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

function ListSettings({ list, onSave }: { list: BabyList; onSave: (data: { description?: string | null; childName?: string | null; isPublic?: boolean }) => Promise<boolean> }) {
  const [description, setDescription] = useState(list.description || '')
  const [childName, setChildName] = useState(list.childName || '')
  const [saving, setSaving] = useState(false)
  const [savingChild, setSavingChild] = useState(false)
  const dirty = description.trim() !== (list.description || '')
  const childDirty = childName.trim() !== (list.childName || '')

  return (
    <div className="space-y-4 rounded-3xl bg-sunken/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[15px] font-bold">
            {list.isPublic ? <Globe size={15} className="text-mint-ink" aria-hidden /> : <Lock size={15} className="text-muted" aria-hidden />}
            {list.isPublic ? 'Lista je otključana' : 'Lista je zaključana'}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            {list.isPublic ? 'Svatko s linkom može je vidjeti i rezervirati poklone, a gosti je mogu naći i po punom imenu i prezimenu, tvom ili djetetovom.' : 'Dok je zaključana, ne otvara je ni link ni pretraga po imenu.'}
          </p>
        </div>
        <button role="switch" aria-checked={list.isPublic} aria-label="Otključana lista" onClick={() => onSave({ isPublic: !list.isPublic })} className="switch"><span /></button>
      </div>
      <div>
        <label htmlFor={`child-${list.id}`} className="field-label">Ime i prezime djeteta <span className="font-medium text-muted">(ako ga već znate)</span></label>
        <input id={`child-${list.id}`} type="text" maxLength={120} value={childName} onChange={e => setChildName(e.target.value)}
          placeholder="npr. Marin Horvat" className="field !bg-surface" />
        <p className="field-hint">Gosti mogu pronaći listu i po imenu i prezimenu djeteta. Prikazuje se i na slici kad podijeliš link.</p>
        {childDirty && (
          <button disabled={savingChild} onClick={async () => { setSavingChild(true); await onSave({ childName: childName.trim() || null }).finally(() => setSavingChild(false)) }}
            className="btn btn-sm btn-ink mt-2">
            {savingChild ? 'Spremam...' : 'Spremi ime'}
          </button>
        )}
      </div>
      <div>
        <label htmlFor={`desc-${list.id}`} className="field-label">Poruka za goste <span className="font-medium text-muted">(vidi se na listi)</span></label>
        <textarea id={`desc-${list.id}`} rows={3} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="npr. Baby shower je 12.5. kod nas doma. Hvala što ste uz nas."
          className="field resize-none !bg-surface" />
        {dirty && (
          <button disabled={saving} onClick={async () => { setSaving(true); await onSave({ description: description.trim() || null }).finally(() => setSaving(false)) }}
            className="btn btn-sm btn-ink mt-2">
            {saving ? 'Spremam...' : 'Spremi poruku'}
          </button>
        )}
      </div>
    </div>
  )
}

const DEFAULT_LIST_NAME: Record<string, string> = { birth: 'Lista za bebu', birthday: 'Rođendanska lista' }

export interface NewListDefaults {
  occasion: string
  dateInput: string
  babyGender: string
}

/** Pre-filled from the profile (and the occasion chosen at registration), everything stays editable for another child. */
function NewListModal({ defaults, onClose, onCreate }: {
  defaults: NewListDefaults
  onClose: () => void
  onCreate: (data: { name: string; occasion: string; childName: string; date: Date | null; babyGender: string }) => Promise<void>
}) {
  const [name, setName] = useState(DEFAULT_LIST_NAME[defaults.occasion] ?? '')
  const [nameTouched, setNameTouched] = useState(false)
  const [childName, setChildName] = useState('')
  const [occasion, setOccasion] = useState(defaults.occasion)
  const [dateInput, setDateInput] = useState(defaults.dateInput)
  const [babyGender, setBabyGender] = useState(defaults.occasion === 'birth' ? defaults.babyGender : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedOcc = OCCASIONS.find(o => o.value === occasion)
  const parsedDate = dateInput.length === 10 ? parseDMY(dateInput) : null

  const pickOccasion = (value: string) => {
    const next = occasion === value ? '' : value
    setOccasion(next)
    if (!nameTouched) setName(DEFAULT_LIST_NAME[next] ?? '')
    setBabyGender(next === 'birth' ? defaults.babyGender : '')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Naziv mora imati najmanje 2 znaka'); return }
    if (dateInput && !parsedDate) { setError(DATE_FORMAT_ERROR); return }
    setLoading(true); setError('')
    try {
      await onCreate({ name: name.trim(), occasion, childName: childName.trim(), date: parsedDate, babyGender })
      onClose()
    } catch (err) {
      setError(apiError(err))
      setLoading(false)
    }
  }

  return (
    <Modal title="Nova lista" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-5 pb-6 sm:px-7 sm:pb-7">
        <div>
          <label htmlFor="new-list-name" className="field-label">Naziv liste</label>
          <input id="new-list-name" type="text" maxLength={120} placeholder="npr. Lista za Mateja" value={name}
            onChange={e => { setName(e.target.value); setNameTouched(true) }} className="field" />
        </div>

        <fieldset>
          <legend className="field-label">Za što je lista?</legend>
          <div className="grid grid-cols-2 gap-2">
            {OCCASIONS.map(o => (
              <button key={o.value} type="button" aria-pressed={occasion === o.value} onClick={() => pickOccasion(o.value)}
                className={clsx(`tone-${o.tone}`, 'choice flex items-center gap-2.5 p-2.5 text-left text-sm font-semibold')}>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-tone p-1"><Art name={o.art} /></span>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="new-list-child" className="field-label">Ime i prezime djeteta <span className="font-medium text-muted">(ako ga već znate)</span></label>
          <input id="new-list-child" type="text" maxLength={120} autoComplete="off" placeholder="npr. Marin Horvat" value={childName}
            onChange={e => setChildName(e.target.value)} className="field" />
          <p className="field-hint">Gosti mogu pronaći listu i po imenu i prezimenu djeteta.</p>
        </div>

        {selectedOcc && (
          <DateField id="new-list-date" label={selectedOcc.dateLabel} value={dateInput} onChange={setDateInput}
            hint={defaults.dateInput ? 'Upisano pri registraciji. Promijeni ako je lista za drugo dijete.' : undefined} />
        )}

        {occasion === 'birth' && (
          <fieldset>
            <legend className="field-label">Spol bebe <span className="font-medium text-muted">(ako želiš)</span></legend>
            <div className="grid grid-cols-3 gap-2">
              {GENDERS.map(opt => (
                <button key={opt.value} type="button" aria-pressed={babyGender === opt.value} onClick={() => setBabyGender(g => g === opt.value ? '' : opt.value)}
                  className="choice min-h-[48px] px-1 text-[13px] font-semibold">
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {error && <p role="alert" className="field-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? 'Radim...' : 'Napravi listu'}</button>
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
      <div className="px-5 pb-6 sm:px-7 sm:pb-7">
        <p className="mb-5 text-muted">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-soft flex-1">Odustani</button>
          <button disabled={busy} onClick={async () => { setBusy(true); await onConfirm().finally(() => setBusy(false)) }} className="btn btn-danger flex-1">
            {busy ? 'Brišem...' : confirmLabel}
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
  const { toast, showToast } = useToast()

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  // Registration sends people here with ?nova=<prigoda>, so the first list opens pre-filled.
  const [requestedOccasion, setRequestedOccasion] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/prijava?next=/moja-lista'); return }
    const nova = new URLSearchParams(window.location.search).get('nova')
    if (nova !== null) {
      setRequestedOccasion(nova)
      setShowNewModal(true)
      router.replace('/moja-lista', { scroll: false })
    }
    listsApi.getAll()
      .then(res => {
        setLists(res.data)
        setExpandedList(prev => prev ?? res.data[0]?.id ?? null)
      })
      .catch(err => setLoadError(apiError(err, 'Liste se trenutno ne mogu učitati.')))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  const newListDefaults: NewListDefaults = {
    occasion: requestedOccasion || lists[0]?.occasion || (user?.dueDate ? 'birth' : ''),
    dateInput: toDMY(user?.dueDate),
    babyGender: user?.babyGender || '',
  }
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

  const handleCreate = async ({ name, occasion, childName, date, babyGender }: { name: string; occasion: string; childName: string; date: Date | null; babyGender: string }) => {
    if (date || babyGender) {
      await authApi.updateProfile({ dueDate: date ? date.toISOString() : undefined, babyGender: babyGender || undefined }).catch(() => {})
    }
    const res = await listsApi.create({ name, occasion: occasion || undefined, childName: childName || undefined })
    const newList: BabyList = { ...res.data, items: [], _count: { items: 0 } }
    setLists(prev => [newList, ...prev])
    setExpandedList(newList.id)
    showToast('Lista je napravljena. Dodaj prve proizvode.')
  }

  const updateListFields = (list: BabyList, data: { name?: string; description?: string | null; childName?: string | null; isPublic?: boolean }) =>
    withToast(async () => {
      await listsApi.update(list.id, data)
      patchList(list.id, l => ({ ...l, ...data, description: data.description === undefined ? l.description : data.description ?? undefined }))
    }, data.isPublic === undefined ? 'Spremljeno' : data.isPublic ? 'Lista je otključana' : 'Lista je zaključana')

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
        <main className="flex min-h-screen items-center justify-center pt-20"><Loader label="Tražim tvoje liste." /></main>
      </>
    )
  }

  // The due date is shared with birthday lists, so only count weeks when a list is about a birth.
  const pregnancy = lists.some(l => l.occasion === 'birth') && !lists.some(l => l.occasion === 'birthday') ? pregnancyStatus(user?.dueDate) : null

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in min-h-screen pb-16 pt-[92px]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <header className="flex items-end justify-between gap-3 pb-6 pt-4 sm:pt-6">
            <div className="min-w-0">
              <h1 className="display truncate pb-1 text-[2.9rem] sm:text-7xl">Hej, {user?.name?.split(' ')[0]}.</h1>
              <p className="mt-1.5 font-medium text-muted">
                {lists.length === 0 ? 'Još nemaš nijednu listu.' : `Imaš ${lists.length} ${plural(lists.length, 'listu', 'liste', 'lista')}.`}
              </p>
            </div>
            <button onClick={() => setShowNewModal(true)} className="btn btn-primary flex-shrink-0 !px-4 sm:!px-6">
              <Plus size={18} strokeWidth={3} aria-hidden /> <span className="hidden sm:inline">Nova lista</span><span className="sr-only sm:hidden">Nova lista</span>
            </button>
          </header>

          {pregnancy && (
            <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="tone-sun mb-5 flex items-center gap-4 rounded-3xl bg-tone p-4 text-on-tone sm:p-5">
              <span className="display flex-shrink-0 text-5xl tabular-nums sm:text-6xl">{pregnancy.week}.</span>
              <p className="font-medium leading-snug">
                <strong className="font-display font-extrabold">tjedan.</strong>{' '}
                {pregnancy.size && <>Beba je otprilike veličine {pregnancy.size}. </>}
                Do termina {plural(pregnancy.weeksLeft, 'ostaje', 'ostaju', 'ostaje')} {pregnancy.weeksLeft} {plural(pregnancy.weeksLeft, 'tjedan', 'tjedna', 'tjedana')}.
              </p>
            </m.div>
          )}

          {loadError && <p role="alert" className="mb-4 rounded-3xl bg-tomato-soft p-4 font-medium text-tomato-ink">{loadError}</p>}

          {lists.length === 0 && !loadError && (
            <div className="tone-bubble rounded-5xl bg-tone p-8 text-center text-on-tone sm:p-14">
              <div className="mx-auto w-28"><Art name="gift" /></div>
              <h2 className="display mt-3 text-4xl sm:text-5xl">Napravi prvu listu.</h2>
              <p className="mx-auto mt-3 max-w-sm text-lg font-medium leading-snug">Upiši što ti treba, pošalji link obitelji i prijateljima, i nitko više ne kupuje isto.</p>
              <button onClick={() => setShowNewModal(true)} className="btn btn-lg btn-ink mt-6 !bg-coal !text-white">Napravi listu</button>
            </div>
          )}

          <div className="space-y-4">
            {lists.map(list => {
              const isExpanded = expandedList === list.id
              const total = list.items.length
              const reserved = list.items.filter(i => i.reservation).length
              const purchased = list.items.filter(i => i.reservation?.status === 'PURCHASED').length
              const occ = OCCASIONS.find(o => o.value === list.occasion)
              const progress = total > 0 ? Math.round((reserved / total) * 100) : 0

              return (
                <section key={list.id} className="card overflow-hidden" aria-label={list.name}>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className={clsx(`tone-${occ?.tone ?? 'sun'}`, 'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-tone p-1.5 sm:h-14 sm:w-14')}>
                        <Art name={occ?.art ?? 'gift'} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <EditableListName name={list.name} onSave={name => updateListFields(list, { name })} />
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm font-medium text-muted">
                          <span>{total} {plural(total, 'stavka', 'stavke', 'stavki')}, {reserved} rezervirano{purchased > 0 && `, ${purchased} kupljeno`}</span>
                          {!list.isPublic && <span className="chip chip-neutral !py-0.5 !text-xs"><Lock size={11} aria-hidden /> zaključana</span>}
                        </p>
                      </div>
                      <button onClick={() => setExpandedList(isExpanded ? null : list.id)} aria-label={isExpanded ? 'Sakrij stavke' : 'Prikaži stavke'} aria-expanded={isExpanded} className="icon-btn -mr-1 -mt-1">
                        <ChevronDown size={20} aria-hidden className={clsx('transition-transform duration-300', isExpanded && 'rotate-180')} />
                      </button>
                    </div>

                    {total > 0 && <ProgressBar value={progress} label="Rezervirano" className="mt-4" />}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button onClick={() => setShareList(list)} className="btn btn-sm btn-primary"><Share2 size={15} aria-hidden /> Podijeli listu</button>
                      <a href={`/lista/${list.shareSlug}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-soft"><Eye size={15} aria-hidden /> Pogledaj kao gost</a>
                      <span className="flex-1" />
                      <button onClick={() => { setExpandedList(list.id); setSettingsOpen(s => s === list.id ? null : list.id) }}
                        aria-label="Postavke liste" aria-expanded={settingsOpen === list.id} className={clsx('icon-btn', settingsOpen === list.id && 'bg-line/10')}>
                        <Settings2 size={18} aria-hidden />
                      </button>
                      <button onClick={() => setDeleteList(list)} aria-label="Obriši listu" className="icon-btn text-muted hover:text-tomato-ink"><Trash2 size={18} aria-hidden /></button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { duration: 0.16 } }} className="overflow-hidden">
                        <div className="space-y-2 border-t border-line/10 p-3 sm:p-4">
                          <AnimatePresence initial={false}>
                            {settingsOpen === list.id && (
                              <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { duration: 0.14 } }} className="overflow-hidden">
                                <ListSettings list={list} onSave={data => updateListFields(list, data)} />
                              </m.div>
                            )}
                          </AnimatePresence>

                          {total === 0 ? (
                            <div className="px-3 py-8 text-center">
                              <p className="font-display text-xl font-extrabold tracking-tight">Lista je još prazna.</p>
                              <p className="mt-1 text-muted">Dodaj prvi proizvod iz kataloga ili zalijepi link iz web shopa.</p>
                            </div>
                          ) : (
                            <ul className="space-y-2">
                              <AnimatePresence initial={false}>
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
                              </AnimatePresence>
                            </ul>
                          )}

                          <div className="grid gap-2 pt-1 sm:grid-cols-2">
                            <Link href="/katalog" className="btn btn-soft !rounded-2xl"><ShoppingBag size={16} aria-hidden /> Dodaj iz kataloga</Link>
                            <button onClick={() => setSmartPasteListId(list.id)} className="btn btn-soft !rounded-2xl"><LinkIcon size={16} aria-hidden /> Dodaj s linka</button>
                          </div>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </section>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />

      <AnimatePresence>
        {showNewModal && !loading && <NewListModal key="new" defaults={newListDefaults} onClose={() => setShowNewModal(false)} onCreate={handleCreate} />}
        {shareList && <ShareListModal key="share" slug={shareList.shareSlug} listName={shareList.name} isPublic={shareList.isPublic} onClose={() => setShareList(null)} />}
        {smartPasteListId && (
          <SmartPasteModal key="paste" listId={smartPasteListId} onClose={() => setSmartPasteListId(null)}
            onAdded={item => { addItemToState(smartPasteListId, item); setSmartPasteListId(null); showToast('Dodano s linka.') }} />
        )}
        {deleteList && (
          <ConfirmModal key="delete" title="Obrisati listu?" confirmLabel="Obriši"
            message={`Lista „${deleteList.name}" i sve rezervacije na njoj bit će trajno obrisane. Link više neće raditi.`}
            onConfirm={confirmDeleteList} onClose={() => setDeleteList(null)} />
        )}
      </AnimatePresence>

      <Toast message={toast} />
    </>
  )
}
