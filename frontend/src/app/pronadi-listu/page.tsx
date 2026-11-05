'use client'
import { Suspense, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Art } from '@/components/art'
import { searchApi, apiError } from '@/lib/api'
import { track } from '@/lib/analytics'
import { OCCASIONS, genderLabel } from '@/lib/occasions'
import { BabyList } from '@/types'
import { ArrowRight, Loader2, Search, X } from 'lucide-react'
import { formatDateHR, plural } from '@/lib/format'
import clsx from 'clsx'

function ListCard({ list, index }: { list: BabyList; index: number }) {
  const occ = OCCASIONS.find(o => o.value === list.occasion)
  const dueDate = list.user?.dueDate ? new Date(list.user.dueDate) : null
  const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null
  const gender = list.user?.babyGender !== 'surprise' ? genderLabel(list.user?.babyGender) : null
  return (
    <Link href={`/lista/${list.shareSlug}`} style={{ '--i': index } as React.CSSProperties}
      className="card card-in group flex items-center gap-4 p-3.5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-4">
      <span className={clsx(`tone-${occ?.tone ?? 'sun'}`, 'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-tone p-2')}>
        <Art name={occ?.art ?? 'gift'} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-extrabold">{list.name}</h2>
        <p className="truncate font-medium text-muted">{list.user?.name}{list.childName && <> · {list.childName}</>}</p>
        <p className="mt-0.5 text-[13px] text-muted">
          {list._count && <>{list._count.items} {plural(list._count.items, 'poklon', 'poklona', 'poklona')}</>}
          {gender && <>, {gender.toLowerCase()}</>}
          {dueDate && <>, {formatDateHR(dueDate)}</>}
          {daysLeft !== null && daysLeft > 0 && <> (još {daysLeft} {plural(daysLeft, 'dan', 'dana', 'dana')})</>}
        </p>
      </div>
      <ArrowRight size={20} aria-hidden className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  )
}

// A list is found only by a full name, so "Ana" alone can't page through everyone's lists.
const isFullName = (q: string) => {
  const words = q.trim().split(/\s+/).filter(Boolean)
  return words.length >= 2 && words.every(w => w.replace(/[^\p{L}]/gu, '').length >= 2)
}

function PronadiListu() {
  const initialQuery = useSearchParams().get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<BabyList[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (q: string) => {
    if (!isFullName(q)) {
      setError('Upiši puno ime i prezime, npr. Ana Horvat.')
      setResults([]); setSearched(false)
      return
    }
    setLoading(true); setError(null); setSearched(true)
    try {
      const res = await searchApi.findLists(q.trim())
      setResults(res.data)
      // Only whether something was found, never the name that was typed.
      track('search', { s: res.data.length ? 'nadeno' : 'prazno' })
    } catch (err) {
      setError(apiError(err, 'Greška pri pretrazi'))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (initialQuery) handleSearch(initialQuery) }, [initialQuery, handleSearch])

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="min-h-screen pb-16">
        <section className="tone-sky rounded-b-5xl bg-tone px-5 pb-12 pt-[110px] text-on-tone sm:pb-16 sm:pt-[130px]">
          <div className="page-in mx-auto max-w-2xl text-center">
            <h1 className="display text-[3.1rem] sm:text-7xl">Pronađi listu</h1>
            <p className="mx-auto mt-3 max-w-md text-lg font-medium leading-snug">Upiši puno ime i prezime roditelja ili djeteta, pa odaberi poklon koji želiš kupiti.</p>
            <form className="mt-7 flex flex-col gap-2.5 sm:flex-row" onSubmit={e => { e.preventDefault(); handleSearch(query) }}>
              <div className="relative flex-1">
                <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-coal/60" aria-hidden />
                <input type="search" aria-label="Ime i prezime roditelja ili djeteta" placeholder="npr. Ana Horvat" value={query} autoFocus onChange={e => { setQuery(e.target.value); setError(null) }}
                  className="min-h-[58px] w-full rounded-full bg-white pl-13 pr-12 text-lg text-coal placeholder:text-coal/50 [&::-webkit-search-cancel-button]:hidden" style={{ paddingLeft: '3.25rem' }} />
                {query && (
                  <button type="button" aria-label="Očisti" onClick={() => { setQuery(''); setResults([]); setSearched(false) }} className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-coal/70 hover:bg-coal/5">
                    <X size={18} />
                  </button>
                )}
              </div>
              <button type="submit" disabled={query.trim().length < 3 || loading} className="btn btn-lg !bg-coal !text-white">
                {loading ? <Loader2 size={20} className="animate-spin" aria-label="Tražim" /> : 'Traži'}
              </button>
            </form>
          </div>
        </section>

        <div className="mx-auto max-w-2xl px-4 pt-8">
          {error && <div role="alert" className="field-error rounded-2xl bg-tomato-soft p-3 text-center">{error}</div>}
          {searched && !loading && !error && (
            results.length === 0 ? (
              <div className="py-10 text-center">
                <div className="tone-bubble mx-auto w-20"><Art name="moon" /></div>
                <h2 className="mt-3 text-2xl font-extrabold">Nema takve liste.</h2>
                <p className="mx-auto mt-2 max-w-sm text-muted">Za „{query}" nismo ništa našli. Provjeri kako se pišu ime i prezime ili zamoli roditelje da ti pošalju link.</p>
              </div>
            ) : (
              <>
                <p className="mb-3 font-display text-lg font-extrabold tracking-tight" aria-live="polite">{results.length} {plural(results.length, 'lista', 'liste', 'lista')}</p>
                <div className="space-y-2.5">{results.map((list, i) => <ListCard key={list.id} list={list} index={i} />)}</div>
              </>
            )
          )}
          {!searched && (
            <p className="text-center text-muted">
              Tražiš svoju? <Link href="/moja-lista" className="font-semibold text-ink underline underline-offset-2">Otvori svoje liste</Link>
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function PronadiListuPage() {
  return <Suspense><PronadiListu /></Suspense>
}
