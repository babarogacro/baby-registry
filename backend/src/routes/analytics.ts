import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import express, { Request, Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { eventsLimiter, publicWriteLimiter } from '../middleware/rateLimit'

/**
 * First-party analytics without cookies:
 *  - POST /api/events       page views, time on page, shares, searches (sent with navigator.sendBeacon)
 *  - GET  /api/go/:id       every "U dućan" link: logs the click, then redirects with UTM tags the shop's
 *                           Google Analytics understands (source listica, medium referral)
 *  - POST /api/conversions  a shop reports a purchase that came from one of our clicks (lc_click)
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

/** The shop link with our tags. GA4 files utm_medium=referral under the Referral channel. */
function taggedUrl(productUrl: string, from: string, clickId?: string) {
  const url = new URL(productUrl)
  url.searchParams.set('ref', 'listica')
  url.searchParams.set('utm_source', 'listica')
  url.searchParams.set('utm_medium', 'referral')
  url.searchParams.set('utm_campaign', from === 'lista' ? 'lista-zelja' : 'katalog')
  url.searchParams.set('utm_content', from)
  if (clickId) url.searchParams.set('lc_click', clickId)
  return url.toString()
}

// GET /api/go/:productId?from=lista&l=<shareSlug>
analyticsRouter.get('/go/:productId', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      select: { id: true, productUrl: true, shopSlug: true },
    })
    if (!product || !/^https?:\/\//i.test(product.productUrl)) return res.redirect(302, '/')
    const from = typeof req.query.from === 'string' && SOURCES.has(req.query.from) ? req.query.from : 'katalog'

    let clickId: string | undefined
    if (!isBot(req)) {
      const slug = typeof req.query.l === 'string' ? req.query.l.slice(0, 60) : null
      const listId = slug ? (await prisma.babyList.findUnique({ where: { shareSlug: slug }, select: { id: true } }))?.id ?? null : null
      const event = await prisma.analyticsEvent.create({
        data: {
          type: 'outbound',
          visitorId: visitorId(req),
          productId: product.id,
          shopSlug: product.shopSlug,
          listId,
          source: from,
          device: deviceOf(req.get('user-agent') || ''),
        },
        select: { id: true },
      }).catch(() => null)
      clickId = event?.id
    }
    res.set('Cache-Control', 'no-store')
    res.set('Referrer-Policy', 'origin')
    res.redirect(302, taggedUrl(product.productUrl, from, clickId))
  } catch {
    res.redirect(302, '/')
  }
})

const conversionSchema = z.object({
  click: z.string().trim().max(60).optional(),
  order: z.string().trim().max(100).optional(),
  value: z.coerce.number().nonnegative().max(1_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
})

async function shopForKey(key: string | undefined) {
  if (!key || key.length < 20) return null
  const shop = await prisma.scrapedShop.findFirst({ where: { conversionKey: key }, select: { slug: true, conversionKey: true } })
  if (!shop?.conversionKey) return null
  const a = Buffer.from(shop.conversionKey)
  const b = Buffer.from(key)
  return a.length === b.length && timingSafeEqual(a, b) ? shop.slug : null
}

async function recordConversion(shopSlug: string, data: z.infer<typeof conversionSchema>) {
  const fields = {
    shopSlug,
    clickId: data.click || null,
    orderId: data.order || null,
    value: data.value ?? null,
    currency: (data.currency || 'EUR').toUpperCase(),
  }
  if (fields.orderId) {
    await prisma.conversion.upsert({
      where: { shopSlug_orderId: { shopSlug, orderId: fields.orderId } },
      create: fields,
      update: { value: fields.value, currency: fields.currency, clickId: fields.clickId ?? undefined },
    })
  } else {
    await prisma.conversion.create({ data: fields })
  }
}

// POST /api/conversions  header x-shop-key, body { click, order, value, currency }
analyticsRouter.post('/conversions', publicWriteLimiter, express.json({ limit: '4kb' }), async (req, res) => {
  try {
    const shopSlug = await shopForKey(req.get('x-shop-key'))
    if (!shopSlug) return res.status(401).json({ error: 'Pogrešan ključ' })
    await recordConversion(shopSlug, conversionSchema.parse(req.body ?? {}))
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Neispravni podaci' })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

// GET /api/conversions/pixel.gif?key=...&click=...&order=...&value=...  for shops that can only add an <img> to the thank-you page
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
analyticsRouter.get('/conversions/pixel.gif', publicWriteLimiter, async (req, res) => {
  res.set('Content-Type', 'image/gif').set('Cache-Control', 'no-store')
  try {
    const shopSlug = await shopForKey(typeof req.query.key === 'string' ? req.query.key : undefined)
    if (shopSlug) await recordConversion(shopSlug, conversionSchema.parse(req.query))
  } catch {}
  res.end(PIXEL)
})

export const newConversionKey = () => randomBytes(24).toString('hex')
