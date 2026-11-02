import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../utils/prisma'
import { authMiddleware, AuthRequest, signToken } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimit'
import { sendWelcomeEmail } from '../services/email'
import { firstIssue } from '../utils/validation'

export const authRouter = Router()

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const userSelect = { id: true, email: true, name: true, dueDate: true, babyGender: true, role: true } as const

const email = z.string().trim().toLowerCase().email('Nevažeća email adresa').max(254)
const babyGender = z.enum(['boy', 'girl', 'surprise'])

function parseDateOnly(value: string) {
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? undefined : d
}

const dateString = z.string().refine(v => !!parseDateOnly(v), 'Nevažeći datum')

authRouter.post('/register', authLimiter, async (req, res) => {
  try {
    const data = z.object({
      email,
      password: z.string().min(8, 'Lozinka mora imati najmanje 8 znakova').max(128),
      name: z.string().trim().min(2, 'Ime mora imati najmanje 2 znaka').max(100),
      dueDate: dateString.optional(),
      babyGender: babyGender.optional(),
    }).parse(req.body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) return res.status(409).json({ error: 'Email je već registriran' })

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 10),
        name: data.name,
        dueDate: data.dueDate ? parseDateOnly(data.dueDate) : null,
        babyGender: data.babyGender ?? null,
      },
      select: userSelect,
    })

    sendWelcomeEmail({ email: user.email, name: user.name }).catch(() => {})
    res.status(201).json({ user, token: signToken(user.id) })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    console.error('Register error:', err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

authRouter.post('/login', authLimiter, async (req, res) => {
  try {
    const { email: userEmail, password } = z.object({
      email,
      password: z.string().min(1).max(128),
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !valid) return res.status(401).json({ error: 'Pogrešan email ili lozinka' })

    const { id, name, dueDate, babyGender: gender, role } = user
    res.json({ user: { id, email: user.email, name, dueDate, babyGender: gender, role }, token: signToken(user.id) })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Pogrešan email ili lozinka' })
    console.error('Login error:', err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

authRouter.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential } = req.body ?? {}
    if (typeof credential !== 'string' || !credential) return res.status(400).json({ error: 'Nedostaje Google token' })
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(501).json({ error: 'Google OAuth nije konfiguriran' })

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload.email_verified) return res.status(400).json({ error: 'Google račun nema potvrđenu email adresu' })

    const googleEmail = payload.email.toLowerCase()
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: googleEmail }] },
    })

    if (!user) {
      user = await prisma.user.create({
        data: { email: googleEmail, name: payload.name || googleEmail.split('@')[0], googleId: payload.sub },
      })
      sendWelcomeEmail({ email: user.email, name: user.name }).catch(() => {})
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } })
    }

    const { id, name, dueDate, babyGender: gender, role } = user
    res.json({ user: { id, email: user.email, name, dueDate, babyGender: gender, role }, token: signToken(user.id) })
  } catch (err) {
    console.error('Google auth error:', err)
    res.status(500).json({ error: 'Google prijava nije uspjela' })
  }
})

authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { ...userSelect, createdAt: true },
    })
    if (!user) return res.status(404).json({ error: 'Korisnik nije pronađen' })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

authRouter.patch('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      name: z.string().trim().min(2, 'Ime mora imati najmanje 2 znaka').max(100).optional(),
      dueDate: z.union([dateString, z.literal(''), z.null()]).optional(),
      babyGender: z.union([babyGender, z.literal(''), z.null()]).optional(),
    }).parse(req.body)

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        name: data.name,
        dueDate: data.dueDate === undefined ? undefined : data.dueDate ? parseDateOnly(data.dueDate) : null,
        babyGender: data.babyGender === undefined ? undefined : data.babyGender || null,
      },
      select: userSelect,
    })
    res.json(user)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// Permanently deletes the account; lists, items and their reservations cascade.
authRouter.delete('/account', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({ where: { id: req.userId! } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Greška na serveru' })
  }
})
