import express, { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { adminAuthMiddleware } from '../middleware/auth'
import { firstIssue, isUniqueViolation } from '../utils/validation'

/** Public blog: published posts only. Images are served from the database with a long cache. */
export const blogRouter = Router()

// [[proizvod:<id>]] in a post embeds that catalog product.
const PRODUCT_EMBED = /\[\[proizvod:([a-z0-9]{10,40})\]\]/gi

const listFields = { id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true, updatedAt: true } as const

blogRouter.get('/', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '24'), 10) || 24))
    const posts = await prisma.blogPost.findMany({
      where: { published: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      select: listFields,
      take: limit,
    })
    res.set('Cache-Control', 'public, max-age=60').json(posts)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

blogRouter.get('/images/:id', async (req, res) => {
  try {
    const image = await prisma.blogImage.findUnique({ where: { id: req.params.id } })
    if (!image) return res.status(404).end()
    res.set('Content-Type', image.mime)
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.end(Buffer.from(image.data))
  } catch { res.status(500).end() }
})

blogRouter.get('/:slug', async (req, res) => {
  try {
    const post = await prisma.blogPost.findFirst({ where: { slug: req.params.slug, published: true, publishedAt: { lte: new Date() } } })
    if (!post) return res.status(404).json({ error: 'Članak nije pronađen' })
    const ids = [...new Set([...post.content.matchAll(PRODUCT_EMBED)].map(m => m[1]))].slice(0, 30)
    const products = ids.length
      ? await prisma.product.findMany({ where: { id: { in: ids } }, include: { category: true } })
      : []
    res.set('Cache-Control', 'public, max-age=60').json({ ...post, products })
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

/** Admin side: write, publish, upload images. Mounted at /api/admin/blog. */
export const adminBlogRouter = Router()
adminBlogRouter.use(adminAuthMiddleware)

// Images arrive base64-encoded in JSON, so this router gets a bigger body limit than the rest of the API.
adminBlogRouter.use(express.json({ limit: '12mb' }))

const SLUG_MAP: Record<string, string> = { č: 'c', ć: 'c', đ: 'd', š: 's', ž: 'z' }
export function slugify(text: string) {
  return text
    .toLocaleLowerCase('hr-HR')
    .replace(/[čćđšž]/g, ch => SLUG_MAP[ch])
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'clanak'
}

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = base
  for (let i = 2; ; i++) {
    const taken = await prisma.blogPost.findFirst({ where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } })
    if (!taken) return slug
    slug = `${base}-${i}`
  }
}

const postSchema = z.object({
  title: z.string().trim().min(3, 'Naslov mora imati najmanje 3 znaka').max(200),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(400).nullable().optional(),
  content: z.string().max(200_000),
  coverImage: z.string().trim().max(1000).nullable().optional(),
  published: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  seoTitle: z.string().trim().max(120).nullable().optional(),
  seoDescription: z.string().trim().max(300).nullable().optional(),
})

adminBlogRouter.get('/', async (_req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: [{ published: 'asc' }, { updatedAt: 'desc' }],
      select: { ...listFields, published: true, createdAt: true },
    })
    res.json(posts)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

adminBlogRouter.get('/:id', async (req, res) => {
  try {
    const post = await prisma.blogPost.findUnique({ where: { id: req.params.id } })
    if (!post) return res.status(404).json({ error: 'Članak nije pronađen' })
    res.json(post)
  } catch { res.status(500).json({ error: 'Greška na serveru' }) }
})

function postData(data: z.infer<typeof postSchema>) {
  const published = data.published ?? false
  return {
    title: data.title,
    excerpt: data.excerpt || null,
    content: data.content,
    coverImage: data.coverImage || null,
    published,
    // Publishing without a date means "now"; a future date schedules the post.
    publishedAt: published ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : data.publishedAt ? new Date(data.publishedAt) : null,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
  }
}

adminBlogRouter.post('/', async (req, res) => {
  try {
    const data = postSchema.parse(req.body)
    const slug = await uniqueSlug(slugify(data.slug || data.title))
    const post = await prisma.blogPost.create({ data: { ...postData(data), slug } })
    res.status(201).json(post)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

adminBlogRouter.patch('/:id', async (req, res) => {
  try {
    const data = postSchema.parse(req.body)
    const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id }, select: { id: true, publishedAt: true, published: true } })
    if (!existing) return res.status(404).json({ error: 'Članak nije pronađen' })
    const slug = await uniqueSlug(slugify(data.slug || data.title), existing.id)
    const fields = postData(data)
    // Keep the original publication date when an already published post is edited.
    if (fields.published && existing.published && existing.publishedAt && !data.publishedAt) fields.publishedAt = existing.publishedAt
    const post = await prisma.blogPost.update({ where: { id: existing.id }, data: { ...fields, slug } })
    res.json(post)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: firstIssue(err) })
    if (isUniqueViolation(err)) return res.status(409).json({ error: 'Taj link već ima drugi članak' })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})

adminBlogRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.blogPost.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch { res.status(404).json({ error: 'Članak nije pronađen' }) }
})

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

adminBlogRouter.post('/images', async (req, res) => {
  try {
    const { data, mime } = z.object({ data: z.string().min(10), mime: z.string() }).parse(req.body)
    if (!IMAGE_TYPES.has(mime)) return res.status(400).json({ error: 'Dozvoljene su slike JPG, PNG, WebP i GIF' })
    const buffer = Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64')
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'Slika je veća od 8 MB' })
    const image = await prisma.blogImage.create({ data: { mime, data: buffer, size: buffer.length }, select: { id: true } })
    res.status(201).json({ id: image.id, url: `/blog/images/${image.id}` })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Neispravna slika' })
    res.status(500).json({ error: 'Greška na serveru' })
  }
})
