import type { Metadata } from 'next'
import TopicPage, { type TopicContent } from '@/components/TopicPage'

export const metadata: Metadata = {
  title: 'Lista želja za bebu: besplatna, bez duplih poklona | Listica',
  description: 'Napravi besplatnu listu želja za bebu, pošalji link obitelji i prijateljima i izbjegni duple poklone. Gosti vide što je već rezervirano i kupuju u dućanu.',
  alternates: { canonical: '/lista-zelja-za-bebu' },
}

const CONTENT: TopicContent = {
  path: '/lista-zelja-za-bebu',
  eyebrow: 'Za rođenje djeteta',
  title: 'Lista želja za bebu',
  lead: 'Kad se beba najavi, svi pitaju isto: što ti fali, da ne kupim nešto što već imaš? Listica želja odgovori umjesto tebe. Upišeš što ti treba, pošalješ link, a obitelj i prijatelji vide što je još slobodno.',
  tone: 'bubble',
  art: 'pram',
  registerHref: '/registracija?occasion=birth',
  steps: [
    { title: 'Upiši što ti treba.', text: 'Biraj iz kataloga hrvatskih dućana ili zalijepi link iz bilo kojeg web shopa. Kod svakog poklona označi koliko ti je važan i dopiši veličinu ili boju.' },
    { title: 'Pošalji link.', text: 'Pošalji ga u obiteljsku grupu na WhatsAppu ili Viberu, ili stavi QR kod na pozivnicu za baby shower.' },
    { title: 'Gosti rezerviraju.', text: 'Gost klikne Rezerviraj i upiše ime. Svi ostali odmah vide da je poklon zauzet, a kupuje se izravno u dućanu.' },
  ],
  ideasTitle: 'Što staviti na Listicu.',
  ideas: [
    { label: 'Kolica i autosjedalica', text: 'Najveći troškovi. Dobri su za skupljanje zajedno, kad više ljudi da svoj dio.', href: '/katalog?kategorija=kolica' },
    { label: 'Spavanje', text: 'Krevetić ili kolijevka, madrac točne veličine, plahte i vreća za spavanje.', href: '/katalog?kategorija=kod-kuce' },
    { label: 'Hranjenje', text: 'Bočice, sterilizator i grijač, a kasnije hranilica i pribor za prve obroke.', href: '/katalog?kategorija=hranjenje-njega' },
    { label: 'Kupanje i njega', text: 'Kadica, ručnici s kapuljačom, toplomjer i kozmetika za bebe.', href: '/katalog?kategorija=hranjenje-njega' },
    { label: 'Odjeća u pravim veličinama', text: 'Bodiji i pidžame u veličini 56, 62 i 68, da sve ne stigne u istoj.', href: '/katalog?kategorija=odjeca' },
    { label: 'Nosiljka i igračke', text: 'Nosiljka ili marama, podloga za igru i prve igračke za hvatanje.', href: '/katalog?kategorija=nosiljke' },
  ],
  sections: [
    { title: 'Kad poslati Listicu.', text: 'Najbolje oko 30. tjedna trudnoće, prije baby showera i prije nego što te počnu pitati. Listica se može mijenjati i nakon slanja: link ostaje isti, a gosti uvijek vide trenutno stanje.' },
    { title: 'Skuplji pokloni, zajedno.', text: 'Za kolica ili autosjedalicu jedan gost pokrene skupljanje, a ostali upišu koliko daju. Novac ne ide preko stranice: svatko svoj dio daje osobi koja naručuje poklon, a skupi se najviše onoliko koliko poklon košta.' },
  ],
  faq: [
    { q: 'Je li lista želja za bebu besplatna?', a: 'Da, za roditelje i za goste. Listica ništa ne prodaje: pokloni se kupuju u dućanu, po cijeni dućana.' },
    { q: 'Moraju li se gosti registrirati?', a: 'Ne. Gost otvori link, odabere poklon, upiše ime i klikne Rezerviraj.' },
    { q: 'Mogu li dodati proizvod iz bilo kojeg web shopa?', a: 'Da. Zalijepi link proizvoda i Listica sama povuče naziv, sliku i cijenu.' },
    { q: 'Mogu li mijenjati Listicu nakon što pošaljem link?', a: 'Da. Dodaješ i brišeš poklone kad god želiš, link ostaje isti, a gosti uvijek vide što je trenutno slobodno.' },
  ],
}

export default function Page() {
  return <TopicPage content={CONTENT} />
}
