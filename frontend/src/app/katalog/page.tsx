import { Suspense } from 'react'
import type { Metadata } from 'next'
import KatalogClient from './KatalogClient'

export const metadata: Metadata = {
  title: 'Katalog | Bebina Lista',
  description: 'Tisuće proizvoda za bebe iz hrvatskih dućana na jednom mjestu: kolica, autosjedalice, nosiljke, igračke i još mnogo toga. Filtriraj po dućanu, kategoriji, brendu i cijeni.',
}

export default function KatalogPage() {
  return (
    <Suspense>
      <KatalogClient />
    </Suspense>
  )
}
