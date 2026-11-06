import PDFDocument from 'pdfkit'
import { join } from 'path'
import type { ShopBilling } from './billing'
import { ATTRIBUTION_DAYS, COMMISSION_RATE } from './pricing'

// Monthly statement for one shop: what we send with the invoice. Brand fonts, A4, amounts without VAT.
const FONTS = join(process.cwd(), 'assets', 'fonts')
const INK = '#1E1537'
const MUTED = '#625978'
const LINE = '#E6E1F2'
const SOFT = '#FFF3E0'
const MINT_INK = '#0B7A5E'

const num = (v: number, digits = 0) => new Intl.NumberFormat('hr-HR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v)
const eur = (v: number) => `${num(v, 2)} €`
const MONTHS = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac']
export const monthName = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}.`
}
const hrDateTime = (iso: string) => new Date(iso).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const STATUS: Record<string, string> = { reported: 'naplaćuje se', returned: 'vraćeno', rejected: 'odbijeno', expired: 'izvan 30 dana' }

export function renderStatementPdf(shop: ShopBilling, month: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Listica: obračun ${shop.name}, ${monthName(month)}`, Author: 'Listica' } })
  doc.registerFont('display', join(FONTS, 'Fredoka-HR-600.otf'))
  doc.registerFont('sans', join(FONTS, 'Nunito-400.ttf'))
  doc.registerFont('bold', join(FONTS, 'Nunito-800.ttf'))

  const left = doc.page.margins.left
  const width = doc.page.width - left - doc.page.margins.right
  const bottom = () => doc.page.height - doc.page.margins.bottom
  const ensure = (h: number) => { if (doc.y + h > bottom()) doc.addPage() }

  const heading = (text: string, note?: string) => {
    ensure(70)
    doc.moveDown(0.8)
    doc.font('display').fontSize(16).fillColor(INK).text(text, left, doc.y, { width })
    if (note) doc.font('sans').fontSize(9).fillColor(MUTED).text(note, { width })
    doc.moveDown(0.4)
  }

  const tiles = (items: [string, string][]) => {
    const cols = 3
    const gap = 10
    const w = (width - gap * (cols - 1)) / cols
    const h = 54
    for (let i = 0; i < items.length; i += cols) {
      ensure(h + gap)
      const y = doc.y
      items.slice(i, i + cols).forEach(([label, value], j) => {
        const x = left + j * (w + gap)
        doc.roundedRect(x, y, w, h, 10).fill(SOFT)
        doc.font('display').fontSize(17).fillColor(INK).text(value, x + 12, y + 9, { width: w - 24, lineBreak: false })
        doc.font('sans').fontSize(9).fillColor(MUTED).text(label, x + 12, y + 33, { width: w - 24, lineBreak: false })
      })
      doc.y = y + h + gap
    }
  }

  const table = (head: string[], rows: string[][], widths: number[], total?: string[]) => {
    const rowH = 18
    const drawRow = (cells: string[], style: 'head' | 'row' | 'total') => {
      ensure(rowH)
      const y = doc.y
      let x = left
      cells.forEach((cell, i) => {
        const w = widths[i] * width
        doc.font(style === 'row' ? 'sans' : 'bold').fontSize(9).fillColor(style === 'head' ? MUTED : INK)
          .text(cell, x + 4, y + 4, { width: w - 8, height: 11, align: i > 0 ? 'right' : 'left', lineBreak: false, ellipsis: true })
        x += w
      })
      doc.moveTo(left, y + rowH).lineTo(left + width, y + rowH).lineWidth(style === 'total' ? 1 : 0.5).strokeColor(style === 'total' ? INK : LINE).stroke()
      doc.y = y + rowH
    }
    drawRow(head, 'head')
    if (rows.length === 0) drawRow(['Nema stavki u ovom mjesecu.', ...head.slice(1).map(() => '')], 'row')
    rows.forEach(r => drawRow(r, 'row'))
    if (total) drawRow(total, 'total')
    doc.moveDown(0.6)
  }

  // Header
  doc.font('bold').fontSize(10).fillColor(MINT_INK).text('LISTICA', left, 48, { characterSpacing: 1.5 })
  doc.font('display').fontSize(26).fillColor(INK).text(`Obračun za ${monthName(month)}`, left, doc.y + 2, { width })
  doc.font('sans').fontSize(11).fillColor(MUTED).text(`${shop.name}  ·  izrađeno ${new Date().toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' })}`, { width })

  heading('Sažetak', 'Sve cijene su bez PDV-a.')
  tiles([
    ['Klikovi koji se naplaćuju', num(shop.clicks.billable)],
    ['Iznos klikova', eur(shop.clicks.amount)],
    ['Ponovljeni, bez naplate', num(shop.clicks.repeat)],
    ['Narudžbe s Listice', num(shop.orderTotals.count)],
    ['Vrijednost narudžbi', eur(shop.orderTotals.value)],
    [`Provizija ${num(COMMISSION_RATE * 100)} %`, eur(shop.orderTotals.commission)],
  ])
  table(['Stavka', 'Iznos'], [
    ['Klikovi u dućan (plaćeno unaprijed sa salda)', eur(shop.clicks.amount)],
    [`Provizija ${num(COMMISSION_RATE * 100)} % na narudžbe (račun za ovaj mjesec)`, eur(shop.orderTotals.commission)],
  ], [0.75, 0.25], ['Ukupno za mjesec', eur(shop.total)])
  if (shop.balance.hasTopUps) {
    doc.font('sans').fontSize(9).fillColor(MUTED)
      .text(`Saldo za klikove danas: uplaćeno ${eur(shop.balance.paid)}, potrošeno ${eur(shop.balance.spent)}, preostalo ${eur(shop.balance.balance)}.`, left, doc.y, { width })
  }

  heading('Klikovi po cijeni proizvoda', 'Klik se naplaćuje kad gost s Listice klikne U dućan i stigne na vašu stranicu proizvoda. Ponovljeni klik s istog uređaja na isti proizvod istog dana ne naplaćuje se.')
  const usedTiers = shop.tiers.filter(t => t.clicks > 0)
  table(['Cijena proizvoda', 'Cijena klika', 'Klikova', 'Iznos'],
    usedTiers.map(t => [t.label, eur(t.cpc), num(t.clicks), eur(t.amount)]),
    [0.4, 0.2, 0.18, 0.22],
    ['Ukupno', '', num(shop.clicks.billable), eur(shop.clicks.amount)])

  heading('Klikovi po proizvodu')
  table(['Proizvod', 'Cijena', 'Klik', 'Klikova', 'Iznos'],
    shop.products.map(p => [`${p.name}${p.sku ? ` (${p.sku})` : ''}`, eur(p.price), eur(p.cpc), p.repeat ? `${num(p.clicks)} (+${num(p.repeat)})` : num(p.clicks), eur(p.amount)]),
    [0.46, 0.14, 0.12, 0.13, 0.15])

  heading('Narudžbe s Listice', `Narudžba se pripisuje Listici ako je obavljena unutar ${ATTRIBUTION_DAYS} dana od klika. Provizija se računa na vrijednost proizvoda bez PDV-a i dostave; vraćeni proizvodi se ne naplaćuju.`)
  table(['Datum', 'Broj narudžbe', 'Vrijednost', 'Status', 'Provizija'],
    shop.orders.map(o => [hrDateTime(o.createdAt), o.orderId ?? '', eur(o.value), STATUS[o.status] ?? o.status, eur(o.commission)]),
    [0.22, 0.26, 0.17, 0.18, 0.17],
    ['Ukupno', '', eur(shop.orderTotals.value), '', eur(shop.orderTotals.commission)])

  doc.end()
  return doc
}

/** The same statement as CSV for Excel (semicolons, decimal commas, UTF-8 with BOM). */
export function renderStatementCsv(shop: ShopBilling, month: string) {
  const cell = (v: string | number | null | undefined) => {
    // Numbers without thousands separators, so Excel reads them as numbers ("1234,5").
    const s = typeof v === 'number' ? new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 2, useGrouping: false }).format(v) : String(v ?? '')
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const line = (...cells: (string | number | null | undefined)[]) => cells.map(cell).join(';')
  const out: string[] = [
    line('Listica', `Obračun za ${monthName(month)}`, shop.name),
    line('Sve cijene su bez PDV-a'),
    '',
    line('Sažetak'),
    line('Klikovi koji se naplaćuju', shop.clicks.billable),
    line('Ponovljeni klikovi (ne naplaćuju se)', shop.clicks.repeat),
    line('Iznos klikova (EUR)', shop.clicks.amount),
    line('Narudžbe s Listice', shop.orderTotals.count),
    line('Vrijednost narudžbi (EUR)', shop.orderTotals.value),
    line(`Provizija ${num(COMMISSION_RATE * 100)} % (EUR)`, shop.orderTotals.commission),
    line('Ukupno za mjesec (EUR)', shop.total),
    '',
    line('Klikovi po cijeni proizvoda'),
    line('Cijena proizvoda', 'Cijena klika (EUR)', 'Klikova', 'Iznos (EUR)'),
    ...shop.tiers.filter(t => t.clicks > 0).map(t => line(t.label, t.cpc, t.clicks, t.amount)),
    '',
    line('Klikovi po proizvodu'),
    line('Proizvod', 'ID u feedu', 'Cijena proizvoda (EUR)', 'Cijena klika (EUR)', 'Klikova', 'Ponovljeni', 'Iznos (EUR)'),
    ...shop.products.map(p => line(p.name, p.sku, p.price, p.cpc, p.clicks, p.repeat, p.amount)),
    '',
    line('Narudžbe s Listice'),
    line('Datum', 'Broj narudžbe', 'lc_click', 'Vrijednost (EUR)', 'Status', 'Provizija (EUR)', 'Proizvodi'),
    ...shop.orders.map(o => line(hrDateTime(o.createdAt), o.orderId, o.clickId, o.value, STATUS[o.status] ?? o.status, o.commission, o.items)),
  ]
  return '﻿' + out.join('\r\n') + '\r\n'
}
