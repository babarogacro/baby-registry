import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { adminAuthMiddleware, AuthRequest } from '../middleware/auth'
import { runScraper, isScraperRunning, SCRAPERS } from '../scraper/registry'
import { firstIssue, isUniqueViolation } from '../utils/validation'
import { httpUrl } from '../utils/urls'

export const adminRouter = Router()

adminRouter.use(adminAuthMiddleware)

function pageParam(value: unknown) {
  const n = parseInt(String(value ?? ''), 10)
  return isNaN(n) || n < 1 ? 1 : Math.min(n, 10_000)
}

adminRouter.get('/stats', async (_req, res) => {
  try {
    const [usersCount, listsCount, productsCount, reservationsCount] = await Promise.all([
      prisma.user.count(),
      prisma.babyList.count(),
      prisma.product.count({ where: { shopSlug: { not: 'custom' } } }),
      prisma.reservation.count(),
    ])
    res.json({ usersCount, listsCount, productsCount, reservationsCount })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.get('/users', async (req, res) => {
  try {
    const page = pageParam(req.query.page)
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
    const where = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
      : {}
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, role: true,
          dueDate: true, babyGender: true, createdAt: true,
          _count: { select: { lists: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.user.count({ where }),
    ])
    res.json({ users, total, totalPages: Math.ceil(total / 20) })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, role: true, dueDate: true, babyGender: true, createdAt: true,
        lists: {
          include: {
            _count: { select: { items: true } },
            items: { select: { id: true, reservation: { select: { id: true, status: true } } } },
          },
        },
      },
    })
    if (!user) return res.status(404).json({ error: 'Korisnik nije pronađen' })
    res.json(user)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.patch('/users/:id/role', async (req: AuthRequest, res) => {
  try {
    const { role } = z.object({ role: z.enum(['USER', 'ADMIN']) }).parse(req.body)
    if (req.params.id === req.userId && role !== 'ADMIN') {
      return res.status(400).json({ error: 'Ne možeš sebi ukloniti admin prava' })
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    })
    res.json(user)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Nevažeća uloga' })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// Same cascade as a user deleting their own profile: lists, items and reservations on them go too.
adminRouter.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ error: 'Ne možeš obrisati sam sebe. Za to koristi Profil.' })
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } })
    if (!user) return res.status(404).json({ error: 'Korisnik nije pronađen' })
    if (user.role === 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (admins <= 1) return res.status(400).json({ error: 'Ovo je jedini admin i ne može se obrisati' })
    }
    await prisma.user.delete({ where: { id: user.id } })
    res.json({ success: true })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.get('/shops', async (_req, res) => {
  try {
    const shops = await prisma.scrapedShop.findMany({ orderBy: { name: 'asc' } })
    res.json(shops.map(s => ({ ...s, isRunning: isScraperRunning(s.slug) })))
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.patch('/shops/:slug/toggle', async (req, res) => {
  try {
    const shop = await prisma.scrapedShop.findUnique({ where: { slug: req.params.slug } })
    if (!shop) return res.status(404).json({ error: 'Shop nije pronađen' })
    const updated = await prisma.scrapedShop.update({ where: { slug: shop.slug }, data: { isActive: !shop.isActive } })
    res.json(updated)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.post('/shops/:slug/scrape', (req, res) => {
  const { slug } = req.params
  if (!(slug in SCRAPERS)) return res.status(404).json({ error: 'Nepoznat shop' })
  if (isScraperRunning(slug)) return res.status(409).json({ error: 'Scraper za ovaj shop već radi' })
  runScraper(slug).catch(console.error)
  res.json({ message: `Scraping pokrenut za ${slug}.` })
})

adminRouter.get('/featured', async (_req, res) => {
  try {
    const featured = await prisma.featuredProduct.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { position: 'asc' },
    })
    res.json(featured)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.post('/featured', async (req, res) => {
  try {
    const { productId } = z.object({ productId: z.string().min(1).max(50) }).parse(req.body)
    const existing = await prisma.featuredProduct.findFirst({ where: { productId } })
    if (existing) return res.status(409).json({ error: 'Proizvod je već istaknut' })
    const count = await prisma.featuredProduct.count()
    const featured = await prisma.featuredProduct.create({
      data: { productId, position: count },
      include: { product: true },
    })
    res.status(201).json(featured)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'productId je obavezan' })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

adminRouter.delete('/featured/:id', async (req, res) => {
  try {
    await prisma.featuredProduct.deleteMany({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

const SETTINGS = {
  heroImage: z.union([httpUrl, z.literal('')]),
  siteName: z.string().trim().max(100),
  contactEmail: z.union([z.string().trim().email('Nevažeća email adresa').max(254), z.literal('')]),
} as const

adminRouter.get('/settings', async (_req, res) => {
  try {
    const settings = await prisma.appSetting.findMany()
    res.json(Object.fromEntries(settings.map(s => [s.key, s.value])))
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.put('/settings/:key', async (req, res) => {
  try {
    const key = req.params.key
    if (!(key in SETTINGS)) return res.status(400).json({ error: 'Nepoznata postavka' })
    const value = SETTINGS[key as keyof typeof SETTINGS].parse(req.body?.value)
    const setting = await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    res.json(setting)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

adminRouter.get('/products', async (req, res) => {
  try {
    const page = pageParam(req.query.page)
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
    const shop = typeof req.query.shop === 'string' ? req.query.shop : ''
    const where = {
      ...(shop && { shopSlug: shop }),
      ...(q && { name: { contains: q, mode: 'insensitive' as const } }),
    }
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: { category: true }, orderBy: { lastScraped: 'desc' }, skip: (page - 1) * 50, take: 50 }),
      prisma.product.count({ where }),
    ])
    res.json({ products, total, totalPages: Math.ceil(total / 50) })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.get('/category-mappings', async (_req, res) => {
  try {
    const mappings = await prisma.categoryMapping.findMany({ include: { category: true }, orderBy: { externalName: 'asc' } })
    res.json(mappings)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.post('/category-mappings', async (req, res) => {
  try {
    const data = z.object({
      externalName: z.string().trim().min(1).max(200),
      shopSlug: z.string().trim().max(50).optional(),
      categoryId: z.string().min(1).max(50),
    }).parse(req.body)
    const mapping = await prisma.categoryMapping.create({
      data: { externalName: data.externalName, shopSlug: data.shopSlug || null, categoryId: data.categoryId },
      include: { category: true },
    })
    res.status(201).json(mapping)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'externalName i categoryId su obavezni' })
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Ovo mapiranje već postoji' })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

adminRouter.delete('/category-mappings/:id', async (req, res) => {
  try {
    await prisma.categoryMapping.deleteMany({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

// External category names (per shop) that have no mapping yet, with product counts.
adminRouter.get('/unmapped-categories', async (_req, res) => {
  try {
    const [groups, categories, mappings] = await Promise.all([
      prisma.product.groupBy({
        by: ['categoryId', 'shopSlug'],
        where: { categoryId: { not: null }, shopSlug: { not: 'custom' } },
        _count: { _all: true },
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.categoryMapping.findMany({ select: { externalName: true, shopSlug: true } }),
    ])

    const nameById = new Map(categories.map(c => [c.id, c.name]))
    const mapped = new Set(mappings.map(m => `${m.externalName}||${m.shopSlug || ''}`))
    const totals = new Map<string, { externalName: string; shopSlug: string; count: number }>()

    for (const g of groups) {
      const externalName = nameById.get(g.categoryId!)
      if (!externalName) continue
      const key = `${externalName}||${g.shopSlug}`
      if (mapped.has(key)) continue
      const entry = totals.get(key) ?? { externalName, shopSlug: g.shopSlug, count: 0 }
      entry.count += g._count._all
      totals.set(key, entry)
    }

    res.json([...totals.values()].sort((a, b) => b.count - a.count))
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminRouter.get('/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { parent: true }, orderBy: { name: 'asc' } })
    res.json(categories)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})
