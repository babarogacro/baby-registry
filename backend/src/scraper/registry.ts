import { runBabyCenterScraper } from './babycenter'
import { runSvijetBebaScraper } from './svijetbeba'

export const SCRAPERS: Record<string, () => Promise<unknown>> = {
  babycenter: runBabyCenterScraper,
  svijetbeba: runSvijetBebaScraper,
}

const running = new Set<string>()

export function isScraperRunning(slug: string) {
  return running.has(slug)
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
