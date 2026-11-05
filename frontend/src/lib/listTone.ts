import type { Tone } from '@/lib/categories'

// Gender-neutral only: no pink or baby blue, since a list is for a boy as often as for a girl.
const LIST_TONES: Tone[] = ['sun', 'mint', 'tomato']

/** Every list keeps one colour, derived from its link, so the page and its share image always match. */
export function listTone(slug: string): Tone {
  return LIST_TONES[[...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % LIST_TONES.length]
}

/** Light-theme colours of the list tones, for places without CSS variables (share images). */
export const TONE_HEX: Record<string, string> = {
  sun: '#FFC83D',
  sky: '#97D4FF',
  mint: '#19B38E',
  bubble: '#FF9FCE',
  tomato: '#FF5A2E',
  cobalt: '#2F57F0',
}
