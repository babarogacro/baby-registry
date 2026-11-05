import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogContent from '@/components/BlogContent'
import { getBlogPost, getBlogPosts } from '@/lib/server'
import { blogDate, blogImageUrl, readingMinutes } from '@/lib/blog'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 60

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return { title: 'Članak nije pronađen | Listica', robots: { index: false } }
  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt || undefined
  const image = blogImageUrl(post.coverImage)
  return {
    title: `${title} | Listica`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title, description, type: 'article', locale: 'hr_HR', siteName: 'Listica', url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined, modifiedTime: post.updatedAt,
      ...(image && { images: [{ url: image, alt: post.title }] }),
    },
    twitter: { card: 'summary_large_image', title, description, ...(image && { images: [image] }) },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()
  const more = (await getBlogPosts(4)).filter(p => p.slug !== post.slug).slice(0, 3)
  const cover = blogImageUrl(post.coverImage)
  const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: cover || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: 'hr',
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    author: { '@type': 'Organization', name: 'Listica' },
    publisher: { '@type': 'Organization', name: 'Listica' },
  }

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in min-h-screen pb-16 pt-[92px]">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          <nav aria-label="Putanja" className="pt-8 text-sm">
            <Link href="/blog" className="inline-flex items-center gap-1.5 font-semibold text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden /> Blog</Link>
          </nav>
          <header className="py-6">
            <h1 className="display text-[2.4rem] leading-[1.02] sm:text-6xl">{post.title}</h1>
            <p className="mt-4 text-sm font-semibold text-muted">
              {blogDate(post.publishedAt)} · {readingMinutes(post.content)} min čitanja
            </p>
            {post.excerpt && <p className="mt-4 text-xl leading-snug text-muted">{post.excerpt}</p>}
          </header>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="mb-8 aspect-[16/9] w-full rounded-4xl object-cover" />
          )}
          <BlogContent content={post.content} products={post.products ?? []} />

          <aside className="mt-12 rounded-4xl bg-mint-soft p-6 sm:p-8">
            <p className="font-display text-2xl font-semibold tracking-tight">Napravi Listicu prije nego te krenu zivkati „što djetetu treba“.</p>
            <p className="mt-2 text-muted">Upiši točno ono što ti treba, pošalji link obitelji i prijateljima. Besplatno je.</p>
            <Link href="/registracija" className="btn btn-primary mt-5">Napravi Listicu</Link>
          </aside>
        </article>

        {more.length > 0 && (
          <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6" aria-labelledby="vise">
            <h2 id="vise" className="font-display text-2xl font-extrabold tracking-tight">Još s bloga</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-3">
              {more.map(p => (
                <li key={p.id}>
                  <Link href={`/blog/${p.slug}`} className="card block h-full p-5 transition-transform duration-200 hover:-translate-y-1">
                    <p className="text-[13px] font-semibold text-muted">{blogDate(p.publishedAt)}</p>
                    <p className="mt-1 font-display text-lg font-extrabold leading-tight tracking-tight">{p.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </main>
      <Footer />
    </>
  )
}
