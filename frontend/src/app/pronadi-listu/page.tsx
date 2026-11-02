'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { searchApi } from '@/lib/api'
import { BabyList } from '@/types'
import { Search, X, ArrowRight, Calendar } from 'lucide-react'
import { formatDateHR } from '@/lib/format'

const OCC: Record<string, { emoji: string; label: string }> = {
  birth:    { emoji: '🍼', label: 'Rođenje djeteta' },
  birthday: { emoji: '🎂', label: 'Rođendan djeteta' },
  other:    { emoji: '🎁', label: 'Ostalo' },
}

function ListCard({ list }: { list: BabyList }) {
  const occ = list.occasion ? OCC[list.occasion] : null
  const dueDate = list.user?.dueDate ? new Date(list.user.dueDate) : null
  const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000) : null
  return (
    <Link href={`/lista/${list.shareSlug}`}
      className="group block bg-white rounded-3xl border border-blush/30 p-5 hover:border-blush-mid hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blush/30 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl">
          {occ ? occ.emoji : '💝'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-charcoal group-hover:text-rose transition-colors">{list.name}</h3>
              <p className="text-sm text-warm-gray mt-0.5">{list.user?.name}</p>
            </div>
            <ArrowRight size={16} className="text-warm-gray/40 group-hover:text-rose transition-colors flex-shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {occ && <span className="text-xs px-2.5 py-1 bg-blush/40 text-rose rounded-full font-medium">{occ.emoji} {occ.label}</span>}
            {list._count && <span className="text-xs px-2.5 py-1 bg-cream text-warm-gray rounded-full">{list._count.items} poklona</span>}
            {list.user?.babyGender && list.user.babyGender !== 'surprise' && (
              <span className="text-xs px-2.5 py-1 bg-cream text-warm-gray rounded-full">
                {list.user.babyGender === 'boy' ? '💙 Dječak' : '💗 Djevojčica'}
              </span>
            )}
          </div>
          {dueDate && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-warm-gray">
              <Calendar size={11} />
              {formatDateHR(dueDate)}
              {daysLeft !== null && daysLeft > 0 && <span className="text-rose font-medium">({daysLeft} dana)</span>}
              {daysLeft !== null && daysLeft <= 0 && <span className="text-sage font-medium">(već je tu! 🎉)</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function PronadiListuPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BabyList[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) return
    setLoading(true); setError(null); setSearched(true)
    try {
      const res = await searchApi.findLists(q.trim())
      setResults(res.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Greška pri pretrazi')
    } finally { setLoading(false) }
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="py-12 text-center">
            <span className="text-5xl block mb-4">🔍</span>
            <h1 className="font-serif text-4xl text-charcoal mb-3">Pronađi listu</h1>
            <p className="text-warm-gray">Pretraži baby liste po imenu i prezimenu mame ili nazivu liste.</p>
          </div>
          <div className="relative mb-4">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-warm-gray" />
            <input type="text" placeholder='npr. "Ana Horvat"' value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
              autoFocus
              className="w-full pl-14 pr-14 py-4 bg-white border-2 border-blush/40 rounded-2xl text-base focus:outline-none focus:border-rose transition-colors shadow-sm" />
            {query && <button onClick={() => { setQuery(''); setResults([]); setSearched(false) }} className="absolute right-5 top-1/2 -translate-y-1/2 text-warm-gray"><X size={18} /></button>}
          </div>
          <button onClick={() => handleSearch(query)} disabled={query.trim().length < 2 || loading}
            className="w-full py-4 bg-rose text-white font-medium rounded-2xl text-base hover:bg-rose/90 transition-all hover:shadow-lg disabled:opacity-50 mb-10">
            {loading ? 'Tražim...' : 'Pretraži liste'}
          </button>
          {error && <div className="p-4 bg-rose/10 border border-rose/20 rounded-2xl text-sm text-rose text-center mb-6">{error}</div>}
          {searched && !loading && (
            results.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl block mb-3">😔</span>
                <h3 className="font-serif text-xl text-charcoal mb-2">Nema rezultata</h3>
                <p className="text-warm-gray text-sm">Nismo pronašli listu za "<strong>{query}</strong>". Provjeri pravopis ili pitaj mamu za direktni link.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-warm-gray mb-4">Pronađeno <strong>{results.length}</strong> lista</p>
                <div className="space-y-3">{results.map(list => <ListCard key={list.id} list={list} />)}</div>
              </>
            )
          )}
          {!searched && (
            <p className="text-center text-sm text-warm-gray">
              Imaš svoju listu? <Link href="/moja-lista" className="text-rose hover:underline font-medium">Pogledaj svoju listu →</Link>
            </p>
          )}
        </div>
      </main>
    </>
  )
}
