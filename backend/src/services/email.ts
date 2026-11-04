import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@bebinalista.hr'
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))
}

// Subjects are plain text, but strip line breaks so user input can't inject headers.
function subjectText(value: string) {
  return value.replace(/[\r\n]+/g, ' ').slice(0, 150)
}

function money(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(amount)
}

function button(href: string, label: string) {
  return `<div style="text-align:center;margin:0 0 32px;">
    <a href="${esc(href)}" style="display:inline-block;background:#C97B6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:500;">${esc(label)}</a>
  </div>`
}

function layout({ title, subtitle, body }: { title: string; subtitle?: string; body: string }) {
  return `<!DOCTYPE html>
<html lang="hr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #F2D9D0;">
    <div style="background:linear-gradient(135deg,#F2D9D0 0%,#FAF7F2 100%);padding:40px 40px 32px;text-align:center;">
      <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#2C2320;margin:0 0 8px;">${esc(title)}</h1>
      ${subtitle ? `<p style="color:#6B6360;font-size:15px;margin:0;">${subtitle}</p>` : ''}
    </div>
    <div style="padding:32px 40px;">
      ${body}
      <hr style="border:none;border-top:1px solid #F2D9D0;margin:0 0 24px;">
      <p style="color:#9B9490;font-size:13px;margin:0;text-align:center;line-height:1.6;">
        Ovo je automatska poruka s <a href="${esc(APP_URL)}" style="color:#C97B6B;text-decoration:none;">Bebine Liste</a>.
      </p>
    </div>
  </div>
</body>
</html>`
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log('⚠️  RESEND_API_KEY nije postavljen - email neće biti poslan')
    return
  }
  try {
    const result = await resend.emails.send({ from: `Bebina Lista <${FROM_EMAIL}>`, to, subject: subjectText(subject), html })
    console.log('✉️  Email poslan:', result.data?.id)
    return result
  } catch (err) {
    console.error('❌ Email greška:', err)
  }
}

interface ListContext {
  mamaEmail: string
  mamaName: string
  listName: string
  listSlug: string
  productName: string
}

export async function sendReservationEmail(p: ListContext & {
  productPrice: number
  productCurrency: string
  reservedBy: string
  reservedNote?: string
}) {
  const body = `
    <p style="color:#2C2320;font-size:16px;margin:0 0 24px;">Bok, <strong>${esc(p.mamaName)}</strong>.</p>
    <p style="color:#6B6360;font-size:15px;margin:0 0 24px;line-height:1.6;">
      <strong style="color:#C97B6B;">${esc(p.reservedBy)}</strong> upravo rezervira poklon s tvoje liste. Nitko drugi ga više ne može odabrati.
    </p>
    <div style="background:#FAF7F2;border-radius:16px;padding:20px;margin:0 0 24px;border:1px solid #F2D9D0;">
      <p style="font-size:13px;color:#6B6360;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Rezervirani proizvod</p>
      <p style="font-size:16px;font-weight:500;color:#2C2320;margin:0 0 6px;">${esc(p.productName)}</p>
      <p style="font-size:18px;color:#C97B6B;font-weight:500;margin:0;">${esc(money(p.productPrice, p.productCurrency))}</p>
    </div>
    ${p.reservedNote ? `
    <div style="background:#F0F3EE;border-radius:16px;padding:20px;margin:0 0 24px;border-left:3px solid #8BA888;">
      <p style="font-size:13px;color:#6B6360;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Poruka</p>
      <p style="font-size:15px;color:#2C2320;margin:0;font-style:italic;">„${esc(p.reservedNote)}"</p>
    </div>` : ''}
    ${button(`${APP_URL}/moja-lista`, 'Otvori listu')}`

  return send(
    p.mamaEmail,
    `${p.reservedBy} rezervira poklon s tvoje liste`,
    layout({ title: 'Novi rezervirani poklon', subtitle: `S liste <strong>${esc(p.listName)}</strong>`, body }),
  )
}

export async function sendGroupBuyJoinEmail(p: ListContext & {
  contributorName: string
  contributorAmount: number
  contributorCurrency: string
  totalCollected: number
  targetAmount: number
  contributorsCount: number
}) {
  const progress = p.targetAmount > 0 ? Math.min(100, Math.round((p.totalCollected / p.targetAmount) * 100)) : 0
  const body = `
    <p style="color:#2C2320;font-size:16px;margin:0 0 24px;">Bok, <strong>${esc(p.mamaName)}</strong>.</p>
    <p style="color:#6B6360;font-size:15px;margin:0 0 24px;line-height:1.6;">
      <strong style="color:#C97B6B;">${esc(p.contributorName)}</strong> daje ${esc(money(p.contributorAmount, p.contributorCurrency))} za
      <strong>${esc(p.productName)}</strong> u grupnoj kupovini.
    </p>
    <div style="background:#FAF7F2;border-radius:16px;padding:20px;margin:0 0 24px;border:1px solid #F2D9D0;">
      <p style="font-size:13px;color:#6B6360;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.05em;">Napredak grupne kupovine</p>
      <p style="font-size:18px;color:#C97B6B;font-weight:500;margin:0 0 8px;">
        ${esc(money(p.totalCollected, p.contributorCurrency))} / ${esc(money(p.targetAmount, p.contributorCurrency))} (${p.contributorsCount} osoba)
      </p>
      <div style="background:#F2D9D0;border-radius:8px;height:8px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#C9A96E,#D4B87A);height:100%;width:${progress}%;border-radius:8px;"></div>
      </div>
      ${progress >= 100 ? '<p style="font-size:14px;color:#8BA888;margin:8px 0 0;font-weight:500;">Iznos je skupljen.</p>' : ''}
    </div>
    ${button(`${APP_URL}/moja-lista`, 'Otvori listu')}`

  return send(
    p.mamaEmail,
    `${p.contributorName} daje ${money(p.contributorAmount, p.contributorCurrency)} za ${p.productName}`,
    layout({ title: 'Novi doprinos za grupnu kupovinu', subtitle: `S liste <strong>${esc(p.listName)}</strong>`, body }),
  )
}

export async function sendWelcomeEmail(p: { email: string; name: string }) {
  const body = `
    <p style="color:#6B6360;font-size:15px;line-height:1.7;margin:0 0 20px;">Registracija je uspjela. Sada možeš:</p>
    <ul style="color:#6B6360;font-size:15px;line-height:2;padding-left:20px;margin:0 0 28px;">
      <li>napraviti listu onoga što ti treba za bebu ili što dijete želi za rođendan</li>
      <li>birati iz tisuća proizvoda iz hrvatskih dućana ili zalijepiti link iz bilo kojeg web shopa</li>
      <li>poslati link obitelji i prijateljima</li>
      <li>vidjeti tko je što rezervirao, da nitko ne kupi isto</li>
    </ul>
    ${button(`${APP_URL}/moja-lista`, 'Napravi listu')}`

  return send(p.email, 'Tvoja Bebina Lista je spremna', layout({ title: `Bok, ${p.name}`, body }))
}
