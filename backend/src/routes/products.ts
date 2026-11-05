import { Router, type Request } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { facetsLimiter } from '../middleware/rateLimit'

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

// Products visible in the public catalog: still listed by an active scraped shop, with a photo.
// Hand-added products ("custom") belong to individual lists and must not leak to everyone.
// Rows without a photo (old Baby Center scrapes that can't be refreshed) stay on lists but not here.
async function catalogShopFilter(): Promise<Prisma.ProductWhereInput> {
  const activeShops = await prisma.scrapedShop.findMany({ where: { isActive: true }, select: { slug: true } })
  return { shopSlug: { in: activeShops.map(s => s.slug) }, inStock: true, imageUrl: { not: null } }
}

type Facet = 'shop' | 'brand' | 'category' | 'price' | 'sale'

/** Builds the catalog filter from the query string. `skip` leaves one filter out, so a facet can count its own alternatives. */
async function catalogWhere(query: Request['query'], skip?: Facet): Promise<Prisma.ProductWhereInput> {
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
  // Repeated query keys arrive as arrays; only plain strings are valid filters here.
  const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
  const [categoryId, categorySlug, shopSlug, brand] = [query.categoryId, query.categorySlug, query.shopSlug, query.brand].map(text)
  const onSale = text(query.onSale)
  const minPrice = toPrice(query.minPrice)
  const maxPrice = toPrice(query.maxPrice)

  const and: Prisma.ProductWhereInput[] = [await catalogShopFilter()]

  // Every word has to match somewhere, so "cybex kolica" finds "CYBEX Priam 4.0 kolica".
  for (const word of q.split(/\s+/).filter(Boolean).slice(0, 6)) {
    and.push({ OR: [
      { name: { contains: word, mode: 'insensitive' } },
      { brand: { contains: word, mode: 'insensitive' } },
      { description: { contains: word, mode: 'insensitive' } },
    ] })
  }

  if (shopSlug && skip !== 'shop') and.push({ shopSlug })
  if (brand && skip !== 'brand') and.push({ brand: { in: brand.split('|').filter(Boolean).slice(0, 50) } })
  if (onSale === '1' && skip !== 'sale') and.push({ originalPrice: { not: null } })
  if (skip !== 'price' && (minPrice !== undefined || maxPrice !== undefined)) and.push({ price: { gte: minPrice, lte: maxPrice } })

  if ((categorySlug || categoryId) && skip !== 'category') {
    const ids = await categoryWithDescendants(categorySlug ? { slug: categorySlug } : { id: categoryId! })
    if (ids) and.push({ categoryId: { in: ids } })
  }

  return { AND: and }
}

const CATEGORY_SELECT = { id: true, name: true, slug: true, parentId: true } as const
type CategoryRow = { id: string; name: string; slug: string; parentId: string | null }
type CategoryNode = CategoryRow & { _count: { products: number }; totalCount: number; children: CategoryNode[] }

function buildCategoryTree(categories: CategoryRow[], counts: { categoryId: string | null; _count: { _all: number } }[]) {
  const own = new Map(counts.map(c => [c.categoryId, c._count._all]))
  const childrenOf = new Map<string | null, CategoryRow[]>()
  for (const c of categories) {
    const siblings = childrenOf.get(c.parentId) ?? []
    siblings.push(c)
    childrenOf.set(c.parentId, siblings)
  }

  const build = (cat: CategoryRow, depth: number): CategoryNode => {
    const children = depth < 2 ? (childrenOf.get(cat.id) ?? []).map(c => build(c, depth + 1)) : []
    const ownCount = own.get(cat.id) ?? 0
    return {
      ...cat,
      _count: { products: ownCount },
      totalCount: ownCount + children.reduce((sum, c) => sum + c.totalCount, 0),
      children,
    }
  }

  return (childrenOf.get(null) ?? []).map(c => build(c, 0))
}

// GET /api/products
productsRouter.get('/', async (req, res) => {
  try {
    const page = toInt(req.query.page, 1, 1, 10_000)
    const take = toInt(req.query.limit, 24, 1, 100)
    const { sortBy } = req.query as Record<string, string | undefined>

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'price_asc' ? { price: 'asc' }
      : sortBy === 'price_desc' ? { price: 'desc' }
      : sortBy === 'newest' ? { createdAt: 'desc' }
      : sortBy === 'name' ? { name: 'asc' }
      : { sortKey: { sort: 'asc', nulls: 'last' } }

    const where = await catalogWhere(req.query)
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: { category: true }, orderBy: [orderBy, { id: 'asc' }], skip: (page - 1) * take, take }),
      prisma.product.count({ where }),
    ])

    res.json({
      products,
      pagination: { page, limit: take, total, totalPages: Math.max(1, Math.ceil(total / take)) },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// Roughly logarithmic, because baby gear runs from a 5 € dummy to a 2.000 € pram.
const PRICE_EDGES = [0, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000]

// GET /api/products/facets — what each filter can still offer, given the other active filters
productsRouter.get('/facets', facetsLimiter, async (req, res) => {
  try {
    const [whereAll, whereNoShop, whereNoBrand, whereNoCategory, whereNoPrice, whereNoSale] = await Promise.all([
      catalogWhere(req.query),
      catalogWhere(req.query, 'shop'),
      catalogWhere(req.query, 'brand'),
      catalogWhere(req.query, 'category'),
      catalogWhere(req.query, 'price'),
      catalogWhere(req.query, 'sale'),
    ])

    const [total, shops, shopCounts, brandCounts, categories, categoryCounts, prices, onSale] = await Promise.all([
      prisma.product.count({ where: whereAll }),
      prisma.scrapedShop.findMany({ where: { isActive: true }, select: { slug: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.product.groupBy({ by: ['shopSlug'], where: whereNoShop, _count: { _all: true } }),
      prisma.product.groupBy({ by: ['brand'], where: { AND: [whereNoBrand, { brand: { not: null } }] }, _count: { _all: true } }),
      prisma.category.findMany({ select: CATEGORY_SELECT, orderBy: { name: 'asc' } }),
      prisma.product.groupBy({ by: ['categoryId'], where: whereNoCategory, _count: { _all: true } }),
      prisma.product.groupBy({ by: ['price'], where: whereNoPrice, _count: { _all: true } }),
      prisma.product.count({ where: { AND: [whereNoSale, { originalPrice: { not: null } }] } }),
    ])

    const countByShop = new Map(shopCounts.map(s => [s.shopSlug, s._count._all]))
    const buckets = PRICE_EDGES.map((from, i) => ({ from, to: PRICE_EDGES[i + 1] ?? null, count: 0 }))
    for (const row of prices) {
      let i = PRICE_EDGES.length - 1
      while (i > 0 && row.price < PRICE_EDGES[i]) i--
      buckets[i].count += row._count._all
    }

    res.json({
      total,
      shops: shops.map(s => ({ ...s, count: countByShop.get(s.slug) ?? 0 })),
      brands: brandCounts
        .map(b => ({ name: b.brand!, count: b._count._all }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'hr')),
      categories: buildCategoryTree(categories, categoryCounts),
      priceBuckets: buckets,
      onSale,
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
      prisma.category.findMany({ select: CATEGORY_SELECT, orderBy: { name: 'asc' } }),
      prisma.product.groupBy({ by: ['categoryId'], where: await catalogShopFilter(), _count: { _all: true } }),
    ])
    res.json(buildCategoryTree(categories, counts))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// GET /api/products/featured
productsRouter.get('/featured', async (_req, res) => {
  try {
    const featured = await prisma.featuredProduct.findMany({
      where: { product: { inStock: true } },
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
