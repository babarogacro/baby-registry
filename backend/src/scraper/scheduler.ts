import cron from 'node-cron'
import { runScraper } from './registry'

// Shops listed in SCRAPER_SKIP (comma-separated) are scraped from elsewhere, see remote.ts.
const skipped = new Set((process.env.SCRAPER_SKIP || '').split(',').map(s => s.trim()).filter(Boolean))

function schedule(expression: string, slug: string, label: string, options: { timezone: string }) {
  if (skipped.has(slug)) {
    console.log(`⏰ Scheduler: ${label} se ne skida odavde (SCRAPER_SKIP)`)
    return
  }
  cron.schedule(expression, () => {
    console.log(`⏰ Scheduler: ${label} scraping...`)
    runScraper(slug).catch(err => console.error(`Scheduler greška (${label}):`, err))
  }, options)
}

export function scheduleScraper() {
  const options = { timezone: 'Europe/Zagreb' }
  schedule('0 2 * * *', 'babycenter', 'Baby Center', options)
  schedule('0 3 * * *', 'svijetbeba', 'Svijet Beba', options)
  console.log('⏰ Scraper scheduler aktiviran (Baby Center 02:00, Svijet Beba 03:00, Europe/Zagreb)')
}
