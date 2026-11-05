import { timingSafeEqual } from 'crypto'
import express, { Router } from 'express'
import { z } from 'zod'
import { dbRunStore, RunStore, SHOPS } from '../scraper/shared'
import { isScraperRunning, setScraperRunning } from '../scraper/registry'
import { firstIssue } from '../utils/validation'

/**
 * Lets a scraper that runs outside Railway (see scraper/remote.ts) store its
 * results here. Enabled only when SCRAPER_KEY is set; every call carries it in
 * the x-scraper-key header.
 */
export const scraperRouter = Router()

// Mounted before the app-wide JSON parser: a listing page is a few hundred products.
scraperRouter.use(express.json({ limit: '2mb' }))

scraperRouter.use((req, res, next) => {
  const expected = process.env.SCRAPER_KEY
  const given = req.header('x-scraper-key') || ''
  if (!expected) return res.status(404).json({ error: 'Udaljeni scraper nije uključen' })
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Pogrešan ključ' })
  }
  next()
})

const runs = new Map<string, { store: RunStore; startedAt: number }>()
const RUN_TTL = 3 * 60 * 60 * 1000

function dropStaleRuns() {
  for (const [slug, run] of runs) {
    if (Date.now() - run.startedAt > RUN_TTL) {
      runs.delete(slug)
      setScraperRunning(slug, false)
    }
  }
}

const productSchema = z.object({
  sku: z.string().max(100).optional(),
  name: z.string().min(1).max(500),
  price: z.number().nonnegative(),
  brand: z.string().max(200).optional(),
  originalPrice: z.number().nonnegative().optional(),
  imageUrl: z.string().max(1000).optional(),
  productUrl: z.string().min(1).max(1000),
})
const itemsSchema = z.object({ categorySlug: z.string().min(1).max(100), products: z.array(productSchema).max(1000) })
const finishSchema = z.object({ failed: z.array(z.string().max(300)).max(200), targetsCount: z.number().int().nonnegative() })
const failSchema = z.object({ message: z.string().max(1000) })

scraperRouter.post('/runs/:shop/begin', async (req, res) => {
  const shop = SHOPS[req.params.shop]
  if (!shop) return res.status(404).json({ error: 'Nepoznat shop' })
  dropStaleRuns()
  if (isScraperRunning(shop.slug)) return res.status(409).json({ error: 'Scraper za ovaj shop već radi' })
  try {
    const store = dbRunStore(shop)
    await store.begin()
    runs.set(shop.slug, { store, startedAt: Date.now() })
    setScraperRunning(shop.slug, true)
    res.json({ ok: true })
  } catch (err) {
    console.error('Scraper begin:', err)
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

function activeRun(slug: string) {
  dropStaleRuns()
  return runs.get(slug)?.store
}

scraperRouter.post('/runs/:shop/items', async (req, res) => {
  const store = activeRun(req.params.shop)
  if (!store) return res.status(409).json({ error: 'Nema aktivnog prolaza, pozovi begin' })
  const parsed = itemsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error) })
  try {
    const saved = await store.save(parsed.data.categorySlug, parsed.data.products)
    res.json({ saved })
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
})

scraperRouter.post('/runs/:shop/finish', async (req, res) => {
  const slug = req.params.shop
  const store = activeRun(slug)
  if (!store) return res.status(409).json({ error: 'Nema aktivnog prolaza, pozovi begin' })
  const parsed = finishSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error) })
  try {
    const result = await store.finish(parsed.data.failed, parsed.data.targetsCount)
    console.log(`✅ ${SHOPS[slug].name} (udaljeni scraper): ${result.totalScraped} proizvoda, ${result.retired} povučeno, ${result.failed.length} neuspjelih kategorija`)
    res.json(result)
  } catch (err) {
    console.error('Scraper finish:', err)
    res.status(500).json({ error: 'Greška na serveru' })
  } finally {
    runs.delete(slug)
    setScraperRunning(slug, false)
  }
})

scraperRouter.post('/runs/:shop/fail', async (req, res) => {
  const slug = req.params.shop
  const store = activeRun(slug)
  if (!store) return res.status(409).json({ error: 'Nema aktivnog prolaza' })
  const parsed = failSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstIssue(parsed.error) })
  await store.fail(parsed.data.message)
  runs.delete(slug)
  setScraperRunning(slug, false)
  res.json({ ok: true })
})
