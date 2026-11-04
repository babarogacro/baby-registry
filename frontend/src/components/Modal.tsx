'use client'
import { ReactNode, useEffect, useId, useRef } from 'react'
import { m, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  title?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Pin to the bottom on phones (sheet style, can be dragged away). */
  sheet?: boolean
  wide?: boolean
}

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

export default function Modal({ title, onClose, children, sheet, wide }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const dragControls = useDragControls()

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstField = isPhone() ? null : panel?.querySelector<HTMLElement>('input, textarea, select')
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

  const phoneSheet = sheet && isPhone()

  return (
    <div className={clsx('fixed inset-0 z-modal flex justify-center', sheet ? 'items-end sm:items-center sm:p-4' : 'items-start p-3 pt-4 sm:items-center sm:p-4')}>
      <m.div className="absolute inset-0 bg-coal/55 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }} onMouseDown={onClose} aria-hidden />
      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        initial={phoneSheet ? { y: '100%' } : { opacity: 0, y: 26, scale: 0.96 }}
        animate={phoneSheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
        exit={phoneSheet ? { y: '100%', transition: { duration: 0.2 } } : { opacity: 0, y: 14, scale: 0.98, transition: { duration: 0.14 } }}
        drag={phoneSheet ? 'y' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose() }}
        className={clsx(
          'relative w-full overflow-y-auto bg-surface shadow-lift focus:outline-none',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
          sheet ? 'max-h-[92dvh] rounded-t-4xl pb-safe sm:rounded-4xl' : 'max-h-[calc(100dvh-2rem)] rounded-4xl sm:max-h-[90vh]',
        )}
      >
        {sheet && (
          <div className="flex cursor-grab touch-none justify-center pb-1 pt-3 sm:hidden" onPointerDown={e => dragControls.start(e)} aria-hidden>
            <span className="h-1.5 w-12 rounded-full bg-line/20" />
          </div>
        )}
        {title && (
          <div className="mb-4 flex items-start justify-between gap-3 px-5 pt-3 sm:px-7 sm:pt-7">
            <h2 id={titleId} className="pt-1.5 text-2xl font-extrabold">{title}</h2>
            <button onClick={onClose} aria-label="Zatvori" className="icon-btn -mr-2 -mt-1"><X size={20} /></button>
          </div>
        )}
        {children}
      </m.div>
    </div>
  )
}
