'use client'
import { useRef, type ReactNode } from 'react'
import { Calendar } from 'lucide-react'
import { formatDateHR, maskDMY, parseDMY } from '@/lib/format'

export const DATE_FORMAT_ERROR = 'Datum nije ispravan. Upiši ga kao datum/mjesec/godina, npr. 15/06/2026.'

/** Typed as datum/mjesec/godina, or picked from the browser's calendar through the icon. */
export default function DateField({ id, label, value, onChange, hint }: {
  id: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const parsed = value.length === 10 ? parseDMY(value) : null
  const iso = parsed ? parsed.toISOString().slice(0, 10) : ''

  const openPicker = () => {
    const picker = pickerRef.current
    if (!picker) return
    try {
      picker.showPicker()
    } catch {
      picker.click()
    }
  }

  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="datum/mjesec/godina" value={value} maxLength={10}
          onChange={e => onChange(maskDMY(e.target.value))} className="field pr-14 tabular-nums" />
        {/* The native picker anchors to this input, which sits under the calendar button. */}
        <input ref={pickerRef} type="date" tabIndex={-1} aria-hidden value={iso}
          onChange={e => { const [y, m, d] = e.target.value.split('-'); if (y && m && d) onChange(`${d}/${m}/${y}`) }}
          className="absolute right-3 top-1/2 h-px w-px -translate-y-1/2 opacity-0" />
        <button type="button" onClick={openPicker} aria-label="Odaberi datum iz kalendara" title="Odaberi iz kalendara"
          className="icon-btn absolute right-0.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
          <Calendar size={19} />
        </button>
      </div>
      {parsed ? (
        <p className="field-hint font-semibold text-mint-ink">{formatDateHR(parsed)}</p>
      ) : value.length === 10 ? (
        <p className="field-error mt-1.5">{DATE_FORMAT_ERROR}</p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  )
}
