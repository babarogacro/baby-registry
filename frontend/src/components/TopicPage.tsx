import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AuthAwareLink from '@/components/AuthAwareLink'
import { Art, type ArtName } from '@/components/art'
import { SITE_URL, TOPIC_PAGES, jsonLd } from '@/lib/site'
import { Plus } from 'lucide-react'
import clsx from 'clsx'

/**
 * A page written for one search ("lista želja za bebu", "lista za rođendan"...):
 * a plain answer up top, the steps, what to put on the list, and the real questions.
 */
export interface TopicContent {
  path: string
  eyebrow: string
  title: string
  lead: string
  tone: string
  art: ArtName
  registerHref: string
  steps: { title: string; text: string }[]
  ideasTitle: string
  ideas: { label: string; text: string; href?: string }[]
  sections: { title: string; text: string }[]
  faq: { q: string; a: string }[]
}

export default function TopicPage({ content }: { content: TopicContent }) {
  const others = TOPIC_PAGES.filter(t => t.href !== content.path)
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Bebina Lista', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: content.title, item: `${SITE_URL}${content.path}` },
        ],
      },
      {
        '@type': 'HowTo',
        name: `${content.title}: kako je napraviti`,
        step: content.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.text })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: content.faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
      },
    ],
  }

  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in pb-16">
        <header className={clsx(`tone-${content.tone}`, 'rounded-b-5xl bg-tone px-5 pb-14 pt-[120px] text-on-tone sm:px-8 sm:pb-20 sm:pt-[140px]')}>
          <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
            <div>
              <nav aria-label="Putanja" className="mb-4 text-sm font-semibold opacity-80">
                <Link href="/" className="underline underline-offset-2">Bebina Lista</Link> <span aria-hidden>/</span> {content.title}
              </nav>
              <p className="text-sm font-extrabold uppercase tracking-wide">{content.eyebrow}</p>
              <h1 className="display mt-2 text-[2.9rem] sm:text-7xl">{content.title}</h1>
              <p className="mt-5 max-w-xl text-lg font-medium leading-snug sm:text-xl">{content.lead}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <AuthAwareLink guestHref={content.registerHref} signedInLabel="Moje liste" className="btn btn-lg btn-primary">Napravi listu</AuthAwareLink>
                <Link href="/katalog" className="btn btn-lg bg-white/70 text-coal hover:bg-white">Pogledaj katalog</Link>
              </div>
            </div>
            <div className="mx-auto hidden w-full max-w-[300px] lg:block"><Art name={content.art} /></div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <section className="pt-14" aria-labelledby="koraci">
            <h2 id="koraci" className="display text-[2.2rem] sm:text-5xl">Kako je napraviti, u tri koraka.</h2>
            <ol className="mt-6 space-y-4">
              {content.steps.map((step, i) => (
                <li key={step.title} className="card flex gap-4 p-5">
                  <span className="display flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sun text-2xl text-coal">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl font-extrabold tracking-tight">{step.title}</h3>
                    <p className="mt-1 text-[17px] leading-snug text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="pt-14" aria-labelledby="ideje">
            <h2 id="ideje" className="display text-[2.2rem] sm:text-5xl">{content.ideasTitle}</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {content.ideas.map(idea => (
                <li key={idea.label} className="rounded-3xl bg-sunken/70 p-4">
                  <p className="font-bold">{idea.href ? <Link href={idea.href} className="underline decoration-2 underline-offset-4 [text-decoration-color:rgb(var(--mint))]">{idea.label}</Link> : idea.label}</p>
                  <p className="mt-1 text-[15px] leading-snug text-muted">{idea.text}</p>
                </li>
              ))}
            </ul>
          </section>

          {content.sections.map(section => (
            <section key={section.title} className="pt-14">
              <h2 className="display text-[2rem] sm:text-4xl">{section.title}</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-muted">{section.text}</p>
            </section>
          ))}

          <section className="pt-14" aria-labelledby="pitanja">
            <h2 id="pitanja" className="display text-[2.2rem] sm:text-5xl">Česta pitanja.</h2>
            <div className="mt-5 divide-y divide-line/10 border-y border-line/10">
              {content.faq.map(item => (
                <details key={item.q} className="group py-1">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-bold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <Plus size={20} aria-hidden className="flex-shrink-0 transition-transform duration-200 group-open:rotate-45" />
                  </summary>
                  <p className="pb-4 text-[17px] leading-snug text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="pt-14 text-center">
            <h2 className="display text-[2.4rem] sm:text-5xl">Napravi listu prije nego što te počnu pitati.</h2>
            <p className="mt-3 text-muted">Besplatno je, a gosti se ne registriraju.</p>
            <div className="mt-6 flex justify-center">
              <AuthAwareLink guestHref={content.registerHref} signedInLabel="Moje liste" className="btn btn-lg btn-primary">Napravi listu</AuthAwareLink>
            </div>
          </section>

          <nav aria-label="Povezano" className="mt-14 border-t border-line/10 pt-6 text-[15px]">
            <p className="font-bold">Pročitaj i:</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {others.map(t => <li key={t.href}><Link href={t.href} className="font-semibold underline underline-offset-2">{t.label}</Link></li>)}
              <li><Link href="/blog" className="font-semibold underline underline-offset-2">Blog</Link></li>
              <li><Link href="/pronadi-listu" className="font-semibold underline underline-offset-2">Pronađi tuđu listu</Link></li>
            </ul>
          </nav>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
      </main>
      <Footer />
    </>
  )
}
