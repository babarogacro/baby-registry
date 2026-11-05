import * as cheerio from 'cheerio'
import { absoluteUrl, fetchText, politePause, runShopScrape, RunStore, ScrapedProduct, SHOPS } from './shared'

const BASE_URL = 'https://www.babycenter.hr'
const MAX_PAGES_PER_TARGET = 30

// Listed most specific first: a product found in several categories keeps the first one.
const TARGETS: { label: string; path: string; categorySlug: string }[] = [
  { label: 'Kolica kompleti', path: '/kolica/kolica-kompleti', categorySlug: 'kolica-kompleti' },
  { label: 'Kišobran kolica', path: '/kolica/kisobran-kolica', categorySlug: 'kisobran-kolica' },
  { label: 'Kolica za dvojke', path: '/kolica/kolica-za-dvojke', categorySlug: 'kolica-za-dvojke' },
  { label: 'Dodaci za kolica', path: '/kolica/dodaci-za-kolica', categorySlug: 'dodaci-za-kolica' },
  { label: 'Kolica', path: '/kolica/kolica', categorySlug: 'kolica' },
  { label: 'Autosjedalice 0-15 mj', path: '/autosjedalice/po-dobi/autosjedalice-od-0-do-15-mjeseci', categorySlug: 'autosjedalice' },
  { label: 'Autosjedalice 5 mj-4 g', path: '/autosjedalice/po-dobi/autosjedalice-od-5-mjeseci-do-4-godine', categorySlug: 'autosjedalice' },
  { label: 'Autosjedalice 4-12 g', path: '/autosjedalice/po-dobi/autosjedalice-od-4-do-12-godina', categorySlug: 'autosjedalice' },
  { label: 'Autosjedalice 0-12 g', path: '/autosjedalice/po-dobi/autosjedalice-od-0-do-12-godina', categorySlug: 'autosjedalice' },
  { label: 'Baze za autosjedalice', path: '/autosjedalice/baze', categorySlug: 'baze-autosjedalice' },
  { label: 'Marame', path: '/nosiljke/marame', categorySlug: 'marame' },
  { label: 'Nosiljke', path: '/nosiljke/nosiljke', categorySlug: 'nosiljke' },
  { label: 'Kreveti i vrtići', path: '/kod-kuce/kreveti-i-vrtici', categorySlug: 'kreveti-vrtici' },
  { label: 'Madraci', path: '/kod-kuce/madraci', categorySlug: 'madraci' },
  { label: 'Posteljina', path: '/kod-kuce/posteljina', categorySlug: 'posteljina' },
  { label: 'Oprema za previjanje', path: '/kod-kuce/oprema-za-previjanje', categorySlug: 'oprema-za-previjanje' },
  { label: 'Hranilice', path: '/kod-kuce/hranilice', categorySlug: 'djecje-sjedalice' },
  { label: 'Ljuljačke i hodalice', path: '/kod-kuce/ljuljacke-i-hodalice', categorySlug: 'ljuljacke-hodalice' },
  { label: 'Kupanje', path: '/njega/kupanje', categorySlug: 'kupanje' },
  { label: 'Dude', path: '/hranjenje/dude', categorySlug: 'dude-bocice' },
  { label: 'Bočice', path: '/hranjenje/bocice-za-bebe', categorySlug: 'dude-bocice' },
  { label: 'Posuđe i pribor', path: '/hranjenje/posudje-i-pribor-za-jelo', categorySlug: 'hranjenje' },
  { label: 'Priprema hrane', path: '/hranjenje/priprema-hrane', categorySlug: 'hranjenje' },
  { label: 'Dojenje', path: '/za-mame/dojenje', categorySlug: 'dojenje' },
  { label: 'Higijena', path: '/njega/proizvodi-za-higijenu', categorySlug: 'njega-kozmetika' },
  { label: 'Kozmetika i pelene', path: '/njega/kozmetika-i-pelene', categorySlug: 'njega-kozmetika' },
  { label: 'Igračke za bebe', path: '/igracke/baby-igracke', categorySlug: 'igracke-bebe' },
  { label: 'Plišane igračke', path: '/igracke/plis', categorySlug: 'plisane-igracke' },
  { label: 'Drvene igračke', path: '/igracke/drvene-igracke', categorySlug: 'edukativne-igracke' },
  { label: 'Kreativne igračke', path: '/igracke/kreativne-igracke', categorySlug: 'edukativne-igracke' },
  { label: 'Knjige', path: '/igracke/knjige', categorySlug: 'knjige' },
  { label: 'Kozmetika za mame', path: '/za-mame/kozmetika', categorySlug: 'za-mame' },
  { label: 'Pomagala za mame', path: '/za-mame/pomagala-za-mame', categorySlug: 'za-mame' },
  { label: 'Donje rublje za mame', path: '/za-mame/donje-rublje', categorySlug: 'za-mame' },
  { label: 'Odjeća kompleti', path: '/odjeca/kompleti', categorySlug: 'odjeca' },
  { label: 'Pidžame', path: '/odjeca/pidzame', categorySlug: 'odjeca' },
  { label: 'Čarape i štramplice', path: '/odjeca/carape-i-strample', categorySlug: 'odjeca' },
  { label: 'Program za krštenje', path: '/odjeca/program-za-krstenje', categorySlug: 'odjeca' },
  { label: 'Obuća za bebe', path: '/obuca/obuca-za-bebe', categorySlug: 'obuca-za-bebe' },
]

export function parseListing(html: string) {
  const $ = cheerio.load(html)
  const products: ScrapedProduct[] = []

  $('[id^="itemCard"]').each((_, el) => {
    const card = $(el)
    let info: { item_id?: string; item_name?: string; item_brand?: string; price?: number; discount?: number } | undefined
    try {
      info = JSON.parse(card.attr('data-json') || '{}').items?.[0]
    } catch {
      return
    }
    const productUrl = absoluteUrl(card.find('a[href]').first().attr('href'), BASE_URL)
    if (!info?.item_name || !productUrl.startsWith(BASE_URL)) return

    const img = card.find('img').first()
    products.push({
      sku: info.item_id ? String(info.item_id) : undefined,
      name: info.item_name.trim(),
      price: Number(info.price),
      brand: info.item_brand,
      originalPrice: info.discount ? Number(info.price) + Number(info.discount) : undefined,
      imageUrl: absoluteUrl(img.attr('data-src') || img.attr('src'), BASE_URL),
      productUrl,
    })
  })

  const pageNumbers = $('a.page-number')
    .map((_, a) => parseInt(($(a).attr('href') || '').split('/').pop() || '', 10))
    .get()
    .filter(n => !isNaN(n))

  return { products, lastPage: Math.max(1, ...pageNumbers) }
}

export function runBabyCenterScraper(store?: RunStore) {
  return runShopScrape(
    SHOPS.babycenter,
    TARGETS,
    async (target, save) => {
      const first = parseListing(await fetchText(BASE_URL + target.path))
      if (first.products.length === 0) throw new Error('nema proizvoda na stranici')

      const lastPage = Math.min(first.lastPage, MAX_PAGES_PER_TARGET)
      let saved = await save(first.products)
      for (let page = 2; page <= lastPage; page++) {
        await politePause()
        const { products } = parseListing(await fetchText(`${BASE_URL}${target.path}/${page}`))
        saved += await save(products)
      }
      console.log(`   ${lastPage} str., ${saved} novih u ovom prolazu`)
    },
    store,
  )
}
