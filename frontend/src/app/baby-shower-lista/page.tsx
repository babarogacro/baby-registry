import type { Metadata } from 'next'
import TopicPage, { type TopicContent } from '@/components/TopicPage'

export const metadata: Metadata = {
  title: 'Lista za baby shower: pokloni bez ponavljanja | Listica',
  description: 'Pošalji listu želja uz pozivnicu za baby shower. Gosti vide što je već rezervirano i donesu ono što ti stvarno treba. Besplatno.',
  alternates: { canonical: '/baby-shower-lista' },
}

const CONTENT: TopicContent = {
  path: '/baby-shower-lista',
  eyebrow: 'Za baby shower',
  title: 'Lista za baby shower',
  lead: 'Na baby shower svi dolaze s poklonom, a malo tko zna što već imaš. Pošalji Listicu uz pozivnicu i svatko će donijeti nešto što ti stvarno treba, bez tri ista bodija.',
  tone: 'mint',
  art: 'heart',
  registerHref: '/registracija?occasion=birth',
  steps: [
    { title: 'Složi Listicu prije pozivnica.', text: 'Upiši što ti treba za bebu i označi što ti je najvažnije. Može iz kataloga ili linkom iz bilo kojeg web shopa.' },
    { title: 'Stavi QR kod na pozivnicu.', text: 'Uz Listicu dobiješ QR kod koji možeš otisnuti na pozivnicu ili poslati sliku pozivnice u grupu.' },
    { title: 'Gosti rezerviraju prije zabave.', text: 'Svatko vidi što je već zauzeto i odabere nešto drugo, pa na zabavu stignu različiti pokloni.' },
  ],
  ideasTitle: 'Što se najčešće donosi.',
  ideas: [
    { label: 'Bodiji i pidžame', text: 'Napiši veličine 56, 62 i 68, da sve ne bude u istoj.', href: '/katalog?kategorija=odjeca' },
    { label: 'Deke i povoji', text: 'Mekane deke, muslinske pelene i vreće za spavanje.' },
    { label: 'Njega i kupanje', text: 'Kozmetika za bebe, ručnici s kapuljačom i toplomjer.', href: '/katalog?kategorija=hranjenje-njega' },
    { label: 'Prve igračke', text: 'Zvečke, grizalice i igračke za kolica.', href: '/katalog?kategorija=igracke' },
    { label: 'Veći poklon od cijelog društva', text: 'Kolica ili autosjedalica: gosti skupe zajedno, svatko upiše svoj dio.' },
    { label: 'Nešto za mamu', text: 'Jastuk za dojenje ili ugodna odjeća za prve tjedne.', href: '/katalog?kategorija=za-mame' },
  ],
  sections: [
    { title: 'Kad poslati pozivnice s Listicom.', text: 'Tri do četiri tjedna prije baby showera. Gosti tako imaju vremena naručiti, a ti stigneš dopuniti Listicu ako nešto već stigne.' },
  ],
  faq: [
    { q: 'Je li Listica za baby shower besplatna?', a: 'Da. Listica ništa ne naplaćuje ni tebi ni gostima; pokloni se kupuju u dućanu.' },
    { q: 'Kako gosti dođu do Listice?', a: 'Preko linka ili QR koda s pozivnice. Ne trebaju se registrirati.' },
    { q: 'Može li više gostiju kupiti jedan veći poklon?', a: 'Da. Jedan gost pokrene skupljanje, ostali upišu koliko daju, a skupi se najviše onoliko koliko poklon košta.' },
  ],
}

export default function Page() {
  return <TopicPage content={CONTENT} />
}
