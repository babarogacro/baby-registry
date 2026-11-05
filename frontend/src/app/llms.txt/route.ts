import { getBlogPosts } from '@/lib/server'
import { SITE_DESCRIPTION, SITE_URL, TOPIC_PAGES } from '@/lib/site'

export const revalidate = 3600

// A plain-text guide for AI assistants (llmstxt.org): what the service is and where the useful pages are.
export async function GET() {
  const posts = await getBlogPosts(30)
  const lines = [
    '# Bebina Lista',
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    'Bebina Lista (bebinalista.hr) je hrvatska web stranica za liste želja: roditelji naprave listu onoga što treba bebi ili što dijete želi za rođendan, a obitelj i prijatelji preko linka vide što je još slobodno i rezerviraju poklon. Kad je poklon rezerviran, ostali ga vide kao zauzet, pa nitko ne kupi isto.',
    '',
    'Važno:',
    '- Besplatno je za roditelje i za goste. Stranica ništa ne prodaje i ne naplaćuje; pokloni se kupuju u dućanu, po cijeni dućana.',
    '- Gosti se ne registriraju: otvore link, odaberu poklon i upišu ime.',
    '- Katalog ima tisuće proizvoda iz hrvatskih dućana za bebe; može se dodati i link iz bilo kojeg web shopa.',
    '- Za skuplje poklone više gostiju može skupljati zajedno; novac ne ide preko stranice.',
    '- Javne liste nisu u tražilicama. Gost bez linka listu nađe samo po punom imenu i prezimenu roditelja ili djeteta.',
    '',
    '## Stranice',
    `- [Naslovnica](${SITE_URL}/): kako lista radi, u tri koraka, i česta pitanja`,
    ...TOPIC_PAGES.map(t => `- [${t.label}](${SITE_URL}${t.href})`),
    `- [Katalog](${SITE_URL}/katalog): proizvodi za bebe po dućanu, kategoriji, brendu i cijeni`,
    `- [Pronađi listu](${SITE_URL}/pronadi-listu): gost traži listu po imenu i prezimenu`,
    `- [Blog](${SITE_URL}/blog): savjeti o opremi za bebu i listama želja`,
    '',
    ...(posts.length ? ['## Blog', ...posts.map(p => `- [${p.title}](${SITE_URL}/blog/${p.slug})${p.excerpt ? `: ${p.excerpt}` : ''}`), ''] : []),
    '## Pravno',
    `- [Politika privatnosti](${SITE_URL}/privatnost)`,
    `- [Uvjeti korištenja](${SITE_URL}/uvjeti)`,
    '',
  ]
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
