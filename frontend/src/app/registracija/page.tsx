'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, m } from 'motion/react'
import { authApi, apiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { safeNext } from '@/lib/redirect'
import { parseDMY } from '@/lib/format'
import { GENDERS, OCCASIONS } from '@/lib/occasions'
import AuthShell from '@/components/AuthShell'
import DateField, { DATE_FORMAT_ERROR } from '@/components/DateField'
import GoogleSignIn from '@/components/GoogleSignIn'
import { Art } from '@/components/art'
import { Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'

function RegistracijaForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  const initialOccasion = OCCASIONS.some(o => o.value === params.get('occasion')) ? params.get('occasion')! : ''
  const { user, setAuth, loadFromStorage } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', dateInput: '', babyGender: '', occasion: initialOccasion })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedOcc = OCCASIONS.find(o => o.value === form.occasion)
  const parsedDate = form.dateInput.length === 10 ? parseDMY(form.dateInput) : null

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (user) router.replace(next) }, [user, next, router])

  const handleGoogle = async (credential: string) => {
    setError(null)
    try {
      const res = await authApi.googleLogin(credential)
      setAuth(res.data.user, res.data.token)
      router.push(next)
    } catch (err) {
      setError(apiError(err, 'Google prijava nije uspjela'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Lozinka mora imati najmanje 8 znakova'); return }
    if (form.dateInput && !parsedDate) { setError(DATE_FORMAT_ERROR); return }
    setLoading(true); setError(null)
    try {
      const res = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        dueDate: parsedDate ? parsedDate.toISOString() : undefined,
        babyGender: form.babyGender || undefined,
      })
      setAuth(res.data.user, res.data.token)
      // Straight into the first list, pre-filled with what was just entered.
      router.push(next === '/moja-lista' ? `/moja-lista?nova=${form.occasion}` : next)
    } catch (err) {
      setError(apiError(err, 'Greška pri registraciji.'))
      setLoading(false)
    }
  }

  return (
    <AuthShell headline={<>Registracija<br />traje pola minute.</>} sub="Besplatno je. Kad napraviš Listicu, šalješ je obitelji i prijateljima jednim linkom.">
      <h1 className="display text-5xl">Registracija</h1>
      <p className="mb-7 mt-3 text-muted">Već imaš profil? <Link href="/prijava" className="font-semibold text-ink underline underline-offset-2">Prijavi se</Link></p>

      {error && <div role="alert" className="field-error mb-5 rounded-2xl bg-tomato-soft p-3">{error}</div>}

      <GoogleSignIn text="signup_with" onCredential={handleGoogle} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reg-name" className="field-label">Ime i prezime</label>
          <input id="reg-name" type="text" required autoComplete="name" maxLength={100} placeholder="Ana Horvat" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="field" />
        </div>
        <div>
          <label htmlFor="reg-email" className="field-label">Email</label>
          <input id="reg-email" type="email" required autoComplete="email" placeholder="ana@email.com" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="field" />
        </div>
        <div>
          <label htmlFor="reg-password" className="field-label">Lozinka</label>
          <div className="relative">
            <input id="reg-password" type={showPass ? 'text' : 'password'} required minLength={8} autoComplete="new-password" placeholder="Najmanje 8 znakova"
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="field pr-12" />
            <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Sakrij lozinku' : 'Prikaži lozinku'} className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2 text-muted">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <fieldset>
          <legend className="field-label">Za što je Listica?</legend>
          <div className="grid grid-cols-2 gap-2">
            {OCCASIONS.map(o => (
              <button key={o.value} type="button" aria-pressed={form.occasion === o.value}
                onClick={() => setForm(p => ({ ...p, occasion: p.occasion === o.value ? '' : o.value, dateInput: '', babyGender: '' }))}
                className={clsx(`tone-${o.tone}`, 'choice flex items-center gap-2.5 p-2.5 text-left text-sm font-semibold')}>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-tone p-1"><Art name={o.art} /></span>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <AnimatePresence initial={false}>
          {selectedOcc && (
            <m.div key="date" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { duration: 0.14 } }} className="overflow-hidden">
              <DateField id="reg-date" label={selectedOcc.dateLabel} value={form.dateInput} onChange={value => setForm(p => ({ ...p, dateInput: value }))} />
            </m.div>
          )}
          {form.occasion === 'birth' && (
            <m.fieldset key="gender" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { duration: 0.14 } }} className="overflow-hidden">
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
            </m.fieldset>
          )}
        </AnimatePresence>

        <button type="submit" disabled={loading} className="btn btn-primary !mt-6 w-full">{loading ? 'Trenutak...' : 'Registriraj se'}</button>
        <p className="text-center text-[13px] text-muted">
          Registracijom prihvaćaš <Link href="/uvjeti" className="font-semibold underline">uvjete korištenja</Link> i <Link href="/privatnost" className="font-semibold underline">politiku privatnosti</Link>.
        </p>
      </form>
    </AuthShell>
  )
}

export default function RegistracijaPage() {
  return <Suspense><RegistracijaForm /></Suspense>
}
