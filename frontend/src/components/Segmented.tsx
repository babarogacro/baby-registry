'use client'
import { useId, type ReactNode } from 'react'
import { m } from 'motion/react'
import clsx from 'clsx'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  /** Small number shown after the label. */
  count?: number
}

/** A pill control whose thumb slides between options. */
export default function Segmented<T extends string>({ options, value, onChange, label, thumbClass = 'bg-ink', activeClass = 'text-canvas', className }: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  thumbClass?: string
  activeClass?: string
  className?: string
}) {
  const layoutId = useId()
  return (
    <div role="group" aria-label={label} className={clsx('no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-line/[0.07] p-1', className)}>
      {options.map(option => {
        const active = option.value === value
        return (
          <button key={option.value} type="button" aria-pressed={active} onClick={() => onChange(option.value)}
            className={clsx('relative flex min-h-[40px] flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-200',
              active ? activeClass : 'text-muted hover:text-ink')}>
            {active && <m.span layoutId={layoutId} className={clsx('absolute inset-0 rounded-full', thumbClass)} />}
            <span className="relative">{option.label}</span>
            {option.count !== undefined && (
              <span className={clsx('relative text-xs font-medium tabular-nums', active ? 'opacity-70' : 'opacity-60')}>{option.count.toLocaleString('hr-HR')}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
