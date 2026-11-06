import { prisma } from '../utils/prisma'
import { CLICK_TIERS, COMMISSION_RATE, round2, tierIndex, tierLabel } from './pricing'

/**
 * The monthly statement for shops: clicks into the shop with their price, purchases with the
 * commission, and the prepaid balance clicks are paid from. Months are counted in Zagreb time.
 */

function zagrebOffsetMs(utcMs: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Zagreb', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - utcMs
}

/** Midnight in Zagreb on the first of a month, as a UTC instant (DST never changes at midnight). */
function zagrebMonthStart(year: number, monthIndex: number) {
  const guess = Date.UTC(year, monthIndex, 1)
  return new Date(guess - zagrebOffsetMs(guess))
}

export function currentMonth() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zagreb' }).slice(0, 7)
}

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { start: zagrebMonthStart(y, m - 1), end: zagrebMonthStart(m === 12 ? y + 1 : y, m === 12 ? 0 : m) }
}

export const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

export const CONVERSION_STATUSES = ['reported', 'returned', 'rejected', 'expired'] as const

export async function computeBilling(month: string, shop: string | null) {
  const { start, end } = monthRange(month)
  const shops = await prisma.scrapedShop.findMany({ where: shop ? { slug: shop } : {}, select: { slug: true, name: true }, orderBy: { name: 'asc' } })
  const slugs = shops.map(s => s.slug)

  const [clicks, orders, topUps, spentAll] = await Promise.all([
    prisma.outboundClick.findMany({
      where: { shopSlug: { in: slugs }, createdAt: { gte: start, lt: end } },
      select: { shopSlug: true, productId: true, productName: true, productSku: true, price: true, cpc: true, billable: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.conversion.findMany({
      where: { shopSlug: { in: slugs }, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.shopTopUp.findMany({ where: { shopSlug: { in: slugs } }, orderBy: { paidAt: 'desc' } }),
    // The balance is "now": everything paid in, minus every charged click so far.
    prisma.outboundClick.groupBy({ by: ['shopSlug'], where: { shopSlug: { in: slugs }, billable: true }, _sum: { cpc: true } }),
  ])

  const result = shops.map(s => {
    const own = clicks.filter(c => c.shopSlug === s.slug)
    const charged = own.filter(c => c.billable)
    const tiers = CLICK_TIERS.map((t, i) => ({ label: tierLabel(i), cpc: t.cpc, clicks: 0, amount: 0 }))
    const products = new Map<string, { productId: string | null; name: string; sku: string | null; price: number; cpc: number; clicks: number; repeat: number; amount: number }>()
    for (const c of own) {
      const key = `${c.productId ?? c.productName}|${c.billable ? c.cpc : clickCpcOf(c.price)}`
      const p = products.get(key) ?? { productId: c.productId, name: c.productName, sku: c.productSku, price: c.price, cpc: clickCpcOf(c.price), clicks: 0, repeat: 0, amount: 0 }
      p.price = c.price // the latest price in the month
      if (c.billable) {
        p.clicks += 1
        p.amount += c.cpc
        const t = tiers[tierIndex(c.price)]
        t.clicks += 1
        t.amount += c.cpc
      } else {
        p.repeat += 1
      }
      products.set(key, p)
    }
    const clickAmount = round2(charged.reduce((a, c) => a + c.cpc, 0))

    const shopOrders = orders.filter(o => o.shopSlug === s.slug).map(o => ({
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      orderId: o.orderId,
      clickId: o.clickId,
      clickAt: o.clickAt?.toISOString() ?? null,
      value: o.value ?? 0,
      currency: o.currency,
      status: o.status,
      channel: o.channel,
      items: o.items,
      commission: o.status === 'reported' ? round2((o.value ?? 0) * COMMISSION_RATE) : 0,
    }))
    const counted = shopOrders.filter(o => o.status === 'reported')
    const commission = round2(counted.reduce((a, o) => a + o.commission, 0))

    const paid = round2(topUps.filter(t => t.shopSlug === s.slug).reduce((a, t) => a + t.amount, 0))
    const spent = round2(spentAll.find(x => x.shopSlug === s.slug)?._sum.cpc ?? 0)

    return {
      slug: s.slug,
      name: s.name,
      clicks: { total: own.length, billable: charged.length, repeat: own.length - charged.length, amount: clickAmount },
      tiers: tiers.map(t => ({ ...t, amount: round2(t.amount) })),
      products: [...products.values()].map(p => ({ ...p, amount: round2(p.amount) }))
        .sort((a, b) => b.amount - a.amount || b.clicks - a.clicks || b.repeat - a.repeat),
      orders: shopOrders,
      orderTotals: {
        count: counted.length,
        value: round2(counted.reduce((a, o) => a + o.value, 0)),
        commission,
        excluded: shopOrders.length - counted.length,
      },
      total: round2(clickAmount + commission),
      balance: { paid, spent, balance: round2(paid - spent), hasTopUps: paid > 0 },
      topUps: topUps.filter(t => t.shopSlug === s.slug).slice(0, 30).map(t => ({ id: t.id, amount: t.amount, note: t.note, paidAt: t.paidAt.toISOString() })),
    }
  })

  return {
    month,
    commissionRate: COMMISSION_RATE,
    tiers: CLICK_TIERS.map((t, i) => ({ label: tierLabel(i), cpc: t.cpc })),
    shops: result,
    totals: {
      clicks: round2(result.reduce((a, r) => a + r.clicks.amount, 0)),
      commission: round2(result.reduce((a, r) => a + r.orderTotals.commission, 0)),
      total: round2(result.reduce((a, r) => a + r.total, 0)),
    },
  }
}

const clickCpcOf = (price: number) => CLICK_TIERS[tierIndex(price)].cpc

export type Billing = Awaited<ReturnType<typeof computeBilling>>
export type ShopBilling = Billing['shops'][number]
