import 'dotenv/config'
import axios from 'axios'
import { SCRAPERS } from './registry'
import { RunStore, Shop, SHOPS } from './shared'

/**
 * Runs a scraper on this machine but stores the results through the API
 * (POST /api/scraper/runs/:shop/...). Baby Center answers HTTP 451 to every
 * cloud provider, so its scrape has to come from a Croatian home connection.
 *
 * Usage: npm run scrape:remote [babycenter|svijetbeba]
 * Needs SCRAPER_API_URL (e.g. https://host/api) and SCRAPER_KEY in the environment.
 */
export function remoteRunStore(shop: Shop, apiUrl: string, key: string): RunStore {
  const client = axios.create({
    baseURL: `${apiUrl.replace(/\/$/, '')}/scraper/runs/${shop.slug}`,
    headers: { 'x-scraper-key': key },
    timeout: 120000,
  })
  const call = async <T>(path: string, body: unknown): Promise<T> => {
    for (let attempt = 1; ; attempt++) {
      try {
        const { data } = await client.post<T>(path, body)
        return data
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        const message = axios.isAxiosError(err) ? err.response?.data?.error || err.message : String(err)
        // Client errors are final (bad key, unknown shop); network blips get two more tries.
        if ((status && status < 500) || attempt >= 3) throw new Error(`API ${path}: ${message}`)
        await new Promise(r => setTimeout(r, 3000 * attempt))
      }
    }
  }

  return {
    begin: () => call('/begin', {}),
    save: (categorySlug, products) => call<{ saved: number }>('/items', { categorySlug, products }).then(r => r.saved),
    finish: (failed, targetsCount) => call('/finish', { failed, targetsCount }),
    fail: message => call('/fail', { message }).then(() => undefined).catch(() => undefined),
  }
}

async function main() {
  const apiUrl = process.env.SCRAPER_API_URL
  const key = process.env.SCRAPER_KEY
  if (!apiUrl || !key) throw new Error('Postavi SCRAPER_API_URL i SCRAPER_KEY')

  const requested = process.argv[2]
  if (requested && !(requested in SCRAPERS)) throw new Error(`Nepoznat shop: ${requested}`)
  for (const slug of requested ? [requested] : Object.keys(SCRAPERS)) {
    await SCRAPERS[slug](remoteRunStore(SHOPS[slug], apiUrl, key))
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Scraper failed:', err)
    process.exit(1)
  })
