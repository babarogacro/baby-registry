'use client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function UvjetiPage() {
  return (
    <>
      <Navbar />
      <main id="sadrzaj" className="page-in min-h-screen pb-16 pt-[92px]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="py-10">
            <h1 className="display mb-3 text-[2.9rem] sm:text-6xl">Uvjeti korištenja</h1>
            <p className="text-muted text-sm">Zadnje ažuriranje: 1. travnja 2026.</p>
          </div>

          <div className="card prose-legal space-y-8 p-6 text-[15px] leading-relaxed sm:p-10">
            <section>
              <h2>1. O usluzi</h2>
              <p>
                Bebina Lista je besplatna online platforma za kreiranje i dijeljenje lista
                željenih poklona za bebe i djecu. Uslugu pruža <strong>Babaroga</strong>,
                vl. Tvrtko Kračun, OIB: 72128351309, Poljski put 16, 53291 Novalja, Hrvatska.
              </p>
              <p className="mt-2">
                Korištenjem platforme prihvaćate ove Uvjete korištenja u cijelosti.
                Ako se ne slažete s uvjetima, molimo vas da ne koristite uslugu.
              </p>
            </section>

            <section>
              <h2>2. Opis usluge</h2>
              <p>Bebina Lista omogućuje korisnicima:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Kreiranje lista željenih poklona za rođenje djeteta, rođendan ili drugu prigodu.</li>
                <li>Pretraživanje kataloga proizvoda prikupljenih iz javno dostupnih internetskih trgovina.</li>
                <li>Dijeljenje lista putem jedinstvenog linka s obitelji i prijateljima.</li>
                <li>Rezervaciju poklona od strane posjetitelja bez potrebe za registracijom.</li>
                <li>E-mail obavijesti o izvršenim rezervacijama.</li>
              </ul>
            </section>

            <section>
              <h2>3. Registracija i korisnički račun</h2>
              <p>
                Za korištenje usluge kreacije lista potrebna je registracija putem e-maila
                ili Google računa. Korisnik je odgovoran za točnost unesenih podataka i
                čuvanje pristupnih podataka.
              </p>
              <p className="mt-2">
                Zadržavamo pravo deaktivacije računa koji krše ove uvjete ili se
                koriste u nedopuštene svrhe.
              </p>
            </section>

            <section>
              <h2>4. Kupovina proizvoda</h2>
              <p>
                Bebina Lista <strong>ne prodaje proizvode</strong> niti ne posreduje u kupovini.
                Svi proizvodi prikazani na platformi dolaze iz vanjskih internetskih trgovina
                (npr. BabyCenter.hr). Klikom na proizvod, korisnik se preusmjerava na web
                stranicu trgovine gdje se vrši kupovina.
              </p>
              <p className="mt-2">
                Za pitanja o cijenama, dostupnosti, isporuci i reklamacijama proizvoda
                obratite se izravno odgovarajućoj trgovini.
              </p>
            </section>

            <section>
              <h2>5. Rezervacije</h2>
              <p>
                Rezervacija poklona na platformi <strong>nije obvezujući ugovor o kupovini</strong>.
                To je neformalna oznaka namjere kupovine kako bi se izbjeglo dupliciranje poklona.
                Bebina Lista ne može garantirati da će rezervirani poklon biti kupljen.
              </p>
            </section>

            <section>
              <h2>6. Javne liste</h2>
              <p>
                Liste su prema zadanim postavkama javne i dostupne svakome tko posjeduje
                jedinstveni link. Korisnik može promijeniti vidljivost liste u postavkama.
                Dijeleći link na svoju listu, korisnik pristaje da podaci prikazani na
                javnoj listi (ime, naziv liste, proizvodi) budu vidljivi posjetiteljima.
              </p>
            </section>

            <section>
              <h2>7. Zabranjeno ponašanje</h2>
              <p>Zabranjeno je:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Korištenje platforme u nezakonite ili štetne svrhe.</li>
                <li>Kreiranje lažnih profila ili lažno predstavljanje.</li>
                <li>Automatsko prikupljanje podataka s platforme (scraping) bez dozvole.</li>
                <li>Ometanje rada ili sigurnosti platforme.</li>
                <li>Zlouporaba sustava rezervacija (npr. masovne lažne rezervacije).</li>
              </ul>
            </section>

            <section>
              <h2>8. Intelektualno vlasništvo</h2>
              <p>
                Dizajn, kod i sadržaj platforme Bebina Lista zaštićeni su autorskim pravima.
                Slike i opisi proizvoda vlasništvo su odgovarajućih trgovina i koriste se
                isključivo u informativne svrhe.
              </p>
            </section>

            <section>
              <h2>9. Ograničenje odgovornosti</h2>
              <p>
                Bebina Lista pruža se &quot;kakva jest&quot; (as-is). Ne garantiramo neprekidnu
                dostupnost, točnost cijena ili dostupnost proizvoda u vanjskim trgovinama.
              </p>
              <p className="mt-2">
                Ne snosimo odgovornost za:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Gubitak podataka uslijed tehničkih problema.</li>
                <li>Netočne informacije o proizvodima iz vanjskih izvora.</li>
                <li>Neizvršene rezervacije ili kupovine.</li>
                <li>Štetu nastalu korištenjem ili nemogućnošću korištenja platforme.</li>
              </ul>
            </section>

            <section>
              <h2>10. Privatnost</h2>
              <p>
                Vaša privatnost nam je važna. Za detalje o obradi osobnih podataka pogledajte
                našu <Link href="/privatnost" className="text-tomato-ink hover:underline">Politiku privatnosti</Link>.
              </p>
            </section>

            <section>
              <h2>11. Izmjene uvjeta</h2>
              <p>
                Zadržavamo pravo izmjene ovih Uvjeta korištenja. Značajne promjene bit će
                objavljene na platformi. Nastavak korištenja usluge nakon objave promjena
                smatra se prihvaćanjem novih uvjeta.
              </p>
            </section>

            <section>
              <h2>12. Primjenjivo pravo</h2>
              <p>
                Na ove Uvjete korištenja primjenjuje se pravo Republike Hrvatske.
                Za sve sporove nadležan je sud u Zadru.
              </p>
            </section>

            <section>
              <h2>13. Kontakt</h2>
              <p>
                Za sva pitanja i prijedloge u vezi s platformom, obratite nam se na:
              </p>
              <p className="mt-2">
                <strong>Babaroga</strong>, vl. Tvrtko Kračun<br />
                Poljski put 16, 53291 Novalja<br />
                OIB: 72128351309<br />
                E-mail: <strong>info@bebinalista.hr</strong>
              </p>
            </section>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-tomato-ink hover:underline">← Natrag na početnu</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
