'use client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function PrivatnostPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 bg-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="py-10">
            <h1 className="font-serif text-4xl text-charcoal mb-2">Politika privatnosti</h1>
            <p className="text-warm-gray text-sm">Zadnje ažuriranje: 1. travnja 2026.</p>
          </div>

          <div className="bg-white rounded-3xl border border-blush/30 p-8 sm:p-10 space-y-8 text-sm text-charcoal leading-relaxed">
            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">1. Voditelj obrade podataka</h2>
              <p>
                Voditelj obrade osobnih podataka je <strong>Babaroga</strong>, vl. Tvrtko Kračun,
                OIB: 72128351309, sa sjedištem na adresi Poljski put 16, 53291 Novalja, Hrvatska
                (u daljnjem tekstu: &quot;mi&quot;, &quot;naš&quot;).
              </p>
              <p className="mt-2">
                Za sva pitanja vezana uz zaštitu osobnih podataka možete nas kontaktirati putem
                e-maila na adresu: <strong>info@bebinalista.hr</strong>.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">2. Koje podatke prikupljamo</h2>
              <p>Prikupljamo sljedeće vrste osobnih podataka:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Podatci o računu:</strong> ime i prezime, e-mail adresa, lozinka (kriptirana).</li>
                <li><strong>Podatci o listi:</strong> naziv liste, odabrani proizvodi, prioriteti, bilješke, prigoda (npr. rođenje, rođendan).</li>
                <li><strong>Podatci o bebi:</strong> planirani termin poroda, spol bebe (opcionalno).</li>
                <li><strong>Podatci o rezervacijama:</strong> ime osobe koja rezervira poklon, opcionalna poruka.</li>
                <li><strong>Tehnički podatci:</strong> IP adresa, vrsta preglednika, vrijeme pristupa (u svrhu sigurnosti i analitike).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">3. Svrha obrade podataka</h2>
              <p>Vaše podatke obrađujemo u sljedeće svrhe:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Kreiranje i upravljanje korisničkim računom.</li>
                <li>Omogućavanje kreiranja, dijeljenja i upravljanja listama poklona.</li>
                <li>Slanje e-mail obavijesti o rezervacijama poklona.</li>
                <li>Prikaz javne liste posjetiteljima kojima je podijeljen link.</li>
                <li>Poboljšanje usluge i korisničkog iskustva.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">4. Pravna osnova obrade</h2>
              <p>
                Osobne podatke obrađujemo temeljem:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Privole</strong> — registracijom na platformu pristajete na obradu podataka.</li>
                <li><strong>Izvršenja ugovora</strong> — obrada je nužna za pružanje usluge (čl. 6(1)(b) GDPR).</li>
                <li><strong>Legitimnog interesa</strong> — za sigurnost platforme i sprječavanje zlouporabe (čl. 6(1)(f) GDPR).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">5. Dijeljenje podataka</h2>
              <p>Vaše podatke ne prodajemo niti dijelimo s trećim stranama, osim:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Resend</strong> — za slanje transakcijskih e-mailova (obavijesti o rezervacijama).</li>
                <li><strong>Google</strong> — ako koristite Google prijavu za autentifikaciju.</li>
                <li><strong>Pružatelj hostinga</strong> — za pohranu i posluživanje aplikacije i baze podataka.</li>
              </ul>
              <p className="mt-2">
                Javna lista poklona vidljiva je svakome tko posjeduje link. Na javnoj listi
                prikazuje se ime vlasnika liste, naziv liste, odabrani proizvodi i status
                rezervacija. Ovu postavku možete promijeniti postavljanjem liste na privatnu.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">6. Kolačići</h2>
              <p>
                Koristimo minimalni set kolačića nužnih za funkcioniranje usluge:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Autentifikacijski token</strong> — pohranjen u localStorage preglednika za održavanje sesije.</li>
                <li><strong>Token rezervacije</strong> — kad rezervirate poklon, u localStorage vašeg preglednika spremamo
                  nasumični ključ i ime koje ste upisali, kako biste kasnije s istog uređaja mogli otkazati rezervaciju ili je označiti kao kupljenu.</li>
              </ul>
              <p className="mt-2">Ne koristimo kolačiće za praćenje ili reklamiranje.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">7. Vaša prava</h2>
              <p>U skladu s GDPR-om, imate pravo na:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Pristup</strong> — zatražiti uvid u podatke koje obrađujemo.</li>
                <li><strong>Ispravak</strong> — zatražiti ispravak netočnih podataka.</li>
                <li><strong>Brisanje</strong> — zatražiti brisanje svih vaših podataka.</li>
                <li><strong>Ograničenje obrade</strong> — ograničiti način na koji koristimo vaše podatke.</li>
                <li><strong>Prenosivost</strong> — zatražiti kopiju podataka u strojno čitljivom formatu.</li>
                <li><strong>Prigovor</strong> — uložiti prigovor na obradu podataka.</li>
              </ul>
              <p className="mt-2">
                Račun i sve povezane liste možete sami trajno obrisati u postavkama profila („Obriši moj račun").
                Za ostvarivanje ostalih prava kontaktirajte nas na
                <strong> info@bebinalista.hr</strong>.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">8. Zadržavanje podataka</h2>
              <p>
                Vaše podatke čuvamo dok god koristite uslugu. Po brisanju računa, svi
                osobni podatci bit će trajno uklonjeni u roku od 30 dana.
                Rezervacije koje su ostale na listama drugih korisnika bit će anonimizirane.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">9. Sigurnost podataka</h2>
              <p>
                Poduzimamo odgovarajuće tehničke i organizacijske mjere za zaštitu vaših podataka,
                uključujući enkripciju lozinki, HTTPS komunikaciju i kontrolu pristupa.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">10. Pravo na pritužbu</h2>
              <p>
                Ako smatrate da su vaša prava povrijeđena, imate pravo podnijeti pritužbu
                nadležnom tijelu — Agenciji za zaštitu osobnih podataka (AZOP),
                Selska cesta 136, 10000 Zagreb, <strong>azop@azop.hr</strong>.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-charcoal mb-3">11. Izmjene politike</h2>
              <p>
                Zadržavamo pravo izmjene ove Politike privatnosti. O svim značajnim
                promjenama bit ćete obaviješteni putem e-maila ili obavijesti na platformi.
              </p>
            </section>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-rose hover:underline">← Natrag na početnu</Link>
          </div>
        </div>
      </main>
    </>
  )
}
