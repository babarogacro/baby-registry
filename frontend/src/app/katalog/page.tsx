import { Suspense } from 'react'
import type { Metadata } from 'next'
import KatalogClient from './KatalogClient'

export const metadata: Metadata = {
  title: 'Katalog proizvoda — Bebina Lista',
  description: 'Pretraži tisuće proizvoda za bebe iz hrvatskih shopova: kolica, autosjedalice, nosiljke, igračke i još mnogo toga.',
}

export default function KatalogPage() {
  return (
    <Suspense>
      <KatalogClient />
    </Suspense>
  )
}
