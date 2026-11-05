'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'motion/react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Modal from '@/components/Modal'
import { authApi, apiError } from '@/lib/api'
import { GENDERS } from '@/lib/occasions'
import { parseDMY, toDMY } from '@/lib/format'
import DateField, { DATE_FORMAT_ERROR } from '@/components/DateField'
import { useAuthStore, leaveToHome } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import { Check, Moon } from 'lucide-react'
import clsx from 'clsx'

function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setBusy(true); setError('')
    try {
      await authApi.deleteAccount()
      onDeleted()
    } catch (err) {
      setError(apiError(err))
      setBusy(false)
    }
  }

  return (
    <Modal title="Obrisati profil?" onClose={onClose}>
      <div className="px-5 pb-6 sm:px-7 sm:pb-7">
        <p className="mb-4 text-muted">
          Trajno brišemo tvoj profil, sve tvoje Listice i rezervacije na njima. Poslani linkovi prestat će raditi. Ovo se ne može poništiti.
        </p>
        <label htmlFor="delete-confirm" className="field-label">Za potvrdu upiši OBRIŠI</label>
        <input id="delete-confirm" type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" className="field mb-4" />
        {error && <p role="alert" className="field-error mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-soft flex-1">Odustani</button>
          <button onClick={remove} disabled={busy || confirmText.trim().toUpperCase() !== 'OBRIŠI'} className="btn btn-danger flex-1">
            {busy ? 'Brišem...' : 'Obriši profil'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function ProfilPage() {
  const router = useRouter()
  const { user, setAuth, logout, token, isLoading: authLoading, loadFromStorage } = useAuthStore()
  const { theme, toggle } = useTheme()
  const [form, setForm] = useState({ name: '', dueDate: '', babyGender: '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/prijava?next=/profil'); return }
    setForm({
      name: user.name || '',
      dueDate: toDMY(user.dueDate),
      babyGender: user.babyGender || '',
    })
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedDate = form.dueDate ? parseDMY(form.dueDate) : null
    if (form.dueDate && !parsedDate) { setError(DATE_FORMAT_ERROR); return }
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.updateProfile({ name: form.name.trim(), dueDate: parsedDate ? parsedDate.toISOString() : null, babyGender: form.babyGender || null })
      if (token) setAuth(res.data, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(apiError(err, 'Greška pri spremanju'))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) return null

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in min-h-screen px-4 pb-16 pt-[92px]">
        <div className="mx-auto max-w-lg">
          <header className="pb-6 pt-4">
            <h1 className="display text-[3.2rem] sm:text-7xl">Profil</h1>
            <p className="mt-2 font-medium text-muted">{user.email}</p>
          </header>

          <div className="card p-5 sm:p-7">
            {error && <div role="alert" className="field-error mb-5 rounded-2xl bg-tomato-soft p-3">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="profile-name" className="field-label">Ime i prezime</label>
                <input id="profile-name" type="text" required minLength={2} maxLength={100} autoComplete="name" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field" />
              </div>

              <DateField id="profile-due" label="Termin poroda ili datum rođendana" value={form.dueDate}
                onChange={value => setForm(p => ({ ...p, dueDate: value }))} hint="Gosti ga vide na tvojim Listicama." />

              <fieldset>
                <legend className="field-label">Spol bebe <span className="font-medium text-muted">(ako želiš)</span></legend>
                <div className="grid grid-cols-3 gap-2">
                  {GENDERS.map(opt => (
                    <button key={opt.value} type="button" aria-pressed={form.babyGender === opt.value}
                      onClick={() => setForm(p => ({ ...p, babyGender: p.babyGender === opt.value ? '' : opt.value }))}
                      className="choice min-h-[48px] px-1 text-[13px] font-semibold">
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button type="submit" disabled={loading} className={clsx('btn w-full', saved ? 'btn-ink' : 'btn-primary')}>
                {saved ? <><Check size={18} strokeWidth={3} aria-hidden /> Spremljeno</> : loading ? 'Spremam...' : 'Spremi promjene'}
              </button>
            </form>
          </div>

          <div className="card mt-4 flex items-center justify-between gap-4 p-5 sm:px-7">
            <label htmlFor="night-switch" className="cursor-pointer">
              <span className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight"><Moon size={17} aria-hidden /> Tamni prikaz</span>
              <span className="block text-[13px] text-muted">Tamna pozadina, ugodnija za oči noću.</span>
            </label>
            <button id="night-switch" role="switch" aria-checked={theme === 'night'} onClick={toggle} className="switch"><span /></button>
          </div>

          <div className="mt-8 border-t border-line/10 pt-5">
            <h2 className="text-base font-extrabold">Brisanje profila</h2>
            <p className="mb-3 mt-1 text-[13px] text-muted">Trajno je i ne može se poništiti.</p>
            <button onClick={() => setDeleting(true)} className="btn btn-sm btn-soft !text-tomato-ink">Obriši moj profil</button>
          </div>
        </div>
      </main>
      <Footer />

      <AnimatePresence>
        {deleting && (
          <DeleteAccountModal key="delete" onClose={() => setDeleting(false)} onDeleted={() => { leaveToHome(); logout() }} />
        )}
      </AnimatePresence>
    </>
  )
}
