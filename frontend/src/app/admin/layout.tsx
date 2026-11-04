import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin | Bebina Lista', robots: { index: false } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
