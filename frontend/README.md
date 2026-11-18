# podpalto.cz – frontend

Veřejná **cenová mapa tuhých paliv** v ČR (palivové dřevo, dřevěné pelety, brikety, uhlí) a interní modul **CI Studio** pro analýzu konkurence. Uživatel zadá svou polohu nebo PSČ a vidí ceny prodejců včetně odhadu dopravy a přepočtu na Kč/kWh. Všechna data (prodejci, ceny, statistiky, reporty CI) čte frontend jen ze **Supabase**; zapisují je agenti ze služeb `tools` a `app` ([CrewAI](https://docs.crewai.com)). Frontend je nasazen na Vercel.

Dokument je určen vývojářům frontendu i backendu, který do Supabase zapisuje data (kontrakt v kap. 5 a v `docs/agent-output-spec.md`). Hlubší popis architektury je v [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Obsah

1. [Rychlý start](#1-rychlý-start)
2. [Stránky a funkce](#2-stránky-a-funkce)
3. [Technologie](#3-technologie)
4. [Struktura složek](#4-struktura-složek)
5. [Datový kontrakt: Supabase](#5-datový-kontrakt-supabase)
6. [Offline režim (bez databáze)](#6-offline-režim-bez-databáze)
7. [Nasazení na Vercel](#7-nasazení-na-vercel)
8. [Další dokumentace](#8-další-dokumentace)

---

## 1. Rychlý start

### Požadavky

- **Node.js ≥ 20.9** (vyžaduje Next.js 16, viz `engines` v `package.json`)
- npm (projekt má `package-lock.json`)

### Příkazy

```bash
cd frontend
npm install
npm run dev      # vývojový server → http://localhost:3001
npm run build    # produkční build
npm run start    # spuštění produkčního buildu (nejdříve `npm run build`)
npm run lint     # ESLint (eslint-config-next)
```

> Skripty `dev` i `start` běží na portu **3001** (3000 bývá obsazený jinou aplikací). Jiný port: `npx next dev -p <port>`.

### Proměnné prostředí

Šablona je v `frontend/.env.example`. Zkopírujte ji do `.env.local` (soubor se necommituje):

```bash
cp .env.example .env.local      # Windows PowerShell: copy .env.example .env.local
```

| Proměnná | Výchozí | Význam |
|---|---|---|
| `NEXT_PUBLIC_MOCK_LATENCY_MS` | `150` | Umělá latence mock API v ms, aby se ukázaly loading stavy. |
| `NEXT_PUBLIC_MOCK_RUN_SPEED` | `1` | Zrychlení simulace CrewAI běhu v CI Studiu (1 ≈ 30 s, 3 ≈ 10 s). |
| `NEXT_PUBLIC_MAP_TILE_URL` | *(prázdné)* | Vlastní zdroj mapových dlaždic. Prázdné = OpenStreetMap bez klíče. |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | *(prázdné)* | Text atribuce k dlaždicím (HTML). |
| `NEXT_PUBLIC_GEOCODER_URL` | `https://photon.komoot.io/api/` | Geokodér pro našeptávač adres nad mapou (Photon, data OpenStreetMap, omezeno na ČR). `off` = jen lokální shody (PSČ, města). Pro produkci vlastní instance Photonu nebo komerční API. |
| `NEXT_PUBLIC_SITE_URL` | `https://podpalto.cz` | Veřejná adresa webu pro kanonické URL, `sitemap.xml`, `robots.txt` a Open Graph. |
| `NEXT_PUBLIC_SITE_INDEXABLE` | *(prázdné)* | `true` **jen na produkci s vlastní doménou** – povolí indexaci vyhledávači a AI crawlery. Jinak (lokálně, náhledy, `*.vercel.app`) má každá stránka `noindex`, hlavičku `X-Robots-Tag: noindex` a `robots.txt` zakazuje vše. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | *(prázdné)* | Kód z Google Search Console (ověření meta tagem; alternativa k TXT záznamu v DNS). |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | *(prázdné)* | Kód z Bing Webmaster Tools (`msvalidate.01`). |
| `NEXT_PUBLIC_LEGAL_OPERATOR_NAME`, `…_ICO`, `…_ADDRESS` | *(prázdné)* | Provozovatel služby pro obchodní podmínky a zásady ochrany osobních údajů (jméno/firma, IČO, sídlo). Vyplnit jen ve Vercelu. |
| `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` | `info@podpalto.cz` | Kontaktní e-mail na právních stránkách. |
| `NEXT_PUBLIC_SUPABASE_URL` | *(prázdné)* | Supabase projekt „Podpalto“ (`https://sdhinkqouseaaesodqyy.supabase.co`). Vyplněné = data z databáze a povinné přihlášení; prázdné = demo režim na `src/data/` bez účtů. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *(prázdné)* | Veřejný (publishable) klíč Supabase. Přístup k datům hlídá RLS. |
| `NEXT_PUBLIC_EUR_CZK_RATE` | `24.43` | Kurz Kč za 1 € pro zobrazení cen v eurech (Nastavení → Měna). Výchozí kurz ČNB z 16. 11. 2026. Data i API zůstávají v Kč. |
| `NEXT_PUBLIC_REGIONS_GEOJSON_URL` | *(prázdné)* | Volitelné GeoJSON hranic 14 krajů (vlastnost `kod` = `PHA`/`STC`/… nebo `nazev`) pro choropleth. Bez něj se vykreslí plynulá heat mapa celé ČR (oříznutá hranicí státu). |

Všechny proměnné začínají `NEXT_PUBLIC_`, takže se **zapékají do buildu**. Po změně je nutné aplikaci znovu sestavit (na Vercelu redeploy).

---

## 2. Stránky a funkce

| Cesta | Soubor | Hlavní funkce |
|---|---|---|
| `/` | `src/app/page.tsx` → `HomeView` | **Mapa cen.** Celoplošná interaktivní **Leaflet mapa** (výchozí celá ČR) s překryvnými widgety: nahoře uprostřed vyhledávací lišta adresy s našeptávačem (adresy, PSČ, obce, prodejci) – vybrané místo se najde a přiblíží; vlevo nahoře přepínač Kč/jednotka ↔ Kč/kWh, vpravo nahoře vrstva krajů, moje poloha a zoom (lišta je poloprůhledná – „zamlžené sklo“); dole skleněný pás průměrných cen ČR, který jde výčnělkem sbalit (mapa pak sahá až dolů), a nad ním vlevo legenda barev cenovek. Vrstva krajů je plynulá heat mapa vyplňující celé území ČR. Shluky ukazují nejnižší cenu („od 1 190 Kč/PRMS“), cenovky jsou barvené podle hladiny vůči průměru kraje. **Pravý panel (1/5)**: filtry (palivo, „Jen v okolí“ + okruh 10–100 km, podrobné filtry, řazení) a seznam výsledků. Klik na cenovku/výsledek otevře **detail prodejce (2/5)**: ilustrace/fotka, ceník, doprava, kontakty a akce **Objednat** (poptávkový formulář), Porovnat, Celý profil. Na mobilu jsou filtry i detail spodní panely. **Nepřihlášený** vidí ukázku: heat mapu krajů a místo filtrů žebříček krajů podle průměrné ceny zvoleného paliva (vs. průměr ČR, počet prodejců v databázi) s výzvou k registraci zdarma. |
| `/kalkulacka` | `src/app/kalkulacka/page.tsx` → `CalculatorPage` | **Chytrá kalkulačka vytápění.** (1) Převodník PRMS / PRM / PLM a výhřevnosti podle dřeviny a vlhkosti, s ekvivalenty v peletách, briketách a uhlí. Vysvětlení syrového dřeva. (2) Sezónní kalkulačka: zadání potřeby tepla v kWh/rok a účinnosti kotle, seřazení prodejců podle konečné ceny vč. dopravy. (3) Srovnávač až 4 prodejců. (4) Sekce **Metodika** s koeficienty z `src/lib/constants.ts`. |
| `/prodejci` | `src/app/prodejci/page.tsx` → `SellersCatalog` | **Katalog prodejců.** Přepínání tabulka / mřížka. Filtry: fulltext, kraj, velikost, šířka sortimentu, typ dopravy (vlastní, hydraulická ruka, zdarma v okolí, osobní odběr), palivo. Řazení podle názvu, hodnocení, nejlevnějšího tvrdého dřeva, šíře sortimentu nebo poslední aktualizace. **Nepřihlášený** vidí 5 prodejců (stejných celý den) a zamčený zbytek s výzvou k registraci. |
| `/prodejci/[slug]` | `src/app/prodejci/[slug]/page.tsx` → `SellerDetail` | **Profil prodejce.** Kontakty a adresa, tlačítko „Porovnat“ (sdíleno s kalkulačkou). Kompletní ceník s přepočtem Kč/kWh a sloupcem změny za 12 měsíců. Graf vývoje ceny vybraného produktu s čárkovanou čárou průměru ČR. Odhad dopravy pro zvolenou polohu. Sekce **Competitive Intelligence** (positioning, tón, USP, SWOT matice, cenové srovnání s krajem a ČR) nebo výzva ke spuštění analýzy v CI Studiu. |
| `/trendy` | `src/app/trendy/page.tsx` → `TrendsView` | **Trh a trendy.** KPI karty čtyř komodit se sparkline, automaticky generovaný krátký komentář, měsíční vývoj cen za 12 měsíců, srovnání krajů, náklady na kWh podle paliva (včetně účinnosti kotle) a sezónnost. **Nepřihlášený** vidí ukazatele a vývoj za 6 měsíců, zbytek rozmazaný se zámkem. |
| `/blog` | `src/app/blog/page.tsx` → `BlogIndex` | **Blog (SEO).** Renderuje se na serveru. Doporučený článek, rubriky (Rady a návody / Ceny a trh / Průvodce), hledání, mřížka článků a výzva k mapě cen. JSON-LD `Blog`. |
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` → `BlogArticle` + `BlogProse` | **Článek.** Tělo v Markdownu (nadpisy s kotvami, fotky s popiskem, tipy, tabulky), obsah článku se zvýrazněním při scrollu, sdílení, štítky, autor, související články. `generateMetadata` (title, description, canonical, Open Graph, Twitter), JSON-LD `BlogPosting`, `generateStaticParams`. |
| `/blog/novy` | `src/app/blog/novy/page.tsx` → `BlogEditor` | **Editor článku** (noindex). Nadpis, slug, perex, rubrika, štítky, úvodní fotka s alt textem, Markdown s lištou nástrojů (nadpisy, tučně, odkaz, seznamy, tip, **vložení fotky**, tabulka), náhled vedle sebe, stav a datum publikace, náhled ve vyhledávači. Vyžaduje přihlášení; redaktor (role editor / admin) ukládá a publikuje do Supabase včetně nahrání fotek, ostatním se koncept uloží jen v prohlížeči. |
| `/plany` | `src/app/plany/page.tsx` → `PlansPage` | **Tarify** Zdarma / Pro / Prodejce. Platby zatím nejsou – tlačítko ukáže, že nejsou v provozu. `?feature=ci` zobrazí důvod přesměrování z CI Studia. |
| `/prihlaseni` | `src/app/prihlaseni/page.tsx` → `AuthPage` | **Přihlášení / registrace / zapomenuté heslo** (Supabase Auth, e-mail + heslo). `?mode=signup`, `?next=/cesta`. Callback z e-mailu: `/auth/callback`, nové heslo: `/nove-heslo`. |
| `/admin/kontrola` | `src/app/admin/kontrola/page.tsx` → `ReviewQueuePage` | **Fronta ruční kontroly** (jen role admin): prodejci a ceny s blokujícím příznakem od agentů; schválit / zamítnout. |
| `/ci-studio` | `src/app/ci-studio/page.tsx` → `CiStudio` | **CI Studio (CrewAI).** Schéma flow `CompetitorAnalysisFlow`. Formulář pro URL konkurenta s validací a příklady. Průběh běhu: stav kroků, progress bar, konzole `crew.log` s úrovněmi INFO / TOOL / THINK / OK / ERR. Archiv reportů z `outputs/` s filtry (kraj, palivo, řazení, fulltext). Prohlížeč reportu s taby (Summary, Offering & Pricing, Positioning, SWOT, Recommendations), SWOT maticí, metadaty, stažením `.md` a kopírováním. Parametry `?url=` (předvyplní URL) a `?report=` (otevře report). **Jen tarif Pro**; analýza se zadává do fronty `analysis_runs` (kap. 5.2). |

Společné prvky: **levý navigační panel** (~1/5 šířky, tmavé jehličí) s logem a položkami menu (ikona + název + popis); dole widget s přepínačem světlého/tmavého režimu a **Nastavením** (zobrazení cen, výchozí poloha, vzhled, porovnání), pod ním účet s tarifem a „Odhlásit se“ (Supabase Auth); nepřihlášený vidí u ukázkových stránek štítek „Ukázka“ a u stránek za účtem zámek. Na mobilu horní lišta s menu. Patička (mimo mapu), stránka 404 a chybová stránka. Upozornění na ukázková data jen v offline režimu.

---

## 3. Technologie

Verze převzaté z `package.json`.

| Oblast | Technologie | Verze |
|---|---|---|
| Framework | Next.js (App Router, Cache Components, Partial Prefetching, Turbopack) | 16.4.6 |
| UI knihovna | React / React DOM | 19.3.0 |
| Jazyk | TypeScript | ^5 |
| Styly | Tailwind CSS v4 + `@tailwindcss/turbopack`, `tw-animate-css` | 4.3.3 / ^1.4.0 |
| Komponenty | shadcn/ui (styl `radix-nova`, base color `neutral`, CSS proměnné), Radix UI | `radix-ui` ^1.8.1 |
| Pomocné knihovny UI | `class-variance-authority`, `clsx`, `tailwind-merge`, `cn` | ^0.7.1 / ^2.1.1 / ^3.7.0 / ^0.5.2 |
| Ikony | lucide-react | ^1.73.0 |
| Mapa | Leaflet, react-leaflet, react-leaflet-cluster (OpenStreetMap dlaždice, bez API klíče) | ^1.9.4 / ^5.0.0 / ^4.1.3 |
| Grafy | Recharts | ^3.10.1 |
| Markdown | react-markdown, remark-gfm | ^10.1.0 / ^4.0.1 |
| Témata | next-themes | ^0.4.6 |
| Notifikace | sonner | ^2.0.8 |
| Příkazová paleta | cmdk | ^1.1.1 |
| Lint | ESLint 9, eslint-config-next | ^9 / 16.4.6 |

**Fonty** (`next/font/google` v `src/app/layout.tsx`): Plus Jakarta Sans (`--font-jakarta`, sans) a JetBrains Mono (`--font-jetbrains`, mono pro ceny a čísla, třída `.num`).

---

### Hranice ČR a krajů pro heat mapu

Hranice státu a 14 krajů pocházejí z OpenStreetMap (stejná data jako podkladová mapa, © přispěvatelé OSM, ODbL). Přegenerování:

```bash
node scripts/fetch-cz-boundaries.mjs
```

Skript stáhne kraje přes Overpass API (cache v `.cache/`), zjednoduší je se zachováním topologie a zapíše `src/data/geo/cz-regions.ts` a `src/data/geo/czechia.ts` (kompaktně zakódované, dekóduje `src/lib/geo-decode.ts`). Přesnost řídí `KEEP_LINES` (čáry a ořez, výchozí 0,25) a `KEEP_FILL` (výplň, 0,03).

## 4. Struktura složek

```
frontend/
├── .env.example              šablona proměnných prostředí
├── components.json           konfigurace shadcn/ui (aliasy @/components, @/lib, …)
├── next.config.ts            cacheComponents, partialPrefetching, Tailwind pro Turbopack
├── AGENTS.md                 pokyny pro AI agenty (nová verze Next.js)
├── src/
│   ├── app/                  App Router – tenké server komponenty (page.tsx)
│   │   ├── layout.tsx        root layout: fonty (Jakarta, Lora, JetBrains Mono), metadata, <AppProviders>, <AppShell>
│   │   ├── globals.css       design tokeny (light/dark), .num, styly Leafletu a mapových dlaždic
│   │   ├── page.tsx          /                 → HomeView
│   │   ├── kalkulacka/       /kalkulacka       → CalculatorPage
│   │   ├── prodejci/         /prodejci         → SellersCatalog
│   │   │   └── [slug]/       /prodejci/[slug]  → SellerDetail (generateStaticParams)
│   │   ├── trendy/           /trendy           → TrendsView
│   │   ├── ci-studio/        /ci-studio        → CiStudio (v Suspense)
│   │   ├── error.tsx, not-found.tsx, icon.svg
│   ├── components/           klientské feature komponenty
│   │   ├── providers/        AppProviders (theme, tooltip, toaster), PreferencesProvider
│   │   ├── layout/           AppShell, AppSidebar (levá navigace), SettingsDialog, SiteFooter, PriceModeToggle, nav-links.ts
│   │   ├── home/             HomeView, FilterPanel, SellerList, SellerCard, MarketPulseBar, use-media-query
│   │   ├── map/              seller-map-loader (dynamic, ssr:false) → seller-map (Leaflet), pins.ts,
│   │   │                     region-layer, price-scale, types.ts
│   │   ├── calculator/       WoodConverter, SeasonCalculator, SellerComparison, Methodology, RawWoodExplainer
│   │   ├── sellers/          SellersCatalog, SellerDetail, seller-utils.ts
│   │   ├── trends/           TrendsView, PriceTrendChart, RegionComparison, EnergyCostChart, Seasonality
│   │   ├── blog/             BlogIndex, BlogArticle, BlogProse (Markdown → HTML), BlogEditor, blog-parts
│   │   ├── ci/               CiStudio, RunPanel, ReportArchive, ReportViewer, SwotMatrix, Markdown
│   │   ├── common/           PageHeader, EmptyState, FuelBadge, FuelIcon, PriceTag, PriceDelta,
│   │   │                     StockBadge, StarRating, Sparkline, KpiCard, RegionSelect, SellerTags,
│   │   │                     ListSkeleton, MockModeBadge, Logo (barrel: index.ts)
│   │   └── ui/               shadcn primitiva (button, card, dialog, select, sheet, tabs, table, …)
│   ├── data/                 mock data (fiktivní demo prodejci, trh, reporty)
│   │   ├── sellers/          part-a.ts, part-b.ts (26 prodejců), index.ts
│   │   ├── market.ts         PRICE_TRENDS (12 měsíců), REGION_STATS (14 krajů)
│   │   ├── reports.ts        REPORTS (5 statických reportů)
│   │   └── helpers.ts        deterministický generátor historie cen
│   ├── hooks/
│   │   └── use-api.ts        useApi(fetcher, deps) → { data, error, loading, reload }
│   ├── lib/
│   │   ├── api/              servisní vrstva (jediné místo volání API)
│   │   │   ├── index.ts      barrel: import { getSellers } from "@/lib/api"
│   │   │   ├── config.ts     API_URL, IS_MOCK, MOCK_LATENCY_MS
│   │   │   ├── client.ts     apiFetch, ApiError, qs, mockResolve
│   │   │   ├── sellers.ts    getSellers, getSeller, getMockSellerSlugs
│   │   │   ├── market.ts     getMarketPulse, getRegionStats, getPriceTrends, getEnergyCosts
│   │   │   ├── reports.ts    getReports, getReport
│   │   │   ├── analysis.ts   startAnalysis, getAnalysisRun, ANALYSIS_POLL_MS
│   │   │   └── mock/         market.ts (odvozená data), analysis-sim.ts (simulace CrewAI běhu)
│   │   ├── constants.ts      číselníky, koeficienty, kraje, PSČ → lokalita
│   │   ├── pricing.ts        přepočty jednotek, Kč/kWh, doprava, cenové hladiny
│   │   ├── filters.ts        filtrovací a řadicí engine úvodní stránky
│   │   ├── report-parser.ts  rozdělení Markdown reportu na sekce, parser SWOT
│   │   ├── format.ts         formátování čísel, měny (Kč / € přepočtem), dat podle jazyka
│   │   ├── i18n/             překlady UI (cs / de / en): core.ts, translate.ts (t), use-i18n.ts (useI18n),
│   │   │                     messages/<oblast>.ts – slovníky po oblastech (common, layout, home, map, …)
│   │   └── utils.ts          cn()
│   └── types/
│       └── index.ts          datový kontrakt (typy API) – jediný zdroj pravdy
└── public/                   (zatím neexistuje; sem patří případné GeoJSON krajů)
```

**Pravidla pro přispívání:**

- Komponenty importují data **pouze** přes `@/lib/api`, nikdy přímo z `src/data/`.
- Typy odpovídající JSON kontraktu patří do `src/types/index.ts`. Změna kontraktu = změna typů + dokumentace v sekci 5.
- Výpočty cen a dopravy patří do `src/lib/pricing.ts` a `src/lib/filters.ts`, ne do komponent. Jsou čisté a použitelné i na serveru.

---

## 5. Datový kontrakt: Supabase

**Jediný zdroj dat je Supabase** (rozhodnutí z 18. 11. 2026, `docs/TODO.md`). Agenti zapisují do
databáze se *secret* klíčem, frontend čte s veřejným klíčem a RLS hlídá, kdo co vidí. Frontend
nevolá žádné REST API a nepotřebuje URL backendu ani CORS. Co agenti zapisují a v jakém tvaru,
popisuje `docs/agent-output-spec.md`; schéma je v `supabase/migrations/`.

### 5.1 Co frontend čte a zapisuje

| Volání | Kdo smí | Vrací / dělá | Kde ve frontendu |
|---|---|---|---|
| `rpc api_sellers(p_slug, p_region, p_category)` | přihlášený | `Seller[]` – jen schválení prodejci s polohou a běžné produkty (bez akcí a pásem); `intel` jen pro Pro | `lib/api/sellers.ts` |
| `rpc api_region_stats()` | přihlášený | `RegionStats[]` (poslední měsíc) | `lib/api/market.ts` |
| `rpc api_price_trends(p_months)` | přihlášený | `PriceTrendPoint[]` (průměry ČR) | `lib/api/market.ts` |
| `rpc api_public_overview()` | kdokoli | trendy 6 měsíců, kraje, počty prodejců v databázi po krajích | `lib/api/public.ts` (ukázky) |
| `rpc api_public_seller_sample(p_limit)` | kdokoli | 5 prodejců (stejných celý den) bez CI shrnutí + celkový počet | `lib/api/public.ts` (ukázky) |
| `analysis_reports` (select) | Pro | reporty CI Studia | `lib/api/reports.ts` |
| `analysis_runs` (insert, select) | Pro | fronta analýz, viz 5.2 | `lib/api/analysis.ts` |
| `reviews`, `order_requests`, `user_preferences`, `profiles` | přihlášený (vlastní řádky) | recenze, poptávky, nastavení, profil | `lib/api/*`, providery |
| `blog_posts`, bucket `blog-images` | čtení kdokoli, zápis editor | blog | `lib/api/blog.ts`, `lib/blog/supabase.ts` |
| `rpc api_review_queue`, `review_product`, `review_seller` | admin | fronta ruční kontroly | `lib/api/review-queue.ts` |
| `heating_census` (select) | kdokoli | Sčítání 2021 – čím topí domácnosti po krajích | připraveno pro Trendy |

„Neuvedeno“: pole, které agent nezjistil, je v databázi `NULL` a v JSON z `api_sellers` chybí
(sklad, velikost firmy, podmínky dopravy). Frontend ho zobrazí jako „Neuvedeno“ – nikdy jako
„nevozí“, „zdarma“ nebo „skladem“ (`estimateDelivery` vrací `unknown`).

### 5.2 Fronta analýz CI Studia (pro službu `app`)

1. Frontend (uživatel s Pro) vloží řádek: `insert into analysis_runs (kind, competitor_url | params | subject_seller_id)`.
   `kind`: `url` (dnešní formulář s URL webu), `market` (`params = {"fuel_category": "...", "region": "STC"}`),
   `seller` (`subject_seller_id`). Stav `queued`, `user_id` = zadavatel.
2. Worker služby `app` se *secret* klíčem volá `select * from claim_analysis_run('<id workeru>')` –
   atomicky vezme nejstarší čekající běh (`for update skip locked`) a nastaví `running`. Nové
   řádky lze místo pollingu sledovat přes Supabase Realtime (tabulka je v publikaci).
3. Během běhu zapisuje do řádku `progress` (0–100), `steps` a `logs` ve tvaru typů `CrewStep[]`
   a `CrewLogEntry[]` ze `src/types/index.ts` (frontend je zobrazuje jak jsou).
4. Na konci vloží report do `analysis_reports` (`id`, `kind`, `params`, `competitor_*`, `report`
   v Markdownu, `seller_id`, `region`, `categories`, `swot`, `requested_by`) a do běhu zapíše
   `status = 'completed'`, `report_id`, `finished_at`, `progress = 100`. Při chybě
   `status = 'failed'` a `error`. U profilu prodejce navíc upsert `seller_intel`.
5. Frontend běh polluje (1,5 s) a po dokončení otevře report. Dokud worker neběží, zůstane běh
   ve stavu „Ve frontě – čeká, až ji převezme backend analýz“.

## 6. Offline režim (bez databáze)

Bez vyplněného `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` je `IS_MOCK = true`
(`src/lib/api/config.ts`): všechny funkce v `src/lib/api/*.ts` vrací ukázková data ze `src/data/`
(s umělou latencí `NEXT_PUBLIC_MOCK_LATENCY_MS`), účty jsou vypnuté a analýzy v CI Studiu se
simulují v prohlížeči (`lib/api/mock/analysis-sim.ts`, rychlost `NEXT_PUBLIC_MOCK_RUN_SPEED`).
Odznak **Demo data** na to upozorňuje. Hodí se pro lokální vývoj UI bez přístupu k databázi.

---

## 6a. Supabase: databáze, účty a tarify

Projekt **Podpalto** (org *Lukas Projects*, region Frankfurt `eu-central-1`, ref `sdhinkqouseaaesodqyy`).

### Přístup a tarify

| Kdo | Co smí |
|---|---|
| Nepřihlášený | **Ukázkové verze:** mapa `/` (heat mapa krajů, žebříček krajů podle ceny, průměry ČR – bez jednotlivých prodejců), `/prodejci` (5 prodejců denně, zbytek zamčený), `/trendy` (6 měsíců, srovnání krajů / Kč/kWh / sezónnost zamčené). Dále blog, ceník `/plany` a přihlášení. Kalkulačka, detail prodejce, CI Studio a editor blogu přesměruje `src/proxy.ts` na `/prihlaseni?mode=signup&next=…`. Data pro ukázky dávají jen RPC `api_public_*`, tabulky jsou pro anon zavřené. |
| `free` (výchozí) | Mapa cen, kalkulačka, prodejci (vč. hodnocení), trendy, poptávky u prodejců. |
| `pro` ($20/měs.) | Navíc CI Studio a CI shrnutí prodejců (SWOT, cenový index). `/ci-studio` bez Pro → `/plany?feature=ci`. |
| `seller` ($20/měs.) | Účet prodejce: po schválení žádosti (`seller_claims` → `approve_seller_claim`) upravuje svůj profil, produkty a ceny a vidí poptávky. |
| role `editor` / `admin` | Píše a publikuje blog (`/blog/novy`), nahrává fotky. Admin vidí vše, schvaluje prodejce a vyřizuje frontu kontroly `/admin/kontrola`. |

Platby (Stripe) zatím nejsou – tlačítko na `/plany` ukáže „Platby zatím nejsou v provozu“. Tarif a roli nastavuje ručně admin v SQL Editoru (uživatel je sám změnit nemůže, viz granty):

```sql
update public.profiles set plan = 'pro', role = 'admin'
where id = (select id from auth.users where email = 'vas@email.cz');
```

### Schéma (`supabase/migrations/`)

| Migrace | Obsah |
|---|---|
| `…200000_core.sql` | `profiles` (tarif, role), `user_preferences` (jazyk, měna, zobrazení cen, motiv, výchozí poloha, porovnání, stav mapy), `plans`, `subscriptions` (připraveno pro Stripe), trigger založení profilu při registraci, RLS pomocníci `is_pro()` / `is_editor()` / `is_admin()`. |
| `…200100_market.sql` | `regions`, `sellers` (adresa, GPS + PostGIS `geog`, kontakty, doprava, štítky, externí hodnocení, vlastník), `products` (druh paliva a parametry, aktuální cena), `price_observations` (historie cen – trigger přepisuje aktuální cenu), `reviews`, `order_requests`, `seller_claims`, `seller_intel`, `analysis_reports`, `analysis_runs`, `commodity_price_stats`, `region_stats`, `scrape_sources`, `scrape_runs`; RPC `api_sellers`, `api_region_stats`, `api_price_trends`, `sellers_within`. |
| `…200200_blog.sql` | `blog_posts` + bucket `blog-images`. |
| `…200300_storage.sql` | Buckety `seller-photos` a `avatars`. |
| `…200400_harden_helper_grants.sql` | RLS pomocníky smí volat jen přihlášení. |
| `20261118120000_agent_output.sql` | Pole z `docs/agent-output-spec.md` (externí klíče, poloha z RÚIAN, registr, strukturovaná doprava, původ ceny a DPH, příznaky, běhy agentů); „neuvedeno“ = NULL u skladu, dopravy, velikosti a polohy; stav kontroly `review_status` u prodejců a produktů (triggery podle blokujících příznaků, admin RPC `review_product` / `review_seller`); akce a množstevní pásma jako samostatné produkty. `api_sellers` vrací jen schválené prodejce s polohou a běžné produkty. |
| `20261118130000_review_fixes.sql` | Triggery kontroly porovnávají jen blokující příznaky (jiné pořadí ani informační příznak schválený záznam znovu neotevře; když blokující zmizí, záznam se sám uvolní); vlastník prodejce vkládá produkty a ceny jen do vybraných sloupců; historie cen jen u viditelných produktů; unikátní běh na snímek; `seller_intel` bez `threat_level`, nově `market_comparison`; tabulka `heating_census` (Sčítání 2021). |
| `20261118140000_ci_queue_and_review_queue.sql` | Fronta analýz: `analysis_runs.kind/params/subject_seller_id/claimed_*`, `claim_analysis_run(worker)` pro službu app, Realtime; `analysis_reports.kind/params`; RPC `api_review_queue` pro admina. |
| `20261118150000_public_teaser.sql` | Ukázková data pro nepřihlášené: `api_public_overview()` a `api_public_seller_sample()`. |

Ukázková data: `supabase/seed.sql` (generuje `node scripts/generate-seed.mjs` ze `src/data/`). V produkčním projektu už jsou nahraná.

**Agenti (scraping, CrewAI)** zapisují serverově se *secret* klíčem (obchází RLS): nový prodejce → `sellers`, položky → `products`, nová cena → `insert into price_observations (product_id, price_czk, source_url)` (aktuální cena se přepíše triggerem), běh → `scrape_runs`, měsíční průměry → `commodity_price_stats` / `region_stats`, report → `analysis_reports` + `seller_intel`.

Frontend: `src/lib/supabase/*` (klient pro prohlížeč, server, proxy), `src/lib/api/*` čte přes RPC, `AuthProvider` drží session a profil, `PreferencesProvider` synchronizuje nastavení do `user_preferences`.

Typy z databáze lze vygenerovat: `npx supabase gen types typescript --project-id sdhinkqouseaaesodqyy > src/lib/supabase/database.types.ts` (vyžaduje `npx supabase login`).

## 6b. Blog a Supabase

1. **Čtení:** `src/lib/api/blog.ts` čte publikované články z `blog_posts` přes REST s veřejným klíčem (RLS: anonym vidí jen publikované), cache `"use cache"` s tagem `blog`. Bez Supabase běží na `src/data/blog.ts`.
2. **Psaní:** `/blog/novy` vyžaduje přihlášení; ukládat do databáze a publikovat smí role `editor` / `admin`. Fotky z editoru (`upload:<id>`) a obálka se při uložení nahrají do bucketu `blog-images` a nahradí veřejnou URL (`uploadBlogImage`, `saveBlogPost`). Pak server action `revalidateBlog()` zneplatní cache.

Mapování řádku tabulky na typ `BlogPost` je v `rowToPost` / `postToRow`. Obsah článků se nepřekládá (je česky), UI blogu ano.

SEO: `src/app/sitemap.ts` (se Supabase jen veřejné stránky: blog, ceník, přihlášení) a `src/app/robots.ts` (neindexuje `/ci-studio` a `/blog/novy`).

---

## 7. Nasazení na Vercel

Nasazení je plánované na pozdější fázi. Postup:

1. Vytvořte projekt z repozitáře a v nastavení nastavte **Root Directory** na `frontend`. Framework preset: **Next.js**.
2. Doplňte proměnné prostředí (Production i Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `NEXT_PUBLIC_SITE_URL`. Mapové proměnné dle potřeby.
3. Build a start jsou výchozí (`npm run build`, `next start`). Verze Node nastavte na 20.9 nebo novější.
4. Po každé změně proměnných `NEXT_PUBLIC_*` proveďte **redeploy**, jinak se nová hodnota nepropíše do buildu.
5. Backend s frontendem přímo nekomunikuje (vše jde přes Supabase), CORS tedy není potřeba.

Pro produkci s vyšším provozem nepoužívejte veřejný OpenStreetMap jako zdroj dlaždic. Nastavte vlastního poskytovatele přes `NEXT_PUBLIC_MAP_TILE_URL` a respektujte jeho podmínky a atribuci.

### TODO – vlastní doména (Wedos → Cloudflare → Vercel)

Kód žádnou adresu napevno nemá – kanonické URL, sitemapa, `robots.txt`, Open Graph i JSON-LD se berou z `NEXT_PUBLIC_SITE_URL`, odkazy v e-mailech z adresy, na které uživatel web otevřel. Při změně domény se tedy upravuje jen nastavení služeb níže. Postup v tomto pořadí:

**1. DNS – Wedos a Cloudflare**
- [ ] Přidat doménu `podpalto.cz` do Cloudflare (plán Free) a zkontrolovat, že se převzaly stávající DNS záznamy (hlavně MX, pokud u domény běží e-mail).
- [ ] U Wedosu přepnout nameservery domény na dva, které přidělí Cloudflare. Počkat, až je zóna v Cloudflare *Active* (minuty až 24 h).
- [ ] Cloudflare → SSL/TLS: režim **Full (strict)** (pro případ, že se někdy zapne proxy).

**2. Vercel**
- [ ] Projekt `podpalto-cz` → Settings → Domains: přidat `podpalto.cz` a `www.podpalto.cz`; jednu nastavit jako hlavní a druhou přesměrovat (doporučeno `www` → `podpalto.cz`, 308).
- [ ] V Cloudflare vytvořit záznamy přesně podle Vercelu (typicky `A` pro kořen a `CNAME` pro `www`) a nechat je **DNS only** (šedý mráček), jinak Vercel nevydá SSL certifikát.
- [ ] Počkat na „Valid Configuration“ a vydání certifikátu u obou domén.
- [ ] Environment Variables (Production): `NEXT_PUBLIC_SITE_URL=https://podpalto.cz` a **`NEXT_PUBLIC_SITE_INDEXABLE=true`** (jen Production – Preview ho mít nesmí, jinak by se indexovaly náhledy). Preview může zůstat na `*.vercel.app`.
- [ ] Settings → Domains: `podpalto-cz.vercel.app` přesměrovat (308) na `https://podpalto.cz`, aby se ve vyhledávačích neobjevil duplikát. Alternativa: nechat ho bez `NEXT_PUBLIC_SITE_INDEXABLE` (pak má `noindex`).
- [ ] **Redeploy** produkce (proměnné `NEXT_PUBLIC_*` se zapékají do buildu).

**3. Supabase (projekt Podpalto)**
- [ ] Authentication → URL Configuration → **Site URL**: `https://podpalto.cz` (výchozí cíl odkazů v e-mailech).
- [ ] **Redirect URLs** – ponechat/přidat: `https://podpalto.cz/**`, `https://www.podpalto.cz/**`, `https://podpalto-cz.vercel.app/**` (náhledy), `http://localhost:3001/**` (vývoj).
- [ ] Authentication → Emails → šablony: zkontrolovat texty (čeština) a že odkazy používají `{{ .ConfirmationURL }}` / `{{ .RedirectTo }}`, ne napevno starou adresu.
- [ ] Vlastní SMTP (např. Resend) s odesílatelem `noreply@podpalto.cz` – vestavěný e-mail Supabase má nízký hodinový limit.
- [ ] *(Volitelné, placený add-on)* Custom Domain pro Supabase, např. `auth.podpalto.cz`, aby uživatel neviděl `*.supabase.co`. Pak aktualizovat `NEXT_PUBLIC_SUPABASE_URL` ve Vercelu i v `.env.local`.
- [ ] Pokud přibude přihlášení přes Google/Apple: v konzoli poskytovatele přidat jako Authorized redirect URI callback Supabase (`https://<ref nebo vlastní doména>/auth/v1/callback`) a jako povolený původ `https://podpalto.cz`.

**4. E-mail a DNS záznamy v Cloudflare**
- [ ] Záznamy SMTP poskytovatele: **SPF** (TXT), **DKIM** (TXT/CNAME), **DMARC** (`_dmarc` TXT, např. `v=DMARC1; p=quarantine`), případně return-path CNAME.
- [ ] Ověřit doménu u poskytovatele SMTP a poslat zkušební e-mail (registrace, obnova hesla) – nesmí padat do spamu.

**5. Ostatní služby**
- [ ] Mapové dlaždice / geokodér s API klíčem (např. MapTiler): přidat `podpalto.cz` mezi povolené domény klíče.
- [ ] Stripe (až bude): webhook `https://podpalto.cz/api/stripe/webhook`, success/cancel URL a doména v nastavení Checkoutu.
- [ ] Google Search Console: ověřit doménu TXT záznamem v Cloudflare (nebo meta tagem přes `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) a odeslat `https://podpalto.cz/sitemap.xml`. Totéž v Bing Webmaster Tools (`NEXT_PUBLIC_BING_SITE_VERIFICATION`) – Bing napájí i vyhledávání ChatGPT a Copilotu.
- [ ] Cloudflare → Security → Bots: **AI Crawl Control / „Block AI bots“ nechat vypnuté** – web AI crawlery záměrně pouští (GEO). Pokud se zapne proxy (oranžový mráček), zkontrolovat i *Bot Fight Mode*, aby neblokoval Googlebot/Bingbot.
- [ ] **Před spuštěním indexace nahradit ukázková data reálnými** – stránky `/ceny`, `llms.txt` a náhledové obrázky ukazují průměry z databáze; od 18. 11. 2026 jsou v ní reálné ceny 81 prodejců, ale pokrytí je slabé (v několika krajích 1–2 ceny, Moravskoslezský bez cen) – indexaci zapnout až po ověření cen a doplnění krajů, jinak by vyhledávače indexovaly průměry z jednoho prodejce.
- [ ] Lokální `.env.local` a `.env.example`: `NEXT_PUBLIC_SITE_URL` nechat na localhost / doplnit produkční hodnotu do dokumentace.

**6. Kontrola po přepnutí**
- [ ] `https://podpalto.cz` i `https://www.podpalto.cz` mají platný certifikát a `www` přesměruje.
- [ ] Registrace → e-mail → odkaz vede na `https://podpalto.cz/auth/callback…` a uživatel je přihlášený.
- [ ] Obnova hesla → `/nove-heslo` funguje.
- [ ] `https://podpalto.cz/sitemap.xml` a `robots.txt` obsahují novou doménu; kanonická URL článku blogu ukazuje na `podpalto.cz`.
- [ ] Indexace zapnutá: `curl -I https://podpalto.cz` **nemá** hlavičku `X-Robots-Tag: noindex`, `robots.txt` povoluje `/` a v HTML není `<meta name="robots" content="noindex">`. Na `*.vercel.app` naopak `noindex` zůstává.
- [ ] Náhledy sdílení: odkaz na `/`, `/ceny/<kraj>` a článek blogu ukáže obrázek (např. v Facebook Sharing Debuggeru nebo náhledu ve Slacku/WhatsAppu); strukturovaná data projdou [Rich Results Testem](https://search.google.com/test/rich-results).
- [ ] `https://podpalto.cz/llms.txt` vrací aktuální průměry a odkazy na novou doménu.
- [ ] Nepřihlášený na `/` → ukázková mapa krajů; `/kalkulacka` → přesměrování na registraci; blog čitelný bez účtu.

### TODO – SEO a GEO do budoucna (až poběží indexace)

Hotové: veřejné `/ceny` (kraje, paliva), `/metodika`, `/llms.txt`, OG obrázky, JSON-LD, sitemapa,
robots s povolenými AI crawlery, indexace vypnutá do `NEXT_PUBLIC_SITE_INDEXABLE=true`.
Teď to nedává smysl (data nebo doména ještě nejsou), proto až později:

- [ ] **Veřejné profily prodejců** – `/prodejci/[slug]` je dnes za přihlášením a `noindex`. Až budou
      reálná data, zvážit veřejnou verzi (název, adresa, nabízená paliva, odkaz na web, bez
      cen pro hosty) s JSON-LD `LocalBusiness` – stránky „palivové dřevo <město>“ jsou největší
      zdroj návštěv z vyhledávání. Pozor na souhlas/námitky prodejců a GDPR u živnostníků (fyzické osoby).
- [ ] **Stránky měst** (`/ceny/<kraj>/<okres nebo město>`) generované z reálných prodejců – až
      bude v každém okrese aspoň pár prodejců, jinak hrozí „thin content“.
- [ ] **IndexNow** (Bing, Seznam, Yandex): po publikaci článku nebo změně cen poslat ping –
      route handler + klíč v `public/<klíč>.txt`.
- [ ] **Seznam.cz**: registrace v Seznam Webmaster (český trh – Seznam má stále podíl), odeslat sitemapu.
- [ ] **`llms-full.txt`** s plným textem metodiky a článků, až bude obsahu víc.
- [ ] **Recenze a hodnocení** v JSON-LD (`AggregateRating`) – jen z vlastních ověřených recenzí,
      ne z převzatých hodnocení Google (porušuje pravidla rich results).
- [ ] **Autoři článků**: články podepisují členové týmu (František Martinovský, Lukáš Voplakal,
      František Tošner, Lukáš Danko – jméno v `blog_posts.author_name` a na konci textu, JSON-LD
      `Person`). Doplnit stránku autora (`/blog/autor/<slug>`) s fotkou, krátkým bio a odkazy
      (LinkedIn apod.) – posílí E-E-A-T; pak `author.url` v JSON-LD článku.
- [ ] **Core Web Vitals**: po spuštění sledovat ve Search Console (mapa s Leafletem je těžká –
      na úvodní stránce pro hosty zvážit statický náhled místo plné mapy).
- [ ] **Historie cen pro `/ceny`**: dnes je v grafu vývoj z měsíčních průměrů; s reálnými daty
      potřebujeme aspoň 3–6 měsíců sběru, než bude vývoj vypovídat.

### TODO – obrázky z Cloudflare R2 (spolu s přesunem DNS na Cloudflare)

Dnes: ilustrace ukázkových článků leží v `public/blog/*.svg` (servíruje Vercel), fotky nahrané
v editoru blogu jdou do Supabase Storage (bucket `blog-images`, cesta `<uid autora>/<rok-měsíc>/<uuid>.<ext>`,
i u článků, které ještě čekají na schválení), připravené jsou buckety `seller-photos` a `avatars`.
Fotky smazaného nebo zamítnutého článku se z bucketu mažou hned (administrace → Blog) a tlačítko
„Uklidit fotky“ smaže soubory, na které neodkazuje žádný článek (RPC `blog_orphan_images`). Cíl: **všechna média z Cloudflare R2** přes vlastní doménu –
nulové poplatky za přenos dat, cache na CDN Cloudflare, Vercel ani Supabase nic neservírují.

- [ ] **Bucket a doména:** v Cloudflare vytvořit R2 bucket (např. `podpalto-media`, složky
      `blog/`, `sellers/`, `avatars/`) a připojit ho jako veřejný přes vlastní doménu
      `media.podpalto.cz` (R2 → Settings → Custom Domains; funguje až po přesunu DNS na Cloudflare).
- [ ] **Cache a bezpečnost:** pravidlo cache pro `media.podpalto.cz` (dlouhá platnost,
      názvy souborů jsou unikátní), CORS bucketu jen pro `https://podpalto.cz` a
      `https://*.vercel.app` (nahrávání z prohlížeče), limit velikosti a typů souborů.
- [ ] **Nahrávání:** R2 API token (Access Key + Secret, jen *Object Read & Write* pro tento
      bucket) uložit **jen do proměnných Vercelu** (serverové, bez `NEXT_PUBLIC_`). Nový route
      handler / server action ověří v Supabase roli (editor/admin u blogu, vlastník u fotek
      prodejce, uživatel u avataru) a vrátí předpodepsanou URL (S3 API, `PutObject`, platnost pár
      minut); prohlížeč nahraje soubor rovnou do R2. U blogu smí nahrávat **kdokoli přihlášený**
      (články čekající na schválení), ale jen do své složky `blog/<uid>/…`. Upravit
      `uploadBlogImage` / `blogImageUrl` / `removeBlogImages` v `src/lib/blog/supabase.ts`.
- [ ] **Mazání:** smazání / zamítnutí článku a úklid nepoužitých fotek (`blog_orphan_images`)
      přepsat na mazání v R2 (server action s `DeleteObjects`); úklid ideálně automaticky
      (Vercel Cron nebo Cloudflare Worker jednou denně) místo ručního tlačítka.
- [ ] **Limity pro nové autory:** max. velikost a počet fotek na článek a uživatele (dnes 5 MB
      na soubor z nastavení bucketu, počet neomezený) – hlídat při vydávání předpodepsané URL.
- [ ] **Proměnná:** `NEXT_PUBLIC_MEDIA_URL=https://media.podpalto.cz` – všechny URL obrázků
      skládat z ní (blog, prodejci, avatary).
- [ ] **Přesun existujících souborů:** `public/blog/*.svg` a obsah Supabase bucketů
      zkopírovat do R2 a v databázi přepsat URL (`blog_posts.cover_url`, obrázky v
      `blog_posts.content`, `sellers.photo_url`, `profiles.avatar_url`) – jednorázový skript.
- [ ] **Úklid:** po ověření vypnout zápis do Supabase bucketů (storage policies) a smazat
      `public/blog/*.svg` z repozitáře; v `docs/agent-output-spec.md` doplnit, že fotky
      prodejců od agentů jdou do R2 (`sellers/<seller_id>/…`).
- [ ] **Optimalizace obrázků:** zvážit Cloudflare Images / Image Resizing (zmenšování a WebP
      na CDN) místo `next/image`, aby se optimalizace neúčtovala na Vercelu.

---

## 8. Další dokumentace

- [ARCHITECTURE.md](./ARCHITECTURE.md): architektura, rendering, stav aplikace, doménová logika, design systém, omezení a další kroky.
- `AGENTS.md`: pokyny pro AI agenty pracující s tímto repozitářem (verze Next.js s odlišnými konvencemi).
- Nadřazený `README.md` v kořeni monorepa: popis celého projektu a částí `app/` a `tools/`.
