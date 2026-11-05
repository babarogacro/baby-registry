import Link from 'next/link'
import { Art } from '@/components/art'

export default function NotFound() {
  return (
    <main id="sadrzaj" className="flex min-h-[100dvh] items-center justify-center bg-coal p-5 text-white">
      <div className="max-w-lg text-center">
        <div className="relative mx-auto h-44 w-44" aria-hidden>
          <span className="absolute left-1/2 top-0 h-14 w-0.5 -translate-x-1/2 bg-white/60" />
          <div className="swing absolute left-1/2 top-0 -ml-16 h-44 w-32 [animation-duration:5s]" style={{ transformOrigin: '50% 0' }}>
            <span className="absolute inset-x-0 bottom-0 block [--on-tone:var(--sun)]"><Art name="moon" /></span>
          </div>
          <span className="twinkle absolute left-0 top-10 h-2 w-2 rounded-full bg-white" />
          <span className="twinkle absolute right-2 top-24 h-1.5 w-1.5 rounded-full bg-white [animation-delay:1s]" />
          <span className="twinkle absolute right-8 top-4 h-1 w-1 rounded-full bg-white [animation-delay:2s]" />
        </div>
        <h1 className="display mt-6 text-[clamp(3.2rem,12vw,5.5rem)]">Ove stranice nema.</h1>
        <p className="mx-auto mt-4 max-w-sm text-lg text-white/75">Link je možda pogrešan ili je Listica obrisana. Ako tražiš nečiju Listicu, potraži je po imenu roditelja.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/pronadi-listu" className="btn btn-primary">Pronađi Listicu</Link>
          <Link href="/" className="btn bg-white/10 text-white">Na početnu</Link>
        </div>
      </div>
    </main>
  )
}
