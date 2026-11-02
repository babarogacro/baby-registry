import cron from 'node-cron'
import { runScraper } from './registry'

export function scheduleScraper() {
  const options = { timezone: 'Europe/Zagreb' }

  cron.schedule('0 2 * * *', () => {
    console.log('⏰ Scheduler: Baby Center scraping...')
    runScraper('babycenter').catch(err => console.error('Scheduler greška (Baby Center):', err))
  }, options)

  cron.schedule('0 3 * * *', () => {
    console.log('⏰ Scheduler: Svijet Beba scraping...')
    runScraper('svijetbeba').catch(err => console.error('Scheduler greška (Svijet Beba):', err))
  }, options)

  console.log('⏰ Scraper scheduler aktiviran (Baby Center 02:00, Svijet Beba 03:00, Europe/Zagreb)')
}
