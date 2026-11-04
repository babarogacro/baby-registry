import type { ArtName } from '@/components/art'

export const OCCASIONS: { value: string; art: ArtName; tone: string; label: string; dateLabel: string }[] = [
  { value: 'birth', art: 'pram', tone: 'tomato', label: 'Rođenje', dateLabel: 'Planirani termin poroda' },
  { value: 'birthday', art: 'gift', tone: 'sky', label: 'Dječji rođendan', dateLabel: 'Datum rođendana' },
]

export const GENDERS = [
  { value: 'boy', label: 'Dječak' },
  { value: 'girl', label: 'Djevojčica' },
  { value: 'surprise', label: 'Iznenađenje' },
]

export const genderLabel = (value?: string | null) => GENDERS.find(g => g.value === value)?.label
