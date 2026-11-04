'use client'
import { useMemo } from 'react'
import { m } from 'motion/react'
import clsx from 'clsx'

const SHAPES = ['rounded-full bg-tomato', 'rounded-md bg-cobalt', 'rounded-t-full bg-mint', 'rounded-full bg-sun', 'rounded-md bg-bubble', 'rounded-t-full bg-sky']

/** Toy shapes thrown out from the centre. Mount it when something good happens. */
export default function Burst({ count = 14, spread = 130, className }: { count?: number; spread?: number; className?: string }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
    const distance = spread * (0.55 + Math.random() * 0.5)
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 20,
      rotate: (Math.random() - 0.5) * 360,
      size: 8 + Math.random() * 9,
      shape: SHAPES[i % SHAPES.length],
    }
  }), [count, spread])

  return (
    <div className={clsx('pointer-events-none absolute left-1/2 top-1/2', className)} aria-hidden>
      {pieces.map((p, i) => (
        <m.span key={i} className={clsx('absolute block', p.shape)} style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 46], scale: [0, 1, 0.8], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 0.95, ease: 'easeOut', times: [0, 0.55, 1] }} />
      ))}
    </div>
  )
}
