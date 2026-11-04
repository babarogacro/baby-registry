import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registracija | Bebina Lista',
  description: 'Besplatna registracija. Napravi listu želja za bebu ili dječji rođendan i pošalji je obitelji i prijateljima jednim linkom.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
