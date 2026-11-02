import type { Category, Product } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

async function getJson<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } })
    return res.ok ? ((await res.json()) as T) : fallback
  } catch {
    return fallback
  }
}

export const getFeaturedProducts = () => getJson<Product[]>('/products/featured', [])
export const getCategories = () => getJson<Category[]>('/products/categories', [])
export const getPublicSettings = () => getJson<{ heroImage: string | null }>('/public/settings', { heroImage: null })
