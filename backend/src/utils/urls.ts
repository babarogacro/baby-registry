import { z } from 'zod'

export const httpUrl = z.string().trim().max(2000).refine(value => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}, 'Link mora počinjati s http:// ili https://')
