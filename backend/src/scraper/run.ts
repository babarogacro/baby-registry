import 'dotenv/config'
import { SCRAPERS } from './registry'

// Usage: npm run scrape [babycenter|svijetbeba] — runs all shops when omitted.
async function main() {
  const requested = process.argv[2]
  if (requested && !(requested in SCRAPERS)) throw new Error(`Nepoznat shop: ${requested}`)
  for (const slug of requested ? [requested] : Object.keys(SCRAPERS)) await SCRAPERS[slug]()
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Scraper failed:', err)
    process.exit(1)
  })
