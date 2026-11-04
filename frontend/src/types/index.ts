export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type ReservationStatus = 'RESERVED' | 'PURCHASED'
export type BabyGender = 'boy' | 'girl' | 'surprise'
export type Occasion = 'birth' | 'birthday' | 'other'
export type Role = 'USER' | 'ADMIN'
export type ContributorRole = 'ORDERER' | 'CONTRIBUTOR'

export interface User {
  id: string
  email: string
  name: string
  dueDate?: string
  babyGender?: BabyGender
  role: Role
  createdAt?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId?: string
  parent?: Category
  children?: Category[]
  _count?: { products: number }
  totalCount?: number
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number | null
  currency: string
  brand?: string | null
  imageUrl?: string
  productUrl: string
  sku?: string
  inStock: boolean
  shopName: string
  shopSlug: string
  categoryId?: string
  category?: Category
  lastScraped: string
  createdAt: string
}

export interface GroupContributor {
  id: string
  reservationId: string
  name: string
  role: ContributorRole
  amount: number
  note?: string
  createdAt: string
}

export interface Reservation {
  id: string
  listItemId: string
  reservedBy: string
  reservedAt: string
  status: ReservationStatus
  note?: string
  isGroupBuy?: boolean
  targetAmount?: number
  contributors?: GroupContributor[]
}

export interface SmartPasteResult {
  title: string
  imageUrl?: string
  description?: string
  price?: number
  shopName?: string
  productUrl: string
}

export interface CategoryMapping {
  id: string
  externalName: string
  shopSlug?: string
  categoryId: string
  category?: Category
  createdAt: string
}

export interface ListItem {
  id: string
  listId: string
  productId: string
  product: Product
  priority: Priority
  note?: string
  createdAt: string
  reservation?: Reservation
}

export interface BabyList {
  id: string
  userId: string
  user?: Pick<User, 'name' | 'dueDate' | 'babyGender'>
  name: string
  occasion?: Occasion
  description?: string
  shareSlug: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  items: ListItem[]
  _count?: { items: number }
}

export interface PaginatedProducts {
  products: Product[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface CatalogFacets {
  total: number
  shops: { slug: string; name: string; count: number }[]
  brands: { name: string; count: number }[]
  categories: Category[]
  priceBuckets: { from: number; to: number | null; count: number }[]
  onSale: number
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: Role
  dueDate?: string
  babyGender?: string
  createdAt: string
  _count: { lists: number }
}
