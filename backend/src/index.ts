import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth'
import { listsRouter } from './routes/lists'
import { productsRouter } from './routes/products'
import { publicRouter } from './routes/public'
import { adminRouter } from './routes/admin'
import { scraperRouter } from './routes/scraper'
import { analyticsRouter } from './routes/analytics'
import { scheduleScraper } from './scraper/scheduler'
import { prisma } from './utils/prisma'

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET nije postavljen. Postavi ga u environment varijablama.')
  process.exit(1)
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET je kraći od 32 znaka — preporuka je dulji nasumični ključ.')
}

const app = express()
const PORT = process.env.PORT || 3001

// Railway terminates TLS in one proxy hop; needed so rate limits see real client IPs.
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: true, credentials: true }))
// Before the 100kb parser: the remote scraper posts whole listing pages.
app.use('/api/scraper', scraperRouter)
// Before the JSON parser too: sendBeacon posts text/plain, parsed by the router itself.
app.use('/api', analyticsRouter)
app.use(express.json({ limit: '100kb' }))
// Express 5 leaves req.body undefined when there is no JSON body; validators expect an object.
app.use((req, _res, next) => {
  req.body ??= {}
  next()
})

app.use('/api/auth', authRouter)
app.use('/api/lists', listsRouter)
app.use('/api/products', productsRouter)
app.use('/api/public', publicRouter)
app.use('/api/admin', adminRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.use((_req, res) => res.status(404).json({ error: 'Ruta ne postoji' }))

app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Neispravan JSON' })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Zahtjev je prevelik' })
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({ error: 'Greška na serveru' })
})

app.listen(PORT, async () => {
  console.log(`🚀 Baby Registry API na http://localhost:${PORT}`)
  scheduleScraper()

  // Ensure all shops exist in DB so they show in admin panel
  const shops = [
    { name: 'Baby Center', slug: 'babycenter', baseUrl: 'https://www.babycenter.hr' },
    { name: 'Svijet Beba', slug: 'svijetbeba', baseUrl: 'https://www.svijet-beba.hr' },
  ]
  for (const shop of shops) {
    await prisma.scrapedShop.upsert({
      where: { slug: shop.slug },
      create: { ...shop, isActive: true },
      update: {},
    }).catch(() => {})
  }

  // Products saved before the "mixed" catalog order existed have no place in it yet.
  await prisma.$executeRaw`UPDATE "Product" SET "sortKey" = random() WHERE "sortKey" IS NULL`.catch(() => {})

  // A restart kills any scrape in progress; don't leave it marked as running forever.
  await prisma.scrapedShop.updateMany({
    where: { lastStatus: 'running' },
    data: { lastStatus: 'error', errorMsg: 'Prekinuto restartom servera' },
  }).catch(() => {})
})
