import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Moje liste | Bebina Lista', robots: { index: false } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
