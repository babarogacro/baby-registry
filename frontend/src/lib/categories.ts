import type { ArtName } from '@/components/art'

export type Tone = 'tomato' | 'cobalt' | 'sun' | 'mint' | 'bubble' | 'sky'

/** Every top-level category owns a colour and a drawing, so the catalog reads at a glance. */
export const ROOT_CATEGORIES: { slug: string; tone: Tone; art: ArtName }[] = [
  { slug: 'kolica', tone: 'tomato', art: 'pram' },
  { slug: 'autosjedalice', tone: 'cobalt', art: 'carseat' },
  { slug: 'nosiljke', tone: 'bubble', art: 'carrier' },
  { slug: 'kod-kuce', tone: 'mint', art: 'crib' },
  { slug: 'hranjenje-njega', tone: 'sun', art: 'bottle' },
  { slug: 'igracke', tone: 'sky', art: 'rings' },
  { slug: 'odjeca', tone: 'tomato', art: 'bodysuit' },
  { slug: 'za-mame', tone: 'bubble', art: 'heart' },
]

const CHILD_TO_ROOT: Record<string, string> = {
  'kolica-kompleti': 'kolica',
  'kisobran-kolica': 'kolica',
  'kolica-za-dvojke': 'kolica',
  'dodaci-za-kolica': 'kolica',
  'baze-autosjedalice': 'autosjedalice',
  marame: 'nosiljke',
  'kreveti-vrtici': 'kod-kuce',
  madraci: 'kod-kuce',
  posteljina: 'kod-kuce',
  'oprema-za-previjanje': 'kod-kuce',
  'djecje-sjedalice': 'kod-kuce',
  'ljuljacke-hodalice': 'kod-kuce',
  kupanje: 'kod-kuce',
  hranjenje: 'hranjenje-njega',
  'dude-bocice': 'hranjenje-njega',
  dojenje: 'hranjenje-njega',
  'njega-kozmetika': 'hranjenje-njega',
  'igracke-bebe': 'igracke',
  'plisane-igracke': 'igracke',
  'edukativne-igracke': 'igracke',
  knjige: 'igracke',
  'obuca-za-bebe': 'odjeca',
}

export function categoryMeta(slug?: string) {
  const root = slug ? CHILD_TO_ROOT[slug] ?? slug : undefined
  return ROOT_CATEGORIES.find(c => c.slug === root) ?? { slug: '', tone: 'sky' as Tone, art: 'gift' as ArtName }
}

/** The curated order instead of alphabetical: the big purchases come first. */
export function sortRootCategories<T extends { slug: string }>(categories: T[]) {
  const order = (slug: string) => {
    const i = ROOT_CATEGORIES.findIndex(c => c.slug === slug)
    return i === -1 ? ROOT_CATEGORIES.length : i
  }
  return [...categories].sort((a, b) => order(a.slug) - order(b.slug))
}
