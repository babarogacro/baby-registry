import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'

export const productsRouter = Router()

function toInt(value: unknown, fallback: number, min: number, max: number) {
  const n = parseInt(String(value ?? ''), 10)
  return isNaN(n) ? fallback : Math.min(max, Math.max(min, n))
}

function toPrice(value: unknown) {
  const n = parseFloat(String(value ?? ''))
  return isNaN(n) || n < 0 ? undefined : n
}

async function categoryWithDescendants(where: Prisma.CategoryWhereUniqueInput) {
  const category = await prisma.category.findUnique({ where, select: { id: true } })
  if (!category) return null
  const children = await prisma.category.findMany({ where: { parentId: category.id }, select: { id: true } })
  const grandchildren = children.length
    ? await prisma.category.findMany({ where: { parentId: { in: children.map(c => c.id) } }, select: { id: true } })
    : []
  return [category.id, ...children.map(c => c.id), ...grandchildren.map(c => c.id)]
}

// Products visible in the public catalog: active scraped shops only. Hand-added
// products ("custom") belong to individual lists and must not leak to everyone.
async function catalogShopFilter(): Promise<Prisma.ProductWhereInput> {
  const activeShops = await prisma.scrapedShop.findMany({ where: { isActive: true }, select: { slug: true } })
  return { shopSlug: { in: activeShops.map(s => s.slug) } }
}

// GET /api/products
productsRouter.get('/', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
    const { categoryId, categorySlug, shopSlug, inStock, sortBy } = req.query as Record<string, string | undefined>
    const page = toInt(req.query.page, 1, 1, 10_000)
    const take = toInt(req.query.limit, 24, 1, 100)
    const minPrice = toPrice(req.query.minPrice)
    const maxPrice = toPrice(req.query.maxPrice)

    const and: Prisma.ProductWhereInput[] = [await catalogShopFilter()]
    if (q) and.push({ OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] })
    if (shopSlug) and.push({ shopSlug })
    if (inStock === 'true') and.push({ inStock: true })
    if (minPrice !== undefined || maxPrice !== undefined) and.push({ price: { gte: minPrice, lte: maxPrice } })

    if (categorySlug || categoryId) {
      const ids = await categoryWithDescendants(categorySlug ? { slug: categorySlug } : { id: categoryId! })
      if (ids) and.push({ categoryId: { in: ids } })
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'price_asc' ? { price: 'asc' }
      : sortBy === 'price_desc' ? { price: 'desc' }
      : sortBy === 'newest' ? { createdAt: 'desc' }
      : { name: 'asc' }

    const where: Prisma.ProductWhereInput = { AND: and }
    const [products, total, priceRange] = await Promise.all([
      prisma.product.findMany({ where, include: { category: true }, orderBy: [orderBy, { id: 'asc' }], skip: (page - 1) * take, take }),
      prisma.product.count({ where }),
      prisma.product.aggregate({ where: and[0], _min: { price: true }, _max: { price: true } }),
    ])

    res.json({
      products,
      pagination: { page, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) },
      priceRange: { min: Math.floor(priceRange._min.price || 0), max: Math.ceil(priceRange._max.price || 10000) },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// GET /api/products/categories — top-level tree with product counts that include sub-categories
productsRouter.get('/categories', async (_req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, slug: true, parentId: true }, orderBy: { name: 'asc' } }),
      prisma.product.groupBy({ by: ['categoryId'], where: await catalogShopFilter(), _count: { _all: true } }),
    ])

    const own = new Map(counts.map(c => [c.categoryId, c._count._all]))
    const childrenOf = new Map<string | null, typeof categories>()
    for (const c of categories) {
      const siblings = childrenOf.get(c.parentId) ?? []
      siblings.push(c)
      childrenOf.set(c.parentId, siblings)
    }

    type Node = (typeof categories)[number] & { _count: { products: number }; totalCount: number; children: Node[] }
    const build = (cat: (typeof categories)[number], depth: number): Node => {
      const children = depth < 2 ? (childrenOf.get(cat.id) ?? []).map(c => build(c, depth + 1)) : []
      const ownCount = own.get(cat.id) ?? 0
      return {
        ...cat,
        _count: { products: ownCount },
        totalCount: ownCount + children.reduce((sum, c) => sum + c.totalCount, 0),
        children,
      }
    }

    res.json((childrenOf.get(null) ?? []).map(c => build(c, 0)))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// GET /api/products/featured
productsRouter.get('/featured', async (_req, res) => {
  try {
    const featured = await prisma.featuredProduct.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { position: 'asc' },
      take: 12,
    })
    res.json(featured.map(f => f.product))
  } catch {
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// GET /api/products/:id
productsRouter.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: { include: { parent: true } } },
    })
    if (!product) return res.status(404).json({ error: 'Proizvod nije pronađen' })
    res.json(product)
  } catch {
    res.status(500).json({ error: 'Greška na serveru' })
  }
})
