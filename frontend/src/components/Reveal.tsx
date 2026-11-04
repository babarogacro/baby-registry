'use client'
import type { ReactNode } from 'react'
import { m } from 'motion/react'

/** Slides a section up once, the first time it scrolls into view. */
export default function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 170, damping: 24, delay }}>
      {children}
    </m.div>
  )
}
