# Architektura frontendu podpalto.cz

Technický popis frontendu: vrstvy, rendering, stav, doménová logika, design systém a známá omezení. Praktický návod a REST kontrakt pro backend jsou v [README.md](./README.md).

---

## Obsah

1. [Přehled a kontext](#1-přehled-a-kontext)
2. [Architektura](#2-architektura)
3. [Vrstvy a odpovědnosti](#3-vrstvy-a-odpovědnosti)
4. [Rendering strategie](#4-rendering-strategie)
5. [Stav aplikace](#5-stav-aplikace)
6. [Datová vrstva a mock režim](#6-datová-vrstva-a-mock-režim)
7. [Doménová logika](#7-doménová-logika)
8. [Design systém](#8-design-systém)
9. [Mapa](#9-mapa)
10. [CI Studio a orchestrace agentů](#10-ci-studio-a-orchestrace-agentů)
11. [Známá omezení a další kroky](#11-známá-omezení-a-další-kroky)

---

## 1. Přehled a kontext

podpalto.cz je veřejná cenová mapa tuhých paliv v ČR a interní nástroj **Competitive Intelligence**. Frontend je **Next.js 16** aplikace (App Router) nasazená na **Vercelu**. Backend je **FastAPI** nad **CrewAI** na **Railway**. Monorepo obsahuje ještě části `app/` (agenti, úlohy, flows) a `tools/` (vlastní nástroje, např. `PageTextTool`). Frontend na nich závisí jen přes REST API.

Klíčová rozhodnutí:

- **Žádná serverová logika ve frontendu.** Aplikace nemá route handlery (`app/api`). Veškerá data přicházejí z REST API nebo z lokálních mock dat.
- **Čisté výpočty.** Ceny, doprava, filtry a parser reportů jsou čisté funkce bez React a Leafletu. Lze je testovat i spouštět na serveru.
- **Plně funkční bez backendu.** Při prázdném `NEXT_PUBLIC_API_URL` běží celá aplikace na mock datech, včetně simulace CrewAI běhu.
- **Stránky jsou tenké.** `page.tsx` jen skládá klientské feature komponenty.

---

## 2. Architektura

```
┌──────────────────────────── Prohlížeč (Next.js na Vercelu) ─────────────────────────────┐
│                                                                                          │
│  src/app/  (App Router)                                                                  │
│    layout.tsx ──▶ AppProviders ──▶ AppShell: AppSidebar │ <main>{page} · SiteFooter      │
│    page.tsx (tenká server komponenta, statický prerender)                                │
│        │                                                                                 │
│        ▼                                                                                 │
│  src/components/<feature>/  (klientské komponenty, "use client")                         │
│        │  stav UI (useState, useDeferredValue)     preference (PreferencesProvider)     │
│        ▼                                                                                 │
│  src/hooks/use-api.ts  useApi(fetcher, deps) → { data, error, loading, reload }          │
│        │                                                                                 │
│        ▼                                                                                 │
│  src/lib/api/*  (servisní vrstva)                                                        │
│        │  IS_MOCK = true ─────▶ mock/ + src/data/  (latence, structuredClone)           │
│        │  IS_MOCK = false ────▶ apiFetch() ──────────────────────────┐                   │
│        │                                                              │                  │
│  src/lib/pricing.ts · filters.ts · report-parser.ts  (čisté funkce)   │                  │
└───────────────────────────────────────────────────────────────────────┼──────────────────┘
                                                                        ▼  HTTPS, JSON, CORS
                    ┌──────────────────────── Railway ────────────────────────────────────┐
                    │  FastAPI  /api/sellers · /api/market/* · /api/reports · /api/analyze │
                    │      │  POST /api/analyze → run_id, běh na pozadí (BackgroundTasks)  │
                    │      ▼                                                               │
                    │  CompetitorAnalysisFlow (CrewAI)                                     │
                    │    validate_input ─▶ run_research ─▶ save_report                     │
                    │                      ├─ web_researcher  (PageTextTool)               │
                    │                      └─ market_analyst  (SWOT, doporučení)           │
                    │      ▼                                                               │
                    │  outputs/YYYYMMDD-HHMMSS_<slug>.md  ─▶ GET /api/reports[/{id}]       │
                    └──────────────────────────────────────────────────────────────────────┘
```

Tok dat v úvodní stránce: `HomeView` načte prodejce a kraje přes `useApi`. Výsledek spočítá `computeMatches()` z `lib/filters.ts` (výpočty cen a dopravy z `lib/pricing.ts`). Komponenty `SellerList` a `SellerMap` jen zobrazují výsledek.

---

## 3. Vrstvy a odpovědnosti

| Vrstva | Adresář | Odpovědnost | Smí importovat |
|---|---|---|---|
| Routing a layout | `src/app/` | Stránky, metadata, root layout, prerender | `components/*` |
| Feature komponenty | `src/components/<feature>/` | UI jednotlivých sekcí, lokální stav | `hooks`, `lib`, `components/common`, `components/ui` |
| Sdílené prvky | `src/components/common/`, `ui/` | Doménová primitiva (`common/`) a shadcn/ui komponenty (`ui/`) | `lib` |
| Providery | `src/components/providers/` | Globální kontexty (téma, tooltip, toaster, preference) | `lib` |
| Hooky | `src/hooks/` | `useApi` | `lib/api` |
| Servisní vrstva | `src/lib/api/` | Jediné místo volání API nebo mock dat | `types`, `data`, `lib/*` |
| Doménová logika | `src/lib/pricing.ts`, `filters.ts`, `constants.ts`, `report-parser.ts`, `format.ts` | Čisté funkce bez React | `types`, `lib/constants` |
| Mock data | `src/data/`, `src/lib/api/mock/` | Fiktivní data a simulace | `types` |
| Kontrakt | `src/types/index.ts` | Typy JSON odpovědí a stavů (jediný zdroj pravdy) | – |

Pravidla:

- Komponenta nevolá `fetch` ani nesahá do `src/data/`. Vše jde přes `@/lib/api`.
- Výpočty cen se neopakují v komponentách. Kalkulačka, mapa, katalog i profil prodejce používají stejné funkce z `pricing.ts`.
- Typy se nedefinují lokálně v komponentách. Jen `src/types` odpovídá API kontraktu.

---

## 4. Rendering strategie

Projekt používá **Cache Components** (`cacheComponents: true` v `next.config.ts`) a **Partial Prefetching** (`partialPrefetching: true`). Build běží přes **Turbopack**. Tailwind v4 je zapojen do Turbopacku pravidlem pro `*.css` (`@tailwindcss/turbopack`).

Principy použité v kódu:

1. **Thin server page, client feature.** Každá `page.tsx` je server komponenta bez `"use client"`, která vrací jeden klientský komponent. Díky tomu je shell stránky staticky prerenderovaný a data se dotahují až v prohlížeči.
   - `/` → `HomeView`
   - `/kalkulacka` → `CalculatorPage`
   - `/prodejci` → `SellersCatalog`
   - `/trendy` → `TrendsView`
2. **Root layout.** `layout.tsx` načítá fonty (`next/font/google`), globální CSS, Leaflet CSS a metadata. Obaluje app přes `AppProviders` (klient) a `AppShell`: levý navigační panel (`AppSidebar`, sdílená šířka `SIDE_PANEL_WIDTH` = clamp(240px, 20vw, 312px)) + posuvná pravá část `#app-scroll` s `<main>` a patičkou (na `/` bez patičky – mapa je celoobrazovková).
3. **Dynamický segment se `generateStaticParams`.** `/prodejci/[slug]` vrací slugy z `getMockSellerSlugs()`. Parametr `params` je Promise, proto se čte uvnitř `Suspense`:
   ```tsx
   <Suspense fallback={<ListSkeleton count={3} />}>
     {params.then(({ slug }) => <SellerDetail slug={slug} />)}
   </Suspense>
   ```
4. **`useSearchParams` v Suspense.** `/ci-studio` obaluje `CiStudio` do `Suspense` s `fallback={null}`. `useSearchParams` na statické stránce bez hranice by vynutil dynamický render celé stránky.
5. **Leaflet jen v prohlížeči.** `components/map/seller-map-loader.tsx` importuje `seller-map` přes `next/dynamic` s `ssr: false` a `MapSkeleton` jako fallback. Leaflet a jeho DOM tak nejsou potřeba na serveru.
6. **Data se načítají na klientu.** `useApi` běží v `useEffect`. Statický shell tak funguje i bez dostupného backendu a při chybě se zobrazí stav chyby, ne prázdná stránka.
7. **Metadata.** Každá stránka exportuje `metadata` (`title`, popis). Root layout definuje šablonu `%s | podpalto.cz`.

---

## 5. Stav aplikace

Aplikace nepoužívá globální store (Redux, Zustand). Stav se dělí na tři úrovně.

### 5.1 Globální preference: `PreferencesProvider`

Soubor: `src/components/providers/preferences-provider.tsx`. Kontext se čte přes `usePreferences()`.

| Pole | Typ | Význam |
|---|---|---|
| `priceMode` | `"unit" \| "kwh"` | Zobrazení ceny za jednotku (Kč/PRMS, Kč/t) nebo přepočet na Kč/kWh. |
| `location` | `UserLocation` | Lokalita pro vzdálenost a dopravu. Výchozí `DEFAULT_LOCATION` (Praha). |
| `setLocationByZip(zip)` | funkce | Nastaví lokalitu podle PSČ. Vrací `false`, pokud PSČ nelze rozpoznat. |
| `compareIds` | `string[]` | Prodejci k porovnání, maximum `MAX_COMPARE = 4`. Při přidání nad limit se vyřadí nejstarší. |
| `toggleCompare`, `clearCompare` | funkce | Správa seznamu porovnání. |

Persistence:

- Klíč v `localStorage`: `podpalto:prefs:v1`.
- **Hydratace bez mismatche.** Při prvním renderu jsou použity výchozí hodnoty. Uložená data se načtou až v `useEffect` a nastaví `hydrated = true`. Zápis do `localStorage` je až po hydrataci, takže nepřepíše uložená data prázdným stavem.
- Čtení i zápis jsou obaleny `try/catch`, protože `localStorage` může být nedostupný (privátní režim, blokované cookies).
- Zdroj `ZIP_PREFIX_LOCATIONS` a `locationFromZip()` převádí PSČ na lokalitu (viz 7.6).

### 5.2 Téma: `next-themes`

`AppProviders` nastavuje `ThemeProvider` s `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}` a `disableTransitionOnChange`. Výchozí je tedy světlý režim bez ohledu na systém uživatele. Třída `dark` se přidává na `<html>` a aktivuje tmavé tokeny v `globals.css`. Přepínač je v levém panelu a v Nastavení.

### 5.3 Ostatní providery

- `TooltipProvider` s `delayDuration={200}`.
- `Toaster` (sonner) v pozici `bottom-right`, s `richColors`. Používá se u chyb spuštění analýzy, dokončení běhu a kopírování Markdownu.

### 5.4 Lokální stav stránek

Stav filtrů a výběru je v komponentách, ne v kontextu:

- **Úvodní stránka** (`HomeView`): `filters: FilterState`, `hoveredId`, `selection` (s `nonce`, aby se opakovaný klik na stejnou kartu znovu zpracoval), `view` (seznam/mapa na mobilu). Filtry se předávají přes `useDeferredValue`, aby se posuvník neblokoval výpočtem.
- **Katalog** (`SellersCatalog`): fulltext, kraj, velikost, šířka sortimentu, doprava, palivo, řazení, zobrazení tabulka/mřížka.
- **CI Studio**: vybraný report je v URL (`?report=`), aby šel odkaz sdílet a fungovalo tlačítko zpět. Změna se dělá přes `router.replace` s `scroll: false`. Parametr `?url=` předvyplní formulář spuštění analýzy (odkaz z profilu prodejce).

### 5.5 Hook `useApi`

Soubor: `src/hooks/use-api.ts`.

```ts
const { data, error, loading, reload } = useApi(() => getSellers(), []);
```

- Každý požadavek má **token** (objekt vytvořený přes `useMemo` s závislostí na `deps` a na `tick` z `reload()`). Výsledek se uloží jen tehdy, když odpovídá aktuálnímu tokenu. Zastaralé odpovědi se tak ignorují (`cancelled` flag v úklidu efektu).
- `loading` je **odvozené**: `result.token !== token`. Efekt tedy nevolá `setState` synchronně, což splňuje pravidla React Compileru.
- Při přepočtu (nová `deps`) zůstávají předchozí `data` k dispozici, dokud nedorazí nová. UI nebliká prázdným stavem.
- Chyba se uloží do `error`, ale předchozí `data` se zachovají. Při novém požadavku se `error` schová.
- `fetcher` se drží v `ref`, takže uzávěr vždy vidí aktuální props, aniž by měnil `deps`.

---

## 6. Datová vrstva a mock režim

### 6.1 Struktura `src/lib/api/`

| Soubor | Exporty | Endpointy / účel |
|---|---|---|
| `config.ts` | `API_URL`, `IS_MOCK`, `MOCK_LATENCY_MS` | Čtení z env. `API_URL` bez koncového lomítka. |
| `client.ts` | `apiFetch<T>`, `ApiError`, `qs`, `mockResolve` | Tenký wrapper nad `fetch`. `ApiError` nese `status` a `body`. `qs` vynechá `undefined`, `null` a prázdné řetězce. `mockResolve` klonuje data a přidá latenci. |
| `sellers.ts` | `getSellers`, `getSeller`, `getMockSellerSlugs` | `/api/sellers`, `/api/sellers/{slug}` (404 → `null`). |
| `market.ts` | `getMarketPulse`, `getRegionStats`, `getPriceTrends`, `getEnergyCosts` | `/api/market/*`. `getPriceTrends(months)` v mock režimu vrací `slice(-months)`. |
| `reports.ts` | `getReports`, `getReport` | `/api/reports`, `/api/reports/{id}` (404 → `null`). Mock vrací souhrny a text bez těla. Excerpt se odvozuje z sekce Summary a zkracuje na 240 znaků. |
| `analysis.ts` | `startAnalysis`, `getAnalysisRun`, `ANALYSIS_POLL_MS` | `POST /api/analyze`, `GET /api/analyze/{run_id}`. Poll interval 1500 ms. |
| `index.ts` | barrel | Komponenty importují jen odsud. |

Pravidlo pro chyby: `apiFetch` vyhodí `ApiError` u každého ne-2xx stavu. 404 se v `getSeller` a `getReport` převádí na `null`, ostatní chyby se propagují do `useApi`.

### 6.2 Přepínání mock ↔ REST

Každá funkce má stejný tvar:

```ts
export async function getSellers(query = {}) {
  if (!IS_MOCK) return apiFetch<Seller[]>(`/api/sellers${qs({ ...query })}`);
  return mockResolve(/* filtrovaná SELLERS */);
}
```

`IS_MOCK` se vyhodnocuje při buildu, protože jde o `NEXT_PUBLIC_*` proměnnou. Přepnutí na REST tedy vyžaduje nový build.

### 6.3 Mock data

- `src/data/sellers/` – 26 fiktivních prodejců (`part-a.ts`, `part-b.ts`), agregovaných v `SELLERS`.
- `src/data/helpers.ts` – deterministický generátor (mulberry32 PRNG, hash řetězce jako seed). Historie cen je 12 měsíců končících aktuálním měsícem, se sezónními koeficienty (topná sezóna dražší; dřevo a pelety mají větší sezónnost než uhlí). Stejný výstup na serveru i v klientu.
- `src/data/market.ts` – `PRICE_TRENDS` a `REGION_STATS`.
- `src/data/reports.ts` – 5 statických reportů.
- `src/lib/api/mock/market.ts` – KPI lišta a `ENERGY_COSTS` se počítají z posledního měsíce (`PRICE_TRENDS`). Náklady na kWh používají `woodKwhPerUnit()` a `BOILER_EFFICIENCY`. Výsledek je seřazený podle `kcPerKwhHeat`.

### 6.4 Simulace CrewAI běhu

Soubor: `src/lib/api/mock/analysis-sim.ts`.

- **Stav je funkcí času.** `startSimulatedRun()` uloží `{ url, startedAt }` do `Map`. `getSimulatedRun()` při každém volání spočítá `elapsed` a z něj odvodí stav kroků, progress a logy. Nejsou tu žádné timery, takže se simulace dá vrátit do libovolného stavu.
- **Scénář:** 4 kroky, celkem 29,5 scénářových sekund. `NEXT_PUBLIC_MOCK_RUN_SPEED` dělí čas (minimum 0,1). Kroky: `validate_input` (0–1,6 s), `run_research.web_researcher` (1,6–15 s), `run_research.market_analyst` (15–27 s), `save_report` (27–29,5 s).
- **Logy** jsou předdefinované `LogDef` položky s časem `t`, zobrazí se, když `t ≤ elapsed`. Úrovně odpovídají TS typu (`info`, `tool`, `thought`, `success`, `error`).
- **Neplatná URL** (bez `http(s)://` nebo bez tečky v doméně) selže v `validate_input` a běh skončí `failed` s chybovou zprávou. Jde o stejný UX jako u reálného backendu.
- **Report** vznikne při dokončení. Obsahuje SWOT vyparsovanou přímo ze strukturovaných dat (`report.swot`) a Markdown se všemi sekcemi. Hash domény určuje deterministicky region, kategorie, texty SWOT, ceny a index vůči kraji. Stejná doména tak vždy vyjde stejně.
- Výsledné `report_id` odpovídá tvaru z backendu: `YYYYMMDD-HHMMSS_<slug>`, kde `slug` vznikne z celé URL stejným regulárním výrazem jako v Pythonu.

---

## 7. Doménová logika

Všechny koeficienty jsou na jednom místě, `src/lib/constants.ts`. Metodika v sekci `/kalkulacka` (`Methodology`) je čte přímo, takže dokumentace odpovídá výpočtům.

### 7.1 Konstanty

| Konstanta | Hodnota | Význam |
|---|---|---|
| `WOOD_SOLID_FACTOR` | `{ PLM: 1, PRM: 0.7, PRMS: 0.45 }` | Podíl dřevní hmoty v jednotce. 1 PRM ≈ 0,70 PLM, 1 PRMS ≈ 0,45 PLM. |
| `WOOD_KWH_PER_PLM` | `{ hard: 2800, birch: 2500, soft: 2050 }` | kWh na 1 PLM při vlhkosti ~20 %. |
| `MOISTURE_ENERGY_FACTOR` | `{ dry: 1, semi: 0.85, fresh: 0.65 }` | Využitelná energie vzhledem k suchému dřevu. Vlhké dřevo má nižší výhřevnost a část energie se spotřebuje na odpaření vody. |
| `KWH_PER_KG` | pellets 4,9; briquettesWood 4,8; briquettesCoal 5,6; coalBrown 4,9; coalBlack 7,8; coke 7,9 | Výhřevnost v kWh/kg. |
| `BOILER_EFFICIENCY` | wood 0,78; pellets 0,90; briquettes 0,80; coal 0,72 | Typická účinnost spalování ve spotřebiči. |
| `PRICE_TIER_THRESHOLD` | `0.05` | ±5 % vůči průměru kraje pro barvení cen. |
| `RADIUS_MIN_KM` / `DEFAULT` / `MAX` | 10 / 50 / 100 km | Okruh na úvodní stránce, krok posuvníku 5 km. |
| `CZ_CENTER`, `CZ_BOUNDS` | střed ČR, bounding box | Výchozí výřez mapy. |
| `FUEL_META` | barvy a třídy po kategoriích | Viz 8.3. |

Ve `pricing.ts` je dále `roadDistanceKm = haversine × 1,25` (odhad silniční vzdálenosti z vzdušné) a v `seller-map.tsx` konstanta `ROAD_FACTOR = 1.25` pro přepočet okruhu na kruh na mapě.

### 7.2 Jednotky dřeva

`convertWoodVolume(value, from, to) = value × SOLID[from] / SOLID[to]`.

Energie v 1 jednotce dřeva (`woodKwhPerUnit`) je:

```
kWh = SOLID[unit] × WOOD_KWH_PER_PLM[skupina] × MOISTURE_ENERGY_FACTOR[vlhkost]
```

Příklad: 1 PRMS tvrdého suchého dřeva = 0,45 × 2800 × 1 = **1 260 kWh**. Měkké suché dřevo vyjde na 922,5 kWh, bříza na 1 125 kWh.

Množství produktu v základní jednotce (`baseUnitsPerUnit`):

| `unit` | Přepočet na PRMS (u dřeva) |
|---|---|
| `PRMS` | 1 |
| `PRM` | 0,7 / 0,45 ≈ 1,556 |
| `PLM` | 1 / 0,45 ≈ 2,222 |
| `paleta` | `packagePrm` (výchozí 1,5 PRM) → ≈ 2,333 PRMS |

U ostatních paliv je základní jednotkou tuna. `pytel` a `paleta` se přepočítají přes `packageKg` (výchozí 1 000 kg).

### 7.3 Energie a cena za kWh

`kwhPerKg(p)`: pokud prodejce uvede `declaredMjPerKg`, použije se `MJ / 3,6`. Jinak tabulková hodnota podle kategorie a podtypu (koks, černé uhlí, hnědé uhlí, hnědouhelné brikety).

- `energyKwhPerUnit(p)` je energie v jedné prodejní jednotce.
- `pricePerKwh(p) = price / energyKwhPerUnit(p)`.
- `pricePerKwhHeat(p) = pricePerKwh(p) / BOILER_EFFICIENCY[category]`. Tato hodnota odpovídá ceně za kWh tepla dodaného do místnosti.

Ve filtrech a na kartách se Kč/kWh zobrazuje bez účinnosti kotle (`pricePerKwh`). Účinnost se použije tam, kde se porovnávají náklady na teplo (trendy, kalkulačka).

### 7.4 Doprava

`estimateDelivery(seller, from, quantity, withHydraulicArm)`:

1. Silniční vzdálenost `d = haversine × 1,25`.
2. Pokud prodejce nemá vlastní dopravu, nebo `d > maxRadiusKm`, výsledek je `outOfRange` (zbývá osobní odběr, pokud je k dispozici).
3. Příplatek za hydraulickou ruku se připočte jen tehdy, když ji prodejce nabízí a uživatel ji zvolil.
4. Doprava je zdarma, pokud `d ≤ freeRadiusKm`, **nebo** pokud `quantity ≥ freeOverQuantity`. Při zdarma dopravě je poplatek jen příplatek za ruku.
5. Jinak: `fee = round(baseFee + (d − freeRadiusKm) × pricePerKm + armFee)`.

`offerTotal()` sečte zboží (`price × quantity`) a dopravu. Vrací i cenu za základní jednotku a za kWh vč. dopravy.

### 7.5 Cenové hladiny

`priceTier(p, stats)` porovná cenu za základní jednotku s průměrem kraje:

- Průměr se vybírá podle komodity: měkké dřevo → `softWoodPrms`, ostatní dřevo → `hardWoodPrms`, pelety → `pelletsT`, brikety → `briquettesT`, uhlí → `coalT`.
- `ratio = cena / průměr − 1`. Pod −5 % je **below** (zelená `#15803d`), nad +5 % je **above** (červená `#dc2626`), jinak **average** (oranžová `#ea580c`).
- Bez údaje o kraji se vrací `average`.

### 7.6 PSČ a lokality

`ZIP_PREFIX_LOCATIONS` mapuje **první dvě číslice PSČ** na město a souřadnice (okresní pošta). Pokrývá prefixy `10` až `79`. Dává přibližný střed města a kraj. Slouží jako náhrada za geokódování, viz omezení. Výraz `looksLikeZip` (`^\d{3}\s?\d{0,2}$`) rozpozná, že uživatel zadal PSČ, a nabídne nastavení polohy.

### 7.7 Filtrovací engine

Soubor: `src/lib/filters.ts`. Hlavní funkce `computeMatches({ sellers, filters, location, regionStats, priceMode })` vrací `SellerMatch[]`.

Postup:

1. **Textové hledání** (`sellerMatchesQuery`): dotaz se rozdělí na tokeny, každý token musí být obsažen v haystacku. Haystack je název, právní název, město, ulice, okres, název kraje a PSČ (s mezerou i bez). Porovnání je **bez diakritiky a bez velikosti písmen** (`normalize("NFD")`).
2. **Okruh**: při textovém hledání se neuplatňuje (cílený dotaz má najít konkrétního prodejce). Jinak se prodejce vynechá, pokud `roadDistanceKm > radiusKm` a není zapnuto „Celá ČR“.
3. **Kandidátní produkty** (`productMatches`): kategorie a podrobné filtry (druh dřeva, forma, vlhkost, délka polen, certifikace, typ briket, typ uhlí). Vlhkost se u produktu odvozuje z `moisturePercent`, pokud chybí `moisture` (< 20 % suché, ≤ 35 % polosuché, jinak čerstvé).
4. **Výběr produktu prodejce:** přednost mají produkty skladem (`stock !== "out_of_stock"`). Z nich se vybere ten s nejnižším skóre:
   - režim Kč/kWh (`sort = kwh` nebo `priceMode = kwh`) → `pricePerKwh`,
   - „Vše“ (smíšená kategorie) → poměr k průměru kraje, aby se srovnatelně porovnávaly různé komodity,
   - jinak → cena za základní jednotku.
5. **Referenční množství** (`referenceFor`): 5 PRMS u dřeva, 1 t u ostatních. Celková cena = `offerTotal` pro toto množství vč. dopravy. Množství se převádí na prodejní jednotky přes `unitsForBaseQuantity`, aby sedělo `freeOverQuantity`.
6. **Řazení** (`SORT_OPTIONS`): `total` (celkem vč. dopravy, u smíšené kategorie Kč/kWh), `unit` (relativní cena), `kwh`, `distance`, `rating` (hodnocení, pak počet recenzí). Ve všech případech následuje sekundární řazení podle celkové ceny.
7. **Nejlepší cena v okolí** (`findBestValueId`): prodejce s nejnižší celkovou cenou, vyžaduje alespoň 2 výsledky. Na kartě se zobrazí jako „Nejlepší cena v okolí“ (u výchozího filtru) nebo „Nejlepší cena“.
8. **Detail prodejce v pravém panelu** (`popupProducts`, až 4 produkty). Nejdřív vybraný, pak nejlevnější z ostatních kategorií, nakonec další nejlevnější produkty skladem.

### 7.8 Parser CI reportů

Soubor: `src/lib/report-parser.ts`. Parser je tolerantní, aby zvládl ruční úpravy reportu.

- `REPORT_SECTIONS` definuje klíče `summary`, `offering`, `positioning`, `swot`, `recommendations`. Každý má seznam regulárních výrazů (anglické a české varianty, např. `/summary/i`, `/shrnut/i`, `/recommendation/i`, `/doporučení/i`, `/cen[íy]/i`).
- `extractSection(md, key)` najde nadpisy (`#` až `######`). Ignoruje H1 titulek, pokud existují nižší úrovně. Vezme první odpovídající nadpis a tělo sekce ukončí dalším nadpisem stejné nebo vyšší úrovně.
- `parseSwot(md)` hledá v SWOT sekci podnadpisy nebo tučné štítky (`**Strengths:**`) a přiřadí k nim odrážky. Používá se jen tehdy, když report nemá strukturované pole `swot`. Štítky se poznávají přes regulární výrazy `strength|siln`, `weakness|slab`, `opportunit|příležitost`, `threat|hrozb`.
- UI (`ReportViewer`) zobrazuje jednotlivé sekce jako taby, SWOT jako matici 2×2 (`SwotMatrix`) a doporučení jako číslované karty.

### 7.9 Formátování

`src/lib/format.ts` formátuje čísla a data pro `cs-CZ`. Mezera mezi číslem a jednotkou je **nedělitelná mezera** (`NBSP`), aby se „1 490 Kč“ nezalomilo. Měsíce v grafech se převádějí do českého tvaru (`formatMonth`, `formatMonthGenitive`). Relativní čas (`formatRelative`) a skloňování (`plural`) jsou tam také.

---

## 8. Design system

### 8.1 Tokeny

Zdroj: `src/app/globals.css`. Tokeny jsou CSS proměnné na `:root` (světlý režim, výchozí) a na `.dark` (tmavý režim). Tailwind v4 je mapuje přes `@theme inline`. Třída `dark` se přepíná přes next-themes.

| Token | Světlý | Tmavý | Použití |
|---|---|---|---|
| `--background` | `#faf8f5` (teplá kamenná bílá) | `#121316` | Pozadí stránky. |
| `--foreground` | `#1c1917` (stone-900) | `#f4f4f5` | Text. |
| `--card` | `#ffffff` | `#18181b` (zinc-900) | Karty, panely. |
| `--primary` | `#ea580c` (orange-600) | `#f97316` | Hlavní akce, aktivní stavy, značka „Podpal to“. |
| `--accent` | `#fff7ed` | `rgb(249 115 22 / 0.12)` | Jemné zvýraznění (rozbalené sekce, insight). |
| `--muted-foreground` | `#78716c` (stone-500) | `#a1a1aa` | Sekundární text. |
| `--border` | `#e7e5e4` (stone-200) | `rgb(255 255 255 / 0.09)` | Rámečky. |
| `--forest` | `#15803d` | `#22c55e` | „Výhodná cena“, úspěch, skladem. Token `forest` je dostupný jako třída `text-forest`, `bg-forest/10` atd. |
| `--destructive` | `#dc2626` | `#f87171` | Chyby. |
| `--radius` | `0.75rem` | – | Základ pro `--radius-sm` až `--radius-4xl` (násobky 0,6 až 2,6). |
| `--shadow-soft` | dvojitý jemný stín | tmavší varianta | Třída `shadow-soft` na kartách a plovoucích panelech. |

Další tokeny (`--sidebar-*`, `--chart-1` až `--chart-5`, `--input`, `--ring`) jsou standardní shadcn sada. Grafy používají barvy komodit z `COMMODITY_META`, ne `--chart-*`.

### 8.2 Typografie a čísla

- Text: **Plus Jakarta Sans** (`font-sans`), nastavený na `html`.
- Mono: **JetBrains Mono** (`font-mono`).
- Třída `.num` (`font-variant-numeric: tabular-nums`, JetBrains Mono, mírný `letter-spacing`) se používá u každé ceny, počtu a údaje z analýzy. Čísla v tabulkách a kartách tak zarovnávají do sloupců.

### 8.3 Barvy paliv a hladin

`FUEL_META` (`src/lib/constants.ts`):

| Palivo | Hex (pro mapu a grafy) | Tailwind |
|---|---|---|
| Dřevo | `#d97706` | amber |
| Pelety | `#059669` | emerald |
| Brikety | `#c2410c` | orange |
| Uhlí | `#334155` | slate |

Cenové hladiny (`PRICE_TIER_META`): pod průměrem `#15803d`, průměr `#ea580c`, nad průměrem `#dc2626`. Teplotní mapa krajů přechází `#16a34a` → `#f59e0b` → `#dc2626` (levně → dráž), funkce `priceScale(t)`.

### 8.4 Komponenty

**`components/ui/` (shadcn, styl radix-nova):** accordion, badge, button, card, checkbox, command, dialog, dropdown-menu, input-group, input, label, popover, progress, scroll-area, select, separator, sheet, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip. Nové shadcn komponenty doporučujeme přidávat přes shadcn CLI podle `components.json`.

**`components/common/`** (sdílená doménová primitiva, export přes `index.ts`):

- `PageHeader` – eyebrow, nadpis, ikona, popis, akce.
- `EmptyState`, `ListSkeleton`, `MockModeBadge`.
- `FuelBadge`, `FuelIcon`, `StockBadge`, `SellerTags`, `StarRating`.
- `PriceTag`, `PriceDelta`, `Sparkline`, `KpiCard`.
- `RegionSelect`, `Logo`.

**`components/ci/`:** `SwotMatrix` (2×2, čtyři kvadranty s barvou a ikonou), `Markdown` (react-markdown s remark-gfm, stylované prvky).

### 8.5 Mapa

Viz sekce 9.

### 8.6 Přístupnost a stavy

- Ovládací prvky mají `aria-label`, `aria-pressed` nebo `aria-current` tam, kde to dává smysl.
- Na mobilu se mapa a seznam přepínají tlačítky (`role="group"`), na desktopu jsou vedle sebe.
- Klikatelné karty mají celou plochu jako odkaz (`after:absolute after:inset-0`), klávesnice fokusuje název.
- Loading stavy používají skeletony se stejnými rozměry jako obsah, aby nedocházelo ke skákání layoutu.

---

## 9. Mapa

Soubory: `src/components/map/`.

| Soubor | Role |
|---|---|
| `seller-map-loader.tsx` | `next/dynamic` s `ssr: false`, fallback `MapSkeleton`. |
| `seller-map.tsx` | Hlavní komponenta: `MapContainer`, dlaždice, shlukování, okruh, uživatelská poloha, ovládání, legenda. |
| `pins.ts` | Ikony Leafletu (`L.divIcon`): cenový špendlík, cluster, poloha uživatele. Cacheované podle obsahu. |
| `region-layer.tsx` | Teplotní mapa krajů. Choropleth z GeoJSONu, jinak kruhy ve středech krajů. |
| `types.ts` | `SellerMapProps`, `MapSelection`. |

Chování:

- **Dlaždice:** výchozí OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`), nebo `NEXT_PUBLIC_MAP_TILE_URL`. Zoom 6 až 17, dlaždice do 19. Počáteční zoom 7, střed `CZ_CENTER`.
- **Vzhled dlaždic:** třída `.podpalto-tiles` s CSS filtrem `grayscale(0.92) brightness(1.04) contrast(0.88) sepia(0.06)`, tedy neutrální „positron“ vzhled. V tmavém režimu `invert` s `hue-rotate(180deg)`.
- **Špendlíky:** text je cena za jednotku nebo Kč/kWh (podle `priceMode`), barva odpovídá cenové hladině, malá tečka barvě paliva. Aktivní (hover nebo výběr) špendlík se zvětší a pulzuje (`.price-pin.is-active`). Ikony se cachují podle `label|tier|fuel|active`, takže hover nepřekreslí všechny markery.
- **Shlukování:** `react-leaflet-cluster` s `chunkedLoading`, `maxClusterRadius={46}`, `spiderfyOnMaxZoom`. Ikona clusteru ukazuje počet.
- **Okruh:** kruh má poloměr `radiusKm × 1000 / 1,25`. Odpovídá silniční vzdálenosti použité ve filtru (vzdušná = silniční / 1,25).
- **Výřez:** priorita je okruh → výsledky textového hledání → celá ČR. Změna se animuje s debounce 300 ms, aby posuvník nespouštěl přelet při každém pohybu. Maximální zoom při přiblížení je 12.
- **Synchronizace výsledky ↔ mapa:** klik na výsledek nebo cenovku otevře detail prodejce v pravém panelu (2/5 šířky), mapa rozbalí cluster a vycentruje marker. Hover na řádek výsledků zvýrazní cenovku a naopak. Zvýraznění je čistě CSS třída `is-active` (ikona se nemění, aby klik nepadl na vyměněný DOM prvek).
- **Vyhledávání adresy:** `AddressSearch` kombinuje okamžité lokální shody (`localPlaces` – PSČ, města) a geokodér Photon (`remotePlaces`, debounce 280 ms, ČR bbox). Výběr nastaví polohu (`usePreferences().setLocation`), zobrazí ji na mapě a přiblíží.
- **ResizeObserver:** při změně velikosti kontejneru (přepnutí Seznam/Mapa, resize okna) se volá `invalidateSize` a při prvním zobrazení se znovu přizpůsobí výřez.
- **Vrstva kraje (heat mapa):** celé území ČR vyplněné podle přesných hranic krajů z OpenStreetMap (`src/data/geo/*`, generuje `scripts/fetch-cz-boundaries.mjs` přes Overpass API). Každý kraj se v rastru (Web Mercator, `map/heat-image.ts`) vyplní svou hodnotou (cena komodity podle filtru, jinak cenový index), pole se rozmaže (~12 km) pro plynulé přechody a obarví paletou. Výplň ořezává vektorová maska (SVG `clipPath` v `SVGOverlay`) přesně podle státní hranice → okraj sedí na podklad při každém zoomu. Navrch čárkované hranice krajů (každá sdílená hrana jednou, z TopoJSON mesh), plná státní hranice a nenápadné popisky (polylabel; skryté při zoomu > 9,5, aby nepřekážely prodejnám). Je-li nastavené `NEXT_PUBLIC_REGIONS_GEOJSON_URL`, použije se místo toho choropleth z vlastního GeoJSONu.
- **Izolace vrstev:** `.leaflet-container` má `isolation: isolate`, aby z-index Leafletu (400 až 1000) nepřekryl dialogy a sheety (z-50).

---

## 10. CI Studio a orchestrace agentů

### 10.1 Co CI Studio dělá

Stránka `/ci-studio` spouští analýzu konkurenta a prohlíží archiv reportů. Komponenty:

- `PipelineDiagram` – statické schéma flow (validate_input → run_research → save_report → outputs/).
- `RunPanel` – formulář (validace URL), spuštění (`startAnalysis`), polling (`getAnalysisRun` každých 1500 ms, dokud běh neskončí), progress, kroky, konzole `crew.log` s automatickým scrollováním, výsledek a odkaz na report. Panel umí také zobrazit výpis API kontraktu.
- `ReportArchive` – seznam s filtry (fulltext, kraj, palivo, řazení). Výběr zapíše `?report=` do URL.
- `ReportViewer` – detail reportu: taby sekcí, SWOT matice, číslovaná doporučení, metadata (URL, cesta, model, doba běhu, kraj, paliva, propojený prodejce), stažení `.md` (Blob) a kopírování do schránky.

Po dokončení běhu `RunPanel` zavolá `onCompleted`, `ci-studio` znovu načte archiv (`reload`) a uživatel může report otevřít tlačítkem.

### 10.2 Kontrakt s backendem

Typy v `src/types/index.ts` přímo kopírují Pydantic modely z flow:

- `CompetitorAnalysisState` (`competitor_url`, `report`, `report_path`) je 1:1.
- `CrewAnalysisReport` je rozšíření o metadata API.
- `AnalysisRun` s `steps: CrewStep[]` a `logs: CrewLogEntry[]`.

Kroky `CrewStepId` odpovídají metodám flow a agentům z `agents.yaml` a `tasks.yaml`. Podrobné mapování je v README, sekce 5.7.

### 10.3 Poznámka k orchestraci vývoje

Frontend vznikl v režimu multiagentní práce. **Opus** jako orchestrátor rozdělil úkoly a **Sonnet** zpracoval větší funkční celky (mapa, filtry, kalkulačka, prodejci, trendy, CI Studio). **Haiku** zpracoval mock data, reporty, UI primitiva a dokumentaci. Orchestrátor držel datový kontrakt v `src/types/index.ts` a výpočty v `src/lib/`, takže jednotlivé části se mohly vyvíjet nezávisle na stejných typech a konstantách.

---

## 11. Známá omezení a další kroky

### 11.1 Omezení

1. **Geokódování PSČ.** `ZIP_PREFIX_LOCATIONS` mapuje jen první dvě číslice na okresní pobočku (prefixy 10 až 79). Výsledek je přibližný. Pro produkci nahradit geokódováním na backendu (Mapy.cz nebo Nominatim) a vracet souřadnice v odpovědi.
2. **Vzdálenosti jsou odhad.** Silniční vzdálenost je vzdušná × 1,25, bez routingu. Okruh a doprava na mapě jsou proto přibližné.
3. **Generátor `generateStaticParams` používá mock slugy** (`getMockSellerSlugs()`) i v REST režimu. Nově přidané prodejce tak nejsou předrenderovaní. Data se ale načítají na klientu, takže funkčnost to neblokuje. Před produkcí ověřit chování dynamických parametrů pro neznámé slugy.
4. **Vrstva krajů** potřebuje GeoJSON, který není v repozitáři. Adresář `public/` zatím neexistuje. Bez souboru se používají kruhy ve středech krajů.
5. **OpenStreetMap** má podmínky použití, které nejsou vhodné pro produkční provoz s vyšším objemem. Před produkcí přejít na komerční poskytovatele dlaždic (MapTiler, Stadia nebo podobné) přes `NEXT_PUBLIC_MAP_TILE_URL` a respektovat jejich atribuci.
6. **Typy pro `leaflet.markercluster`** nejsou nainstalované (`@types/leaflet.markercluster`). `seller-map.tsx` používá lokální minimální typy `ClusterGroupLike` a `ClusterLike`.
7. **Simulace běhů žije v paměti** prohlížeče (modul `analysis-sim.ts`). Po obnovení stránky zmizí běhy i nově vygenerované reporty. Statických 5 reportů zůstává.
8. **Reálný běh na pozadí** v backendu zatím nemá persistentní úložiště stavu. Po restartu procesu na Railway se běhy ztratí.
9. **CI Studio nemá autentizaci.** Stránka i endpointy `POST /api/analyze` jsou veřejné. Před produkcí je nutné ochránit CI Studio a API (například přihlášením nebo API klíčem na backendu). Neplatí to pro veřejnou mapu.
10. **Ceny jsou fiktivní** v mock režimu. Při nasazení na reálná data musí backend zajistit aktuálnost (`updatedAt`, `lastScrapedAt`).
11. **Parser reportů je tolerantní heuristika.** Pokud se LLM odchýlí od očekávané struktury (jiný název sekce, jiná úroveň nadpisů), zobrazí se celý Markdown bez rozdělení na taby a SWOT může být neúplná. Doporučení je strukturované pole `swot` v odpovědi API.
12. **Bez testů.** Projekt zatím nemá unit ani E2E testy. Nejdřív by měly přijít testy pro `pricing.ts`, `filters.ts` a `report-parser.ts`, protože jsou čisté a snadno testovatelné.
13. **Zdroj `NEXT_PUBLIC_API_URL` je viditelný v prohlížeči.** To je záměr (volání jde z klienta), ale backend musí být zabezpečen sám, ne skrytím URL.

### 11.2 Další kroky

- Backend: endpointy podle README sekce 5, CORS a asynchronní běh analýzy.
- Geokódování PSČ na backendu a vracení souřadnic prodejců a lokalit.
- Testy čistých funkcí (`pricing`, `filters`, `report-parser`) a E2E smoke testy hlavních stránek.
- Persistentní úložiště běhů (Redis nebo databáze) a archiv reportů v DB místo souborů v `outputs/`.
- Autentizace CI Studia a API pro zápis.
- Komerční dlaždice mapy a GeoJSON krajů v `public/`.
- Předrenderování profilů prodejců z dat API, nebo ponechání dynamického renderu s ověřením chování.


## Design systém „Lesní chalupa“

Cílová skupina: chalupáři, zahrádkáři, farmáři a milovníci přírody – web má působit klidně a „jako doma“.

- **Barvy:** čistě bílý základ (`--background: #fff`), barevné jsou jen widgety. Tokeny (light/dark) v `globals.css`: `wood` (dub/ořech/bříza), `moss` (mech – pozitivní, levné), `pine` (jehličí – levý panel), `clay` (hlína – drahé, chyby), `coal` (uhel). Každý má `-soft` (plocha) a `-strong` (text) variantu. Hlavní akce = lesní zeleň `--primary #4e6e50`. Jediný oranžový prvek je plamen v logu.
- **Tvary:** karty a panely `rounded-2xl` (16 px), tlačítka/inputy/čipy `rounded-xl` (12 px), plně kulaté jen vyhledávací lišta, segmentové přepínače, avatary a cenovky na mapě.
- **Typografie:** nadpisy h1/h2 patkovým písmem Lora (`font-heading`), text Plus Jakarta Sans, čísla a ceny JetBrains Mono (`.num`).
- **Symetrie:** boční panely mají stejnou šířku i výšku hlavičky (72 px), horní lišta mapy má stejně široké levé a pravé skupiny, řady karet mají stejnou výšku (`auto-rows-fr` + `h-full`), lichý počet položek v mřížce = jedna přes celou šířku.
- **Ikony paliv** (`components/common/fuel-icon.tsx`, obrysy): dřevo = „log“ z Phosphor Icons (MIT), pelety = „paper-bag“ z Tabler Icons (MIT), brikety = „bricks-line“ z MingCute (Apache 2.0), uhlí = „stone“ z Hugeicons (MIT). Ostatní ikony UI jsou z lucide-react (ISC).
- **Mapa:** OSM dlaždice s teplým „papírovým“ CSS filtrem, cenovky jako světlé pilulky s okrajem v barvě cenové hladiny (mech / dub / hlína).
