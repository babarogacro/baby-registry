import PDFDocument from 'pdfkit'
import { join } from 'path'
import type { Stats } from './stats'

// A4 report of the admin statistics. Fonts are embedded because the built-in PDF fonts lack č, ć and đ.
const FONTS = join(process.cwd(), 'assets', 'fonts')
const INK = '#1E1537'
const MUTED = '#625978'
const LINE = '#E6E1F2'
const BAR = '#2F57F0'
const SOFT = '#FFF3E0'

const nf = new Intl.NumberFormat('hr-HR')
const num = (v: number, digits = 0) => new Intl.NumberFormat('hr-HR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v)
const eur = (v: number) => `${num(v, 2)} €`
const pct = (v: number) => `${num(v * 100, 1)} %`
const dur = (ms: number) => {
  const s = Math.round(ms / 1000)
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`
}
const hrDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${Number(d)}. ${Number(m)}. ${y}.`
}

export function renderStatsPdf(stats: Stats, shopName: string | null): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Listica: statistike', Author: 'Listica' } })
  // Brand fonts: Fredoka 600 (with č ć đ added) for headings and numbers, Nunito for text.
  doc.registerFont('display', join(FONTS, 'Fredoka-HR-600.otf'))
  doc.registerFont('sans', join(FONTS, 'Nunito-400.ttf'))
  doc.registerFont('bold', join(FONTS, 'Nunito-800.ttf'))

  const left = doc.page.margins.left
  const width = doc.page.width - left - doc.page.margins.right
  const bottom = () => doc.page.height - doc.page.margins.bottom

  const ensure = (h: number) => { if (doc.y + h > bottom()) doc.addPage() }

  const heading = (text: string) => {
    ensure(60)
    doc.moveDown(0.8)
    doc.font('display').fontSize(17).fillColor(INK).text(text, left, doc.y, { width })
    doc.moveDown(0.35)
  }

  // A grid of labelled numbers, three per row.
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

  const table = (head: string[], rows: (string | number)[][], widths: number[]) => {
    const rowH = 18
    const drawRow = (cells: (string | number)[], bold: boolean) => {
      ensure(rowH)
      const y = doc.y
      let x = left
      cells.forEach((cell, i) => {
        const w = widths[i] * width
        const right = i > 0
        doc.font(bold ? 'bold' : 'sans').fontSize(9).fillColor(bold ? MUTED : INK)
          .text(String(cell), x + 4, y + 4, { width: w - 8, align: right ? 'right' : 'left', lineBreak: false, ellipsis: true })
        x += w
      })
      doc.moveTo(left, y + rowH).lineTo(left + width, y + rowH).lineWidth(0.5).strokeColor(LINE).stroke()
      doc.y = y + rowH
    }
    drawRow(head, true)
    if (rows.length === 0) drawRow(['Nema podataka u ovom razdoblju.', ...head.slice(1).map(() => '')], false)
    rows.forEach(r => drawRow(r, false))
    doc.moveDown(0.6)
  }

  // One measure per chart, bars from a shared baseline: never two scales on one axis.
  const barChart = (title: string, points: { date: string; value: number }[]) => {
    const h = 120
    ensure(h + 46)
    doc.font('bold').fontSize(10).fillColor(INK).text(title, left, doc.y)
    const top = doc.y + 6
    const max = Math.max(1, ...points.map(p => p.value))
    const slot = width / Math.max(1, points.length)
    const barW = Math.max(1, Math.min(18, slot - 2))
    doc.font('sans').fontSize(8).fillColor(MUTED).text(nf.format(max), left, top - 2, { width, align: 'right' })
    doc.moveTo(left, top + h).lineTo(left + width, top + h).lineWidth(0.8).strokeColor(LINE).stroke()
    points.forEach((p, i) => {
      const bh = (p.value / max) * (h - 12)
      if (bh > 0) doc.roundedRect(left + i * slot + (slot - barW) / 2, top + h - bh, barW, bh, Math.min(2, barW / 2)).fill(BAR)
    })
    const step = Math.ceil(points.length / 8)
    points.forEach((p, i) => {
      if (i % step !== 0) return
      doc.font('sans').fontSize(7).fillColor(MUTED).text(hrDate(p.date).slice(0, -5), left + i * slot - 10, top + h + 4, { width: slot + 20, align: 'center', lineBreak: false })
    })
    doc.y = top + h + 22
  }

  // Header
  doc.font('bold').fontSize(10).fillColor('#0B7A5E').text('LISTICA', left, 48, { characterSpacing: 1.5 })
  doc.font('display').fontSize(28).fillColor(INK).text('Statistike', left, doc.y + 2)
  doc.font('sans').fontSize(11).fillColor(MUTED)
    .text(`${hrDate(stats.period.from)} do ${hrDate(stats.period.to)}  ·  ${shopName ? `Dućan: ${shopName}` : 'Svi dućani'}  ·  izrađeno ${new Date().toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' })}`)
  if (shopName) {
    doc.moveDown(0.3).font('sans').fontSize(9).fillColor(MUTED)
      .text('Filtar po dućanu vrijedi za proizvode, rezervacije, kupnje i klikove. Promet weba prikazan je za cijeli web.', { width })
  }

  heading('Promet')
  tiles([
    ['Posjeti (dnevno jedinstveni)', nf.format(stats.traffic.visits)],
    ['Sesije', nf.format(stats.traffic.sessions)],
    ['Prikazi stranica', nf.format(stats.traffic.pageviews)],
    ['Stranica po posjetu', num(stats.traffic.pagesPerVisit, 1)],
    ['Prosječno vrijeme po posjetu', dur(stats.traffic.avgTimePerVisitMs)],
    ['Posjeti s jednom stranicom', pct(stats.traffic.bounceRate)],
  ])
  barChart('Posjeti po danu', stats.series.map(s => ({ date: s.date, value: s.visits })))

  heading('Korisnici i Listice')
  tiles([
    ['Novi korisnici', nf.format(stats.users.new)],
    ['Korisnika ukupno', nf.format(stats.users.total)],
    ['Korisnika s Listicom', nf.format(stats.users.withList)],
    ['Nove Listice', nf.format(stats.lists.new)],
    ['Listica ukupno', nf.format(stats.lists.total)],
    ['Proizvoda po Listici (prosjek / medijan)', `${num(stats.lists.itemsPerList.avg, 1)} / ${num(stats.lists.itemsPerList.median, 0)}`],
    ['Prikazi javnih Listica', nf.format(stats.lists.views)],
    ['Različitih Listica otvoreno', nf.format(stats.lists.viewedLists)],
    ['Dijeljenja Listice', nf.format(stats.engagement.shares)],
  ])

  heading('Pokloni i kupnje')
  tiles([
    ['Dodano na Listice', nf.format(stats.items.added)],
    ['Vrijednost dodanog', eur(stats.items.addedValue)],
    ['Klik na Rezerviraj', nf.format(stats.reservations.starts)],
    ['Rezervirano', nf.format(stats.reservations.count)],
    ['Vrijednost rezerviranog', eur(stats.reservations.value)],
    ['Označeno kao kupljeno', nf.format(stats.reservations.purchased)],
    ['Vrijednost kupljenog', eur(stats.reservations.purchasedValue)],
    ['Skupljanja zajedno', nf.format(stats.reservations.groupBuys)],
    ['Upisano u skupljanjima', eur(stats.reservations.groupPledged)],
  ])
  barChart('Rezervacije po danu', stats.series.map(s => ({ date: s.date, value: s.reservations })))

  heading('Odlasci u dućan')
  tiles([
    ['Klikovi u dućan', nf.format(stats.outbound.clicks)],
    ['Posjeta s klikom u dućan', pct(stats.outbound.clickRate)],
    ['Kupnje koje su javili dućani', `${nf.format(stats.conversions.count)} (${eur(stats.conversions.value)})`],
  ])
  barChart('Klikovi u dućan po danu', stats.series.map(s => ({ date: s.date, value: s.clicks })))

  heading('Po dućanima')
  table(['Dućan', 'Klikovi', 'Dodano', 'Rezervirano', 'Kupljeno', 'Vrijednost rez.', 'Javljene kupnje'],
    stats.shops.map(s => [s.name, nf.format(s.clicks), nf.format(s.added), nf.format(s.reserved), nf.format(s.purchased), eur(s.reservedValue), `${nf.format(s.conversions)} / ${eur(s.conversionValue)}`]),
    [0.22, 0.1, 0.1, 0.12, 0.11, 0.17, 0.18])

  heading('Najposjećenije stranice')
  table(['Stranica', 'Prikazi', 'Prosj. vrijeme'], stats.traffic.topPages.map(p => [p.path, nf.format(p.views), p.avgMs ? dur(p.avgMs) : '']), [0.6, 0.2, 0.2])

  heading('Odakle dolaze posjetitelji')
  table(['Izvor', 'Posjeti'], [...stats.traffic.referrers, ...stats.traffic.campaigns].map(r => [r.name, nf.format(r.visits)]), [0.8, 0.2])
  table(['Uređaj', 'Posjeti'], stats.traffic.devices.map(d => [d.name, nf.format(d.visits)]), [0.8, 0.2])

  heading('Proizvodi')
  table(['Najviše klikova u dućan', 'Dućan', 'Klikovi'], stats.top.clicked.map(p => [p.name, p.shop, nf.format(p.count)]), [0.62, 0.22, 0.16])
  table(['Najčešće dodano na Listice', 'Dućan', 'Puta'], stats.top.added.map(p => [p.name, p.shop, nf.format(p.count)]), [0.62, 0.22, 0.16])
  table(['Najčešće rezervirano', 'Dućan', 'Puta'], stats.top.reserved.map(p => [p.name, p.shop, nf.format(p.count)]), [0.62, 0.22, 0.16])
  table(['Kategorija', 'Dodano'], stats.top.categories.map(c => [c.name, nf.format(c.count)]), [0.8, 0.2])
  table(['Brend', 'Dodano'], stats.top.brands.map(c => [c.name, nf.format(c.count)]), [0.8, 0.2])

  doc.end()
  return doc
}
