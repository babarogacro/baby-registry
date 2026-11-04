'use client'
import { m } from 'motion/react'
import clsx from 'clsx'

export default function ProgressBar({ value, label, className, barClass = 'bg-mint' }: { value: number; label: string; className?: string; barClass?: string }) {
  return (
    <div className={clsx('h-3 overflow-hidden rounded-full bg-line/10', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <m.div className={clsx('h-full rounded-full', barClass)} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} />
    </div>
  )
}
