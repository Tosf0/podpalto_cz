# podpalto.cz – frontend

Veřejná **cenová mapa tuhých paliv** v ČR (palivové dřevo, dřevěné pelety, brikety, uhlí) a interní modul **CI Studio** pro analýzu konkurence. Uživatel zadá svou polohu nebo PSČ a vidí ceny prodejců včetně odhadu dopravy a přepočtu na Kč/kWh. CI Studio spouští multiagentní analýzu konkurenta v [CrewAI](https://docs.crewai.com), která běží na backendu na Railway. Frontend je nasazen na Vercel.

Dokument je určen vývojářům frontendu a také backendové kolegyni, která implementuje REST API. Hlubší popis architektury je v [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Obsah

1. [Rychlý start](#1-rychlý-start)
2. [Stránky a funkce](#2-stránky-a-funkce)
3. [Technologie](#3-technologie)
4. [Struktura složek](#4-struktura-složek)
5. [REST API kontrakt pro CrewAI backend](#5-rest-api-kontrakt-pro-crewai-backend)
6. [Mock režim](#6-mock-režim)
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
| `NEXT_PUBLIC_API_URL` | *(prázdné)* | URL backendu FastAPI + CrewAI na Railway, bez koncového lomítka. **Prázdné = mock režim** (všechna data z `src/data/`). |
| `NEXT_PUBLIC_MOCK_LATENCY_MS` | `150` | Umělá latence mock API v ms, aby se ukázaly loading stavy. |
| `NEXT_PUBLIC_MOCK_RUN_SPEED` | `1` | Zrychlení simulace CrewAI běhu v CI Studiu (1 ≈ 30 s, 3 ≈ 10 s). |
| `NEXT_PUBLIC_MAP_TILE_URL` | *(prázdné)* | Vlastní zdroj mapových dlaždic. Prázdné = OpenStreetMap bez klíče. |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | *(prázdné)* | Text atribuce k dlaždicím (HTML). |
| `NEXT_PUBLIC_GEOCODER_URL` | `https://photon.komoot.io/api/` | Geokodér pro našeptávač adres nad mapou (Photon, data OpenStreetMap, omezeno na ČR). `off` = jen lokální shody (PSČ, města). Pro produkci vlastní instance Photonu nebo komerční API. |
| `NEXT_PUBLIC_EUR_CZK_RATE` | `24.43` | Kurz Kč za 1 € pro zobrazení cen v eurech (Nastavení → Měna). Výchozí kurz ČNB z 16. 11. 2026. Data i API zůstávají v Kč. |
| `NEXT_PUBLIC_REGIONS_GEOJSON_URL` | *(prázdné)* | Volitelné GeoJSON hranic 14 krajů (vlastnost `kod` = `PHA`/`STC`/… nebo `nazev`) pro choropleth. Bez něj se vykreslí plynulá heat mapa celé ČR (oříznutá hranicí státu). |

Všechny proměnné začínají `NEXT_PUBLIC_`, takže se **zapékají do buildu**. Po změně je nutné aplikaci znovu sestavit (na Vercelu redeploy).

---

## 2. Stránky a funkce

| Cesta | Soubor | Hlavní funkce |
|---|---|---|
| `/` | `src/app/page.tsx` → `HomeView` | **Mapa cen.** Celoplošná interaktivní **Leaflet mapa** (výchozí celá ČR) s překryvnými widgety: nahoře uprostřed vyhledávací lišta adresy s našeptávačem (adresy, PSČ, obce, prodejci) – vybrané místo se najde a přiblíží; vlevo nahoře přepínač Kč/jednotka ↔ Kč/kWh, vpravo nahoře vrstva krajů, moje poloha a zoom; pod mapou ukotvený pás průměrných cen ČR s legendou (mapa pod ním nepokračuje). Vrstva krajů je plynulá heat mapa vyplňující celé území ČR. Shluky ukazují nejnižší cenu („od 1 190 Kč/PRMS“), cenovky jsou barvené podle hladiny vůči průměru kraje. **Pravý panel (1/5)**: filtry (palivo, „Jen v okolí“ + okruh 10–100 km, podrobné filtry, řazení) a seznam výsledků. Klik na cenovku/výsledek otevře **detail prodejce (2/5)**: ilustrace/fotka, ceník, doprava, kontakty a akce **Objednat** (poptávkový formulář), Porovnat, Celý profil. Na mobilu jsou filtry i detail spodní panely. |
| `/kalkulacka` | `src/app/kalkulacka/page.tsx` → `CalculatorPage` | **Chytrá kalkulačka vytápění.** (1) Převodník PRMS / PRM / PLM a výhřevnosti podle dřeviny a vlhkosti, s ekvivalenty v peletách, briketách a uhlí. Vysvětlení syrového dřeva. (2) Sezónní kalkulačka: zadání potřeby tepla v kWh/rok a účinnosti kotle, seřazení prodejců podle konečné ceny vč. dopravy. (3) Srovnávač až 4 prodejců. (4) Sekce **Metodika** s koeficienty z `src/lib/constants.ts`. |
| `/prodejci` | `src/app/prodejci/page.tsx` → `SellersCatalog` | **Katalog prodejců.** Přepínání tabulka / mřížka. Filtry: fulltext, kraj, velikost, šířka sortimentu, typ dopravy (vlastní, hydraulická ruka, zdarma v okolí, osobní odběr), palivo. Řazení podle názvu, hodnocení, nejlevnějšího tvrdého dřeva, šíře sortimentu nebo poslední aktualizace. Sloupec „CI hrozba“ z CI analýzy. |
| `/prodejci/[slug]` | `src/app/prodejci/[slug]/page.tsx` → `SellerDetail` | **Profil prodejce.** Kontakty a adresa, tlačítko „Porovnat“ (sdíleno s kalkulačkou). Kompletní ceník s přepočtem Kč/kWh a sloupcem změny za 12 měsíců. Graf vývoje ceny vybraného produktu s čárkovanou čárou průměru ČR. Odhad dopravy pro zvolenou polohu. Sekce **Competitive Intelligence** (positioning, tón, USP, SWOT matice, cenové srovnání s krajem a ČR) nebo výzva ke spuštění analýzy v CI Studiu. |
| `/trendy` | `src/app/trendy/page.tsx` → `TrendsView` | **Trh a trendy.** KPI karty čtyř komodit se sparkline, automaticky generovaný krátký komentář, měsíční vývoj cen za 12 měsíců, srovnání krajů, náklady na kWh podle paliva (včetně účinnosti kotle) a sezónnost. |
| `/ci-studio` | `src/app/ci-studio/page.tsx` → `CiStudio` | **CI Studio (CrewAI).** Schéma flow `CompetitorAnalysisFlow`. Formulář pro URL konkurenta s validací a příklady. Průběh běhu: stav kroků, progress bar, konzole `crew.log` s úrovněmi INFO / TOOL / THINK / OK / ERR. Archiv reportů z `outputs/` s filtry (kraj, palivo, řazení, fulltext). Prohlížeč reportu s taby (Summary, Offering & Pricing, Positioning, SWOT, Recommendations), SWOT maticí, metadaty, stažením `.md` a kopírováním. Parametry `?url=` (předvyplní URL) a `?report=` (otevře report). |

Společné prvky: **levý navigační panel** (~1/5 šířky, tmavé jehličí) s logem a položkami menu (ikona + název + popis); dole widget s přepínačem světlého/tmavého režimu a **Nastavením** (zobrazení cen, výchozí poloha, vzhled, porovnání), pod ním účet a „Odhlásit se“ (zatím jen připraveno – přihlašování není napojené). Na mobilu horní lišta s menu. Patička (mimo mapu), stránka 404 a chybová stránka. Upozornění na ukázková data jen v mock režimu.

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

## 5. REST API kontrakt pro CrewAI backend

Frontend volá backend z prohlížeče (klientské komponenty přes `useApi`). Base URL je `NEXT_PUBLIC_API_URL` bez koncového lomítka. Všechny odpovědi jsou JSON. Typy jsou v `src/types/index.ts`.

### 5.1 Obecná pravidla

- **Úspěch:** HTTP 2xx s JSON tělem.
- **„Nenalezeno“:** u `GET /api/sellers/{slug}` a `GET /api/reports/{id}` vraťte **HTTP 404**. Frontend pak zobrazí prázdný stav (`null`), nikoli chybu.
- **Jiné chyby** (4xx/5xx): frontend vyhodí `ApiError` se stavem a tělem a zobrazí chybový stav s možností „Zkusit znovu“.
- **CORS:** povolte původ Vercelu (produkční i případné preview domény) a `http://localhost:3001` (lokální vývoj). Frontend posílá `Accept: application/json` a u POST `Content-Type: application/json`.
- **Pojmenování:** tržní data jsou v **camelCase** (`avgPrices`, `priceIndex`, `changePct`). Objekty CrewAI jsou v **snake_case** (`competitor_url`, `run_id`, `report_path`), protože kopírují Pydantic modely z flow.
- **Čísla:** ceny jsou v Kč vč. DPH. Měsíce ve formátu `YYYY-MM`. Data a časy v ISO 8601.

### 5.2 Přehled endpointů

| Metoda | Cesta | Query / body | Odpověď (typ) | Poznámka |
|---|---|---|---|---|
| GET | `/api/sellers` | `region` (RegionCode), `category` (FuelCategory), oba volitelné | `Seller[]` | Prázdné parametry se neposílají. |
| GET | `/api/sellers/{slug}` | – | `Seller` | 404 → `null`. |
| GET | `/api/market/pulse` | – | `MarketPulseItem[]` | KPI lišta, 4 položky. |
| GET | `/api/market/regions` | – | `RegionStats[]` | 14 krajů. |
| GET | `/api/market/trends` | `months` (výchozí 12) | `PriceTrendPoint[]` | Nejstarší první. |
| GET | `/api/market/energy-costs` | – | `EnergyCostItem[]` | Kč/kWh podle paliva. |
| GET | `/api/reports` | – | `CrewAnalysisReportSummary[]` | Nejnovější první, bez těla `report`. |
| GET | `/api/reports/{id}` | – | `CrewAnalysisReport` | Vč. Markdownu. 404 → `null`. |
| POST | `/api/analyze` | body `{ "competitor_url": string }` | `StartAnalysisResponse` | Spustí běh na pozadí. |
| GET | `/api/analyze/{run_id}` | – | `AnalysisRun` | Frontend polluje každých **1500 ms** (`ANALYSIS_POLL_MS`). |

Hodnoty `RegionCode`: `PHA`, `STC`, `JHC`, `PLK`, `KVK`, `ULK`, `LBK`, `HKK`, `PAK`, `VYS`, `JHM`, `OLK`, `ZLK`, `MSK`. Hodnoty `FuelCategory`: `wood`, `pellets`, `briquettes`, `coal`.

### 5.3 Prodejci

**`GET /api/sellers?region=JHM&category=wood`** → `Seller[]`

**`GET /api/sellers/{slug}`** → `Seller`, nebo 404

Typ `Seller` (zkráceno; úplný tvar viz `src/types/index.ts`):

```json
{
  "id": "s-brno-01",
  "slug": "brnenske-palivo",
  "name": "Brněnské palivo",
  "website": "https://www.brnenske-palivo.cz",
  "description": "Rodinný prodejce dřeva a pelet v Brně a okolí.",
  "address": { "street": "Příkop 12", "city": "Brno", "zip": "602 00", "region": "JHM", "district": "Brno-město" },
  "location": { "lat": 49.1951, "lng": 16.6068 },
  "size": "small",
  "rating": 4.6,
  "reviewCount": 84,
  "categories": ["wood", "pellets"],
  "tags": ["skladem", "vlastni-doprava", "platba-kartou"],
  "products": [
    {
      "id": "p-buk-prms-33",
      "sellerId": "s-brno-01",
      "name": "Buk štípaný suchý 33 cm",
      "category": "wood",
      "woodSpecies": ["buk"],
      "woodGroup": "hard",
      "woodForm": "sypane",
      "moisture": "dry",
      "moisturePercent": 16,
      "logLengthCm": 33,
      "price": 1490,
      "unit": "PRMS",
      "stock": "in_stock",
      "priceHistory": [{ "date": "2025-12", "price": 1450 }, { "date": "2026-11", "price": 1490 }],
      "updatedAt": "2026-11-14T08:00:00.000Z"
    }
  ],
  "delivery": {
    "ownDelivery": true,
    "hydraulicArm": false,
    "pickupAvailable": true,
    "baseFee": 390,
    "pricePerKm": 18,
    "freeRadiusKm": 15,
    "freeOverQuantity": 5,
    "maxRadiusKm": 80
  },
  "intel": {
    "reportId": "20261112-160933_https-www-brnenske-palivo-cz",
    "positioning": "Lokální dodavatel s důrazem na suché dřevo.",
    "toneOfVoice": "věcný a přátelský",
    "usp": ["Suché dřevo do 20 %", "Rozvoz do 48 h"],
    "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
    "priceIndexVsCz": -3.2,
    "threatLevel": "medium",
    "analyzedAt": "2026-11-12T16:09:33.000Z"
  },
  "lastScrapedAt": "2026-11-14T06:00:00.000Z"
}
```

Poznámky k polím:

- `products[].price` je cena za `unit` (`PRMS`, `PRM`, `PLM`, `t`, `paleta`, `pytel`). Pro `paleta` a `pytel` jsou potřeba `packageKg`, resp. `packagePrm`.
- `intel` je volitelné. Vyplňuje se z posledního CrewAI reportu daného prodejce (`reportId`, `threatLevel`, `priceIndexVsCz` = odchylka od průměru ČR v %).
- `lastScrapedAt` je poslední průchod CrewAI webem prodejce.

### 5.4 Trh

**`GET /api/market/pulse`** → `MarketPulseItem[]`

```json
[
  { "key": "hardWoodPrms", "label": "Tvrdé dřevo", "unit": "Kč/PRMS", "value": 1840, "changePct": 0.8, "spark": [1790, 1805, 1812, 1822, 1830, 1840] }
]
```

Klíče `key`: `hardWoodPrms`, `softWoodPrms`, `pelletsT`, `briquettesT`, `coalT`. Pole `spark` obsahuje posledních 6 měsíců.

**`GET /api/market/regions`** → `RegionStats[]`

```json
[
  {
    "region": "JHM",
    "name": "Jihomoravský kraj",
    "avgPrices": { "hardWoodPrms": 1820, "softWoodPrms": 1510, "pelletsT": 6600, "briquettesT": 5600, "coalT": 4100 },
    "sellerCount": 9,
    "priceIndex": 99.4,
    "changePct": -0.3
  }
]
```

`priceIndex`: 100 = průměr ČR. `changePct`: meziměsíční změna indexu v %.

**`GET /api/market/trends?months=12`** → `PriceTrendPoint[]` (nejstarší první)

```json
[
  { "month": "2026-10", "hardWoodPrms": 1820, "softWoodPrms": 1500, "pelletsT": 6550, "briquettesT": 5520, "coalT": 4080 },
  { "month": "2026-11", "hardWoodPrms": 1840, "softWoodPrms": 1510, "pelletsT": 6600, "briquettesT": 5600, "coalT": 4100 }
]
```

**`GET /api/market/energy-costs`** → `EnergyCostItem[]`

```json
[
  { "id": "pelety-a1", "label": "Pelety ENplus A1", "category": "pellets", "kcPerKwh": 1.35, "kcPerKwhHeat": 1.5, "efficiency": 0.9 }
]
```

`kcPerKwh` = cena za kWh energie v palivu. `kcPerKwhHeat` = cena za kWh dodaného tepla (po účinnosti kotle). Pole je seřazeno podle `kcPerKwhHeat` vzestupně.

### 5.5 Reporty CI

**`GET /api/reports`** → `CrewAnalysisReportSummary[]` (nejnovější první, bez `report`)

```json
[
  {
    "id": "20261112-160933_https-www-brnenske-palivo-cz",
    "competitor_url": "https://www.brnenske-palivo.cz",
    "competitor_name": "Brnenske Palivo",
    "competitor_domain": "brnenske-palivo.cz",
    "report_path": "outputs/20261112-160933_https-www-brnenske-palivo-cz.md",
    "created_at": "2026-11-12T16:09:33.000Z",
    "status": "completed",
    "model": "anthropic/claude-opus-5-5",
    "duration_s": 29.5,
    "region": "JHM",
    "categories": ["wood", "pellets"],
    "excerpt": "Brnenske Palivo je regionální prodejce zaměřený na domácnosti vytápějící dřevem a peletami…"
  }
]
```

`excerpt` jsou první přibližně 240 znaků sekce Summary bez Markdownu. Typ je `Omit<CrewAnalysisReport, "report"> & { excerpt: string }`.

**`GET /api/reports/{id}`** → `CrewAnalysisReport`, nebo 404

```json
{
  "id": "20261112-160933_https-www-brnenske-palivo-cz",
  "competitor_url": "https://www.brnenske-palivo.cz",
  "report": "# Competitor report: brnenske-palivo.cz\n\n## Summary\n\n…\n\n## SWOT\n\n### Strengths\n\n- …\n\n## Recommendations for podpalto.cz\n\n1. **Zdůraznit cenu v Kč/kWh.** …",
  "report_path": "outputs/20261112-160933_https-www-brnenske-palivo-cz.md",
  "competitor_name": "Brnenske Palivo",
  "competitor_domain": "brnenske-palivo.cz",
  "created_at": "2026-11-12T16:09:33.000Z",
  "status": "completed",
  "model": "anthropic/claude-opus-5-5",
  "duration_s": 29.5,
  "region": "JHM",
  "categories": ["wood", "pellets"],
  "swot": {
    "strengths": ["Široký sortiment dřeva a pelet na jednom místě"],
    "weaknesses": ["Web neukazuje cenu v Kč/kWh"],
    "opportunities": ["Partnerství s montéry kotlů a kamen"],
    "threats": ["Cenová válka s regionálními prodejci"]
  }
}
```

Pole `swot` je volitelné. Pokud chybí, frontend ho vyparsuje z Markdownu. Pole `seller_id` (volitelné) propojuje report s prodejcem v katalogu.

### 5.6 CI běh analýzy

**`POST /api/analyze`**, body `{ "competitor_url": "https://www.konkurent.cz" }`

→ `StartAnalysisResponse`

```json
{ "run_id": "run_8f3a21", "status": "queued" }
```

**`GET /api/analyze/{run_id}`** → `AnalysisRun` (frontend polluje každých 1500 ms, dokud `status` není `completed` nebo `failed`)

```json
{
  "run_id": "run_8f3a21",
  "competitor_url": "https://www.konkurent.cz",
  "status": "running",
  "progress": 45,
  "steps": [
    {
      "id": "validate_input",
      "method": "validate_input",
      "label": "Validace URL konkurenta",
      "status": "done",
      "started_at": "2026-11-16T10:00:00.000Z",
      "finished_at": "2026-11-16T10:00:01.600Z"
    },
    {
      "id": "run_research.web_researcher",
      "method": "run_research",
      "label": "Průzkum webu konkurenta",
      "agent": "web_researcher",
      "agent_role": "Competitive Intelligence Web Researcher",
      "status": "running",
      "started_at": "2026-11-16T10:00:01.600Z"
    },
    {
      "id": "run_research.market_analyst",
      "method": "run_research",
      "label": "Analýza trhu a doporučení",
      "agent": "market_analyst",
      "agent_role": "Market Analyst for podpalto.cz",
      "status": "pending"
    },
    {
      "id": "save_report",
      "method": "save_report",
      "label": "Uložení Markdown reportu",
      "status": "pending"
    }
  ],
  "logs": [
    { "ts": "2026-11-16T10:00:00.200Z", "step": "validate_input", "level": "info", "message": "Flow CompetitorAnalysisFlow spuštěn, competitor_url=https://www.konkurent.cz" },
    { "ts": "2026-11-16T10:00:03.600Z", "step": "run_research.web_researcher", "level": "tool", "message": "PageTextTool → GET https://www.konkurent.cz/", "agent": "web_researcher" }
  ],
  "started_at": "2026-11-16T10:00:00.000Z"
}
```

Hodnoty `status` běhu: `queued`, `running`, `completed`, `failed`. Hodnoty `steps[].status`: `pending`, `running`, `done`, `error`. Úrovně `logs[].level`: `info`, `tool`, `thought`, `success`, `error`.

Po úspěšném dokončení vyplňte `report_id` (stem názvu souboru v `outputs/`). Při selhání vyplňte `error` (lidsky čitelná zpráva, zobrazí se uživateli).

### 5.7 Mapování na CrewAI flow

Zdrojový kód: `app/src/podpalto_app/flows/competitor_analysis.py`, konfigurace agentů a úloh: `app/src/podpalto_app/crews/research_crew/config/{agents,tasks}.yaml`.

**Spuštění.** Backend zavolá `CompetitorAnalysisFlow().kickoff(inputs={"competitor_url": url})` na pozadí a okamžitě vrátí `run_id`.

**Stav flow ↔ TS typ.** Pydantic `CompetitorAnalysisState` (`competitor_url`, `report`, `report_path`) je 1:1 zrcadlen v TS typu `CompetitorAnalysisState`. `CrewAnalysisReport` jej rozšiřuje o metadata API (`id`, `competitor_name`, `competitor_domain`, `created_at`, `status`, `model`, `duration_s`, volitelně `seller_id`, `region`, `categories`, `swot`). Tato metadata backend doplní sám. Flow je nevytváří.

**Kroky flow ↔ `CrewStep`.**

| Krok flow (metoda) | `CrewStep.id` | Poznámka |
|---|---|---|
| `validate_input` (`@start`) | `validate_input` | Doplní URL z nastavení, pokud chybí. |
| `run_research` (`@listen`) | `run_research.web_researcher`, `run_research.market_analyst` | Jedna metoda flow spouští `ResearchCrew` s `Process.sequential`. Dva agenti se ve frontendu zobrazují jako dva kroky. Události pro ně posílejte z callbacků crew (task/step callback), nikoli z flow. |
| `save_report` (`@listen`) | `save_report` | Zapíše `outputs/YYYYMMDD-HHMMSS_<slug>.md`. |

**Agenti.** `web_researcher` („Competitive Intelligence Web Researcher“) má nástroj `PageTextTool` a čte stránky konkurenta. `market_analyst` („Market Analyst for podpalto.cz“) sestavuje SWOT a doporučení. Úlohy: `research_task` → `analysis_task` (kontext `research_task`).

**ID reportu.** `id` = název souboru bez přípony. Flow ho vytváří takto:

```python
slug = re.sub(r"[^a-z0-9]+", "-", competitor_url.lower()).strip("-")   # https://www.brnenske-palivo.cz → https-www-brnenske-palivo-cz
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")                        # 20261112-160933
path = settings.output_dir / f"{stamp}_{slug}.md"
```

Výsledné ID je `20261112-160933_https-www-brnenske-palivo-cz`. Stejný tvar generuje mock simulace.

**Očekávaná struktura Markdownu.** Frontend report parsuje (`src/lib/report-parser.ts`), proto zachovejte tyto sekce a jejich názvy (anglické i české varianty fungují, ale držte se anglických):

```markdown
# Competitor report: brnenske-palivo.cz

## Summary
…

## Offering & Pricing
…

## Positioning
…

## SWOT

### Strengths
- …

### Weaknesses
- …

### Opportunities
- …

### Threats
- …

## Recommendations for podpalto.cz
1. …
```

Parser najde sekce podle názvu nadpisu, kterýkoli úroveň `#` až `######`. SWOT čte položky pod podnadpisy `Strengths`, `Weaknesses`, `Opportunities`, `Threats` (nebo tučné štítky `**Strengths:**`). Položky jsou odrážky nebo číslované seznamy. Pokud SWOT vrátíte jako strukturovaný JSON v poli `swot`, parser se nepoužije.

### 5.8 Poznámky pro backend

1. **CORS** pro doménu Vercelu a `localhost:3001`, viz 5.1.
2. **Konvence jmen:** tržní data camelCase, CrewAI objekty snake_case. Neměňte je, frontend je očekává v této podobě.
3. **Běh na pozadí:** `POST /api/analyze` musí vrátit `run_id` okamžitě. Flow spusťte v `BackgroundTasks`, vlákně nebo workeru. Nečekejte na dokončení.
4. **Úložiště stavu běhů:** pro demo stačí paměť procesu. Na Railway ale proces může restartovat nebo běžet ve více instancích, a pak se běhy ztratí. Pro produkci použijte Redis nebo databázi.
5. **Progress 0–100** počítejte podle dokončených kroků (např. validace 5 %, průzkum 40 %, analýza 40 %, uložení 15 %).
6. **Archiv reportů:** `GET /api/reports` čte `outputs/*.md`. `id` je stem souboru. `competitor_name` a `competitor_domain` odvoďte z URL (`competitor_domain` bez `www.`). `excerpt` vezměte ze sekce Summary.
7. **`report_path`:** flow vrací absolutní cestu na serveru. Do API posílejte relativní `outputs/<soubor>.md`, ať neuniká cesta serveru.
8. **Mapování `seller_id`:** pokud je report pro prodejce z katalogu, vyplňte `seller_id`. Frontend pak u prodejce zobrazí odkaz na profil.
9. **Chyby:** neznámé `id` nebo `run_id` vracejte jako 404. Ostatní chyby jako 4xx/5xx s tělem `{ "detail": "…" }` nebo podobně, `ApiError` ho předá do UI.

#### Návrh minimálního FastAPI (pouze návrh, pseudokód)

```python
# Návrh – ilustrativní, nejde o hotový kód.
from pathlib import Path
from uuid import uuid4
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from podpalto_app.flows.competitor_analysis import CompetitorAnalysisFlow

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["https://<vercel-domena>", "http://localhost:3001"],
                   allow_methods=["*"], allow_headers=["*"])
RUNS: dict[str, dict] = {}  # v produkci nahradit Redisem / DB

class StartRequest(BaseModel):
    competitor_url: str

def run_flow(run_id: str, url: str) -> None:
    RUNS[run_id]["status"] = "running"
    try:
        flow = CompetitorAnalysisFlow()
        flow.kickoff(inputs={"competitor_url": url})
        RUNS[run_id].update(status="completed", report_id=Path(flow.state.report_path).stem)
    except Exception as exc:
        RUNS[run_id].update(status="failed", error=str(exc))

@app.post("/api/analyze")
def start(req: StartRequest, tasks: BackgroundTasks):
    run_id = f"run_{uuid4().hex[:6]}"
    RUNS[run_id] = {"run_id": run_id, "competitor_url": req.competitor_url, "status": "queued",
                    "progress": 0, "steps": [], "logs": [], "started_at": "…"}
    tasks.add_task(run_flow, run_id, req.competitor_url)
    return {"run_id": run_id, "status": "queued"}

@app.get("/api/analyze/{run_id}")
def status(run_id: str):
    if run_id not in RUNS:
        raise HTTPException(status_code=404)
    return RUNS[run_id]
```

Zbytek API (`/api/sellers`, `/api/market/*`, `/api/reports`) lze naplnit z dat, která už máte v databázi nebo v `outputs/`.

---

## 6. Mock režim

Pokud je `NEXT_PUBLIC_API_URL` prázdné, `IS_MOCK` je `true` (`src/lib/api/config.ts`). Všechny funkce v `src/lib/api/*.ts` pak vracejí lokální data místo HTTP volání. Aplikace je kompletně použitelná bez backendu. Odznak **Demo data** a tooltip na něj upozorňují.

| Co | Kde | Poznámka |
|---|---|---|
| Prodejci | `src/data/sellers/part-a.ts`, `part-b.ts`, `index.ts` | 26 **fiktivních** demo prodejců. Ceny, doprava a produkty jsou generovány deterministicky (`src/data/helpers.ts`). |
| Trh | `src/data/market.ts` | `PRICE_TRENDS` (12 měsíců, 12/2025 – 11/2026) a `REGION_STATS` (14 krajů). |
| Odvozená tržní data | `src/lib/api/mock/market.ts` | KPI lišta (`MARKET_PULSE`) a náklady na energii (`ENERGY_COSTS`) se počítají z posledního měsíce. |
| Reporty | `src/data/reports.ts` | 5 statických reportů. |
| Simulace CrewAI | `src/lib/api/mock/analysis-sim.ts` | Stav běhu je **čistá funkce uplynulého času**. Scénář trvá 29,5 s a dělí se hodnotou `NEXT_PUBLIC_MOCK_RUN_SPEED`. Kroky, logy a progress odpovídají reálnému flow. Při dokončení vznikne report ve stejném formátu jako reálný (včetně ID podle času a URL). |

Další detaily mock režimu:

- Každá mock odpověď prochází `mockResolve()` (`client.ts`). Ta data **klonuje** (`structuredClone`) a přidá latenci. UI tak nemůže data omylem zmutovat.
- Běhy a vygenerované reporty drží modul v paměti prohlížeče (`Map`). Po obnovení stránky zmizí, statické reporty zůstanou.
- Stránka `/prodejci/[slug]` se pre-renderuje podle slugů mock prodejců (`generateStaticParams`). I při připojeném backendu, viz omezení v ARCHITECTURE.md.

---

## 7. Nasazení na Vercel

Nasazení je plánované na pozdější fázi. Postup:

1. Vytvořte projekt z repozitáře a v nastavení nastavte **Root Directory** na `frontend`. Framework preset: **Next.js**.
2. Doplňte proměnné prostředí (Production i Preview). Minimum je `NEXT_PUBLIC_API_URL` s URL backendu na Railway. Mapové proměnné dle potřeby.
3. Build a start jsou výchozí (`npm run build`, `next start`). Verze Node nastavte na 20.9 nebo novější.
4. Po každé změně proměnných `NEXT_PUBLIC_*` proveďte **redeploy**, jinak se nová hodnota nepropíše do buildu.
5. Backend musí povolit CORS pro produkční doménu Vercelu (sekce 5.1).

Pro produkci s vyšším provozem nepoužívejte veřejný OpenStreetMap jako zdroj dlaždic. Nastavte vlastního poskytovatele přes `NEXT_PUBLIC_MAP_TILE_URL` a respektujte jeho podmínky a atribuci.

---

## 8. Další dokumentace

- [ARCHITECTURE.md](./ARCHITECTURE.md): architektura, rendering, stav aplikace, doménová logika, design systém, omezení a další kroky.
- `AGENTS.md`: pokyny pro AI agenty pracující s tímto repozitářem (verze Next.js s odlišnými konvencemi).
- Nadřazený `README.md` v kořeni monorepa: popis celého projektu a částí `app/` a `tools/`.
