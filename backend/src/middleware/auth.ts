import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils/prisma'

// Route params here are always plain path segments, never repeated wildcard arrays.
export interface AuthRequest extends Request<Record<string, string>> {
  userId?: string
}

export function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '30d' })
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Potrebna prijava' })
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { userId?: string }
    if (!payload.userId) throw new Error('missing userId')
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Nevažeći token' })
  }
}

export function adminAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  authMiddleware(req, res, async () => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } })
      if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Nedovoljna prava pristupa' })
      next()
    } catch (err) {
      next(err)
    }
  })
}
