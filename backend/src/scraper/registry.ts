import { runBabyCenterScraper } from './babycenter'
import { runSvijetBebaScraper } from './svijetbeba'
import { RunStore } from './shared'

export const SCRAPERS: Record<string, (store?: RunStore) => Promise<unknown>> = {
  babycenter: runBabyCenterScraper,
  svijetbeba: runSvijetBebaScraper,
}

const running = new Set<string>()

export function isScraperRunning(slug: string) {
  return running.has(slug)
}

/** Remote runs (routes/scraper.ts) hold the same lock as in-process runs. */
export function setScraperRunning(slug: string, value: boolean) {
  if (value) running.add(slug)
  else running.delete(slug)
}

export async function runScraper(slug: string) {
  const run = SCRAPERS[slug]
  if (!run) throw new Error(`Unknown scraper: ${slug}`)
  if (running.has(slug)) return
  running.add(slug)
  try {
    await run()
  } finally {
    running.delete(slug)
  }
}
