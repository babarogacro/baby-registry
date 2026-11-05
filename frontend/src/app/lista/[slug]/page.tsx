import { cache } from 'react'
import type { Metadata } from 'next'
import PublicListClient from './PublicListClient'
import type { BabyList } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

type ListResult = { list: BabyList; error: null } | { list: null; error: string }

const getList = cache(async (slug: string): Promise<ListResult> => {
  try {
    const res = await fetch(`${API_URL}/public/lista/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (res.ok) return { list: await res.json(), error: null }
    const body = await res.json().catch(() => ({}))
    return { list: null, error: body.error || 'Listica nije pronađena' }
  } catch {
    return { list: null, error: 'Listica trenutno nije dostupna. Pokušaj ponovno za trenutak.' }
  }
})

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { list } = await getList(slug)
  // Lists contain names and due dates of private people; keep them out of search engines.
  const robots = { index: false, follow: false }
  if (!list) return { title: 'Listica nije pronađena | Listica', robots }

  const total = list.items.length
  const available = list.items.filter(i => !i.reservation).length
  const shareTitle = list.childName ? `Listica želja za ${list.childName}` : list.name
  const description = `Listica od ${list.user?.name || 'budućih roditelja'}: ${total} poklona, ${available} slobodno. Odaberi poklon i rezerviraj ga, da se pokloni ne ponavljaju.`

  // The share image itself comes from ./opengraph-image.tsx (list colour and the child's name).
  return {
    title: `${list.name} | Listica`,
    description,
    robots,
    openGraph: {
      title: shareTitle,
      description,
      siteName: 'Listica',
      type: 'website',
      locale: 'hr_HR',
      url: `/lista/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
    },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const { list, error } = await getList(slug)
  return <PublicListClient slug={slug} initialList={list} initialError={error} />
}
