import * as cheerio from 'cheerio'
import { absoluteUrl, fetchText, politePause, runShopScrape, ScrapedProduct } from './shared'

const BASE_URL = 'https://www.svijet-beba.hr'
const MAX_PRODUCTS_PER_TARGET = 1200

// Listed most specific first: a product found in several categories keeps the first one.
const TARGETS: { label: string; path: string; categorySlug: string }[] = [
  { label: 'Kolica', path: '/djecja-kolica-za-bebe-kisobran-kolica-i-kolica-za-dvoje/42/69/1', categorySlug: 'kolica' },
  { label: 'Autosjedalice', path: '/autosjedalice-za-bebe-i-djecje-autosjedalice/42/66/1', categorySlug: 'autosjedalice' },
  { label: 'Kljunašice', path: '/hranjenje/kljunasice/42/61/179', categorySlug: 'dude-bocice' },
  { label: 'Posude za hranu', path: '/hranjenje/posude/42/61/181', categorySlug: 'hranjenje' },
  { label: 'Dude varalice', path: '/hranjenje/dude-varalice/42/61/183', categorySlug: 'dude-bocice' },
  { label: 'Grizala', path: '/hranjenje/grizala/42/61/184', categorySlug: 'hranjenje' },
  { label: 'Pribor za jelo', path: '/hranjenje/hranjenje-bebe/42/61/188', categorySlug: 'hranjenje' },
  { label: 'Dojenje', path: '/hranjenje/dojenje/42/61/189', categorySlug: 'dojenje' },
  { label: 'Hranilice', path: '/hranjenje/hranilice-za-bebe/42/61/190', categorySlug: 'djecje-sjedalice' },
  { label: 'Kozmetika', path: '/kupanje-i-higijena-kadice-kozmetika-previjanje-kozmetika/42/56/342', categorySlug: 'njega-kozmetika' },
  { label: 'Kupanje', path: '/kupanje-i-higijena-kadice-kozmetika-previjanje-djecje-kadice/42/56/343', categorySlug: 'kupanje' },
  { label: 'Previjanje', path: '/kupanje-i-higijena-kadice-kozmetika-previjanje-previjanje/42/56/346', categorySlug: 'oprema-za-previjanje' },
  { label: 'Krevetići i kolijevke', path: '/djecja-soba-krevetici-kolijevke-za-bebe-i-putni-krevetici/42/58/303', categorySlug: 'kreveti-vrtici' },
  { label: 'Baby monitori', path: '/djecja-soba-baby-monitor/42/58/307', categorySlug: 'kreveti-vrtici' },
  { label: 'Dodaci za krevetiće', path: '/djecja-soba-spavanje/42/58/308', categorySlug: 'posteljina' },
  { label: 'Dekice', path: '/djecja-soba-dekice/42/58/309', categorySlug: 'posteljina' },
  { label: 'Njihaljke', path: '/djecja-soba-njihaljke/42/58/318', categorySlug: 'ljuljacke-hodalice' },
  { label: 'Nosiljke', path: '/izvan-kuce-nosenje-bebe/42/38/463', categorySlug: 'nosiljke' },
  { label: 'Igračke za bebe', path: '/igracke-za-bebe/42/15/480', categorySlug: 'igracke-bebe' },
  { label: 'Plišane igračke', path: '/igracke-plisanci/42/15/479', categorySlug: 'plisane-igracke' },
  { label: 'Edukativne igračke', path: '/igracke-edukativne/42/15/477', categorySlug: 'edukativne-igracke' },
  { label: 'Didaktičke igračke', path: '/igracke-didakticke/42/15/476', categorySlug: 'edukativne-igracke' },
  { label: 'Kreativne igračke', path: '/igracke-kreativne/42/15/481', categorySlug: 'edukativne-igracke' },
  { label: 'Na kotačima', path: '/igracke-na-kotacima/42/15/472', categorySlug: 'igracke-bebe' },
  { label: 'Društvene igre', path: '/igracke-drustvene-igre/42/15/553', categorySlug: 'edukativne-igracke' },
  { label: 'Slikovnice', path: '/igracke-slikovnice/42/15/716', categorySlug: 'knjige' },
  { label: 'Za mame', path: '/za-mame-njega-dojenje-i-organizacija/42/112/1', categorySlug: 'za-mame' },
  { label: 'Moda', path: '/moda/42/62/1', categorySlug: 'odjeca' },
]

function parseHRPrice(text: string) {
  const match = text.match(/\d[\d.]*,\d{2}/)
  if (!match) return 0
  const value = parseFloat(match[0].replace(/\./g, '').replace(',', '.'))
  return isNaN(value) ? 0 : value
}

function cleanName(text: string) {
  return text
    .replace(/-?\d+%/g, '')
    .replace(/\d+[,.]\d+\s*€/g, '')
    .replace(/Dodaj u košaricu/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseCards(html: string) {
  const $ = cheerio.load(html)
  const products: ScrapedProduct[] = []

  $('article.product').each((_, el) => {
    const card = $(el)
    const link = card.find('a[href*="/41/"]').first()
    const productUrl = absoluteUrl(link.attr('href'), BASE_URL)
    if (!productUrl) return

    const img = card.find('img').first()
    const name = cleanName(img.attr('alt') || '') || cleanName(link.text())
    if (name.length < 3) return

    products.push({
      sku: card.attr('id')?.replace('article_id_', '') || undefined,
      name,
      price: parseHRPrice(card.find('.price').first().text() || card.text()),
      imageUrl: absoluteUrl(img.attr('data-src') || img.attr('src'), BASE_URL),
      productUrl,
    })
  })

  return products
}

export function runSvijetBebaScraper() {
  return runShopScrape(
    { slug: 'svijetbeba', name: 'Svijet Beba', baseUrl: BASE_URL },
    TARGETS,
    async (target, save) => {
      const html = await fetchText(BASE_URL + target.path)
      const products = parseCards(html)
      if (products.length === 0) throw new Error('nema proizvoda na stranici')
      let saved = await save(products)

      const grid = cheerio.load(html)('[data-offset]').first()
      const [menu, action, id] = target.path.split('/').slice(-3)
      let hasMore = grid.attr('data-has-more') === '1'
      let offset = parseInt(grid.attr('data-offset') || '0', 10)

      // The category page lazy-loads the rest of its products through this endpoint.
      while (hasMore && offset < MAX_PRODUCTS_PER_TARGET) {
        await politePause()
        const url = `${BASE_URL}/include/ajax_products.php?menu=${menu}&action=${action}&id=${id}&perPage=60&offset=${offset}`
        const data = JSON.parse(await fetchText(url)) as { html?: string; nextOffset?: number; hasMore?: number }
        if (!data.html || !data.nextOffset || data.nextOffset <= offset) break
        saved += await save(parseCards(data.html))
        offset = data.nextOffset
        hasMore = !!data.hasMore
      }
      console.log(`   ${offset} pregledano, ${saved} novih u ovom prolazu`)
    },
  )
}
