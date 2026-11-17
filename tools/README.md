# tools — služba se zdroji dat

Python balíček `podpalto_tools`: samostatná FastAPI služba, která data **sbírá**, **ověřuje
a přepočítává** a agentům je **podává**. Nezávisí na CrewAI ani na balíčku `app`, takže běží
ve vlastním malém kontejneru. Architektura vychází z rešerše „Zdroje dat o pevných palivech“
(dále PDF): datový kontrakt `SolidFuelPriceRecord` (PDF 4.3), převody jednotek a výhřevnosti
(PDF 3) a pravidlo, že veškerou aritmetiku dělá deterministický Python (PDF 4.4).

```
src/podpalto_tools/
├── api.py                   # FastAPI aplikace (endpointy nástrojů se generují z registru)
├── registry.py              # ToolSpec = kontrakt jednoho nástroje
├── schemas.py               # sdílené modely (FuelType se 7 kategoriemi z PDF, Region, ToolResult)
├── settings.py              # konfigurace z prostředí
├── collect/                 # SBĚR: deterministický kód, žádné LLM
│   ├── sources.yaml         # registr zdrojů: jediné weby, které sběr navštíví
│   ├── source_registry.py   # načtení a validace registru (kind, pilíř, kraj, DPH, doprava)
│   ├── heureka.py           # parser XML feedu ve formátu Heureka
│   ├── shoptet.py           # obchody bez feedu: sitemapa → produktové stránky → mikrodata
│   ├── pricelist.py         # ceníky: text stránky pro crew a kontrola řádků, které vrátí
│   ├── normalize.py         # SolidFuelPriceRecord: druh paliva, jednotky, Kč/t, Kč/prms, Kč/kWh
│   ├── store.py             # SQLite: snímky a záznamy cen
│   ├── collector.py         # robots.txt → feed / stránky / ceník → normalizace → uložení
│   └── cli.py               # příkaz podpalto-collect (jen strukturované zdroje)
└── sources/                 # NÁSTROJE pro agenty: jeden modul = jeden nástroj
    ├── __init__.py          # ALL_TOOLS: seznam registrovaných nástrojů
    ├── eshop_catalog.py     # REAL  ceny prodejců (čte databázi snímků), filtr podle kraje
    ├── price_comparison.py  # REAL  cenová hladina: min / průměr / max, Kč/kWh, odlehlé ceny
    ├── market_statistics.py # MOCK  roční řady cen a spotřeby
    ├── news_search.py       # MOCK  zprávy: regulace, dotace, ceny, dodávky
    ├── customer_reviews.py  # MOCK  recenze prodejců
    └── page_text.py         # REAL  stáhne stránku a vrátí její text (nikomu nepřiřazený)
```

Kategorie paliv (PDF 4.3, `fuel_category`): `brown_coal`, `black_coal`, `coke`,
`coal_briquettes`, `wood_pellets`, `wood_briquettes`, `firewood`.

## Jak tečou data

Sběr řídí `CollectionFlow` ve službě `app` (PDF 4.1). Bere zdroj po zdroji a podle `kind`
volá jednu ze dvou cest této služby:

```
                    ┌─ heureka_feed / shoptet_html ─▶ POST /sources/{id}/collect
sources.yaml ──▶ flow┤                                  robots → feed nebo stránky → normalize ─┐
                    └─ static_html ─▶ POST /sources/{id}/pages ─▶ text ceníku ─▶ ExtractionCrew  │
                                       POST /sources/{id}/extraction ◀─ citované řádky ─┘        │
                                       ověření citací → čtení čísel → normalize ────────────────┤
                                                                                                 ▼
                    data/prices.sqlite ──▶ eshop_catalog, price_comparison ──▶ agenti reportu
```

- **Strukturované zdroje** (feed, Shoptet) čte a přepočítává jen kód.
- **Ceníky** (`static_html`) mají každý jiný tvar. Text stránky přečte extrakční crew
  (Extractor → QA Auditor). Crew ale jen **cituje**: název, text s cenou, jednotku
  a balení doslova ze stránky, plus úsudky, které parser neudělá (druh paliva, k čemu se
  cena vztahuje, zda je s DPH). Tato služba pak ověří, že každá citace na stránce opravdu
  je, sama z citace přečte číslo a zkontroluje jednotku. Čísla tedy nikdy nevymýšlí LLM.
- Stejná kontrola běží jako **guardrail** extrakční crew (`?dry_run=true`): když řádek
  neprojde, crew dostane důvody a opraví ho (až 3 pokusy).
- Nezměněný ceník (stejný hash textu) se znovu neposílá crew: předchozí záznamy se jen
  potvrdí s novým časem sběru. Tím se šetří volání LLM.

Strukturované zdroje jde sebrat i bez služby `app`:

```bash
uv run podpalto-collect              # feedy a Shoptet obchody (asi 10 minut)
uv run podpalto-collect palivos      # jen vybraný zdroj
```

Ceníky tímto příkazem sebrat nejdou (vrátí `needs_extraction`); spouští je `uv run collect`
ve službě `app`. Dokud neproběhl žádný sběr, vrací `eshop_catalog` a `price_comparison`
chybu 502 s návodem.

## API

| Metoda | Cesta | Účel |
|---|---|---|
| `GET` | `/health` | kontrola, že služba běží |
| `GET` | `/tools` | katalog: název, popis, příznak `mock` a JSON schéma vstupu každého nástroje |
| `POST` | `/tools/{name}` | spustí nástroj; tělo požadavku odpovídá jeho vstupnímu modelu |
| `GET` | `/sources` | registr zdrojů a poslední pokus o sběr u každého z nich |
| `POST` | `/collect` | sběr strukturovaných zdrojů na pozadí, vrátí `202`; výsledek je vidět v `/sources` |
| `POST` | `/sources/{id}/collect` | krok flow: hned sebere jeden feed nebo Shoptet obchod |
| `POST` | `/sources/{id}/pages` | krok flow: stáhne ceník a vrátí jeho text (`unchanged` = beze změny) |
| `POST` | `/sources/{id}/extraction` | krok flow: ověří, přepočítá a uloží řádky od crew; `?dry_run=true` jen ověří |

Současně běží jen jeden sběr; další požadavek na sběr dostane `409`.

```bash
uv run uvicorn podpalto_tools.api:app --port 8001
```

Vše jde vyzkoušet ručně na <http://localhost:8001/docs>.

## Registr zdrojů a pravidla sběru

`collect/sources.yaml` obsahuje 22 zdrojů ze tří pilířů PDF:

| `kind` | Pilíř PDF | Zdroje | Co se stahuje |
|---|---|---|---|
| `heureka_feed` | 1 e-shopy | 5 | `robots.txt` a XML feed (2 požadavky) |
| `shoptet_html` | 1 e-shopy | 5 | `robots.txt`, sitemapa a veřejné produktové stránky (nejvýš `COLLECT_MAX_PAGES`) |
| `static_html` | 2 uhelné sklady, 4 lesy a dřevo | 8 + 4 | `robots.txt` a stránky ceníku z `page_paths` |

Pět e-shopů feed zpřístupňuje, druhých pět na něj vrací 403 (ověřeno 16. 11. 2026), proto se
čtou ze stránek, které uvádí jejich sitemapa a nezakazuje `robots.txt`. Dvanáct ceníků z PDF
(ověřeno 17. 11. 2026) povoluje `robots.txt` a ceny má přímo v HTML. Kraje u nich jsou převzaté
z PDF a je potřeba je ověřit; IČO zatím doplněné není.

Pole registru: `pillar`, `ico`, `region` (kraj prodejce), `price_region` (kde cena platí, `CZ`
= celostátně), `price_includes_vat` (výchozí, když ceník DPH neuvádí), `delivery_included`,
`page_paths`, `url_filter`, `max_pages`, `enabled`, `consent`, `notes`.

- Sběr navštíví jen weby z registru a v nich jen adresy, které povoluje `robots.txt`.
- Mezi dvěma stránkami téhož webu je pauza (`COLLECT_PAGE_DELAY_S`, nebo delší
  `Crawl-delay` z `robots.txt`).
- Když web odpoví 401, 403 nebo 429, běh pro něj hned končí a nic se neuloží. Platí poslední
  úspěšný snímek. Žádné opakování, žádné jiné cesty, žádné obcházení blokace.
- Ceník, ze kterého neprojde ověřením žádný řádek, nepřepíše starší data (`rejected`).
- Zdroj sebraný před méně než hodinou se přeskočí (`COLLECT_MIN_INTERVAL_S`).
- Vypnutím zdroje (`enabled: false`) se jeho uložené záznamy přestanou podávat agentům.
- Pole `consent` eviduje, zda prodejce souhlasil se zobrazováním svých cen. Pro interní vývoj
  souhlas potřeba není, pro veřejné zobrazení ano. Kód ho zatím nevynucuje.

## Normalizace (PDF, sekce 3)

Každá cena končí jako `SolidFuelPriceRecord`: prodejce a IČO, URL a čas sběru, kategorie
a jakost (ENplus A1, Rekord 4", SD Bílina), cena přesně podle zdroje a jednotka (`kg`, `q`,
`t`, `bag`, `pallet`, `m3`, `prmr`, `prms`), normalizované Kč/kg, Kč/t, Kč/prms a Kč/kWh,
doprava a kraj. Pole se stejnými názvy jako v PDF se ukládají do tabulky `records`.

**Hmotnostní a objemové jednotky**

- 1 q = 100 kg. Paleta se nikdy nepovažuje za 1 000 kg, váha se čte z názvu nebo parametrů
  (balení ve feedech není standardizované), u ceníku z citovaného textu balení.
- Dřevo: `prm` = `prmr` (rovnaný), `sprm` = `prms` (sypaný). Srovnává se v Kč/prms:
  1 prmr = 1,6 prms, 1 m³ plného dřeva ≈ 2,22 prms. U e-shopů znamená samotné „m³“ bez
  „sypané/rovnané“ cokoli, takže se nepřevádí (`volume_stacking_unknown`). U ceníků lesů
  je m³ plnometr.
- Hmotnost dřeva: tvrdé 337 kg/prms, měkké 227 kg/prms (20 % vlhkosti). Dřevina se pozná
  z názvu; bříza, směs a neuvedená dřevina se na kg nepřevádí (`wood_species_unknown`).
  Čerstvé/syrové dřevo nedostane Kč/kWh (`fresh_wood_no_energy_value`).

**Energie (Kč/kWh)**

Kč/kWh = (Kč/kg) / (výhřevnost MJ/kg / 3,6). Je to cena energie v palivu, bez účinnosti kotle.
Výhřevnost se bere od prodejce, je-li uvedená a mezi 9 a 36,5 MJ/kg; jinak typická hodnota
ze středu rozpětí tabulky v PDF:

| Palivo | MJ/kg | Palivo | MJ/kg |
|---|---|---|---|
| dřevěné pelety | 16,9 | uhelné brikety | 19,45 |
| dřevěné brikety | 17,9 | černé uhlí | 26,55 |
| hnědé uhlí | 18,0 | koks | 31,75 |
| suché dřevo | 14,1 | | |

**DPH a doprava**

- Ceník bez DPH (lesy, velkoobchod): přičte se 21 % (`vat_added`). Neříká-li ceník nic,
  platí `price_includes_vat` z registru (`vat_assumed_from_registry`).
- `price_total_delivered_vat` = cena vč. dopravy, je-li doprava v ceně (`delivery_included`)
  nebo známý skutečný poplatek. Poplatek 0 nebo 1 Kč ve feedu bývá zástupný a nepočítá se.

**Kontroly**

- Jednotková cena mimo pásmo 3 000–40 000 Kč/t nebo 300–6 000 Kč/prms se zahodí
  (`unit_price_implausible`): nejspíš je špatně přečtená velikost balení.
- Cena pod polovinou nebo nad dvojnásobkem mediánu ostatních prodejců téže kategorie
  (aspoň 3) dostane `outlier_vs_market`. Je to deterministická část QA auditora z PDF;
  `price_comparison` vrací jejich počet v `outliers_count`.
- Když velikost balení nejde určit, záznam si ponechá cenu bez jednotkové ceny
  (`package_size_unknown`) a do statistik se nepočítá.
- Kamna, kotle, krbové vložky, kouřovody, náhradní díly, poukazy a štěpka se vyřazují podle
  názvu, i když zmiňují palivo.
- Uvádí-li prodejce jednotkovou cenu přímo v názvu („12,90 Kč/kg“), má přednost a velikost
  balení se dopočítá z ní.
- U obchodů čtených ze stránek se při chybějící velikosti balení použije hmotnost zásilky
  (`package_size_from_shipping_weight`), u dřeva ne.
- `price_comparison` počítá každý produkt jednou, v jeho nejlevnější variantě; paliva na váhu
  v Kč/t, dřevo v Kč/prms.

**Kontrola řádků z ceníku** (`pricelist.py`): citace musí na stránce být (velikost písmen,
mezery, pomlčky a oddělovače buněk nehrají roli); `price_text` musí obsahovat právě jednu
cenu (čísla s jednotkou jako „100 kg“ nebo „25 cm“ se nepočítají); jednotka v citaci nesmí
odporovat zvolené `original_unit`; `bag`/`pallet` musí mít citovanou váhu balení.

## Konfigurace

| Proměnná | Výchozí | Význam |
|---|---|---|
| `TOOLS_DATA_DIR` | `data` | databáze snímků (`prices.sqlite`) a kopie stažených dat |
| `SOURCES_FILE` | — | jiný registr zdrojů než přibalený `sources.yaml` |
| `COLLECTOR_USER_AGENT` | obecný | hlavička User-Agent; pro pravidelný provoz nastav hodnotu, podle které tě prodejce pozná a může kontaktovat |
| `COLLECTOR_TIMEOUT_S` | `30` | časový limit požadavku |
| `COLLECT_MIN_INTERVAL_S` | `3600` | minimální odstup dvou sběrů téhož zdroje (0 = vypnuto) |
| `COLLECT_PAGE_DELAY_S` | `1.5` | pauza mezi stránkami téhož webu |
| `COLLECT_MAX_PAGES` | `150` | nejvyšší počet stránek z jednoho obchodu za běh (`max_pages` v registru má přednost) |

Databáze se kvůli novému kontraktu jmenuje `prices.sqlite`. Starší `podpalto.sqlite` se už
nečte; data stačí sebrat znovu.

## Mock nástroje

`market_statistics`, `news_search` a `customer_reviews` zatím vrací smyšlená data
(prodejci `MockPaliva`, `DemoTopivo`, `TestBrikety`, `SampleFuel`, adresy na doméně `.example`).
Každá odpověď nese `"mock": true`, aby agenti i výsledný report věděli, že nejde
o skutečná data. Skutečné nástroje vrací `"mock": false` a čas sběru.

## Nový zdroj dat

**Další e-shop:** záznam do `sources.yaml`. Má-li veřejný feed Heureka, použij `heureka_feed`;
jinak, pokud běží na Shoptetu, `shoptet_html`.

**Další ceník (sklad, lesní správa, prodejce dřeva):** `kind: static_html`, `page_paths`
se stránkou ceníku, `pillar`, `region`, `price_region` a u cen bez DPH
`price_includes_vat: false`. Kód se nemění; ceník přečte extrakční crew.

Po přidání spusť sběr a zkontroluj v `/tools/eshop_catalog` druh paliva, jednotku a cenu.
Chybné případy doplň do `tests/test_normalize.py` nebo `tests/test_pricelist.py`.

**Jiný typ zdroje (PDF ceník, ceník jako obrázek, stránka vyžadující JavaScript):** nový
`SourceKind`, cesta v `collector.py` a větev v `CollectionFlow`. PDF ani OCR zatím
implementované nejsou.

**Nový nástroj pro agenty:**

1. Vytvoř modul v `sources/` se vstupním a výstupním Pydantic modelem (výstup dědí
   z `ToolResult`), funkcí `run(params)` a konstantou `TOOL = ToolSpec(...)`.
   Popisy (`description`) piš anglicky: čte je LLM.
2. Přidej `TOOL` do `ALL_TOOLS` v `sources/__init__.py`. Endpoint i položka v katalogu
   vzniknou automaticky.
3. Přiřaď název nástroje agentovi v `remote_tools` v `agents.yaml` služby `app`.
4. Přidej test do `tests/`.

Selhání zdroje hlas výjimkou `ToolError`: API ji převede na HTTP 502 a agent dostane
chybovou zprávu, na kterou může reagovat.

## Testy

Testy nesahají na síť. Feed je smyšlený soubor `tests/fixtures/heureka_feed.xml`, produktové
stránky v `tests/test_shoptet.py` a ceník smyšleného uhelného skladu v `tests/test_pricelist.py`
jsou také smyšlené. Data skutečných prodejců v repozitáři nejsou.
