'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Modal from '@/components/Modal'
import { authApi, apiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { User, Calendar, Baby, Save, Check } from 'lucide-react'
import clsx from 'clsx'

const GENDERS = [
  { value: 'boy', emoji: '💙', label: 'Dječak' },
  { value: 'girl', emoji: '💗', label: 'Djevojčica' },
  { value: 'surprise', emoji: '🎀', label: 'Iznenađenje' },
]

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
    <Modal title="Obrisati račun?" onClose={onClose}>
      <div className="px-5 sm:px-6 pb-6">
        <p className="text-sm text-warm-gray mb-4">
          Trajno ćemo obrisati tvoj račun, sve tvoje liste i rezervacije na njima. Linkovi koje si podijelila prestat će raditi. Ovo se ne može poništiti.
        </p>
        <label htmlFor="delete-confirm" className="block text-xs font-medium text-warm-gray mb-1.5">Za potvrdu upiši <strong>OBRIŠI</strong></label>
        <input id="delete-confirm" type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off"
          className="w-full px-4 py-3 bg-cream border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-rose mb-4" />
        {error && <p role="alert" className="text-sm text-rose mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-blush/40 text-warm-gray text-sm font-medium rounded-full hover:bg-cream">Odustani</button>
          <button onClick={remove} disabled={busy || confirmText.trim().toUpperCase() !== 'OBRIŠI'}
            className="flex-1 py-3 bg-rose text-white text-sm font-medium rounded-full hover:bg-rose/90 disabled:opacity-40">
            {busy ? 'Brišem...' : 'Obriši račun'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function ProfilPage() {
  const router = useRouter()
  const { user, setAuth, logout, token, isLoading: authLoading, loadFromStorage } = useAuthStore()
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
      dueDate: user.dueDate ? user.dueDate.substring(0, 10) : '',
      babyGender: user.babyGender || '',
    })
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.updateProfile({ name: form.name.trim(), dueDate: form.dueDate || null, babyGender: form.babyGender || null })
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
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-lg mx-auto">
          <div className="py-8">
            <h1 className="font-serif text-3xl text-charcoal mb-1">Moj profil</h1>
            <p className="text-warm-gray text-sm">{user.email}</p>
          </div>

          <div className="bg-white rounded-3xl border border-blush/30 p-6 shadow-sm">
            {error && <div role="alert" className="mb-5 p-3 bg-rose/10 border border-rose/20 rounded-xl text-sm text-rose">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="profile-name" className="flex items-center gap-1.5 text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide">
                  <User size={11} /> Ime i prezime
                </label>
                <input id="profile-name" type="text" required minLength={2} maxLength={100} autoComplete="name" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-cream border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-blush-mid transition-colors" />
              </div>

              <div>
                <label htmlFor="profile-due" className="flex items-center gap-1.5 text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide">
                  <Calendar size={11} /> Termin poroda / datum rođendana
                </label>
                <input id="profile-due" type="date" value={form.dueDate}
                  onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-4 py-3 bg-cream border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-blush-mid transition-colors" />
                <p className="text-xs text-warm-gray/70 mt-1">Prikazuje se gostima na tvojim listama.</p>
              </div>

              <fieldset>
                <legend className="flex items-center gap-1.5 text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide">
                  <Baby size={11} /> Spol bebe
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {GENDERS.map(opt => (
                    <button key={opt.value} type="button" aria-pressed={form.babyGender === opt.value}
                      onClick={() => setForm(p => ({ ...p, babyGender: p.babyGender === opt.value ? '' : opt.value }))}
                      className={clsx('py-3 rounded-xl text-sm font-medium border transition-all',
                        form.babyGender === opt.value ? 'border-rose bg-blush/30 text-charcoal' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                      <span className="block text-xl mb-0.5" aria-hidden>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button type="submit" disabled={loading}
                className={clsx('w-full py-3 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50',
                  saved ? 'bg-sage text-white' : 'bg-rose text-white hover:bg-rose/90 hover:shadow-lg hover:shadow-rose/20')}>
                {saved ? <><Check size={16} /> Spremljeno!</> : loading ? 'Sprema se...' : <><Save size={16} /> Spremi promjene</>}
              </button>
            </form>
          </div>

          <div className="mt-6 p-5 border border-rose/20 rounded-2xl bg-rose/5">
            <h2 className="text-sm font-medium text-rose mb-1">Zona opasnosti</h2>
            <p className="text-xs text-warm-gray mb-3">Brisanje računa je trajno i ne može se poništiti.</p>
            <button onClick={() => setDeleting(true)} className="text-xs text-rose/80 hover:text-rose underline transition-colors">
              Obriši moj račun
            </button>
          </div>
        </div>
      </main>

      {deleting && (
        <DeleteAccountModal onClose={() => setDeleting(false)}
          onDeleted={() => { logout(); router.replace('/') }} />
      )}
    </>
  )
}
