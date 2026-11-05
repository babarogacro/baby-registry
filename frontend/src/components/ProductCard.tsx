'use client'
import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowUpRight, Check, Plus } from 'lucide-react'
import { Art } from '@/components/art'
import { Product } from '@/types'
import { outboundUrl, type OutboundSource } from '@/lib/analytics'
import { categoryMeta } from '@/lib/categories'
import { discountPercent, displayName, formatPrice } from '@/lib/format'
import clsx from 'clsx'

interface ProductCardProps {
  product: Product
  onAddToList?: (product: Product) => void
  isOnList?: boolean
  /** Position in the grid, for the staggered entrance. */
  index?: number
  /** Which page the card is on, so shop clicks can be counted per place. */
  from?: OutboundSource
}

export default function ProductCard({ product, onAddToList, isOnList, index, from = 'katalog' }: ProductCardProps) {
  const [imgError, setImgError] = useState(false)
  const [popped, setPopped] = useState(false)
  const wasOnList = useRef(isOnList)

  useEffect(() => {
    if (isOnList && !wasOnList.current) setPopped(true)
    wasOnList.current = isOnList
  }, [isOnList])

  const shopUrl = outboundUrl(product.id, from)
  const meta = categoryMeta(product.category?.slug)
  const discount = discountPercent(product)

  return (
    <article className={clsx(`tone-${meta.tone} group relative flex flex-col`, index !== undefined && 'card-in')}
      style={index !== undefined ? ({ '--i': index % 24 } as CSSProperties) : undefined}>
      <div className="photo-tile relative aspect-square overflow-hidden rounded-3xl">
        <a href={shopUrl} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden className="absolute inset-0 block">
          {product.imageUrl && !imgError ? (
            <Image src={product.imageUrl} alt="" fill onError={() => setImgError(true)}
              className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.06] sm:p-5"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
          ) : (
            <Art name={meta.art} className="absolute inset-[22%] opacity-90" />
          )}
        </a>
        {discount > 0 && <span className="sticker absolute left-2.5 top-2.5">−{discount} %</span>}
        {!product.inStock && <span className="chip absolute bottom-2.5 left-2.5 bg-coal text-white">Nedostupno</span>}
        {onAddToList && (
          <button onClick={() => onAddToList(product)} aria-pressed={isOnList}
            aria-label={isOnList ? `${displayName(product)} je na listi` : `Dodaj na listu: ${displayName(product)}`}
            title={isOnList ? 'Na listi' : 'Dodaj na listu'}
            className={clsx('absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full shadow-float transition-transform duration-200 hover:scale-110 active:scale-90',
              isOnList ? 'bg-coal text-white' : 'bg-mint text-coal')}>
            {isOnList
              ? <Check size={20} strokeWidth={3} aria-hidden className={clsx(popped && 'pop')} onAnimationEnd={() => setPopped(false)} />
              : <Plus size={22} strokeWidth={3} aria-hidden />}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3">
        {product.brand && <p className="text-[13px] font-bold text-tone-ink">{product.brand}</p>}
        <h3 className="line-clamp-2 font-sans text-[15px] font-medium leading-snug tracking-normal text-ink">
          <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="hover:underline hover:decoration-2 hover:underline-offset-2">{displayName(product)}</a>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="font-display text-lg font-extrabold leading-none tabular-nums tracking-tight">
            {formatPrice(product.price, product.currency)}
            {discount > 0 && product.originalPrice && (
              <span className="mt-1 block font-sans text-xs font-medium tracking-normal text-muted line-through">{formatPrice(product.originalPrice, product.currency)}</span>
            )}
          </p>
          <a href={shopUrl} target="_blank" rel="noopener noreferrer"
            className="flex flex-shrink-0 items-center gap-0.5 rounded-full py-1 text-xs font-semibold text-muted transition-colors hover:text-ink">
            {product.shopName}<ArrowUpRight size={13} aria-hidden className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span className="sr-only"> (otvara se u novoj kartici)</span>
          </a>
        </div>
      </div>
    </article>
  )
}
