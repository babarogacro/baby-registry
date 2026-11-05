import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Art } from '@/components/art'
import { getBlogPosts } from '@/lib/server'
import { blogDate, blogImageUrl } from '@/lib/blog'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog | Bebina Lista',
  description: 'Savjeti o opremi za bebu, listama želja, baby showeru i dječjim rođendanima: što stvarno treba, što može čekati i kako izbjeći duple poklone.',
  alternates: { canonical: '/blog' },
}

const TONES = ['sun', 'sky', 'mint', 'bubble'] as const

export default async function BlogPage() {
  const posts = await getBlogPosts(48)

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in min-h-screen pb-16 pt-[92px]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="max-w-2xl py-10">
            <p className="note text-tomato-ink">što ti fali?</p>
            <h1 className="display mt-2 text-[2.9rem] sm:text-6xl">Blog</h1>
            <p className="mt-3 text-lg text-muted">Što stvarno treba za bebu, što može čekati i kako složiti listu da se pokloni ne ponavljaju.</p>
          </header>

          {posts.length === 0 ? (
            <div className="card py-16 text-center">
              <div className="tone-sun mx-auto w-20"><Art name="star" /></div>
              <p className="mt-3 font-display text-xl font-extrabold tracking-tight">Prvi članci stižu uskoro.</p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
              {posts.map((post, i) => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="card group flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1">
                    <div className={`tone-${TONES[i % TONES.length]} aspect-[16/10] overflow-hidden bg-tone`}>
                      {post.coverImage
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={blogImageUrl(post.coverImage)} alt="" loading={i < 3 ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                        : <div className="flex h-full items-center justify-center p-10"><Art name="gift" className="h-full w-auto" /></div>}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {post.publishedAt && <p className="text-[13px] font-semibold text-muted">{blogDate(post.publishedAt)}</p>}
                      <h2 className="mt-1 font-display text-xl font-extrabold leading-tight tracking-tight">{post.title}</h2>
                      {post.excerpt && <p className="mt-2 line-clamp-3 text-[15px] text-muted">{post.excerpt}</p>}
                      <span className="mt-auto pt-4 text-sm font-bold underline underline-offset-4">Pročitaj</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
