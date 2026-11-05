import type { Tone } from '@/lib/categories'

const LIST_TONES: Tone[] = ['sun', 'sky', 'mint', 'bubble']

/** Every list keeps one colour, derived from its link, so the page and its share image always match. */
export function listTone(slug: string): Tone {
  return LIST_TONES[[...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % LIST_TONES.length]
}

/** Light-theme colours of the list tones, for places without CSS variables (share images). */
export const TONE_HEX: Record<string, string> = {
  sun: '#FFC933',
  sky: '#97D4FF',
  mint: '#28C892',
  bubble: '#FF9EC7',
  tomato: '#FF5A36',
  cobalt: '#2F4BFF',
}
