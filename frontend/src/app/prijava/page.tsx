'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, apiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { safeNext } from '@/lib/redirect'
import GoogleSignIn from '@/components/GoogleSignIn'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

function PrijavaForm() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get('next'))
  const { user, setAuth, loadFromStorage } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadFromStorage() }, [loadFromStorage])
  useEffect(() => { if (user) router.replace(next) }, [user, next, router])

  const finish = (data: { user: Parameters<typeof setAuth>[0]; token: string }) => {
    setAuth(data.user, data.token)
    router.push(next)
  }

  const handleGoogle = async (credential: string) => {
    setLoading(true); setError(null)
    try {
      finish((await authApi.googleLogin(credential)).data)
    } catch (err) {
      setError(apiError(err, 'Google prijava nije uspjela'))
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      finish((await authApi.login(email.trim().toLowerCase(), password)).data)
    } catch (err) {
      setError(apiError(err, 'Pogrešan email ili lozinka'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-warm-gray hover:text-charcoal transition-colors mb-8">
          <ArrowLeft size={14} /> Natrag
        </Link>

        <div className="text-center mb-8">
          <span className="text-5xl block mb-4" aria-hidden>🍼</span>
          <h1 className="font-serif text-3xl text-charcoal mb-2">Prijava</h1>
          <p className="text-warm-gray text-sm">
            Nemaš račun?{' '}
            <Link href={`/registracija${next !== '/moja-lista' ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-rose hover:underline font-medium">Registriraj se</Link>
          </p>
        </div>

        {error && <div role="alert" className="mb-5 p-3 bg-rose/10 border border-rose/20 rounded-xl text-sm text-rose">{error}</div>}

        <GoogleSignIn text="signin_with" onCredential={handleGoogle} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide">Email</label>
            <input id="login-email" type="email" required autoComplete="email" placeholder="ana@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-rose transition-colors" />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-warm-gray mb-1.5 uppercase tracking-wide">Lozinka</label>
            <div className="relative">
              <input id="login-password" type={showPass ? 'text' : 'password'} required autoComplete="current-password" placeholder="Tvoja lozinka" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-blush/40 rounded-xl text-base sm:text-sm focus:outline-none focus:border-rose transition-colors pr-11" />
              <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-warm-gray">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-rose text-white font-medium rounded-full hover:bg-rose/90 transition-all hover:shadow-lg hover:shadow-rose/20 disabled:opacity-60">
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PrijavaPage() {
  return <Suspense><PrijavaForm /></Suspense>
}
