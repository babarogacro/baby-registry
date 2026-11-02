'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  if (!message) return null
  return (
    <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 max-w-[calc(100vw-2rem)] bg-charcoal text-white text-sm text-center rounded-full shadow-2xl fade-in">
      {message}
    </div>
  )
}
