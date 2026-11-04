import axios from 'axios'
import type { CatalogFacets, Priority } from '@/types'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    // Only an expired/invalid session should log the user out — not a 401 from a public call.
    const hadToken = typeof window !== 'undefined' && !!localStorage.getItem('token')
    if (err.response?.status === 401 && hadToken) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.startsWith('/prijava')) window.location.href = '/prijava'
    }
    return Promise.reject(err)
  }
)

export default api

export function apiError(err: unknown, fallback = 'Nešto je pošlo po krivu. Pokušaj ponovno.') {
  const anyErr = err as { response?: { data?: { error?: string } } }
  return anyErr?.response?.data?.error || fallback
}

export function addRefToUrl(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('ref', 'bebinalista')
    u.searchParams.set('utm_source', 'bebinalista')
    u.searchParams.set('utm_medium', 'wishlist')
    return u.toString()
  } catch {
    return url
  }
}

export const authApi = {
  register: (data: { email: string; password: string; name: string; dueDate?: string; babyGender?: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  googleLogin: (credential: string) =>
    api.post('/auth/google', { credential }),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; dueDate?: string | null; babyGender?: string | null }) =>
    api.patch('/auth/profile', data),
  deleteAccount: () => api.delete('/auth/account'),
}

export interface CustomProductInput {
  name: string
  price?: number
  imageUrl?: string
  productUrl?: string
  description?: string
  shopName?: string
}

export const listsApi = {
  getAll: () => api.get('/lists'),
  getOne: (id: string) => api.get(`/lists/${id}`),
  create: (data: { name: string; occasion?: string; description?: string; isPublic?: boolean }) =>
    api.post('/lists', data),
  update: (id: string, data: { name?: string; occasion?: string | null; description?: string | null; isPublic?: boolean }) =>
    api.patch(`/lists/${id}`, data),
  delete: (id: string) => api.delete(`/lists/${id}`),
  addItem: (listId: string, productId: string, priority: Priority = 'MEDIUM', note?: string) =>
    api.post(`/lists/${listId}/items`, { productId, priority, note }),
  addCustomItem: (listId: string, customProduct: CustomProductInput, priority: Priority = 'MEDIUM', note?: string) =>
    api.post(`/lists/${listId}/items`, { customProduct, priority, note }),
  updateItem: (listId: string, itemId: string, data: { priority?: Priority; note?: string | null }) =>
    api.patch(`/lists/${listId}/items/${itemId}`, data),
  removeItem: (listId: string, itemId: string) =>
    api.delete(`/lists/${listId}/items/${itemId}`),
  clearReservation: (listId: string, itemId: string) =>
    api.delete(`/lists/${listId}/items/${itemId}/reservation`),
  smartPaste: (url: string) =>
    api.post('/lists/smart-paste', { url }),
}

export interface ProductFilters {
  q?: string; categoryId?: string; categorySlug?: string; shopSlug?: string
  /** Brand names joined with "|". */
  brand?: string
  onSale?: '1'
  minPrice?: number; maxPrice?: number
}

export const productsApi = {
  getAll: (params?: ProductFilters & { page?: number; limit?: number; sortBy?: string }) => api.get('/products', { params }),
  getFacets: (params?: ProductFilters) => api.get<CatalogFacets>('/products/facets', { params }),
  getOne: (id: string) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getFeatured: () => api.get('/products/featured'),
}

export const publicApi = {
  getList: (slug: string) => api.get(`/public/lista/${slug}`),
  getSettings: () => api.get<{ heroImage: string | null }>('/public/settings'),
  reserve: (slug: string, itemId: string, reservedBy: string, note?: string) =>
    api.post<{ ownerToken: string }>(`/public/lista/${slug}/rezerviraj/${itemId}`, { reservedBy, note }),
  reserveGroupBuy: (slug: string, itemId: string, data: { reservedBy: string; note?: string; isGroupBuy: true; targetAmount: number; amount: number; role: 'ORDERER' | 'CONTRIBUTOR' }) =>
    api.post<{ ownerToken: string; contributorId: string }>(`/public/lista/${slug}/rezerviraj/${itemId}`, data),
  joinGroupBuy: (slug: string, itemId: string, data: { name: string; role: 'ORDERER' | 'CONTRIBUTOR'; amount: number; note?: string }) =>
    api.post<{ ownerToken: string; contributor: { id: string } }>(`/public/lista/${slug}/group/${itemId}/join`, data),
  leaveGroupBuy: (slug: string, itemId: string, contributorId: string, token: string) =>
    api.delete(`/public/lista/${slug}/group/${itemId}/leave/${contributorId}`, { data: { token } }),
  cancelReservation: (slug: string, itemId: string, token: string) =>
    api.delete(`/public/lista/${slug}/rezerviraj/${itemId}`, { data: { token } }),
  setReservationStatus: (slug: string, itemId: string, token: string, status: 'RESERVED' | 'PURCHASED') =>
    api.patch(`/public/lista/${slug}/rezerviraj/${itemId}/status`, { token, status }),
}

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getShops: () => api.get('/admin/shops'),
  toggleShop: (slug: string) => api.patch(`/admin/shops/${slug}/toggle`),
  triggerScrape: (slug: string) => api.post(`/admin/shops/${slug}/scrape`),
  getUsers: (params?: { page?: number; q?: string }) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  setUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  getFeatured: () => api.get('/admin/featured'),
  addFeatured: (productId: string) => api.post('/admin/featured', { productId }),
  removeFeatured: (id: string) => api.delete(`/admin/featured/${id}`),
  getSettings: () => api.get('/admin/settings'),
  setSetting: (key: string, value: string) => api.put(`/admin/settings/${key}`, { value }),
  getProducts: (params?: { page?: number; q?: string; shop?: string }) =>
    api.get('/admin/products', { params }),
  getCategoryMappings: () => api.get('/admin/category-mappings'),
  createCategoryMapping: (data: { externalName: string; shopSlug?: string; categoryId: string }) =>
    api.post('/admin/category-mappings', data),
  deleteCategoryMapping: (id: string) => api.delete(`/admin/category-mappings/${id}`),
  getUnmappedCategories: () => api.get('/admin/unmapped-categories'),
  getCategories: () => api.get('/admin/categories'),
}

export const searchApi = {
  findLists: (q: string) => api.get('/public/pretraga', { params: { q } }),
}
