import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import express, { Request, Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { conversionLimiter, eventsLimiter, publicWriteLimiter } from '../middleware/rateLimit'
import { ATTRIBUTION_DAYS, clickPrice } from '../services/pricing'

/**
 * First-party analytics without cookies:
 *  - POST /api/events       page views, time on page, shares, searches (sent with navigator.sendBeacon)
 *  - GET  /api/go/:id       every "U dućan" link: records the click and what it costs the shop, then
 *                           redirects with the tags from the merchant presentation (utm_source=listica,
 *                           utm_medium=wishlist, utm_campaign, utm_content = feed product id, lc_click)
 *  - GET|POST /api/konverzija  a shop reports a purchase that came from one of our clicks
 */
export const analyticsRouter = Router()

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|viber|skype|discord|headless|lighthouse|pagespeed|python|curl|wget|axios|node-fetch|go-http|java\/|okhttp|vercel|uptime|monitor/i

function clientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || ''
}

// The salt changes at midnight UTC, so the same person gets a new id every day and can't be followed.
function visitorId(req: Request) {
  const day = new Date().toISOString().slice(0, 10)
  const ua = req.get('user-agent') || ''
  return createHash('sha256').update(`${day}|${process.env.JWT_SECRET}|${clientIp(req)}|${ua}`).digest('hex').slice(0, 24)
}

function deviceOf(ua: string) {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet'
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

const isBot = (req: Request) => {
  const ua = req.get('user-agent') || ''
  return !ua || BOT.test(ua)
}

async function listIdForPath(path?: string | null) {
  const slug = path?.match(/^\/lista\/([^/?#]+)/)?.[1]
  if (!slug) return null
  const list = await prisma.babyList.findUnique({ where: { shareSlug: slug }, select: { id: true } })
  return list?.id ?? null
}

const short = (max: number) => z.string().trim().max(max).optional().nullable()
const eventSchema = z.object({
  t: z.enum(['pageview', 'engagement', 'share', 'search', 'reserve_start']),
  p: short(300),
  r: short(200),
  d: z.number().int().min(0).max(6 * 60 * 60 * 1000).optional().nullable(),
  s: short(40),
  us: short(100),
  um: short(100),
  uc: short(100),
})

// sendBeacon posts text/plain (no CORS preflight), so the body is parsed here as text.
analyticsRouter.post('/events', eventsLimiter, express.text({ type: '*/*', limit: '4kb' }), async (req, res) => {
  res.status(204).end()
  if (isBot(req)) return
  try {
    const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const e = eventSchema.parse(raw)
    const path = e.p?.split(/[?#]/)[0] || null
    if (path?.startsWith('/admin')) return
    const ua = req.get('user-agent') || ''
    let referrer: string | null = null
    if (e.r) { try { referrer = new URL(e.r).hostname.replace(/^www\./, '') } catch {} }
    await prisma.analyticsEvent.create({
      data: {
        type: e.t,
        path,
        visitorId: visitorId(req),
        listId: await listIdForPath(path),
        source: e.s || null,
        referrer,
        utmSource: e.us || null,
        utmMedium: e.um || null,
        utmCampaign: e.uc || null,
        device: deviceOf(ua),
        durationMs: e.t === 'engagement' ? e.d ?? null : null,
      },
    })
  } catch {
    // Analytics must never break the page; malformed pings are simply dropped.
  }
})

const SOURCES = new Set(['katalog', 'lista', 'moja-lista', 'naslovnica', 'blog', 'dodaj'])

/** The shop link with the tags from the merchant presentation; the shop's own link stays as it is. */
function taggedUrl(productUrl: string, tags: { campaign: string; content: string; clickId?: string }) {
  const url = new URL(productUrl)
  url.searchParams.set('utm_source', 'listica')
  url.searchParams.set('utm_medium', 'wishlist')
  url.searchParams.set('utm_campaign', tags.campaign)
  url.searchParams.set('utm_content', tags.content)
  if (tags.clickId) url.searchParams.set('lc_click', tags.clickId)
  return url.toString()
}

const newClickId = () => `lc_${randomBytes(8).toString('hex')}`

// GET /api/go/:productId?from=lista&l=<shareSlug>
analyticsRouter.get('/go/:productId', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      select: { id: true, name: true, price: true, sku: true, productUrl: true, shopSlug: true },
    })
    if (!product || !/^https?:\/\//i.test(product.productUrl)) return res.redirect(302, '/')
    const from = typeof req.query.from === 'string' && SOURCES.has(req.query.from) ? req.query.from : 'katalog'
    const slug = typeof req.query.l === 'string' ? req.query.l.slice(0, 60) : null
    const list = slug ? await prisma.babyList.findUnique({ where: { shareSlug: slug }, select: { id: true, occasion: true } }) : null
    // utm_campaign tells the shop which kind of list the visitor came from.
    const campaign = list ? (list.occasion === 'birthday' ? 'rodjendan' : 'lista') : 'katalog'

    let clickId: string | undefined
    if (!isBot(req)) {
      const visitor = visitorId(req)
      const device = deviceOf(req.get('user-agent') || '')
      await prisma.analyticsEvent.create({
        data: { type: 'outbound', visitorId: visitor, productId: product.id, shopSlug: product.shopSlug, listId: list?.id ?? null, source: from, device },
      }).catch(() => null)
      // The visitor id changes every day, so "same device, same product, already clicked" means today.
      const repeat = await prisma.outboundClick.findFirst({ where: { visitorId: visitor, productId: product.id, billable: true }, select: { id: true } })
      const billable = !repeat
      const click = await prisma.outboundClick.create({
        data: {
          id: newClickId(),
          productId: product.id,
          productName: product.name.slice(0, 300),
          productSku: product.sku,
          shopSlug: product.shopSlug,
          listId: list?.id ?? null,
          campaign,
          source: from,
          price: product.price,
          cpc: billable ? clickPrice(product.price) : 0,
          billable,
          visitorId: visitor,
          device,
        },
        select: { id: true },
      }).catch(() => null)
      clickId = click?.id
    }
    res.set('Cache-Control', 'no-store')
    res.set('Referrer-Policy', 'origin')
    res.redirect(302, taggedUrl(product.productUrl, { campaign, content: product.sku || product.id, clickId }))
  } catch (err) {
    console.error('Outbound redirect error:', err)
    res.redirect(302, '/')
  }
})

const conversionSchema = z.object({
  click: z.string().trim().max(60).optional(),
  order: z.string().trim().max(100).optional(),
  value: z.coerce.number().nonnegative().max(1_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
  // A comma list or, from JSON, an array of the shop's product ids.
  items: z.union([z.string().trim().max(1000), z.array(z.coerce.string()).max(200)]).optional()
    .transform(v => (Array.isArray(v) ? v.join(',').slice(0, 1000) : v)),
})
type ConversionInput = z.infer<typeof conversionSchema>

async function shopForKey(key: string | undefined) {
  if (!key || key.length < 20) return null
  const shop = await prisma.scrapedShop.findFirst({ where: { conversionKey: key }, select: { slug: true, conversionKey: true } })
  if (!shop?.conversionKey) return null
  const a = Buffer.from(shop.conversionKey)
  const b = Buffer.from(key)
  return a.length === b.length && timingSafeEqual(a, b) ? shop.slug : null
}

/** Our click behind an lc_click value: new lc_ ids, or the event id older links carried. */
async function findClick(click: string | undefined) {
  if (!click) return null
  if (click.startsWith('lc_')) {
    const c = await prisma.outboundClick.findUnique({ where: { id: click }, select: { shopSlug: true, createdAt: true } })
    return c ? { shopSlug: c.shopSlug, at: c.createdAt } : null
  }
  const e = await prisma.analyticsEvent.findUnique({ where: { id: click }, select: { type: true, shopSlug: true, createdAt: true } })
  return e?.type === 'outbound' && e.shopSlug ? { shopSlug: e.shopSlug, at: e.createdAt } : null
}

type Outcome = 'recorded' | 'duplicate' | 'unknown-click' | 'missing-order' | 'wrong-shop'

/**
 * A purchase report. Without a shop key it must name a real click of ours and an order number, and
 * the first report of an order wins, so nobody can rewrite an order's value afterwards. With the
 * shop's key (old endpoint) a report may also correct an order it sent before.
 */
async function recordConversion(data: ConversionInput, channel: 'pixel' | 'server' | 'key', keyShop: string | null = null): Promise<Outcome> {
  const click = await findClick(data.click)
  if (!keyShop && !click) return 'unknown-click'
  if (keyShop && click && click.shopSlug !== keyShop) return 'wrong-shop'
  const shopSlug = keyShop ?? click!.shopSlug
  const orderId = data.order || null
  if (!keyShop && !orderId) return 'missing-order'

  const expired = !!click && Date.now() - click.at.getTime() > ATTRIBUTION_DAYS * 86_400_000
  const fields = {
    shopSlug,
    clickId: data.click || null,
    orderId,
    value: data.value ?? null,
    currency: (data.currency || 'EUR').toUpperCase(),
    items: data.items || null,
    channel,
    clickAt: click?.at ?? null,
    status: expired ? 'expired' : 'reported',
  }
  if (!orderId) {
    await prisma.conversion.create({ data: fields })
    return 'recorded'
  }
  const existing = await prisma.conversion.findUnique({ where: { shopSlug_orderId: { shopSlug, orderId } }, select: { id: true } })
  if (existing) {
    if (!keyShop) return 'duplicate'
    await prisma.conversion.update({ where: { id: existing.id }, data: { value: fields.value, currency: fields.currency, clickId: fields.clickId ?? undefined, items: fields.items ?? undefined } })
    return 'recorded'
  }
  try {
    await prisma.conversion.create({ data: fields })
  } catch {
    return 'duplicate' // the same order reported twice at once
  }
  return 'recorded'
}

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
const sendPixel = (res: import('express').Response) => res.set('Content-Type', 'image/gif').set('Cache-Control', 'no-store').end(PIXEL)

// GET /api/konverzija?click=lc_...&order=...&value=...&currency=EUR  the "Listica: kupnja" tag (an image request)
analyticsRouter.get('/konverzija', conversionLimiter, async (req, res) => {
  try {
    await recordConversion(conversionSchema.parse(req.query), 'pixel', await shopForKey(req.get('x-shop-key')))
  } catch {}
  sendPixel(res)
})

// POST /api/konverzija  from the shop's server after the order is confirmed; JSON or form fields
analyticsRouter.post('/konverzija', conversionLimiter, express.json({ limit: '8kb' }), express.urlencoded({ extended: false, limit: '8kb' }), async (req, res) => {
  try {
    const outcome = await recordConversion(conversionSchema.parse(req.body ?? {}), 'server', await shopForKey(req.get('x-shop-key')))
    if (outcome === 'recorded' || outcome === 'duplicate') return res.json({ ok: true, duplicate: outcome === 'duplicate' })
    const messages: Record<string, string> = {
      'unknown-click': 'Klik s tom oznakom ne postoji',
      'missing-order': 'Nedostaje broj narudžbe (order)',
      'wrong-shop': 'Klik pripada drugom dućanu',
    }
    res.status(422).json({ ok: false, error: messages[outcome] })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Neispravni podaci' })
    res.status(500).json({ ok: false, error: 'Greška na serveru' })
  }
})

// Older endpoints with the shop's key, kept for anyone already set up with them.
analyticsRouter.post('/conversions', publicWriteLimiter, express.json({ limit: '4kb' }), async (req, res) => {
  try {
    const shopSlug = await shopForKey(req.get('x-shop-key'))
    if (!shopSlug) return res.status(401).json({ error: 'Pogrešan ključ' })
    await recordConversion(conversionSchema.parse(req.body ?? {}), 'key', shopSlug)
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Neispravni podaci' })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

analyticsRouter.get('/conversions/pixel.gif', publicWriteLimiter, async (req, res) => {
  try {
    const shopSlug = await shopForKey(typeof req.query.key === 'string' ? req.query.key : undefined)
    if (shopSlug) await recordConversion(conversionSchema.parse(req.query), 'key', shopSlug)
  } catch {}
  sendPixel(res)
})

export const newConversionKey = () => randomBytes(24).toString('hex')
