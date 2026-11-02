'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Heart, ExternalLink } from 'lucide-react'
import { Product } from '@/types'
import { addRefToUrl } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import clsx from 'clsx'

interface ProductCardProps {
  product: Product
  onAddToList?: (product: Product) => void
  isOnList?: boolean
}

export default function ProductCard({ product, onAddToList, isOnList }: ProductCardProps) {
  const [imgError, setImgError] = useState(false)
  const shopUrl = addRefToUrl(product.productUrl)

  return (
    <article className="product-card bg-white rounded-3xl overflow-hidden border border-blush/30 flex flex-col">
      <a href={shopUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="relative block bg-cream overflow-hidden aspect-square">
        {product.imageUrl && !imgError ? (
          <Image src={product.imageUrl} alt="" fill className="object-contain p-3" onError={() => setImgError(true)}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-5xl opacity-20">🍼</span>
        )}
        {!product.inStock && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-warm-gray/80 text-white text-xs rounded-full">Nedostupno</span>
        )}
      </a>

      <div className="flex flex-col p-4 flex-1">
        {product.category && <span className="text-xs text-warm-gray/70 mb-1">{product.category.name}</span>}
        <h3 className="text-sm font-medium text-charcoal line-clamp-2 leading-snug mb-2 flex-1">{product.name}</h3>
        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-base font-medium text-charcoal">{formatPrice(product.price, product.currency)}</span>
          <span className="text-xs text-warm-gray/70 truncate">{product.shopName}</span>
        </div>
        <div className="flex gap-2 mt-3">
          {onAddToList && (
            <button onClick={() => onAddToList(product)} aria-pressed={isOnList}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-medium transition-colors',
                isOnList ? 'bg-rose/10 text-rose border border-rose/20' : 'bg-blush/40 text-charcoal hover:bg-blush border border-transparent')}>
              <Heart size={12} className={isOnList ? 'fill-rose' : ''} />
              {isOnList ? 'Na listi' : 'Dodaj'}
            </button>
          )}
          <a href={shopUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium bg-sage-light/60 text-sage hover:bg-sage-light transition-colors">
            <ExternalLink size={11} /> Pogledaj
          </a>
        </div>
      </div>
    </article>
  )
}
