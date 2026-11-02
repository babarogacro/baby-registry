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
