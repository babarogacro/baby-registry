'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, apiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { safeNext } from '@/lib/redirect'
import { parseDMY, maskDMY, formatDateHR } from '@/lib/format'
import GoogleSignIn from '@/components/GoogleSignIn'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'

const OCCASIONS = [
  { value: 'birth', emoji: '🍼', label: 'Rođenje djeteta', dateLabel: 'Planirani termin poroda' },
  { value: 'birthday', emoji: '🎂', label: 'Rođendan djeteta', dateLabel: 'Datum rođendana' },
]

const inputCls = 'w-full px-4 py-3 bg-white border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-rose'
const labelCls = 'block text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide'

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
    if (form.dateInput && !parsedDate) { setError('Datum nije ispravan. Format: dd/mm/gggg'); return }
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
      router.push(next)
    } catch (err) {
      setError(apiError(err, 'Greška pri registraciji.'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blush via-cream to-sage-light/30 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blush/60 rounded-full blur-3xl" aria-hidden />
        <div className="relative text-center">
          <span className="text-8xl block mb-6" aria-hidden>🍼</span>
          <h2 className="font-serif text-4xl text-charcoal mb-4">Svaka beba zaslužuje savršen doček</h2>
          <p className="text-warm-gray max-w-xs mx-auto leading-relaxed mb-8">Kreiraj svoju listu željenih poklona i podijeli je s onima koji te vole.</p>
          <ul className="flex flex-col gap-3">
            {OCCASIONS.map(o => (
              <li key={o.value} className="flex items-center gap-3 bg-white/50 rounded-2xl px-5 py-3.5 text-left">
                <span className="text-2xl" aria-hidden>{o.emoji}</span>
                <span className="text-sm text-charcoal font-medium">{o.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-warm-gray hover:text-charcoal mb-8"><ArrowLeft size={14} /> Natrag</Link>
          <h1 className="font-serif text-3xl text-charcoal mb-1">Kreiraj račun</h1>
          <p className="text-warm-gray text-sm mb-6">Već imaš račun? <Link href="/prijava" className="text-rose hover:underline font-medium">Prijavi se</Link></p>
          {error && <div role="alert" className="mb-5 p-3 bg-rose/10 border border-rose/20 rounded-xl text-sm text-rose">{error}</div>}

          <GoogleSignIn text="signup_with" onCredential={handleGoogle} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className={labelCls}>Ime i prezime *</label>
              <input id="reg-name" type="text" required autoComplete="name" maxLength={100} placeholder="Ana Horvat" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label htmlFor="reg-email" className={labelCls}>Email *</label>
              <input id="reg-email" type="email" required autoComplete="email" placeholder="ana@email.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label htmlFor="reg-password" className={labelCls}>Lozinka *</label>
              <div className="relative">
                <input id="reg-password" type={showPass ? 'text' : 'password'} required minLength={8} autoComplete="new-password" placeholder="Najmanje 8 znakova"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={clsx(inputCls, 'pr-11')} />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-warm-gray">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <fieldset>
              <legend className={labelCls}>Za što kreiramo listu?</legend>
              <div className="grid grid-cols-2 gap-2">
                {OCCASIONS.map(o => (
                  <button key={o.value} type="button" aria-pressed={form.occasion === o.value}
                    onClick={() => setForm(p => ({ ...p, occasion: p.occasion === o.value ? '' : o.value, dateInput: '', babyGender: '' }))}
                    className={clsx('flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all',
                      form.occasion === o.value ? 'border-rose bg-blush/30 text-charcoal' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                    <span className="text-xl" aria-hidden>{o.emoji}</span> {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {selectedOcc && (
              <div>
                <label htmlFor="reg-date" className={labelCls}>{selectedOcc.dateLabel}</label>
                <div className="relative">
                  <input id="reg-date" type="text" inputMode="numeric" placeholder="15/06/2026" value={form.dateInput} maxLength={10}
                    onChange={e => setForm(p => ({ ...p, dateInput: maskDMY(e.target.value) }))}
                    className={clsx(inputCls, 'font-mono tracking-wider')} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-warm-gray/60 pointer-events-none">dd/mm/gggg</span>
                </div>
                {parsedDate && <p className="text-xs text-sage mt-1">✓ {formatDateHR(parsedDate)}</p>}
              </div>
            )}
            {form.occasion === 'birth' && (
              <fieldset>
                <legend className={labelCls}>Spol bebe</legend>
                <div className="grid grid-cols-3 gap-2">
                  {[{ value: 'boy', emoji: '💙', label: 'Dječak' }, { value: 'girl', emoji: '💗', label: 'Djevojčica' }, { value: 'surprise', emoji: '🎀', label: 'Iznenađenje' }].map(opt => (
                    <button key={opt.value} type="button" aria-pressed={form.babyGender === opt.value}
                      onClick={() => setForm(p => ({ ...p, babyGender: p.babyGender === opt.value ? '' : opt.value }))}
                      className={clsx('flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium border transition-all',
                        form.babyGender === opt.value ? 'border-rose bg-blush/30' : 'border-blush/40 text-warm-gray hover:border-blush-mid')}>
                      <span className="text-xl" aria-hidden>{opt.emoji}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-rose text-white font-medium rounded-full hover:bg-rose/90 transition-all hover:shadow-lg disabled:opacity-60 mt-2">
              {loading ? 'Kreiram račun...' : 'Kreiraj račun 🎉'}
            </button>
            <p className="text-xs text-warm-gray/80 text-center">
              Registracijom prihvaćaš <Link href="/uvjeti" className="underline">uvjete korištenja</Link> i <Link href="/privatnost" className="underline">politiku privatnosti</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function RegistracijaPage() {
  return <Suspense><RegistracijaForm /></Suspense>
}
