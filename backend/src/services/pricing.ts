/**
 * The merchant price list ("Listica za trgovce", 2026./2027.). All amounts in EUR without VAT.
 *  - one-off listing fee, invoiced by hand
 *  - a price per click into the shop, by the product's price, paid in advance from a prepaid balance
 *  - commission on purchases that came from a click, invoiced monthly
 */

export const LISTING_FEE = 500
export const COMMISSION_RATE = 0.1
/** A purchase counts for Listica if it happens within this many days after the click. */
export const ATTRIBUTION_DAYS = 30

/** Click price by product price; each bracket includes its upper bound ("do 13 €"). */
export const CLICK_TIERS: { upTo: number; cpc: number }[] = [
  { upTo: 1.33, cpc: 0.02 },
  { upTo: 13, cpc: 0.06 },
  { upTo: 33, cpc: 0.08 },
  { upTo: 66, cpc: 0.1 },
  { upTo: 165, cpc: 0.14 },
  { upTo: 331, cpc: 0.16 },
  { upTo: 597, cpc: 0.18 },
  { upTo: 929, cpc: 0.22 },
  { upTo: 1327, cpc: 0.24 },
  { upTo: Infinity, cpc: 0.32 },
]

export function tierIndex(price: number) {
  const i = CLICK_TIERS.findIndex(t => price <= t.upTo)
  return i === -1 ? CLICK_TIERS.length - 1 : i
}

export function clickPrice(price: number) {
  return CLICK_TIERS[tierIndex(price)].cpc
}

const money = (v: number) => new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 2 }).format(v)

/** "do 1,33 €", "1,33 do 13 €", ..., "preko 1.327 €" */
export function tierLabel(i: number) {
  const t = CLICK_TIERS[i]
  if (i === 0) return `do ${money(t.upTo)} €`
  const prev = CLICK_TIERS[i - 1].upTo
  return t.upTo === Infinity ? `preko ${money(prev)} €` : `${money(prev)} do ${money(t.upTo)} €`
}

export const round2 = (v: number) => Math.round(v * 100) / 100
