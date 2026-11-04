import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pronađi listu | Bebina Lista',
  description: 'Upiši ime i prezime roditelja ili naziv liste, pogledaj što je još slobodno i rezerviraj poklon.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
