'use client'
import { useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import PriorityPicker from '@/components/PriorityPicker'
import { Art } from '@/components/art'
import { apiError, listsApi } from '@/lib/api'
import { categoryMeta } from '@/lib/categories'
import { displayName, formatPrice, plural } from '@/lib/format'
import { BabyList, Priority, Product } from '@/types'
import clsx from 'clsx'

const listCount = (list: BabyList) => list._count?.items ?? list.items?.length ?? 0

export default function AddToListModal({ product, lists, onClose, onAdded }: {
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
  const meta = categoryMeta(product.category?.slug)

  const add = async () => {
    setSaving(true); setError('')
    try {
      await listsApi.addItem(listId, product.id, priority, note.trim() || undefined)
      onAdded('Dodano na Listicu.')
    } catch (err: any) {
      setError(err?.response?.status === 409 ? 'Ovaj proizvod je već na toj Listici.' : apiError(err))
      setSaving(false)
    }
  }

  return (
    <Modal title="Dodaj na Listicu" onClose={onClose} sheet>
      <div className="px-5 pb-6 sm:px-7 sm:pb-7">
        <div className={clsx(`tone-${meta.tone}`, 'mb-5 flex gap-3 rounded-3xl bg-tone-soft p-3')}>
          <div className="photo-tile flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <Art name={meta.art} className="h-10 w-10" />}
          </div>
          <div className="min-w-0 flex-1">
            {product.brand && <p className="text-[13px] font-bold text-tone-ink">{product.brand}</p>}
            <p className="line-clamp-2 text-sm font-medium leading-snug">{displayName(product)}</p>
            <p className="mt-0.5 font-display font-extrabold tracking-tight">{formatPrice(product.price, product.currency)}</p>
          </div>
        </div>

        {lists.length === 0 ? (
          <div className="py-3 text-center">
            <p className="mb-4 text-muted">Još nemaš Listicu. Napravi je pa se vrati po ovaj proizvod.</p>
            <Link href="/moja-lista" className="btn btn-primary">Napravi Listicu</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {lists.length > 1 && (
              <fieldset>
                <legend className="field-label">Na koju Listicu?</legend>
                <div className="space-y-2">
                  {lists.map(list => (
                    <button key={list.id} type="button" aria-pressed={listId === list.id} onClick={() => setListId(list.id)}
                      className="choice flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-semibold">
                      <span className="truncate">{list.name}</span>
                      <span className="flex-shrink-0 text-xs font-medium opacity-70">{listCount(list)} {plural(listCount(list), 'stavka', 'stavke', 'stavki')}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <PriorityPicker value={priority} onChange={setPriority} />
            <div>
              <label htmlFor="add-note" className="field-label">Napomena <span className="font-medium text-muted">(ako treba)</span></label>
              <input id="add-note" type="text" maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder="npr. veličina 62, plava boja" className="field" />
            </div>
            {error && <p role="alert" className="field-error">{error}</p>}
            <button onClick={add} disabled={saving || !listId} className="btn btn-primary w-full">
              {saving ? 'Dodajem...' : 'Dodaj na Listicu'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
