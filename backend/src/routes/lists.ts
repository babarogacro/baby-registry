import { Router } from 'express'
import { z } from 'zod'
import * as cheerio from 'cheerio'
import { prisma } from '../utils/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { smartPasteLimiter } from '../middleware/rateLimit'
import { fetchExternalHtml, UnsafeUrlError } from '../utils/safeFetch'
import { firstIssue } from '../utils/validation'
import { httpUrl } from '../utils/urls'

export const listsRouter = Router()

export const listItemInclude = {
  product: { include: { category: true } },
  reservation: {
    omit: { ownerToken: true },
    include: { contributors: { omit: { ownerToken: true }, orderBy: { createdAt: 'asc' as const } } },
  },
}

const itemOrder = [{ priority: 'asc' as const }, { createdAt: 'desc' as const }]

listsRouter.use(authMiddleware)

async function findOwnedList(listId: string, userId: string) {
  return prisma.babyList.findFirst({ where: { id: listId, userId }, select: { id: true } })
}

listsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const lists = await prisma.babyList.findMany({
      where: { userId: req.userId! },
      include: { _count: { select: { items: true } }, items: { include: listItemInclude, orderBy: itemOrder } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(lists)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

const listFields = {
  name: z.string().trim().min(2, 'Naziv mora imati najmanje 2 znaka').max(120),
  occasion: z.enum(['birth', 'birthday', 'other']),
  description: z.string().trim().max(1000),
  isPublic: z.boolean(),
}

listsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      name: listFields.name,
      occasion: listFields.occasion.optional(),
      description: listFields.description.optional(),
      isPublic: listFields.isPublic.default(true),
    }).parse(req.body)
    const list = await prisma.babyList.create({ data: { ...data, userId: req.userId! } })
    res.status(201).json(list)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

listsRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const list = await prisma.babyList.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { items: { include: listItemInclude, orderBy: itemOrder } },
    })
    if (!list) return res.status(404).json({ error: 'Lista nije pronađena' })
    res.json(list)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

listsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      name: listFields.name.optional(),
      occasion: listFields.occasion.nullable().optional(),
      description: listFields.description.nullable().optional(),
      isPublic: listFields.isPublic.optional(),
    }).parse(req.body)

    const updated = await prisma.babyList.updateMany({ where: { id: req.params.id, userId: req.userId! }, data })
    if (updated.count === 0) return res.status(404).json({ error: 'Lista nije pronađena' })
    res.json(await prisma.babyList.findUnique({ where: { id: req.params.id } }))
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

listsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const deleted = await prisma.babyList.deleteMany({ where: { id: req.params.id, userId: req.userId! } })
    if (deleted.count === 0) return res.status(404).json({ error: 'Lista nije pronađena' })
    res.json({ success: true })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

const priority = z.enum(['HIGH', 'MEDIUM', 'LOW'])
const itemNote = z.string().trim().max(200)

listsRouter.post('/:id/items', async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      productId: z.string().max(50).optional(),
      customProduct: z.object({
        name: z.string().trim().min(1, 'Naziv je obavezan').max(300),
        price: z.number().min(0).max(1_000_000).optional(),
        imageUrl: httpUrl.optional(),
        productUrl: httpUrl.optional(),
        description: z.string().max(2000).optional(),
      }).optional(),
      priority: priority.default('MEDIUM'),
      note: itemNote.optional(),
    }).parse(req.body)

    if (!(await findOwnedList(req.params.id, req.userId!))) return res.status(404).json({ error: 'Lista nije pronađena' })

    let productId = data.productId
    if (productId) {
      const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
      if (!exists) return res.status(404).json({ error: 'Proizvod nije pronađen' })
    } else if (data.customProduct) {
      const product = await prisma.product.create({
        data: {
          name: data.customProduct.name,
          price: data.customProduct.price ?? 0,
          imageUrl: data.customProduct.imageUrl ?? null,
          productUrl: data.customProduct.productUrl ?? '',
          description: data.customProduct.description ?? null,
          shopName: 'Ručno dodano',
          shopSlug: 'custom',
          currency: 'EUR',
          inStock: true,
        },
      })
      productId = product.id
    }

    if (!productId) return res.status(400).json({ error: 'productId ili customProduct je obavezan' })

    const existing = await prisma.listItem.findFirst({ where: { listId: req.params.id, productId } })
    if (existing) return res.status(409).json({ error: 'Proizvod je već na listi' })

    const item = await prisma.listItem.create({
      data: { productId, priority: data.priority, note: data.note || null, listId: req.params.id },
      include: listItemInclude,
    })
    res.status(201).json(item)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

function findPrice(obj: any): number | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers
  const raw = offers?.price ?? offers?.lowPrice
  if (raw !== undefined) {
    const p = parseFloat(String(raw).replace(',', '.'))
    if (!isNaN(p) && p > 0) return p
  }
  for (const child of Array.isArray(obj) ? obj : Array.isArray(obj['@graph']) ? obj['@graph'] : []) {
    const p = findPrice(child)
    if (p) return p
  }
  return undefined
}

function absoluteHttpUrl(value: string | undefined, base: string) {
  if (!value) return undefined
  try {
    const u = new URL(value, base)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined
  } catch { return undefined }
}

// Extracts product info (title, image, price) from a shop page URL.
listsRouter.post('/smart-paste', smartPasteLimiter, async (req: AuthRequest, res) => {
  try {
    const { url } = z.object({ url: httpUrl }).parse(req.body)
    const $ = cheerio.load(await fetchExternalHtml(url))

    const meta = (selector: string) => $(selector).attr('content')?.trim() || undefined

    const title = meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || $('title').first().text().trim()
    const imageUrl = absoluteHttpUrl(meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]'), url)
    const description = meta('meta[property="og:description"]') || meta('meta[name="description"]')
    const shopName = meta('meta[property="og:site_name"]') || new URL(url).hostname.replace(/^www\./, '')

    let price: number | undefined
    $('script[type="application/ld+json"]').each((_, el) => {
      if (price) return
      try { price = findPrice(JSON.parse($(el).text())) } catch {}
    })
    if (!price) {
      const metaPrice = meta('meta[property="product:price:amount"]') || meta('meta[property="og:price:amount"]')
      const p = metaPrice ? parseFloat(metaPrice.replace(',', '.')) : NaN
      if (!isNaN(p) && p > 0) price = p
    }
    if (!price) {
      const match = $('.price, .product-price, [class*="price"], [data-price]').first().text().match(/\d[\d.,]*/)
      if (match) {
        const p = parseFloat(match[0].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
        if (!isNaN(p) && p > 0) price = p
      }
    }

    res.json({
      title: (title || '').slice(0, 300),
      imageUrl,
      description: description?.slice(0, 2000),
      price,
      shopName: shopName?.slice(0, 100),
      productUrl: url,
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Nevažeći link' })
    if (err instanceof UnsafeUrlError) return res.status(400).json({ error: err.message })
    res.status(400).json({ error: 'Nije moguće dohvatiti podatke s tog linka' })
  }
})

listsRouter.patch('/:id/items/:itemId', async (req: AuthRequest, res) => {
  try {
    const data = z.object({
      priority: priority.optional(),
      note: itemNote.nullable().optional(),
    }).parse(req.body)

    if (!(await findOwnedList(req.params.id, req.userId!))) return res.status(404).json({ error: 'Lista nije pronađena' })
    const updated = await prisma.listItem.updateMany({
      where: { id: req.params.itemId, listId: req.params.id },
      data: { priority: data.priority, note: data.note === undefined ? undefined : data.note || null },
    })
    if (updated.count === 0) return res.status(404).json({ error: 'Stavka nije pronađena' })
    res.json(await prisma.listItem.findUnique({ where: { id: req.params.itemId }, include: listItemInclude }))
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

listsRouter.delete('/:id/items/:itemId', async (req: AuthRequest, res) => {
  try {
    if (!(await findOwnedList(req.params.id, req.userId!))) return res.status(404).json({ error: 'Lista nije pronađena' })
    const deleted = await prisma.listItem.deleteMany({ where: { id: req.params.itemId, listId: req.params.id } })
    if (deleted.count === 0) return res.status(404).json({ error: 'Stavka nije pronađena' })
    res.json({ success: true })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

// List owner frees up an item someone reserved (e.g. the friend changed their mind).
listsRouter.delete('/:id/items/:itemId/reservation', async (req: AuthRequest, res) => {
  try {
    if (!(await findOwnedList(req.params.id, req.userId!))) return res.status(404).json({ error: 'Lista nije pronađena' })
    const deleted = await prisma.reservation.deleteMany({
      where: { listItem: { id: req.params.itemId, listId: req.params.id } },
    })
    if (deleted.count === 0) return res.status(404).json({ error: 'Rezervacija nije pronađena' })
    res.json({ success: true })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})
