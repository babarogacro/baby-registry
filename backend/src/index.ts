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
import { blogRouter, adminBlogRouter } from './routes/blog'
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
// Blog admin uploads images as base64 JSON, larger than the general 100kb limit.
app.use('/api/admin/blog', adminBlogRouter)
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
app.use('/api/blog', blogRouter)
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
  console.log(`🚀 Listica API na http://localhost:${PORT}`)
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

  // The project was renamed from "Bebina lista" to "Listica" (November 2026). Rewrite the old name in texts
  // the admin wrote (settings, blog posts) in all its Croatian cases. Slugs stay, so published links keep working.
  // Idempotent: after the first run nothing matches any more.
  const RENAME: [string, string][] = [
    ['bebinalista\\.hr', 'listica.hr'],
    ['bebina\\s+lista', 'Listica'],
    ['bebine\\s+liste', 'Listice'],
    ['bebinoj\\s+listi', 'Listici'],
    ['bebinu\\s+listu', 'Listicu'],
    ['bebinom\\s+listom', 'Listicom'],
  ]
  for (const [from, to] of RENAME) {
    await prisma.$executeRaw`UPDATE "AppSetting" SET value = regexp_replace(value, ${from}, ${to}, 'gi') WHERE value ~* ${from}`.catch(() => {})
    await prisma.$executeRaw`UPDATE "BlogPost" SET
      title = regexp_replace(title, ${from}, ${to}, 'gi'),
      excerpt = regexp_replace(excerpt, ${from}, ${to}, 'gi'),
      content = regexp_replace(content, ${from}, ${to}, 'gi'),
      "seoTitle" = regexp_replace("seoTitle", ${from}, ${to}, 'gi'),
      "seoDescription" = regexp_replace("seoDescription", ${from}, ${to}, 'gi')
      WHERE title ~* ${from} OR excerpt ~* ${from} OR content ~* ${from} OR "seoTitle" ~* ${from} OR "seoDescription" ~* ${from}`.catch(() => {})
  }

  // Once: the product's lists are called "Listica" now, so names made from the old default or placeholder
  // ("Lista za bebu", "Rođendanska lista", "Lista za Mateja") follow, in every case. A flag keeps it to one run,
  // so a name someone types with "lista" later stays as they wrote it.
  const LIST_NAMES_FLAG = 'migration:listica-list-names'
  const done = await prisma.appSetting.findUnique({ where: { key: LIST_NAMES_FLAG } }).catch(() => null)
  if (!done) {
    try {
      const FORMS: [string, string][] = [['lista', 'Listica'], ['liste', 'Listice'], ['listi', 'Listici'], ['listu', 'Listicu'], ['listom', 'Listicom'], ['listama', 'Listicama']]
      for (const [from, to] of FORMS) {
        const re = `\\m${from}\\M`
        await prisma.$executeRaw`UPDATE "BabyList" SET name = regexp_replace(name, ${re}, ${to}, 'gi') WHERE name ~* ${re}`
      }
      await prisma.appSetting.create({ data: { key: LIST_NAMES_FLAG, value: new Date().toISOString() } })
    } catch (err) {
      console.error('Preimenovanje naziva lista nije uspjelo:', err)
    }
  }

  // A restart kills any scrape in progress; don't leave it marked as running forever.
  await prisma.scrapedShop.updateMany({
    where: { lastStatus: 'running' },
    data: { lastStatus: 'error', errorMsg: 'Prekinuto restartom servera' },
  }).catch(() => {})
})
