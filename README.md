# 🍼 Bebina Lista — Baby Registry App

Mame kreiraju liste želja iz kataloga hrvatskih baby shopova (ili zalijepe link iz bilo kojeg shopa), dijele ih s obitelji i prijateljima, a oni rezerviraju poklone upisivanjem imena, bez registracije. Poklon se može kupiti i zajednički (grupna kupovina).

---

## Arhitektura

```
baby-registry/
├── backend/    # Node 20 + Express 5 + Prisma 6 + Zod 4, scraperi (axios + cheerio)
└── frontend/   # Next.js 16 + React 19 + Tailwind CSS 3
```

---

## 🚀 Lokalni razvoj

```bash
make install   # ovisnosti
make db        # PostgreSQL u Dockeru + tablice (kopira backend/.env.example u .env)
make dev       # backend na :3001, frontend na :3000
make scrape    # napuni katalog (traje dugo jer pauzira između zahtjeva prema shopovima)
make check     # TypeScript provjera
```

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

Proizvodi: `GET /api/products`, `/api/products/categories`, `/api/products/featured`, `/api/products/:id`

Admin: `/api/admin/stats|users|shops|featured|settings|products|category-mappings|unmapped-categories|categories`

---

## 🕷️ Scraperi

`backend/src/scraper/`: `babycenter.ts` i `svijetbeba.ts` definiraju kategorije i parsiranje, `shared.ts` sadrži zajednički tok rada.

- **Automatski:** svaku noć u 02:00 (Baby Center) i 03:00 (Svijet Beba), po zagrebačkom vremenu. Ručno: admin panel ili `npm run scrape [shop]`.
- **Povlačenje proizvoda:** proizvod koji shop više ne prikazuje dobiva `inStock = false` i nestaje iz kataloga, ali ostaje na listama s upozorenjem. To se događa samo nakon zdravog prolaza, tako da blokiran ili pokvaren scrape ne može isprazniti katalog.
- **Kad shop promijeni strukturu:** neuspjele kategorije vide se u admin panelu pod *Scraper*. Tada ažuriraj `TARGETS` u odgovarajućoj datoteci.

---

## 🗄️ Promjene baze

Sheme se primjenjuju s `prisma db push`. **Mijenjaj je samo aditivno** (nova polja s defaultom ili nullable, indeksi), da deploy ne obriše produkcijske podatke.
