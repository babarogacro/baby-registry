import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { sendReservationEmail, sendGroupBuyJoinEmail } from '../services/email'
import { publicWriteLimiter, searchLimiter } from '../middleware/rateLimit'
import { newOwnerToken, tokensMatch } from '../utils/tokens'
import { firstIssue, isUniqueViolation } from '../utils/validation'
import { listItemInclude } from './lists'

export const publicRouter = Router()

const personName = z.string().trim().min(2, 'Ime mora imati najmanje 2 znaka').max(100)
const message = z.string().trim().max(500)
const amount = z.number().positive('Iznos mora biti pozitivan').max(100_000)

// Money is compared in cents so 0.1 + 0.2 style float noise can't let a share slip past the target.
const cents = (value: number) => Math.round(value * 100)
const money = (value: number) => `${value.toFixed(2).replace('.', ',')} €`

// Resolves a public list item, or sends the error response and returns null.
async function findPublicListItem(req: Request, res: Response) {
  const list = await prisma.babyList.findUnique({ where: { shareSlug: String(req.params.slug) }, select: { id: true, isPublic: true } })
  if (!list) { res.status(404).json({ error: 'Lista nije pronađena' }); return null }
  if (!list.isPublic) { res.status(403).json({ error: 'Lista je privatna' }); return null }
  const item = await prisma.listItem.findFirst({
    where: { id: String(req.params.itemId), listId: list.id },
    include: { reservation: { include: { contributors: true } }, product: { select: { price: true } } },
  })
  if (!item) { res.status(404).json({ error: 'Stavka nije pronađena' }); return null }
  return { list, item }
}

async function notifyOwner(listId: string, itemId: string, send: (ctx: {
  mamaEmail: string; mamaName: string; listName: string; listSlug: string
  productName: string; productPrice: number; productCurrency: string
}) => Promise<unknown>) {
  const list = await prisma.babyList.findUnique({
    where: { id: listId },
    include: { user: { select: { email: true, name: true } }, items: { where: { id: itemId }, include: { product: true } } },
  })
  const product = list?.items[0]?.product
  if (!list || !product) return
  await send({
    mamaEmail: list.user.email,
    mamaName: list.user.name,
    listName: list.name,
    listSlug: list.shareSlug,
    productName: product.name,
    productPrice: product.price,
    productCurrency: product.currency,
  })
}

// GET /api/public/lista/:slug
publicRouter.get('/lista/:slug', async (req, res) => {
  try {
    const list = await prisma.babyList.findUnique({
      where: { shareSlug: req.params.slug },
      include: {
        user: { select: { name: true, dueDate: true, babyGender: true } },
        items: { include: listItemInclude, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    if (!list) return res.status(404).json({ error: 'Lista nije pronađena' })
    if (!list.isPublic) return res.status(403).json({ error: 'Lista je privatna' })
    const { userId, ...publicList } = list
    res.set('Cache-Control', 'no-store').json(publicList)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

// GET /api/public/settings — the few admin settings the public site needs.
publicRouter.get('/settings', async (_req, res) => {
  try {
    const hero = await prisma.appSetting.findUnique({ where: { key: 'heroImage' } })
    res.json({ heroImage: hero?.value || null })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

// "Đurđa Kračun" and "durda kracun" are the same person to a guest typing on a phone.
function nameWords(value: string) {
  return value
    .toLocaleLowerCase('hr-HR')
    .replace(/đ/g, 'd')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
}

/** Every typed word must be a whole word of the name, and there must be at least a first and last name. */
function matchesFullName(queryWords: string[], name: string | null | undefined) {
  if (!name) return false
  const words = new Set(nameWords(name))
  return queryWords.every(w => words.has(w))
}

// GET /api/public/pretraga?q=Ana+Horvat
// Only a full name (parent's or child's) finds a list, so typing "Ana" can't browse everyone's lists.
publicRouter.get('/pretraga', searchLimiter, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
    const queryWords = nameWords(q)
    if (queryWords.length < 2 || queryWords.some(w => w.length < 2)) {
      return res.status(400).json({ error: 'Upiši ime i prezime, npr. Ana Horvat' })
    }

    const candidates = await prisma.babyList.findMany({
      where: { isPublic: true },
      select: { id: true, childName: true, user: { select: { name: true } } },
    })
    const ids = candidates
      .filter(l => matchesFullName(queryWords, l.user.name) || matchesFullName(queryWords, l.childName))
      .map(l => l.id)
      .slice(0, 50)
    if (ids.length === 0) return res.json([])

    const lists = await prisma.babyList.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, name: true, occasion: true, childName: true, shareSlug: true, createdAt: true,
        user: { select: { name: true, dueDate: true, babyGender: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    res.json(lists)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

// POST /api/public/lista/:slug/rezerviraj/:itemId
publicRouter.post('/lista/:slug/rezerviraj/:itemId', publicWriteLimiter, async (req, res) => {
  try {
    const data = z.object({
      reservedBy: personName,
      note: message.optional(),
      isGroupBuy: z.boolean().optional(),
      targetAmount: amount.optional(),
      amount: amount.optional(),
      role: z.enum(['ORDERER', 'CONTRIBUTOR']).optional(),
    }).parse(req.body)

    const found = await findPublicListItem(req, res)
    if (!found) return
    const { list, item } = found
    if (item.reservation) return res.status(409).json({ error: 'Ovaj poklon je upravo rezerviran' })

    const ownerToken = newOwnerToken()
    const note = data.note || null
    let contributorId: string | undefined

    if (data.isGroupBuy) {
      if (!data.targetAmount || !data.amount) return res.status(400).json({ error: 'Unesi ciljni iznos i svoj doprinos' })
      // The pool never exceeds the gift: the target is capped by the price, every share by the target.
      if (item.product.price > 0 && cents(data.targetAmount) > cents(item.product.price)) {
        return res.status(400).json({ error: `Iznos koji se skuplja ne može biti veći od cijene proizvoda (${money(item.product.price)})` })
      }
      if (cents(data.amount) > cents(data.targetAmount)) {
        return res.status(400).json({ error: 'Tvoj dio ne može biti veći od iznosa koji se skuplja' })
      }
      const reservation = await prisma.reservation.create({
        data: {
          listItemId: item.id,
          reservedBy: data.reservedBy,
          note,
          isGroupBuy: true,
          targetAmount: data.targetAmount,
          contributors: {
            create: { name: data.reservedBy, role: data.role ?? 'CONTRIBUTOR', amount: data.amount, note, ownerToken },
          },
        },
        include: { contributors: true },
      })
      contributorId = reservation.contributors[0].id
    } else {
      await prisma.reservation.create({ data: { listItemId: item.id, reservedBy: data.reservedBy, note, ownerToken } })
    }

    notifyOwner(list.id, item.id, ctx => sendReservationEmail({ ...ctx, reservedBy: data.reservedBy, reservedNote: data.note })).catch(console.error)

    res.status(201).json({
      success: true,
      message: `Hvala, ${data.reservedBy}. Poklon je rezerviran.`,
      ownerToken,
      contributorId,
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Ovaj poklon je upravo rezerviran' })
    console.error('Reserve error:', err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// POST /api/public/lista/:slug/group/:itemId/join
publicRouter.post('/lista/:slug/group/:itemId/join', publicWriteLimiter, async (req, res) => {
  try {
    const data = z.object({
      name: personName,
      role: z.enum(['ORDERER', 'CONTRIBUTOR']),
      amount,
      note: message.optional(),
    }).parse(req.body)

    const found = await findPublicListItem(req, res)
    if (!found) return
    const { list, item } = found
    if (!item.reservation?.isGroupBuy) return res.status(400).json({ error: 'Ova stavka nije grupna kupovina' })

    const reservationId = item.reservation.id
    const target = item.reservation.targetAmount || 0
    const ownerToken = newOwnerToken()
    // Re-read the shares inside the transaction so two people joining at once can't overshoot the target.
    const outcome = await prisma.$transaction(async tx => {
      const existing = await tx.groupContributor.findMany({ where: { reservationId }, select: { amount: true } })
      const collected = existing.reduce((sum, c) => sum + cents(c.amount), 0)
      const remaining = (cents(target) - collected) / 100
      if (remaining <= 0) return { error: 'Iznos je već skupljen' }
      if (cents(data.amount) > cents(remaining)) return { error: `Preostalo je još ${money(remaining)}. Upiši najviše toliko.` }
      const contributor = await tx.groupContributor.create({
        data: { reservationId, name: data.name, role: data.role, amount: data.amount, note: data.note || null, ownerToken },
      })
      return { contributor, totalCollected: (collected + cents(data.amount)) / 100, count: existing.length + 1 }
    })
    if ('error' in outcome) return res.status(400).json({ error: outcome.error })
    const { contributor, totalCollected } = outcome

    notifyOwner(list.id, item.id, ctx => sendGroupBuyJoinEmail({
      ...ctx,
      contributorName: data.name,
      contributorAmount: data.amount,
      contributorCurrency: ctx.productCurrency,
      totalCollected,
      targetAmount: target,
      contributorsCount: outcome.count,
    })).catch(console.error)

    const { ownerToken: _hidden, ...publicContributor } = contributor
    res.status(201).json({
      success: true,
      message: `Hvala, ${data.name}. Tvoj dio je upisan.`,
      contributor: publicContributor,
      ownerToken,
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    console.error('Group join error:', err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// DELETE /api/public/lista/:slug/group/:itemId/leave/:contributorId
publicRouter.delete('/lista/:slug/group/:itemId/leave/:contributorId', publicWriteLimiter, async (req, res) => {
  try {
    const found = await findPublicListItem(req, res)
    if (!found) return
    const reservation = found.item.reservation
    if (!reservation?.isGroupBuy) return res.status(400).json({ error: 'Ova stavka nije grupna kupovina' })

    const contributor = reservation.contributors.find(c => c.id === req.params.contributorId)
    if (!contributor) return res.status(404).json({ error: 'Sudionik nije pronađen' })
    if (!tokensMatch(contributor.ownerToken, req.body?.token)) {
      return res.status(403).json({ error: 'Možeš ukloniti samo svoj doprinos' })
    }

    if (reservation.contributors.length === 1) {
      await prisma.reservation.delete({ where: { id: reservation.id } })
    } else {
      await prisma.groupContributor.delete({ where: { id: contributor.id } })
    }
    res.json({ success: true, message: 'Napustio/la si grupnu kupovinu' })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

// PATCH /api/public/lista/:slug/rezerviraj/:itemId/status
publicRouter.patch('/lista/:slug/rezerviraj/:itemId/status', publicWriteLimiter, async (req, res) => {
  try {
    const { token, status } = z.object({ token: z.string(), status: z.enum(['RESERVED', 'PURCHASED']) }).parse(req.body)
    const found = await findPublicListItem(req, res)
    if (!found) return
    const reservation = found.item.reservation
    if (!reservation) return res.status(404).json({ error: 'Rezervacija nije pronađena' })
    const isOwner = tokensMatch(reservation.ownerToken, token)
      || (reservation.isGroupBuy && reservation.contributors.some(c => tokensMatch(c.ownerToken, token)))
    if (!isOwner) return res.status(403).json({ error: 'Ovo nije tvoja rezervacija' })

    await prisma.reservation.update({ where: { id: reservation.id }, data: { status } })
    res.json({ success: true, status })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// DELETE /api/public/lista/:slug/rezerviraj/:itemId
publicRouter.delete('/lista/:slug/rezerviraj/:itemId', publicWriteLimiter, async (req, res) => {
  try {
    const found = await findPublicListItem(req, res)
    if (!found) return
    const reservation = found.item.reservation
    if (!reservation) return res.status(404).json({ error: 'Rezervacija nije pronađena' })
    if (!tokensMatch(reservation.ownerToken, req.body?.token)) return res.status(403).json({ error: 'Ovo nije tvoja rezervacija' })

    await prisma.reservation.delete({ where: { id: reservation.id } })
    res.json({ success: true, message: 'Rezervacija je uklonjena' })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})
