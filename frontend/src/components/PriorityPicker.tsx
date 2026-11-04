'use client'
import { PRIORITIES } from '@/lib/priorities'
import type { Priority } from '@/types'
import clsx from 'clsx'

export default function PriorityPicker({ value, onChange, legend = 'Koliko ti treba?' }: { value: Priority; onChange: (value: Priority) => void; legend?: string }) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="grid grid-cols-3 gap-2">
        {PRIORITIES.map(p => (
          <button key={p.value} type="button" aria-pressed={value === p.value} onClick={() => onChange(p.value)}
            className={clsx('choice min-h-[64px] px-2 py-2.5 text-center')}>
            <span className={clsx('block text-[13px] font-bold leading-tight', value === p.value && 'text-ink')}>{p.label}</span>
            <span className="mt-0.5 block text-[11px] font-medium leading-tight opacity-75">{p.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
