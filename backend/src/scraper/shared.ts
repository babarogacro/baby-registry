import axios from 'axios'
import { prisma } from '../utils/prisma'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
export const politePause = () => sleep(1500 + Math.random() * 1000)

export async function fetchText(url: string, attempt = 1): Promise<string> {
  try {
    const { data } = await axios.get(url, {
      responseType: 'text',
      timeout: 30000,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'hr-HR,hr;q=0.9,en;q=0.8',
      },
    })
    return data
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const retryable = status === undefined || status >= 500 || status === 429
    if (retryable && attempt < 3) {
      await sleep(3000 * attempt)
      return fetchText(url, attempt + 1)
    }
    throw new Error(status ? `HTTP ${status}` : (err as Error).message)
  }
}

export function absoluteUrl(value: string | undefined, base: string) {
  if (!value) return ''
  if (value.startsWith('//')) return `https:${value}`
  if (value.startsWith('/')) return base + value
  return value
}

const CATEGORY_TREE: { slug: string; name: string; children?: { slug: string; name: string }[] }[] = [
  { slug: 'kolica', name: 'Kolica', children: [
    { slug: 'kolica-kompleti', name: 'Kolica kompleti' },
    { slug: 'kisobran-kolica', name: 'Kišobran kolica' },
    { slug: 'kolica-za-dvojke', name: 'Kolica za dvojke' },
    { slug: 'dodaci-za-kolica', name: 'Dodaci za kolica' },
  ] },
  { slug: 'autosjedalice', name: 'Autosjedalice', children: [
    { slug: 'baze-autosjedalice', name: 'Baze za autosjedalice' },
  ] },
  { slug: 'nosiljke', name: 'Nosiljke', children: [
    { slug: 'marame', name: 'Marame' },
  ] },
  { slug: 'kod-kuce', name: 'Kod kuće', children: [
    { slug: 'kreveti-vrtici', name: 'Kreveti i vrtići' },
    { slug: 'madraci', name: 'Madraci' },
    { slug: 'posteljina', name: 'Posteljina' },
    { slug: 'oprema-za-previjanje', name: 'Oprema za previjanje' },
    { slug: 'djecje-sjedalice', name: 'Hranilice' },
    { slug: 'ljuljacke-hodalice', name: 'Ljuljačke i hodalice' },
    { slug: 'kupanje', name: 'Kupanje' },
  ] },
  { slug: 'hranjenje-njega', name: 'Hranjenje i njega', children: [
    { slug: 'hranjenje', name: 'Hranjenje' },
    { slug: 'dude-bocice', name: 'Dude i bočice' },
    { slug: 'dojenje', name: 'Dojenje' },
    { slug: 'njega-kozmetika', name: 'Njega i kozmetika' },
  ] },
  { slug: 'igracke', name: 'Igračke', children: [
    { slug: 'igracke-bebe', name: 'Igračke za bebe' },
    { slug: 'plisane-igracke', name: 'Plišane igračke' },
    { slug: 'edukativne-igracke', name: 'Edukativne igračke' },
    { slug: 'knjige', name: 'Knjige i slikovnice' },
  ] },
  { slug: 'za-mame', name: 'Za mame' },
  { slug: 'odjeca', name: 'Odjeća', children: [
    { slug: 'obuca-za-bebe', name: 'Obuća za bebe' },
  ] },
]

async function ensureCategories() {
  const ids = new Map<string, string>()
  const upsert = async (slug: string, name: string, parentId: string | null) => {
    const category = await prisma.category.upsert({
      where: { slug },
      create: { slug, name, parentId },
      update: { name, parentId },
      select: { id: true },
    })
    ids.set(slug, category.id)
    return category.id
  }
  for (const top of CATEGORY_TREE) {
    const parentId = await upsert(top.slug, top.name, null)
    for (const child of top.children ?? []) await upsert(child.slug, child.name, parentId)
  }
  return ids
}

// Shops write brands differently ("CYBEX", "Cybex"), so the catalog facet needs one spelling.
const BRAND_SPELLING: Record<string, string> = {
  'B.BOX': 'b.box',
  'BABYBJORN': 'BabyBjörn',
  'BABYBJÖRN': 'BabyBjörn',
  'BABY BJORN': 'BabyBjörn',
  'BABY BJÖRN': 'BabyBjörn',
  'BEBE-JOU': 'Bébé-Jou',
  'BÉBÉ-JOU': 'Bébé-Jou',
  'BIBS': 'BIBS',
  'BRITAX ROMER': 'Britax Römer',
  'LASSIG': 'Lässig',
  'MAGNA TILES': 'Magna-Tiles',
  'MAM': 'MAM',
  'MAXI COSI': 'Maxi-Cosi',
  'NUK': 'NUK',
  'SWEETDREAMERS': 'Sweet Dreamers',
}

export function normalizeBrand(raw: string | undefined) {
  const clean = raw?.replace(/[®™]/g, '').replace(/\s+/g, ' ').trim()
  if (!clean || clean.length < 2) return undefined
  const key = clean.toLocaleUpperCase('hr-HR')
  return BRAND_SPELLING[key]
    ?? key.toLocaleLowerCase('hr-HR').replace(/(^|[\s-])(\p{L})/gu, (_, gap, letter) => gap + letter.toLocaleUpperCase('hr-HR'))
}

export interface ScrapedProduct {
  sku?: string
  name: string
  price: number
  brand?: string
  /** Price before the shop's discount, when the shop shows one. */
  originalPrice?: number
  imageUrl?: string
  productUrl: string
}

export interface ScrapeTarget {
  label: string
  categorySlug: string
}

export type SaveProducts = (products: ScrapedProduct[]) => Promise<number>

interface Shop {
  slug: string
  name: string
  baseUrl: string
}

/**
 * Shared run lifecycle: resolves categories, upserts by SKU or URL, records status,
 * and retires products the shop no longer lists (only after a healthy run, so a
 * blocked or broken scrape can never empty the catalog).
 */
export async function runShopScrape<T extends ScrapeTarget>(
  shop: Shop,
  targets: T[],
  scrapeTarget: (target: T, save: SaveProducts) => Promise<void>,
) {
  const startedAt = new Date()
  console.log(`\n🕷️  ${shop.name} scraper pokrenut:`, startedAt.toLocaleString('hr-HR'))

  await prisma.scrapedShop.upsert({
    where: { slug: shop.slug },
    create: { ...shop, isActive: true, lastStatus: 'running' },
    update: { lastStatus: 'running', lastRun: startedAt, errorMsg: null },
  })

  const seen = new Set<string>()
  const failed: string[] = []
  let saveErrors = 0

  try {
    const categoryIds = await ensureCategories()
    const existing = await prisma.product.findMany({
      where: { shopSlug: shop.slug },
      select: { id: true, sku: true, productUrl: true, inStock: true },
    })
    const bySku = new Map(existing.filter(p => p.sku).map(p => [p.sku!, p.id]))
    const byUrl = new Map(existing.map(p => [p.productUrl, p.id]))
    const previousInStock = existing.filter(p => p.inStock).length

    for (const target of targets) {
      const categoryId = categoryIds.get(target.categorySlug)
      if (!categoryId) throw new Error(`Nepoznata kategorija: ${target.categorySlug}`)

      const save: SaveProducts = async products => {
        let saved = 0
        for (const p of products) {
          const key = p.sku || p.productUrl
          if (seen.has(key) || !p.name || !p.productUrl || !(p.price > 0)) continue
          seen.add(key)
          const data = {
            name: p.name.slice(0, 500),
            price: p.price,
            originalPrice: p.originalPrice && p.originalPrice > p.price ? p.originalPrice : null,
            brand: normalizeBrand(p.brand),
            imageUrl: p.imageUrl?.slice(0, 1000) || null,
            productUrl: p.productUrl.slice(0, 1000),
            sku: p.sku ?? null,
            inStock: true,
            shopSlug: shop.slug,
            shopName: shop.name,
            categoryId,
            lastScraped: new Date(),
          }
          try {
            const id = (p.sku && bySku.get(p.sku)) || byUrl.get(p.productUrl)
            if (id) {
              await prisma.product.update({ where: { id }, data, select: { id: true } })
            } else {
              const created = await prisma.product.create({ data: { ...data, sortKey: Math.random() }, select: { id: true } })
              byUrl.set(p.productUrl, created.id)
              if (p.sku) bySku.set(p.sku, created.id)
            }
            saved++
          } catch (err) {
            if (++saveErrors <= 5) console.error(`   ⚠️  ${p.name.slice(0, 40)}: ${(err as Error).message}`)
          }
        }
        return saved
      }

      console.log(`\n📂 ${target.label} → ${target.categorySlug}`)
      try {
        await scrapeTarget(target, save)
      } catch (err) {
        console.error(`   ❌ ${target.label}: ${(err as Error).message}`)
        failed.push(`${target.label} (${(err as Error).message})`)
      }
      await politePause()
    }

    const healthy = seen.size > 0
      && seen.size >= previousInStock * 0.5
      && failed.length <= targets.length * 0.25

    let retired = 0
    if (healthy) {
      const result = await prisma.product.updateMany({
        where: { shopSlug: shop.slug, inStock: true, lastScraped: { lt: startedAt } },
        data: { inStock: false },
      })
      retired = result.count
    }

    const problems = [
      failed.length > 0 && `Neuspjele kategorije (${failed.length}): ${failed.join(', ')}`,
      saveErrors > 0 && `${saveErrors} grešaka pri spremanju`,
      !healthy && 'Rezultat je sumnjivo malen pa stari proizvodi nisu uklonjeni',
    ].filter(Boolean).join(' · ')

    await prisma.scrapedShop.update({
      where: { slug: shop.slug },
      data: {
        lastStatus: seen.size > 0 ? 'success' : 'error',
        lastRun: new Date(),
        productsCount: seen.size,
        errorMsg: problems.slice(0, 1000) || null,
      },
    })

    console.log(`\n✅ ${shop.name} gotovo: ${seen.size} proizvoda, ${retired} povučeno, ${failed.length} neuspjelih kategorija`)
    return { totalScraped: seen.size, retired, failed }
  } catch (err) {
    console.error('\n❌ Fatalna greška:', err)
    await prisma.scrapedShop.update({
      where: { slug: shop.slug },
      data: { lastStatus: 'error', errorMsg: String(err).slice(0, 1000), lastRun: new Date() },
    }).catch(() => {})
    return { totalScraped: seen.size, retired: 0, failed }
  }
}
