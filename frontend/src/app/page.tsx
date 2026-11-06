import Link from 'next/link'
import Navbar from '@/components/Navbar'
import ProductCard from '@/components/ProductCard'
import AuthAwareLink from '@/components/AuthAwareLink'
import Footer from '@/components/Footer'
import Reveal from '@/components/Reveal'
import HeroMobile from '@/components/HeroMobile'
import PoklonLutrija from '@/components/PoklonLutrija'
import ListDemoPhone from '@/components/ListDemoPhone'
import { Art } from '@/components/art'
import { getBlogPosts, getCategories, getFeaturedProducts, getOnSaleProducts, getPublicSettings } from '@/lib/server'
import { blogDate, blogImageUrl } from '@/lib/blog'
import { categoryMeta, sortRootCategories } from '@/lib/categories'
import { plural } from '@/lib/format'
import { ArrowRight, Check, Link2, Plus, Search } from 'lucide-react'
import clsx from 'clsx'

export const revalidate = 300

// Each indexable page names itself as canonical; the root layout can't, or every page would point here.
export const metadata = { alternates: { canonical: '/' } }

// The tiles differ in size on purpose: the big purchases get the big blocks.
const BENTO: Record<string, string> = {
  kolica: 'col-span-2 row-span-2 sm:col-span-2',
  autosjedalice: 'col-span-1 sm:col-span-2',
  nosiljke: 'col-span-1',
  'kod-kuce': 'col-span-1',
  'hranjenje-njega': 'col-span-1 sm:col-span-2',
  igracke: 'col-span-1 sm:col-span-2',
  odjeca: 'col-span-1 sm:col-span-2',
  'za-mame': 'col-span-2',
}

function MockRow({ art, tone, name, tag, done }: { art: Parameters<typeof Art>[0]['name']; tone: string; name: string; tag: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 text-coal">
      <span className={clsx(`tone-${tone}`, 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-tone p-1.5')}><Art name={art} /></span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
      {done ? (
        <span className="flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-bold"><Check size={12} strokeWidth={3} aria-hidden /> {tag}</span>
      ) : (
        <span className="rounded-full bg-coal/10 px-2.5 py-1 text-xs font-bold">{tag}</span>
      )}
    </div>
  )
}

const STEPS = [
  {
    tone: 'cobalt',
    title: 'Složi Listicu.',
    text: 'Za bebu upiši što ti treba, za rođendan što dijete želi. Biraj iz kataloga hrvatskih dućana ili zalijepi link iz bilo kojeg web shopa, označi koliko ti je što važno i dopiši veličinu ili boju.',
    mock: (
      <div className="space-y-2">
        <MockRow art="pram" tone="tomato" name="Kolica 2u1" tag="Luksuz" />
        <MockRow art="monitor" tone="sky" name="Baby monitor" tag="Najviše treba" />
        <MockRow art="rings" tone="sun" name="Drvene slagalice" tag="Bilo bi lijepo" />
      </div>
    ),
  },
  {
    tone: 'sun',
    title: 'Pošalji link.',
    text: 'Pošalji ga na WhatsApp ili Viber, ili stavi QR kod na pozivnicu. Gosti ga otvore i odmah vide Listicu.',
    mock: (
      <div className="space-y-2.5">
        <div className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-white p-3.5 text-sm font-medium text-coal">Evo naše Listice, da se ne ponavljate.</div>
        <div className="ml-auto flex max-w-[85%] items-center gap-2 rounded-3xl rounded-br-md bg-coal p-3.5 text-sm font-semibold text-white">
          <Link2 size={16} aria-hidden className="flex-shrink-0" /> <span className="truncate">listica.hr/lista/nasa-beba</span>
        </div>
        <div className="max-w-[60%] rounded-3xl rounded-bl-md bg-white p-3.5 text-sm font-medium text-coal">Ja uzimam kadicu.</div>
      </div>
    ),
  },
  {
    tone: 'mint',
    title: 'Nitko ne kupi isto.',
    text: 'Svatko vidi što je još slobodno i što je već uzeto, pa kupuje izravno u dućanu. Za skuplje poklone više ljudi može skupiti zajedno.',
    mock: (
      <div className="space-y-2">
        <MockRow art="bath" tone="sky" name="Kadica, uzela susjeda" tag="Uzeto" done />
        <MockRow art="carseat" tone="cobalt" name="Autosjedalica, uzela kuma" tag="Uzeto" done />
        <MockRow art="pram" tone="tomato" name="Kolica, skupljaju 4 osobe" tag="75 %" />
      </div>
    ),
  },
]

const FAQ = [
  { q: 'Plaća li se nešto?', a: 'Ne. Listica je besplatna za roditelje i za goste. Pokloni se kupuju u dućanu, po cijeni dućana.' },
  { q: 'Moraju li se gosti registrirati?', a: 'Ne. Gost otvori link, odabere poklon i upiše svoje ime. To je sve.' },
  { q: 'Što ako proizvod koji želim nije u katalogu?', a: 'Zalijepi link proizvoda iz bilo kojeg web shopa. Listica sama povuče naziv, sliku i cijenu.' },
  { q: 'Tko vidi moju Listicu?', a: 'Ljudi kojima pošalješ link, a gosti bez linka mogu je naći samo ako upišu puno ime i prezime, tvoje ili djetetovo. Google je ne prikazuje. Ako je zaključaš, ne otvara je ni link ni pretraga.' },
  { q: 'Što ako netko rezervira poklon pa odustane?', a: 'Gost rezervaciju može otkazati s uređaja na kojem ju je napravio, a ti je možeš osloboditi u svojoj Listici. Poklon je odmah opet slobodan za druge.' },
  { q: 'Kako radi skupljanje zajedno?', a: 'Za skuplji poklon jedan gost pokrene skupljanje, a ostali upišu koliko daju. Novac ne ide preko stranice: svatko svoj dio daje osobi koja naručuje poklon.' },
  { q: 'Radi li i za dječji rođendan?', a: 'Da. Napravi rođendansku Listicu s onim što dijete želi, pa je pošalji gostima jednako kao i Listicu za bebu.' },
]

export default async function HomePage() {
  const [featured, categories, settings, onSale, posts] = await Promise.all([getFeaturedProducts(), getCategories(), getPublicSettings(), getOnSaleProducts(), getBlogPosts(3)])
  const topCategories = sortRootCategories(categories.filter(c => (c.totalCount ?? 0) > 0))
  const totalProducts = topCategories.reduce((sum, c) => sum + (c.totalCount ?? 0), 0)
  const rail = [...featured, ...onSale.filter(p => !featured.some(f => f.id === p.id))].slice(0, 10)

  const facts = [
    ...(totalProducts > 0 ? [`${totalProducts.toLocaleString('hr-HR')} proizvoda iz hrvatskih dućana`] : []),
    'Za rođenje i dječji rođendan',
    'Besplatno za roditelje i goste',
    'Obitelj i prijatelji samo upišu ime',
    'Link iz bilo kojeg web shopa',
    'Za skupe poklone više ljudi skupi zajedno',
    'QR kod za pozivnice',
  ]

  return (
    <>
      <Navbar />
      <main id="sadrzaj">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-b-5xl bg-hero text-hero-ink">
          <div className="mx-auto grid min-h-[100svh] max-w-7xl grid-rows-[auto_1fr] px-5 sm:px-8 lg:min-h-[820px] lg:grid-cols-[1.08fr_1fr] lg:grid-rows-1 lg:gap-6">
            <div className="relative z-10 order-2 flex flex-col justify-center pb-16 pt-2 lg:order-1 lg:pb-24 lg:pt-28">
              <p className="page-in mb-3 text-sm font-extrabold uppercase tracking-wide">Listica želja za bebu i dječji rođendan</p>
              <h1 className="display page-in text-[clamp(2.4rem,12.6vw,6rem)] lg:text-[clamp(4rem,7vw,6.2rem)]">
                Izbjegni
                <span className="block text-[rgb(var(--hero-accent))]">duple poklone.</span>
              </h1>
              <p className="page-in mt-6 max-w-[33rem] text-lg font-medium leading-snug sm:text-xl [animation-delay:90ms]">
                Upiši što ti treba za bebu i pošalji link obitelji i prijateljima. Kad netko odabere poklon, ostali odmah vide da je zauzet. Besplatno je za tebe i za goste, pokloni se kupuju u dućanu.
              </p>
              <div className="page-in mt-8 flex flex-wrap items-center gap-3 [animation-delay:160ms]">
                <AuthAwareLink guestHref="/registracija" signedInLabel="Moje Listice" className="btn btn-lg btn-primary">Napravi Listicu</AuthAwareLink>
                <Link href="/katalog" className="btn btn-lg btn-outline-hero">Pogledaj katalog</Link>
              </div>
              <p className="page-in mt-5 text-[15px] font-medium [animation-delay:220ms]">
                Radi i za <AuthAwareLink guestHref="/registracija?occasion=birthday" className="font-bold underline decoration-2 underline-offset-[3px]">dječji rođendan</AuthAwareLink>.
              </p>
            </div>
            <div className="relative order-1 pt-[72px] lg:order-2 lg:pt-[72px]">
              <HeroMobile heroImage={settings.heroImage} />
            </div>
          </div>
        </section>

        {/* Facts marquee */}
        <div className="marquee-wrap overflow-hidden py-6" aria-label="Što sve dobivaš">
          <ul className="marquee flex w-max gap-3">
            {[...facts, ...facts].map((fact, i) => (
              <li key={i} aria-hidden={i >= facts.length} className="flex items-center gap-3 whitespace-nowrap font-display text-lg font-bold">
                {fact}
                <span className={clsx('inline-block h-3 w-3', i % 3 === 0 ? 'rounded-full bg-tomato' : i % 3 === 1 ? 'rounded-sm bg-cobalt' : 'rounded-t-full bg-mint')} aria-hidden />
              </li>
            ))}
          </ul>
        </div>

        {/* The guest's side, played on a phone */}
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20" aria-labelledby="kako-izgleda">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_0.2fr] [&>*]:min-w-0">
            <Reveal>
              <p className="note text-tomato-ink">ovako to izgleda</p>
              <h2 id="kako-izgleda" className="display mt-1 max-w-xl text-[2.9rem] sm:text-6xl">Ovako gosti vide tvoju Listicu.</h2>
              <p className="mt-5 max-w-lg text-lg font-medium leading-snug text-muted">
                Otvore link na mobitelu, vide što je još slobodno, kliknu Rezerviraj i upišu ime. Svi ostali u istom trenutku vide da je poklon zauzet. Gosti se ne registriraju i ništa ne plaćaju na stranici.
              </p>
              <div className="mt-7">
                <AuthAwareLink guestHref="/registracija" signedInLabel="Moje Listice" className="btn btn-lg btn-primary">Napravi Listicu</AuthAwareLink>
              </div>
            </Reveal>
            <ListDemoPhone />
          </div>
        </section>

        {/* Three steps, stacked like blocks */}
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8" aria-labelledby="koraci">
          <Reveal>
            <p className="note text-cobalt-ink">traje nekoliko minuta</p>
            <h2 id="koraci" className="display mt-1 max-w-3xl text-[2.9rem] sm:text-6xl">Kako radi, u tri koraka.</h2>
          </Reveal>
          <ol className="mt-10 space-y-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className={clsx(`tone-${step.tone}`, 'lg:sticky')} style={{ top: `${96 + i * 22}px` }}>
                <div className="grid items-center gap-8 rounded-5xl bg-tone p-6 text-on-tone sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14 lg:p-14 [&>*]:min-w-0">
                  <div>
                    <span className="display block text-[5.5rem] opacity-30 sm:text-[8rem]">{i + 1}</span>
                    <h3 className="display -mt-3 text-[2.2rem] sm:text-5xl">{step.title}</h3>
                    <p className="mt-4 max-w-lg text-lg font-medium leading-snug opacity-90">{step.text}</p>
                  </div>
                  <div className="rounded-4xl bg-coal/10 p-3 sm:p-4">{step.mock}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Poklon lutrija */}
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <PoklonLutrija />
        </section>

        {/* Categories */}
        {topCategories.length > 0 && (
          <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20" aria-labelledby="kategorije">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="kategorije" className="display max-w-2xl text-[2.9rem] sm:text-6xl">Od kolica do čarapa.</h2>
                <p className="mt-3 max-w-xl text-lg font-medium text-muted">{totalProducts.toLocaleString('hr-HR')} proizvoda iz hrvatskih dućana. Cijene provjeravamo svake noći.</p>
              </div>
              <Link href="/katalog" className="btn btn-soft">Cijeli katalog <ArrowRight size={17} aria-hidden /></Link>
            </Reveal>
            <div className="mt-9 grid auto-rows-[minmax(150px,1fr)] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:grid-cols-4 sm:gap-4">
              {topCategories.map(cat => {
                const meta = categoryMeta(cat.slug)
                return (
                  <Link key={cat.id} href={`/katalog?kategorija=${cat.slug}`}
                    className={clsx(`tone-${meta.tone}`, BENTO[cat.slug] ?? 'col-span-1', 'group relative overflow-hidden rounded-4xl bg-tone p-5 text-on-tone transition-transform duration-300 ease-out hover:-translate-y-1 active:scale-[0.99]')}>
                    <span className="font-display text-xl font-extrabold leading-none tracking-tight sm:text-2xl">{cat.name}</span>
                    <span className="mt-1.5 block text-sm font-semibold opacity-75">{(cat.totalCount ?? 0).toLocaleString('hr-HR')} {plural(cat.totalCount ?? 0, 'proizvod', 'proizvoda', 'proizvoda')}</span>
                    <Art name={meta.art} className="absolute -bottom-2 -right-1 h-[68%] w-auto transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-1 group-hover:rotate-[-5deg] group-hover:scale-105" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Product rail */}
        {rail.length > 0 && (
          <section className="py-10" aria-labelledby="izdvojeno">
            <Reveal className="mx-auto max-w-7xl px-5 sm:px-8">
              <h2 id="izdvojeno" className="display text-[2.4rem] sm:text-5xl">{featured.length > 0 ? 'Izdvojeno iz kataloga.' : 'Trenutno na akciji.'}</h2>
            </Reveal>
            <ul className="no-scrollbar mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 sm:px-8 xl:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
              {rail.map(product => (
                <li key={product.id} className="w-[62vw] flex-shrink-0 snap-center sm:w-[260px]"><ProductCard product={product} from="naslovnica" /></li>
              ))}
            </ul>
          </section>
        )}

        {/* One sincere moment */}
        <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <Reveal>
            <p className="display text-[2.1rem] leading-[1.04] sm:text-[3.6rem]">
              Za bebu te pitaju: što ti fali, da ne kupim nešto što već imaš? Za rođendan: što mali ili mala želi? S Listicom odgovoriš jednom, svima odjednom.
            </p>
          </Reveal>
        </section>

        {/* From the blog */}
        {posts.length > 0 && (
          <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8" aria-labelledby="iz-bloga">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="iz-bloga" className="display text-[2.4rem] sm:text-5xl">Iz bloga.</h2>
              <Link href="/blog" className="btn btn-soft">Svi članci <ArrowRight size={17} aria-hidden /></Link>
            </Reveal>
            <ul className="mt-7 grid gap-4 sm:grid-cols-3 [&>*]:min-w-0">
              {posts.map(post => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="card group flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1">
                    {post.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={blogImageUrl(post.coverImage)} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
                    )}
                    <div className="p-5">
                      <p className="text-[13px] font-semibold text-muted">{blogDate(post.publishedAt)}</p>
                      <p className="mt-1 font-display text-xl font-extrabold leading-tight tracking-tight">{post.title}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 pb-6 sm:px-8" aria-labelledby="pitanja">
          <Reveal>
            <h2 id="pitanja" className="display text-[2.4rem] sm:text-5xl">Česta pitanja.</h2>
          </Reveal>
          <div className="mt-6 divide-y divide-line/10 border-y border-line/10">
            {FAQ.map(item => (
              <details key={item.q} className="group py-1">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-bold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus size={20} aria-hidden className="flex-shrink-0 transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="pb-4 text-[17px] leading-snug text-muted">{item.a}</p>
              </details>
            ))}
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
          }) }} />
        </section>

        {/* Guests */}
        <section className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="tone-sky grid items-center gap-8 rounded-5xl bg-tone p-6 text-on-tone sm:p-12 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <h2 className="display text-[2.6rem] sm:text-6xl">Netko ti je spomenuo Listicu, a nemaš link?</h2>
              <p className="mt-4 max-w-md text-lg font-medium leading-snug">Upiši puno ime i prezime roditelja ili djeteta. Vidjet ćeš što je još slobodno i moći ćeš rezervirati poklon.</p>
            </div>
            <form action="/pronadi-listu" className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="trazi-listu" className="sr-only">Ime i prezime roditelja ili djeteta</label>
              <input id="trazi-listu" name="q" type="search" minLength={3} required placeholder="npr. Ana Horvat" className="min-h-[58px] w-full flex-1 rounded-full bg-white px-6 text-lg text-coal placeholder:text-coal/50" />
              <button type="submit" className="btn btn-lg btn-ink !bg-coal !text-white"><Search size={18} aria-hidden /> Traži</button>
            </form>
          </Reveal>
        </section>

        {/* Bookend */}
        <section className="mx-auto max-w-7xl px-5 pb-6 pt-14 text-center sm:px-8 sm:pt-20">
          <Reveal>
            <h2 className="display mx-auto max-w-4xl text-[clamp(3rem,9vw,6.5rem)]">Napravi Listicu prije nego što te počnu pitati.</h2>
            <div className="mt-8 flex justify-center">
              <AuthAwareLink guestHref="/registracija" signedInLabel="Moje Listice" className="btn btn-lg btn-primary">Napravi Listicu</AuthAwareLink>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  )
}
