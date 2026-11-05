'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m, useInView } from 'motion/react'
import { Art, type ArtName } from '@/components/art'
import { Check, Gift } from 'lucide-react'
import clsx from 'clsx'

/**
 * A phone playing the guest's side of a list on a loop: the list scrolls, a guest taps
 * Rezerviraj on the bath, types a name, confirms, and the gift is marked as taken for everyone.
 */

interface DemoItem { art: ArtName; tone: string; brand: string; name: string; price: string; tag: string; reserved?: boolean }

const ITEMS: DemoItem[] = [
  { art: 'monitor', tone: 'sky', brand: 'Philips Avent', name: 'Baby monitor s kamerom', price: '149,99 €', tag: 'Najviše treba', reserved: true },
  { art: 'carseat', tone: 'cobalt', brand: 'Cybex', name: 'Autosjedalica 0 do 13 kg', price: '229,00 €', tag: 'Najviše treba', reserved: true },
  { art: 'bath', tone: 'mint', brand: 'Stokke', name: 'Sklopiva kadica', price: '54,99 €', tag: 'Bilo bi lijepo' },
  { art: 'bodysuit', tone: 'bubble', brand: 'Liewood', name: 'Bodiji, set od 3', price: '29,99 €', tag: 'Bilo bi lijepo' },
  { art: 'bear', tone: 'sun', brand: 'Jellycat', name: 'Plišani medo', price: '24,99 €', tag: 'Luksuz' },
]
const TARGET = 2 // the bath
const GUEST = 'Teta Mira'

// The script, in milliseconds from the start of a loop.
type Step = 'idle' | 'scroll' | 'tap' | 'sheet' | 'typing' | 'confirm' | 'done' | 'back' | 'rest'
const SCRIPT: [Step, number][] = [
  ['idle', 1200], ['scroll', 1500], ['tap', 700], ['sheet', 600], ['typing', 1500], ['confirm', 600], ['done', 1500], ['back', 1400], ['rest', 2600],
]

function Row({ item, reserved, highlight }: { item: DemoItem; reserved: boolean; highlight: boolean }) {
  return (
    <div className={clsx('relative flex gap-2.5 rounded-2xl border bg-white p-2 transition-colors duration-300', highlight ? 'border-mint' : 'border-coal/10')}>
      <div className={clsx(`tone-${item.tone}`, 'relative flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center rounded-xl bg-tone p-1.5 transition-[filter,opacity] duration-500', reserved && 'opacity-60 grayscale')}>
        <Art name={item.art} />
        <AnimatePresence>
          {reserved && (
            <m.span initial={{ scale: 1.8, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              className="absolute rounded-md border-2 border-coal bg-white/90 px-1 text-[8px] font-extrabold uppercase text-coal">
              Rezervirano
            </m.span>
          )}
        </AnimatePresence>
      </div>
      <div className="min-w-0 flex-1 text-coal">
        <p className="text-[9px] font-bold opacity-60">{item.brand}</p>
        <p className="truncate text-[11px] font-bold leading-tight">{item.name}</p>
        <p className="mt-0.5 text-[10px] font-extrabold">{item.price}</p>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="rounded-full bg-coal/[0.07] px-1.5 py-0.5 text-[8px] font-bold">{item.tag}</span>
          {!reserved && <span className="rounded-full bg-mint px-2 py-0.5 text-[9px] font-extrabold">Rezerviraj</span>}
        </div>
      </div>
    </div>
  )
}

export default function ListDemoPhone() {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, { margin: '-80px' })
  const [step, setStep] = useState<Step>('idle')
  const [typed, setTyped] = useState('')
  const [reduced, setReduced] = useState(false)

  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])

  // Walk through the script while the phone is on screen; restart from the top each loop.
  useEffect(() => {
    if (!visible || reduced) return
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      const [name, ms] = SCRIPT[i]
      setStep(name)
      if (name === 'idle') setTyped('')
      i = (i + 1) % SCRIPT.length
      timer = setTimeout(next, ms)
    }
    next()
    return () => clearTimeout(timer)
  }, [visible, reduced])

  useEffect(() => {
    if (step !== 'typing') return
    let n = 0
    const t = setInterval(() => { n += 1; setTyped(GUEST.slice(0, n)); if (n >= GUEST.length) clearInterval(t) }, 110)
    return () => clearInterval(t)
  }, [step])

  const order: Step[] = SCRIPT.map(([s]) => s)
  const at = (s: Step) => order.indexOf(step) >= order.indexOf(s)
  const finished = reduced || at('done')
  const reservedCount = 2 + (finished ? 1 : 0)
  const scrolled = !reduced && at('scroll') && !at('back')
  const sheetOpen = !reduced && at('sheet') && !at('done')
  const fingerOn = !reduced && (step === 'tap' || step === 'confirm')

  return (
    <div ref={ref} className="relative mx-auto w-[272px] sm:w-[300px]" aria-label="Primjer: gost na mobitelu rezervira kadicu s liste" role="img">
      <div className="relative overflow-hidden rounded-[2.6rem] border-[9px] border-coal bg-coal shadow-lift">
        <div className="absolute left-1/2 top-2 z-30 h-5 w-20 -translate-x-1/2 rounded-full bg-coal" />
        <div className="relative h-[540px] overflow-hidden rounded-[2rem] bg-canvas sm:h-[590px]" aria-hidden>
          <m.div animate={{ y: scrolled ? -150 : 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
            <div className="tone-bubble rounded-b-[1.6rem] bg-tone px-4 pb-5 pt-9 text-center text-coal">
              <p className="text-[10px] font-semibold">Lista od Ana Horvat</p>
              <p className="font-display text-[26px] font-extrabold leading-none tracking-tight">Za malu Lanu</p>
              <span className="mt-2 inline-block rounded-full bg-coal/10 px-2 py-0.5 text-[9px] font-semibold">Termin: 14. ožujka</span>
              <p className="mt-3 font-display text-[12px] font-extrabold">
                <m.span key={reservedCount} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="inline-block">{reservedCount}</m.span> od {ITEMS.length} rezervirano
              </p>
              <div className="mx-auto mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-coal/15">
                <m.div className="h-full rounded-full bg-coal" animate={{ width: `${(reservedCount / ITEMS.length) * 100}%` }} transition={{ duration: 0.6 }} />
              </div>
            </div>
            <div className="space-y-2 p-3">
              <p className="rounded-xl bg-sun-soft p-2 text-[9px] font-medium leading-snug text-coal">Klikni <strong>Rezerviraj</strong> kod poklona koji ćeš kupiti. Ostali će vidjeti da je zauzet.</p>
              {ITEMS.map((item, i) => (
                <Row key={item.name} item={item} reserved={!!item.reserved || (i === TARGET && finished)} highlight={i === TARGET && (step === 'tap' || sheetOpen)} />
              ))}
            </div>
          </m.div>

          {/* The reservation sheet */}
          <AnimatePresence>
            {sheetOpen && (
              <>
                <m.div key="dim" className="absolute inset-0 bg-coal/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <m.div key="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  className="absolute inset-x-0 bottom-0 rounded-t-[1.6rem] bg-white p-4 text-coal">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-coal/15" />
                  <p className="font-display text-[15px] font-extrabold">Rezerviraj poklon</p>
                  <div className="mt-2 flex items-center gap-2 rounded-xl bg-canvas p-2">
                    <span className="tone-mint flex h-9 w-9 items-center justify-center rounded-lg bg-tone p-1"><Art name="bath" /></span>
                    <span className="text-[11px] font-bold">Sklopiva kadica · 54,99 €</span>
                  </div>
                  <p className="mt-3 text-[10px] font-semibold">Tvoje ime</p>
                  <div className="mt-1 flex h-9 items-center rounded-xl border-2 border-cobalt bg-white px-2.5 text-[12px] font-semibold">
                    {typed}<span className="ml-px inline-block h-4 w-[2px] animate-pulse bg-coal" />
                  </div>
                  <div className={clsx('mt-3 flex h-10 items-center justify-center gap-1.5 rounded-full bg-mint text-[12px] font-extrabold transition-transform duration-150', step === 'confirm' && 'scale-95')}>
                    <Gift size={14} aria-hidden /> Rezerviraj
                  </div>
                  <p className="mt-2 text-center text-[9px] text-coal/60">Ovdje se ništa ne plaća.</p>
                </m.div>
              </>
            )}
          </AnimatePresence>

          {/* Confirmation */}
          <AnimatePresence>
            {!reduced && step === 'done' && (
              <m.div key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-x-6 top-1/3 rounded-3xl bg-white p-4 text-center text-coal shadow-lift">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-mint"><Check size={22} strokeWidth={3} aria-hidden /></span>
                <p className="mt-2 font-display text-[15px] font-extrabold">Poklon je rezerviran.</p>
                <p className="mt-0.5 text-[10px] text-coal/70">Hvala, {GUEST}. Nitko drugi ovo neće kupiti.</p>
              </m.div>
            )}
          </AnimatePresence>

          {/* The guest's finger */}
          <AnimatePresence>
            {fingerOn && (
              <m.span key={step} initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: 1, scale: [1.3, 0.85, 1] }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
                className="absolute z-20 h-9 w-9 rounded-full border-2 border-white bg-coal/35"
                // The rows have fixed heights, so the bath's button sits at the same spot on every phone size.
                style={step === 'tap' ? { left: 'calc(81% - 18px)', top: '234px' } : { left: 'calc(50% - 18px)', bottom: '44px' }} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
