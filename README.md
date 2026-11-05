# Listica

Mala lista za velike želje.


Roditelji slažu liste želja iz kataloga hrvatskih baby shopova (ili zalijepe link iz bilo kojeg shopa), dijele ih s obitelji i prijateljima, a oni rezerviraju poklone upisivanjem imena, bez registracije. Poklon se može kupiti i zajednički (grupna kupovina).

---

## Arhitektura

```
baby-registry/
├── backend/    # Node 20 + Express 5 + Prisma 6 + Zod 4, scraperi (axios + cheerio)
└── frontend/   # Next.js 16 + React 19 + Tailwind CSS 3 + motion
```

---

## 🎨 Dizajn

Motiv je vrtuljak iznad krevetića: geometrijski oblici drvenih igračaka na koncima. Sve je u `frontend/src`:

- **Boje i teme:** tokeni su CSS varijable u `app/globals.css`, a dnevnu i noćnu temu ("Noćna smjena") mijenja `data-theme` na `<html>`. Klase `tone-*` daju komponenti obitelj boja, a svaka glavna kategorija ima svoju (`lib/categories.ts`).
- **Crteži:** svi su u `components/art.tsx`, ne koristimo emojije kao ikone.
- **Vrtuljak:** `components/Vrtuljak.tsx` je fizika njihala bez biblioteke. Poštuje `prefers-reduced-motion` i spava kad nije na ekranu.
- **Animacije:** `motion` za modale, klizni odabir i izlaske, CSS za ulazak kartica. Tekstovi ne koriste crtice ni rodno označene oblike.

---

## 🚀 Lokalni razvoj

```bash
make install   # ovisnosti
make db        # PostgreSQL u Dockeru + tablice (kopira backend/.env.example u .env)
make dev       # backend na :3001, frontend na :3000
make scrape    # napuni katalog (traje dugo jer pauzira između zahtjeva prema shopovima)
make check     # TypeScript provjera
```

Lokalna baza se zove `listica` (korisnik `listica`). Docker volumen napravljen prije preimenovanja i dalje ima staru bazu `baby_registry`: ili ostavi stari `DATABASE_URL` u `backend/.env`, ili napravi novu bazu s `docker compose down -v` pa `make db`.

Frontend čita `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=      # opcionalno
NEXT_PUBLIC_FRONTEND_URL=          # javna adresa, za Open Graph linkove
```

Backend varijable su opisane u `backend/.env.example`. `JWT_SECRET` je obavezan: server se bez njega ne pokreće. Prvog admina postavi u bazi (`role = 'ADMIN'`).

---

## 🔐 Sigurnosni model

- **Admin API** (`/api/admin/*`) traži JWT korisnika s ulogom `ADMIN`.
- **Rezervacije** su bez prijave: pri rezervaciji gost dobije tajni `ownerToken` koji ostaje u njegovom browseru (localStorage). Samo s njim može otkazati rezervaciju ili je označiti kao kupljenu. Mama može osloboditi bilo koju rezervaciju na svojoj listi.
- **Smart paste** dohvaća samo javne http(s) adrese; privatne i interne IP adrese blokirane su na razini konekcije, uključujući redirecte.
- **Javne liste** su `noindex` jer sadrže imena i termine poroda.
- Rate limiting: prijava (broji samo neuspjele pokušaje), javne rezervacije, pretraga, smart paste.

---

## 📡 API

Auth: `POST /api/auth/register|login|google`, `GET /api/auth/me`, `PATCH /api/auth/profile`, `DELETE /api/auth/account`

Liste (prijava): `GET|POST /api/lists`, `GET|PATCH|DELETE /api/lists/:id`, `POST /api/lists/:id/items`, `PATCH|DELETE /api/lists/:id/items/:itemId`, `DELETE /api/lists/:id/items/:itemId/reservation`, `POST /api/lists/smart-paste`

Javno: `GET /api/public/lista/:slug`, `GET /api/public/pretraga?q=`, `GET /api/public/settings`, `POST|DELETE /api/public/lista/:slug/rezerviraj/:itemId`, `PATCH /api/public/lista/:slug/rezerviraj/:itemId/status`, `POST /api/public/lista/:slug/group/:itemId/join`, `DELETE /api/public/lista/:slug/group/:itemId/leave/:contributorId`

Proizvodi: `GET /api/products`, `/api/products/facets`, `/api/products/categories`, `/api/products/featured`, `/api/products/:id`. Filteri su `q`, `shopSlug`, `categorySlug`, `brand` (više vrijednosti spojenih s `|`), `onSale=1`, `minPrice`, `maxPrice`; `facets` za svaki filter broji što još nudi s obzirom na ostale aktivne filtere.

Admin: `/api/admin/stats|users|shops|featured|settings|products|category-mappings|unmapped-categories|categories`

---

## 🕷️ Scraperi

`backend/src/scraper/`: `babycenter.ts` i `svijetbeba.ts` definiraju kategorije i parsiranje, `shared.ts` sadrži zajednički tok rada.

- **Automatski:** svaku noć u 02:00 (Baby Center) i 03:00 (Svijet Beba), po zagrebačkom vremenu. Ručno: admin panel ili `npm run scrape [shop]`.
- **Baby Center blokira hosting IP adrese** (HTTP 451 s Railwaya iz SAD-a i Amsterdama, i s GitHub Actions runnera), pa se s cloud servera ne može skinuti. Za skidanje s druge adrese postoji `npm run scrape:remote babycenter`: skida stranice tamo gdje se pokrene i šalje proizvode u API (`POST /api/scraper/runs/:shop/begin|items|finish`, header `x-scraper-key`). Na serveru treba `SCRAPER_KEY` i `SCRAPER_SKIP=babycenter`, na stroju koji skida `SCRAPER_KEY` i `SCRAPER_API_URL`. Dok se to ne riješi, Baby Center podaci u katalogu su stari.
- **Podaci:** uz naziv i cijenu spremaju se brend (`normalizeBrand` u `shared.ts` svodi "CYBEX" i "Cybex" na jedan zapis) i cijena prije popusta, ako je dućan prikazuje.
- **Povlačenje proizvoda:** proizvod koji shop više ne prikazuje dobiva `inStock = false` i nestaje iz kataloga, ali ostaje na listama s upozorenjem. To se događa samo nakon zdravog prolaza, tako da blokiran ili pokvaren scrape ne može isprazniti katalog.
- **Kad shop promijeni strukturu:** neuspjele kategorije vide se u admin panelu pod *Scraper*. Tada ažuriraj `TARGETS` u odgovarajućoj datoteci.

---

## 🗄️ Promjene baze

Sheme se primjenjuju s `prisma db push`. **Mijenjaj je samo aditivno** (nova polja s defaultom ili nullable, indeksi), da deploy ne obriše produkcijske podatke.
