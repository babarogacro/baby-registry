'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, apiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { safeNext } from '@/lib/redirect'
import AuthShell from '@/components/AuthShell'
import GoogleSignIn from '@/components/GoogleSignIn'
import { Eye, EyeOff } from 'lucide-react'

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
    <AuthShell headline={<>Vidi što je<br />novo na listi.</>} sub="Prijavi se i provjeri tko je što rezervirao.">
      <h1 className="display text-5xl">Prijava</h1>
      <p className="mb-7 mt-3 text-muted">
        Nemaš profil?{' '}
        <Link href={`/registracija${next !== '/moja-lista' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-ink underline underline-offset-2">Registriraj se</Link>
      </p>

      {error && <div role="alert" className="field-error mb-5 rounded-2xl bg-tomato-soft p-3">{error}</div>}

      <GoogleSignIn text="signin_with" onCredential={handleGoogle} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="field-label">Email</label>
          <input id="login-email" type="email" required autoComplete="email" placeholder="ana@email.com" value={email} onChange={e => setEmail(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="login-password" className="field-label">Lozinka</label>
          <div className="relative">
            <input id="login-password" type={showPass ? 'text' : 'password'} required autoComplete="current-password" placeholder="Tvoja lozinka" value={password}
              onChange={e => setPassword(e.target.value)} className="field pr-12" />
            <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Sakrij lozinku' : 'Prikaži lozinku'} className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2 text-muted">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary !mt-6 w-full">{loading ? 'Prijava...' : 'Prijavi se'}</button>
      </form>
    </AuthShell>
  )
}

export default function PrijavaPage() {
  return <Suspense><PrijavaForm /></Suspense>
}
