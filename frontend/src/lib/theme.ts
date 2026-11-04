import { useCallback, useSyncExternalStore } from 'react'

export type Theme = 'day' | 'night'

const listeners = new Set<() => void>()

function current(): Theme {
  return document.documentElement.dataset.theme === 'night' ? 'night' : 'day'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function setTheme(theme: Theme) {
  if (theme === 'night') document.documentElement.dataset.theme = 'night'
  else delete document.documentElement.dataset.theme
  try { localStorage.setItem('theme', theme) } catch {}
  listeners.forEach(listener => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, current, () => 'day')
  const toggle = useCallback(() => setTheme(current() === 'night' ? 'day' : 'night'), [])
  return { theme, toggle }
}
