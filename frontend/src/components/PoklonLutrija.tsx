'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m, useInView } from 'motion/react'
import { Art, type ArtName } from '@/components/art'
import Segmented from '@/components/Segmented'
import { Check, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import type { Tone } from '@/lib/categories'

type Mode = 'bez' | 's'

interface Gift { guest: string; name: string; art: ArtName; tone: Tone; stamp?: string }

const WITHOUT_LIST: Gift[] = [
  { guest: 'Teta', name: 'Plišani medo', art: 'bear', tone: 'bubble' },
  { guest: 'Kuma', name: 'Plišani medo, veći', art: 'bear', tone: 'bubble', stamp: 'Opet medo' },
  { guest: 'Susjeda s trećeg', name: 'Bodi, veličina 56', art: 'bodysuit', tone: 'sky' },
  { guest: 'Kolegice s posla', name: 'Plišani medo, s glazbom', art: 'bear', tone: 'bubble', stamp: 'Treći medo' },
  { guest: 'Svekrva', name: 'Bodi, veličina 56', art: 'bodysuit', tone: 'sky', stamp: 'Isti bodi' },
  { guest: 'Djed', name: 'Deka s medvjedićima', art: 'blanket', tone: 'sun', stamp: 'Opet medvjedi' },
]

const WITH_LIST: Gift[] = [
  { guest: 'Teta', name: 'Bočice i sterilizator', art: 'bottle', tone: 'sun' },
  { guest: 'Kuma', name: 'Autosjedalica', art: 'carseat', tone: 'cobalt' },
  { guest: 'Susjeda s trećeg', name: 'Kadica za kupanje', art: 'bath', tone: 'sky' },
  { guest: 'Kolegice s posla', name: 'Kolica, skupile su zajedno', art: 'pram', tone: 'tomato' },
  { guest: 'Svekrva', name: 'Krevetić', art: 'crib', tone: 'mint' },
  { guest: 'Djed', name: 'Nosiljka', art: 'carrier', tone: 'bubble' },
]

const RESULT: Record<Mode, { title: string; text: string }> = {
  bez: { title: '3 medvjeda, 2 ista bodija, 1 deka.', text: 'Svatko je htio razveseliti, nitko nije znao što su drugi kupili. Kolica i autosjedalica još nisu kupljeni.' },
  s: { title: 'Sve što treba, bez duplih poklona.', text: 'Svatko je vidio što je već uzeto i odabrao nešto drugo.' },
}

const STEP_MS = 620

export default function PoklonLutrija() {
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-120px' })
  const [mode, setMode] = useState<Mode>('bez')
  const [opened, setOpened] = useState(0)
  const [round, setRound] = useState(0)
  const gifts = mode === 'bez' ? WITHOUT_LIST : WITH_LIST
  const done = opened >= gifts.length

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOpened(gifts.length); return }
    setOpened(0)
    let n = 0
    const timer = setInterval(() => {
      n += 1
      setOpened(n)
      if (n >= gifts.length) clearInterval(timer)
    }, STEP_MS)
    return () => clearInterval(timer)
  }, [inView, mode, round, gifts.length])

  return (
    <div ref={rootRef} className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
      <div>
        <p className="note text-tomato-ink">što ti fali?</p>
        <h2 className="display mt-2 text-[2.9rem] sm:text-6xl">Bez liste, svatko pogađa.</h2>
        <p className="mt-5 max-w-md text-lg text-muted">Svi pitaju isto, svatko kupi po svom, nitko ne zna što su drugi već uzeli. Pogledaj što stigne bez liste, a što s listom.</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Segmented label="Način izvlačenja" value={mode} onChange={value => setMode(value)}
            options={[{ value: 'bez', label: 'Bez liste' }, { value: 's', label: 'S listom' }]}
            thumbClass={mode === 'bez' ? 'bg-tomato' : 'bg-mint'} activeClass="text-coal" />
          <button onClick={() => setRound(r => r + 1)} className="btn btn-sm btn-soft" disabled={!done}>
            <RotateCcw size={15} aria-hidden /> Prikaži ponovno
          </button>
        </div>
        <div className="mt-7 min-h-[7.5rem]" aria-live="polite">
          <AnimatePresence mode="wait">
            {done && (
              <m.div key={mode} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                <p className="font-display text-2xl font-extrabold tracking-tight">{RESULT[mode].title}</p>
                <p className="mt-1.5 max-w-md text-muted">{RESULT[mode].text}</p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {gifts.map((gift, i) => {
          const isOpen = i < opened
          return (
            <li key={`${mode}-${round}-${i}`} className={clsx(`tone-${gift.tone}`, 'relative aspect-[4/5] min-h-0')}>
              <AnimatePresence initial={false} mode="wait">
                {isOpen ? (
                  <m.div key="open" initial={{ scale: 0.7, rotate: -5, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 19 }}
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl bg-tone p-3 text-on-tone sm:p-4">
                    <p className="text-[13px] font-semibold opacity-80">{gift.guest}</p>
                    <div className="flex min-h-0 flex-1 items-center justify-center py-1"><Art name={gift.art} className="h-full max-h-[110px] w-auto" /></div>
                    <p className="font-display text-[15px] font-bold leading-tight sm:text-base">{gift.name}</p>
                    {gift.stamp && <span className="stamp stamp-in absolute right-2 top-2 border-current bg-tone text-[11px]">{gift.stamp}</span>}
                    {mode === 's' && (
                      <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-coal text-white">
                        <Check size={15} strokeWidth={3} aria-label="S liste" />
                      </span>
                    )}
                  </m.div>
                ) : (
                  <m.div key="closed" exit={{ scale: 1.08, opacity: 0, transition: { duration: 0.12 } }}
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-line/[0.07] p-3 text-center">
                    <div className="tone-sun w-1/2"><Art name="gift" /></div>
                    <p className="mt-2 text-[13px] font-semibold text-muted">{gift.guest}</p>
                  </m.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
