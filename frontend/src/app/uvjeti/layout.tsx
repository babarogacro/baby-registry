import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Uvjeti korištenja | Bebina Lista',
  description: 'Pravila korištenja Bebine Liste za roditelje i goste.',
  alternates: { canonical: '/uvjeti' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
