// Adds the Croatian letters Fredoka lacks (č ć Č Ć đ Đ) using its own caron, acute and bar shapes.
// Output: a full font for share images and the PDF report, a tiny web subset with just those letters, and a preview SVG.
const ot = require('opentype.js')
const fs = require('fs')
const path = require('path')

const src = process.argv[2]
const out = process.argv[3]
fs.mkdirSync(out, { recursive: true })
const f = ot.loadSync(src)
const G = ch => f.charToGlyph(ch)
const center = g => { const b = g.getBoundingBox(); return (b.x1 + b.x2) / 2 }

function shifted(p, dx, dy) {
  const n = new ot.Path()
  for (const c of p.commands) {
    const k = { ...c }
    for (const [x, y] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
      if (k[x] !== undefined) { k[x] += dx; k[y] += dy }
    }
    n.commands.push(k)
  }
  return n
}
function merge(...paths) { const n = new ot.Path(); for (const p of paths) n.commands.push(...p.commands); return n }

// Mark components exactly as the font places them on š/Š and é/É, re-centred on c/C.
function markOf(composite, base) {
  void composite.path // opentype.js reads composite components lazily, together with the outline
  const comp = composite.components[1]
  return { glyph: f.glyphs.get(comp.glyphIndex), dx: comp.dx, dy: comp.dy, baseCenter: center(base) }
}
function withMark(baseCh, mark, nudge = 0) {
  const base = G(baseCh)
  const dx = mark.dx + (center(base) - mark.baseCenter) + nudge
  return { advance: base.advanceWidth, path: merge(base.path, shifted(mark.glyph.path, dx, mark.dy)) }
}

const caronLc = markOf(G('š'), G('s'))
const caronUc = markOf(G('Š'), G('S'))
const acuteLc = markOf(G('é'), G('e'))
const acuteUc = markOf(G('É'), G('E'))

// The open side of c/C pulls the optical centre left of the bounding box centre.
const built = {
  ccaron: { unicode: 0x010D, ...withMark('c', caronLc, -12) },
  Ccaron: { unicode: 0x010C, ...withMark('C', caronUc, -14) },
  cacute: { unicode: 0x0107, ...withMark('c', acuteLc, -8) },
  Cacute: { unicode: 0x0106, ...withMark('C', acuteUc, -10) },
  Dcroat: { unicode: 0x0110, advance: G('Ð').advanceWidth, path: G('Ð').path },
}

// đ: the bar of Ð (Fredoka's hyphen) shortened to suit the lowercase, crossing the stem of d.
{
  const d = G('d')
  const ys = d.path.commands.filter(c => c.y !== undefined)
  const top = ys.filter(c => c.y > 600)
  const stemL = Math.min(...top.map(c => c.x)), stemR = Math.max(...top.map(c => c.x))
  const hb = G('-').getBoundingBox()
  const thick = (hb.y2 - hb.y1) * 0.82
  const r = thick / 2
  const x1 = stemL - 120, x2 = stemR + 46
  const yMid = 612
  const y1 = yMid - r, y2 = yMid + r
  const k = 0.5523 * r
  const bar = new ot.Path()
  // Clockwise like the font's own outer contours, so the overlap with the stem fills instead of cancelling.
  bar.moveTo(x1 + r, y1)
  bar.curveTo(x1 + r - k, y1, x1, yMid - k, x1, yMid)
  bar.curveTo(x1, yMid + k, x1 + r - k, y2, x1 + r, y2)
  bar.lineTo(x2 - r, y2)
  bar.curveTo(x2 - r + k, y2, x2, yMid + k, x2, yMid)
  bar.curveTo(x2, yMid - k, x2 - r + k, y1, x2 - r, y1)
  bar.lineTo(x1 + r, y1)
  bar.close()
  const advance = Math.max(d.advanceWidth, Math.round(x2 + 24))
  built.dcroat = { unicode: 0x0111, advance, path: merge(d.path, bar) }
  console.log('d stem', stemL.toFixed(0), stemR.toFixed(0), 'bar', x1.toFixed(0), x2.toFixed(0), 'thick', thick.toFixed(0), 'adv', d.advanceWidth, '->', advance)
}

// Overlapping contours (the bar across the stem of đ, Ð's bar across D) render with pale seams on Windows
// once the outline is CFF, so each new glyph is flattened into one outline without overlaps.
const paper = require('paper')
paper.setup(new paper.Size(1000, 1000))
function toPaper(p) {
  const children = []
  let cur = null
  for (const c of p.commands) {
    if (c.type === 'M') { cur = new paper.Path({ insert: false }); cur.moveTo(new paper.Point(c.x, c.y)); children.push(cur) }
    else if (c.type === 'L') cur.lineTo(new paper.Point(c.x, c.y))
    else if (c.type === 'C') cur.cubicCurveTo(new paper.Point(c.x1, c.y1), new paper.Point(c.x2, c.y2), new paper.Point(c.x, c.y))
    else if (c.type === 'Q') cur.quadraticCurveTo(new paper.Point(c.x1, c.y1), new paper.Point(c.x, c.y))
    else if (c.type === 'Z') cur.closePath()
  }
  return new paper.CompoundPath({ children, fillRule: 'nonzero', insert: false })
}
function fromPaper(item) {
  const out = new ot.Path()
  const paths = item.className === 'CompoundPath' ? item.children : [item]
  for (const p of paths) {
    const segs = p.segments
    if (!segs.length) continue
    out.moveTo(segs[0].point.x, segs[0].point.y)
    const n = p.closed ? segs.length : segs.length - 1
    for (let i = 1; i <= n; i++) {
      const a = segs[i - 1], b = segs[i % segs.length]
      if (a.handleOut.isZero() && b.handleIn.isZero()) out.lineTo(b.point.x, b.point.y)
      else out.curveTo(a.point.x + a.handleOut.x, a.point.y + a.handleOut.y, b.point.x + b.handleIn.x, b.point.y + b.handleIn.y, b.point.x, b.point.y)
    }
    out.close()
  }
  return out
}
function removeOverlap(p) {
  return fromPaper(toPaper(p).unite(new paper.Path({ insert: false }), { insert: false }))
}
for (const b of Object.values(built)) b.path = removeOverlap(b.path)

const NEW = Object.entries(built).map(([name, b]) => new ot.Glyph({ name, unicode: b.unicode, advanceWidth: b.advance, path: b.path }))

const meta = {
  unitsPerEm: f.unitsPerEm, ascender: f.ascender, descender: f.descender,
  copyright: 'Copyright 2016 The Fredoka Project Authors (https://github.com/hafontia/Fredoka-One). Croatian letters added for Listica, 2026.',
  license: 'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
  licenseURL: 'https://openfontlicense.org',
}
const os2 = t => ({ ...t, usWinAscent: f.tables.os2.usWinAscent, usWinDescent: f.tables.os2.usWinDescent, sTypoAscender: f.tables.os2.sTypoAscender, sTypoDescender: f.tables.os2.sTypoDescender, sTypoLineGap: f.tables.os2.sTypoLineGap, usWeightClass: 600 })

// Full font: every original glyph (outlines resolved) plus the new ones.
const all = [f.glyphs.get(0)]
for (let i = 1; i < f.glyphs.length; i++) {
  const g = f.glyphs.get(i)
  all.push(new ot.Glyph({ name: g.name || `g${i}`, unicode: g.unicode, unicodes: g.unicodes, advanceWidth: g.advanceWidth, path: g.path }))
}
all.push(...NEW)
const full = new ot.Font({ familyName: 'Fredoka HR', styleName: 'SemiBold', ...meta, glyphs: all })
Object.assign(full.tables, { os2: os2(full.tables.os2 || {}) })
fs.writeFileSync(path.join(out, 'Fredoka-HR-600.otf'), Buffer.from(full.toArrayBuffer()))

// Web subset: only the added letters, layered in front of Google's Fredoka with unicode-range.
const notdef = new ot.Glyph({ name: '.notdef', advanceWidth: 500, path: new ot.Path() })
const subset = new ot.Font({ familyName: 'Fredoka HR', styleName: 'SemiBold', ...meta, glyphs: [notdef, ...NEW] })
fs.writeFileSync(path.join(out, 'Fredoka-HR-letters.otf'), Buffer.from(subset.toArrayBuffer()))

// Preview: original letters next to the new ones, set in the patched full font.
const check = ot.parse(fs.readFileSync(path.join(out, 'Fredoka-HR-600.otf')).buffer)
const lines = ['Pronađi listu', 'Čačak ćevapi Ćiro', 'Đurđa i Đuro', 'cč cć CČ CĆ dđ DĐ', 'Lista za dječji rođendan', 'šš žž éé ŠŽ']
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="' + (lines.length * 130 + 40) + '"><rect width="100%" height="100%" fill="#FFF8EF"/>'
lines.forEach((t, i) => { svg += `<path fill="#1E1537" d="${check.getPath(t, 30, 120 + i * 130, 100).toPathData(1)}"/>` })
svg += '</svg>'
fs.writeFileSync(path.join(out, 'preview.svg'), svg)
console.log('glyphs full', all.length, 'subset', NEW.length + 1)
for (const n of ['Fredoka-HR-600.otf', 'Fredoka-HR-letters.otf']) console.log(n, fs.statSync(path.join(out, n)).size)
