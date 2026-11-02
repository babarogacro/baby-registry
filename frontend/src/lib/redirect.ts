/** Only follow same-site relative paths, never an attacker-supplied absolute URL. */
export function safeNext(next: string | null, fallback = '/moja-lista') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
