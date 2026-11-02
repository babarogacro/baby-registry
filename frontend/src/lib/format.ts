/** Croatian plural: plural(1, 'stavka', 'stavke', 'stavki') → "stavka"; 3 → "stavke"; 5, 11, 12 → "stavki". */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

/** Items added from a link used to store a placeholder shop name; fall back to the link's domain. */
export function shopLabel(product: { shopName: string; productUrl?: string }) {
  if (product.shopName !== 'Ručno dodano' || !product.productUrl) return product.shopName
  try {
    return new URL(product.productUrl).hostname.replace(/^www\./, '')
  } catch {
    return product.shopName
  }
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatPrice(amount: number, currency = 'EUR') {
  let fmt = formatters.get(currency)
  if (!fmt) {
    fmt = new Intl.NumberFormat('hr-HR', { style: 'currency', currency, minimumFractionDigits: 2 })
    formatters.set(currency, fmt)
  }
  return fmt.format(amount)
}

/** Parses a user-typed amount, accepting both "12,50" and "12.50". */
export function parseAmount(value: string) {
  const n = parseFloat(value.replace(/\s/g, '').replace(',', '.'))
  return isNaN(n) ? NaN : Math.round(n * 100) / 100
}

/** Parses dd/mm/yyyy as a UTC date so the calendar day never shifts with timezones. */
export function parseDMY(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const day = parseInt(m[1]), month = parseInt(m[2]), year = parseInt(m[3])
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return d
}

export function maskDMY(raw: string) {
  let val = raw.replace(/[^\d]/g, '')
  if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2)
  if (val.length >= 6) val = val.slice(0, 5) + '/' + val.slice(5)
  return val.slice(0, 10)
}

export function formatDateHR(date: Date | string) {
  return new Date(date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
