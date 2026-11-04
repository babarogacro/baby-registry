'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    clearTimeout(timer.current)
    setToast(message)
    timer.current = setTimeout(() => setToast(null), duration)
  }, [duration])

  useEffect(() => () => clearTimeout(timer.current), [])

  return { toast, showToast }
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-toast flex justify-center px-4 sm:bottom-8">
      <AnimatePresence>
        {message && (
          <m.div key={message} initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96, transition: { duration: 0.14 } }}
            className="max-w-full rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-canvas shadow-lift ring-2 ring-canvas/25">
            {message}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
