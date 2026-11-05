'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AnimatePresence } from 'motion/react'
import ProductCard from '@/components/ProductCard'
import AddToListModal from '@/app/katalog/AddToListModal'
import { Toast, useToast } from '@/components/Toast'
import { listsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { blogImageUrl, splitBlogContent } from '@/lib/blog'
import type { BabyList, Product } from '@/types'

/**
 * An article: Markdown (no raw HTML, so nothing an author pastes can run scripts),
 * with [[proizvod:<id>]] turned into a product card that can go straight onto a list.
 */
export default function BlogContent({ content, products }: { content: string; products: Product[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loadFromStorage } = useAuthStore()
  const [lists, setLists] = useState<BabyList[] | null>(null)
  const [adding, setAdding] = useState<Product | null>(null)
  const [onList, setOnList] = useState<Set<string>>(new Set())
  const { toast, showToast } = useToast()
  const byId = new Map(products.map(p => [p.id, p]))

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  const addToList = async (product: Product) => {
    if (!user) { router.push(`/prijava?next=${encodeURIComponent(pathname)}`); return }
    if (!lists) {
      try { setLists((await listsApi.getAll()).data) } catch { setLists([]) }
    }
    setAdding(product)
  }

  return (
    <>
      <div className="blog-prose">
        {splitBlogContent(content).map((segment, i) => {
          if (segment.kind === 'markdown') {
            return (
              <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @next/next/no-img-element
                  img: ({ src, alt }) => <img src={blogImageUrl(typeof src === 'string' ? src : '')} alt={alt ?? ''} loading="lazy" />,
                  a: ({ href, children }) => {
                    const external = !!href && /^https?:\/\//.test(href)
                    return <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>
                  },
                }}>
                {segment.text}
              </ReactMarkdown>
            )
          }
          const product = byId.get(segment.id)
          if (!product) return null
          return (
            <div key={i} className="not-prose my-8 max-w-[280px]">
              <ProductCard product={product} from="blog" onAddToList={addToList} isOnList={onList.has(product.id)} />
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {adding && lists && (
          <AddToListModal key="add" product={adding} lists={lists} onClose={() => setAdding(null)}
            onAdded={msg => {
              setOnList(prev => new Set(prev).add(adding.id))
              setAdding(null)
              showToast(msg)
            }} />
        )}
      </AnimatePresence>
      <Toast message={toast} />
    </>
  )
}
