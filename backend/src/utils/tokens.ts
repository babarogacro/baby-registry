import crypto from 'node:crypto'

export function newOwnerToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export function tokensMatch(expected: string | null | undefined, provided: unknown): boolean {
  if (!expected || typeof provided !== 'string') return false
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
