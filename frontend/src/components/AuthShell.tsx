'use client'
import type { ReactNode } from 'react'
import Logo from '@/components/Logo'
import { ThemeToggle } from '@/components/Navbar'
import Vrtuljak, { type Hanger } from '@/components/Vrtuljak'
import { Art } from '@/components/art'
import clsx from 'clsx'

function Piece({ tone, shape, art }: { tone: string; shape: string; art: Parameters<typeof Art>[0]['name'] }) {
  return (
    <span className={clsx(`tone-${tone}`, shape, 'block aspect-square bg-tone p-[17%] shadow-float')}>
      <Art name={art} className="block h-full w-full" />
    </span>
  )
}

const HANGERS: Hanger[] = [
  { key: 'a', x: 0.18, drop: 170, size: 120, children: <Piece tone="cobalt" shape="rounded-t-full rounded-b-[18%]" art="carseat" /> },
  { key: 'b', x: 0.5, drop: 70, size: 170, children: <Piece tone="tomato" shape="rounded-full" art="pram" /> },
  { key: 'c', x: 0.82, drop: 210, size: 110, children: <Piece tone="mint" shape="rounded-[26%]" art="bottle" /> },
]

/** Split screen for sign-in and sign-up: the mobile on one side, the form on the other. */
export default function AuthShell({ headline, sub, children }: { headline: ReactNode; sub: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh]">
      <aside className="sticky top-0 hidden h-[100dvh] w-[46%] flex-col overflow-hidden rounded-r-5xl bg-hero px-10 pb-12 text-hero-ink lg:flex">
        <Vrtuljak hangers={HANGERS} heightClass="h-[440px]" />
        <div className="mt-auto">
          <p className="display text-[clamp(3rem,5.2vw,5rem)]">{headline}</p>
          <p className="mt-4 max-w-md text-lg font-medium leading-snug">{sub}</p>
        </div>
      </aside>

      <main id="sadrzaj" className="page-in flex flex-1 flex-col px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </main>
    </div>
  )
}
