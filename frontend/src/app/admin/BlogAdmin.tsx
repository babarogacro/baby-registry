'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import Modal from '@/components/Modal'
import BlogContent from '@/components/BlogContent'
import { adminApi, apiError, productsApi } from '@/lib/api'
import { blogDate, blogImageUrl } from '@/lib/blog'
import { formatPrice } from '@/lib/format'
import type { BlogPost, Product } from '@/types'
import { ArrowLeft, Bold, Eye, Heading2, Heading3, ImagePlus, Link2, List, Loader2, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Draft {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  published: boolean
  publishedAt: string // datetime-local value, Zagreb time
  seoTitle: string
  seoDescription: string
}

const EMPTY: Draft = { title: '', slug: '', excerpt: '', content: '', coverImage: '', published: false, publishedAt: '', seoTitle: '', seoDescription: '' }

const toLocalInput = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Big phone photos are shrunk in the browser before upload, so the database stays small. */
async function prepareImage(file: File): Promise<{ data: string; mime: string }> {
  const read = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  if (file.type === 'image/gif') return { data: await read(file), mime: file.type }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('canvas'))), 'image/webp', 0.85))
  return { data: await read(blob), mime: 'image/webp' }
}

function status(post: { published: boolean; publishedAt?: string | null }) {
  if (!post.published) return { label: 'Skica', cls: 'bg-sunken text-muted' }
  if (post.publishedAt && new Date(post.publishedAt) > new Date()) return { label: 'Zakazano', cls: 'bg-sun-soft text-sun-ink' }
  return { label: 'Objavljeno', cls: 'bg-mint-soft text-mint-ink' }
}

function ProductPicker({ onPick, onClose }: { onPick: (p: Product) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Product[]>([])
  useEffect(() => {
    const t = setTimeout(() => {
      productsApi.getAll({ q: q || undefined, limit: 8 }).then(r => setResults(r.data.products)).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [q])
  return (
    <Modal title="Ubaci proizvod" onClose={onClose}>
      <div className="px-5 pb-6 sm:px-6">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" autoFocus placeholder="Pretraži katalog..." value={q} onChange={e => setQ(e.target.value)} className="field !pl-10" aria-label="Pretraži katalog" />
        </div>
        <ul className="space-y-2">
          {results.map(p => (
            <li key={p.id}>
              <button onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-xl bg-white object-contain" /> : <span className="h-12 w-12 rounded-xl bg-sunken" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted">{formatPrice(p.price, p.currency)} · {p.shopName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}

function Editor({ initial, onClose, onSaved, notify }: { initial: Draft; onClose: () => void; onSaved: () => void; notify: (m: string) => void }) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [slugTouched, setSlugTouched] = useState(!!initial.id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [previewProducts, setPreviewProducts] = useState<Product[]>([])
  const [picking, setPicking] = useState(false)
  const [uploading, setUploading] = useState<'cover' | 'inline' | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }))

  const autoSlug = (title: string) => title.toLocaleLowerCase('hr-HR').replace(/[čć]/g, 'c').replace(/đ/g, 'd').replace(/š/g, 's').replace(/ž/g, 'z')
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

  // Wraps the selection (or inserts at the cursor) so formatting works like in a normal editor.
  const insert = (before: string, after = '', placeholder = '') => {
    const el = textRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const selected = value.slice(s, e) || placeholder
    const next = value.slice(0, s) + before + selected + after + value.slice(e)
    set('content', next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + selected.length)
    })
  }
  const linePrefix = (prefix: string) => {
    const el = textRef.current
    if (!el) return
    const start = el.value.lastIndexOf('\n', el.selectionStart - 1) + 1
    set('content', el.value.slice(0, start) + prefix + el.value.slice(start))
    requestAnimationFrame(() => el.focus())
  }

  const upload = async (file: File, target: 'cover' | 'inline') => {
    setUploading(target); setError('')
    try {
      const { data, mime } = await prepareImage(file)
      const res = await adminApi.uploadBlogImage(data, mime)
      if (target === 'cover') set('coverImage', res.data.url)
      else insert(`\n![`, `](${res.data.url})\n`, 'opis slike')
    } catch (err) {
      setError(apiError(err, 'Slika se ne može učitati.'))
    } finally {
      setUploading(null)
    }
  }

  const showPreview = async () => {
    const ids = [...draft.content.matchAll(/\[\[proizvod:([a-z0-9]{10,40})\]\]/gi)].map(m => m[1])
    const found: Product[] = []
    for (const id of [...new Set(ids)].slice(0, 30)) {
      try { found.push((await productsApi.getOne(id)).data) } catch {}
    }
    setPreviewProducts(found)
    setPreview(true)
  }

  const save = async (publish: boolean) => {
    if (draft.title.trim().length < 3) { setError('Naslov mora imati najmanje 3 znaka'); return }
    setSaving(true); setError('')
    const body = {
      title: draft.title.trim(),
      slug: draft.slug.trim() || undefined,
      excerpt: draft.excerpt.trim() || null,
      content: draft.content,
      coverImage: draft.coverImage.trim() || null,
      published: publish,
      publishedAt: draft.publishedAt ? new Date(draft.publishedAt).toISOString() : null,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
    }
    try {
      const res = draft.id ? await adminApi.updateBlogPost(draft.id, body) : await adminApi.createBlogPost(body)
      setDraft(d => ({ ...d, id: res.data.id, slug: res.data.slug, published: res.data.published, publishedAt: toLocalInput(res.data.publishedAt) }))
      setSlugTouched(true)
      notify(publish ? 'Članak je objavljen' : 'Skica je spremljena')
      onSaved()
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const tools = [
    { label: 'Podnaslov', icon: <Heading2 size={16} />, run: () => linePrefix('## ') },
    { label: 'Manji podnaslov', icon: <Heading3 size={16} />, run: () => linePrefix('### ') },
    { label: 'Podebljano', icon: <Bold size={16} />, run: () => insert('**', '**', 'tekst') },
    { label: 'Link', icon: <Link2 size={16} />, run: () => insert('[', '](https://)', 'tekst linka') },
    { label: 'Popis', icon: <List size={16} />, run: () => linePrefix('- ') },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onClose} className="btn btn-sm btn-soft"><ArrowLeft size={15} aria-hidden /> Svi članci</button>
        <div className="flex flex-wrap gap-2">
          {draft.id && draft.published && <a href={`/blog/${draft.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-soft"><Eye size={15} aria-hidden /> Na webu</a>}
          <button onClick={() => save(false)} disabled={saving} className="btn btn-sm btn-soft">{draft.published ? 'Vrati u skicu' : 'Spremi skicu'}</button>
          <button onClick={() => save(true)} disabled={saving} className="btn btn-sm btn-primary">
            {saving && <Loader2 size={15} className="animate-spin" aria-hidden />} {draft.published ? 'Spremi i objavi' : 'Objavi'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="field-error rounded-2xl bg-tomato-soft p-3">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-4 p-5">
          <div>
            <label htmlFor="blog-title" className="field-label">Naslov</label>
            <input id="blog-title" value={draft.title} maxLength={200} className="field !text-lg !font-semibold"
              onChange={e => { set('title', e.target.value); if (!slugTouched) set('slug', autoSlug(e.target.value)) }} />
          </div>
          <div>
            <label htmlFor="blog-excerpt" className="field-label">Sažetak <span className="font-medium text-muted">(ispod naslova i na popisu članaka)</span></label>
            <textarea id="blog-excerpt" rows={2} maxLength={400} value={draft.excerpt} onChange={e => set('excerpt', e.target.value)} className="field resize-none" />
          </div>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="field-label !mb-0">Tekst</span>
              <div className="flex flex-wrap items-center gap-1">
                {tools.map(t => <button key={t.label} type="button" onClick={t.run} title={t.label} aria-label={t.label} className="icon-btn !h-9 !w-9">{t.icon}</button>)}
                <label title="Slika u tekstu" className="icon-btn !h-9 !w-9 cursor-pointer">
                  {uploading === 'inline' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                  <span className="sr-only">Slika u tekstu</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'inline'); e.target.value = '' }} />
                </label>
                <button type="button" onClick={() => setPicking(true)} title="Proizvod iz kataloga" aria-label="Proizvod iz kataloga" className="icon-btn !h-9 !w-9"><Package size={16} /></button>
                <button type="button" onClick={() => (preview ? setPreview(false) : showPreview())} className={clsx('btn btn-sm ml-1', preview ? 'btn-ink' : 'btn-soft')}>
                  {preview ? <><Pencil size={14} aria-hidden /> Uređuj</> : <><Eye size={14} aria-hidden /> Pregled</>}
                </button>
              </div>
            </div>
            {preview ? (
              <div className="min-h-[420px] rounded-2xl border border-line/10 p-5">
                <BlogContent content={draft.content} products={previewProducts} />
              </div>
            ) : (
              <textarea ref={textRef} rows={22} value={draft.content} onChange={e => set('content', e.target.value)}
                placeholder={'Piši kao u porukama. ## na početku retka je podnaslov, **tekst** je podebljano, - na početku retka je popis.\n\nGumb s kutijom ubacuje proizvod iz kataloga koji se može dodati na Listicu.'}
                className="field resize-y font-mono !text-[14px] leading-relaxed" />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card space-y-3 p-5">
            <p className="font-display text-lg font-extrabold tracking-tight">Naslovna slika</p>
            {draft.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blogImageUrl(draft.coverImage)} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover" />
            )}
            <label className="btn btn-sm btn-soft w-full cursor-pointer">
              {uploading === 'cover' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <ImagePlus size={15} aria-hidden />}
              {draft.coverImage ? 'Zamijeni sliku' : 'Učitaj sliku'}
              <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'cover'); e.target.value = '' }} />
            </label>
            {draft.coverImage && <button onClick={() => set('coverImage', '')} className="w-full text-xs font-semibold text-muted underline">Makni sliku</button>}
          </div>

          <div className="card space-y-3 p-5">
            <p className="font-display text-lg font-extrabold tracking-tight">Objava</p>
            <div>
              <label htmlFor="blog-slug" className="field-label">Link</label>
              <div className="flex items-center gap-1 text-sm text-muted">/blog/
                <input id="blog-slug" value={draft.slug} onChange={e => { setSlugTouched(true); set('slug', autoSlug(e.target.value)) }} className="field !min-h-[40px] !py-1.5 !text-sm" />
              </div>
            </div>
            <div>
              <label htmlFor="blog-date" className="field-label">Datum objave <span className="font-medium text-muted">(budući datum zakazuje)</span></label>
              <input id="blog-date" type="datetime-local" value={draft.publishedAt} onChange={e => set('publishedAt', e.target.value)} className="field !min-h-[40px] !py-1.5 !text-sm" />
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <p className="font-display text-lg font-extrabold tracking-tight">Google i dijeljenje</p>
            <div>
              <label htmlFor="blog-seo-title" className="field-label">Naslov za Google <span className="font-medium text-muted">({draft.seoTitle.length}/60)</span></label>
              <input id="blog-seo-title" maxLength={120} value={draft.seoTitle} placeholder={draft.title} onChange={e => set('seoTitle', e.target.value)} className="field !text-sm" />
            </div>
            <div>
              <label htmlFor="blog-seo-desc" className="field-label">Opis za Google <span className="font-medium text-muted">({draft.seoDescription.length}/155)</span></label>
              <textarea id="blog-seo-desc" rows={3} maxLength={300} value={draft.seoDescription} placeholder={draft.excerpt} onChange={e => set('seoDescription', e.target.value)} className="field resize-none !text-sm" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {picking && <ProductPicker key="pick" onClose={() => setPicking(false)} onPick={p => { setPicking(false); insert(`\n[[proizvod:${p.id}]]\n`) }} />}
      </AnimatePresence>
    </div>
  )
}

export default function BlogAdmin({ notify }: { notify: (message: string) => void }) {
  const [posts, setPosts] = useState<BlogPost[] | null>(null)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [deleting, setDeleting] = useState<BlogPost | null>(null)

  const load = useCallback(() => adminApi.getBlogPosts().then(r => setPosts(r.data)).catch(() => setPosts([])), [])
  useEffect(() => { load() }, [load])

  const open = async (id?: string) => {
    if (!id) { setEditing({ ...EMPTY }); return }
    try {
      const p: BlogPost = (await adminApi.getBlogPost(id)).data
      setEditing({
        id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt ?? '', content: p.content, coverImage: p.coverImage ?? '',
        published: p.published, publishedAt: toLocalInput(p.publishedAt), seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '',
      })
    } catch (err) { notify(apiError(err)) }
  }

  if (editing) return <Editor initial={editing} onClose={() => { setEditing(null); load() }} onSaved={load} notify={notify} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{posts ? `${posts.length} članaka` : 'Učitavam...'}</p>
        <button onClick={() => open()} className="btn btn-sm btn-primary"><Plus size={15} aria-hidden /> Novi članak</button>
      </div>
      {posts?.length === 0 && <p className="card p-8 text-center text-muted">Još nema članaka. Napiši prvi.</p>}
      <ul className="space-y-3">
        {posts?.map(post => {
          const st = status(post)
          return (
            <li key={post.id} className="card flex flex-wrap items-center gap-4 p-4">
              {post.coverImage
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={blogImageUrl(post.coverImage)} alt="" className="h-14 w-20 rounded-xl object-cover" />
                : <span className="h-14 w-20 rounded-xl bg-sunken" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{post.title}</p>
                <p className="text-xs text-muted">/blog/{post.slug} · {post.publishedAt ? blogDate(post.publishedAt) : 'bez datuma'}</p>
              </div>
              <span className={clsx('chip', st.cls)}>{st.label}</span>
              <div className="flex gap-2">
                <button onClick={() => open(post.id)} className="btn btn-sm btn-soft"><Pencil size={14} aria-hidden /> Uredi</button>
                <button onClick={() => setDeleting(post)} aria-label={`Obriši ${post.title}`} className="icon-btn text-muted hover:text-tomato-ink"><Trash2 size={16} aria-hidden /></button>
              </div>
            </li>
          )
        })}
      </ul>

      <AnimatePresence>
        {deleting && (
          <Modal key="del" title="Obrisati članak?" onClose={() => setDeleting(null)}>
            <div className="px-5 pb-6 sm:px-6">
              <p className="mb-5 text-muted">„{deleting.title}" nestaje s weba i ne može se vratiti.</p>
              <div className="flex gap-2">
                <button onClick={async () => {
                  try { await adminApi.deleteBlogPost(deleting.id); notify('Članak je obrisan'); setDeleting(null); load() } catch (err) { notify(apiError(err)) }
                }} className="btn btn-sm btn-danger"><Trash2 size={15} aria-hidden /> Obriši</button>
                <button onClick={() => setDeleting(null)} className="btn btn-sm btn-soft">Odustani</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
