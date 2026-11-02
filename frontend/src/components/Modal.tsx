'use client'
import { ReactNode, useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  title?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Pin to the bottom on phones (sheet style). */
  sheet?: boolean
  wide?: boolean
}

export default function Modal({ title, onClose, children, sheet, wide }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstField = panel?.querySelector<HTMLElement>('input, textarea, select')
    ;(firstField ?? panel)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key !== 'Tab' || !panel) return
      const focusable = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex justify-center bg-charcoal/40 backdrop-blur-sm fade-in',
        sheet ? 'items-end sm:items-center sm:p-4' : 'items-start sm:items-center p-3 pt-4 sm:p-4'
      )}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={clsx(
          'bg-white w-full shadow-2xl fade-up overflow-y-auto focus:outline-none',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
          sheet ? 'rounded-t-3xl sm:rounded-3xl max-h-[90dvh] pb-safe' : 'rounded-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[90vh]'
        )}
      >
        {title && (
          <div className="flex justify-between items-start gap-3 px-5 sm:px-6 pt-5 sm:pt-6 mb-4">
            <h3 id={titleId} className="font-serif text-xl text-charcoal">{title}</h3>
            <button onClick={onClose} aria-label="Zatvori" className="p-2 -mr-2 -mt-1 hover:bg-cream rounded-full transition-colors">
              <X size={20} className="text-warm-gray" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
