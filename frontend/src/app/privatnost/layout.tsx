import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politika privatnosti | Listica',
  description: 'Koje podatke Listica prikuplja, zašto, koliko ih čuva i kako ih možeš obrisati.',
  alternates: { canonical: '/privatnost' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
