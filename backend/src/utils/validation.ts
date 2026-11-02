import { z } from 'zod'

export function firstIssue(err: z.ZodError) {
  return err.issues[0]?.message || 'Neispravni podaci'
}

export function isUniqueViolation(err: unknown) {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}
