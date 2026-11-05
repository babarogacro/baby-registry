import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pronađi listu | Bebina Lista',
  description: 'Upiši puno ime i prezime roditelja ili djeteta, pogledaj što je još slobodno i rezerviraj poklon.',
  alternates: { canonical: '/pronadi-listu' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
