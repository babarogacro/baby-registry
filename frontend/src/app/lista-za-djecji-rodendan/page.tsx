import type { Metadata } from 'next'
import TopicPage, { type TopicContent } from '@/components/TopicPage'

export const metadata: Metadata = {
  title: 'Lista želja za dječji rođendan | Listica',
  description: 'Besplatna lista želja za dječji rođendan. Upiši što dijete želi, pošalji link roditeljima gostiju i izbjegni tri iste igračke.',
  alternates: { canonical: '/lista-za-djecji-rodendan' },
}

const CONTENT: TopicContent = {
  path: '/lista-za-djecji-rodendan',
  eyebrow: 'Za dječji rođendan',
  title: 'Lista želja za dječji rođendan',
  lead: 'Pred svaki rođendan stigne isto pitanje: što mali ili mala želi? S Listicom odgovoriš jednom, svim gostima odjednom, i dijete ne dobije tri iste igračke.',
  tone: 'sky',
  art: 'gift',
  registerHref: '/registracija?occasion=birthday',
  steps: [
    { title: 'Upiši što dijete želi.', text: 'Igračke, knjige, opremu za sport ili odjeću. Iz kataloga ili linkom iz bilo kojeg web shopa, s veličinom ili bojom u napomeni.' },
    { title: 'Pošalji link uz pozivnicu.', text: 'Link pošalji roditeljima gostiju u grupu ili ga stavi kao QR kod na pozivnicu.' },
    { title: 'Svatko uzme nešto drugo.', text: 'Roditelji gostiju vide što je već rezervirano i odaberu nešto drugo. Pokloni se kupuju u dućanu.' },
  ],
  ideasTitle: 'Što staviti na rođendansku Listicu.',
  ideas: [
    { label: 'Igračke za tu dob', text: 'Ono što dijete stvarno spominje, a ne ono što se samo dobro vidi u dućanu.', href: '/katalog?kategorija=igracke' },
    { label: 'Knjige i slikovnice', text: 'Navedi naslove koje već imate, da ne stignu dvaput.' },
    { label: 'Sport i igra vani', text: 'Bicikl, kaciga, romobil ili lopta, uz točnu veličinu.' },
    { label: 'Odjeća i obuća', text: 'S veličinom u napomeni, jer se djeca brzo izrastu.', href: '/katalog?kategorija=odjeca' },
    { label: 'Veći poklon zajedno', text: 'Za skuplju želju više roditelja skupi zajedno, svatko da svoj dio.' },
    { label: 'Bilo koji web shop', text: 'Zalijepi link iz bilo kojeg dućana i Listica povuče naziv, sliku i cijenu.' },
  ],
  sections: [
    { title: 'Zašto Listica pomaže.', text: 'Gosti ne moraju zvati i pitati, a roditelji ne moraju svakome posebno odgovarati. Dijete dobije ono što želi, a ne pet istih kockica.' },
    { title: 'Ista Listica, svake godine.', text: 'Za sljedeći rođendan napravi novu Listicu u istom profilu, a stare ostaju kao uspomena na to što je dijete željelo.' },
  ],
  faq: [
    { q: 'Je li rođendanska Listica besplatna?', a: 'Da, za roditelje i za goste. Pokloni se kupuju u dućanu, po cijeni dućana.' },
    { q: 'Moraju li se roditelji gostiju registrirati?', a: 'Ne. Otvore link, odaberu poklon i upišu ime.' },
    { q: 'Mogu li imati više Listica, za svako dijete posebno?', a: 'Da. U istom profilu možeš imati Listice za više djece i više prigoda.' },
    { q: 'Mogu li zaključati Listicu nakon rođendana?', a: 'Da. U postavkama Listice je zaključaš i više je ne otvara ni link ni pretraga po imenu.' },
  ],
}

export default function Page() {
  return <TopicPage content={CONTENT} />
}
