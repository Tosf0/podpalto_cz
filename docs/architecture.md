# Architektura

Jak je systém podpalto.cz postavený, které části co dělají a podle jakých pravidel. Návrh
vychází z rešerše „Zdroje dat o pevných palivech“ (dále **PDF**), sekce 4: deterministický
**CrewAI Flow** navenek, specializované **Crews** uvnitř kroků a striktní **Pydantic**
kontrakt dat. Zdroje z druhého návrhu (dokument „Ověření datových zdrojů“) ho doplňují.

Související dokumenty: [database.md](database.md) (co ukládáme),
[sources.md](sources.md) (odkud data bereme), [TODO.md](TODO.md) (otevřené úkoly).

## Cíl

Neutrální přehled trhu tuhých paliv pro domácnosti: co které palivo stojí u kterého
prodejce, v přepočtu na tunu, sypaný metr a kWh, v jakém kraji, a kde domácnosti tímto
palivem topí. Platforma nic neprodává a žádného prodejce nezvýhodňuje.

## Hlavní pravidla

1. **Čísla počítá jen kód.** Převody jednotek, DPH, Kč/t, Kč/kWh i statistiky dělá Python
   (PDF 4.4). LLM čísla nevytváří ani nepřepočítává.
2. **Agenti ceníky citují, ne přepisují.** Extrakční crew vrací doslovné citace ze stránky;
   kód ověří, že každá citace na stránce opravdu je, a číslo z ní přečte sám.
3. **robots.txt je hranice.** Sbírá se vše, co robots.txt dovolí. Odmítnutí (401, 403, 429,
   zákaz v robots.txt, detekce botů) se zapíše a dál se nezkouší: žádné opakování, jiné
   cesty, proxy ani „stealth“ prohlížeč.
4. **Chybějící údaj je lepší než špatný.** Co nejde spolehlivě určit, zůstane prázdné
   a dostane příznak (viz [database.md](database.md#příznaky-flags)).
5. **Dvě služby, propojené jen přes HTTP.** Služba s agenty neimportuje kód služby
   s daty; kontrakt mezi nimi hlídají testy.

## Celkový pohled

```
                           ┌──────────────────────── app :8000 ────────────────────────┐
 frontend ──HTTP──────────▶│ FastAPI /runs                                              │
 (zatím není)              │                                                            │
 CLI: uv run collect ─────▶│ CollectionFlow ──▶ ExtractionCrew (extractor → auditor)    │
 CLI: uv run kickoff ─────▶│ MarketResearchFlow ──▶ SolidFuelsCrew (manažer → 5 agentů) │
                           │            ToolsClient / RemoteTool (HTTP)                 │
                           └──────────────────────────────┬─────────────────────────────┘
                                                          │ HTTP (TOOLS_API_URL)
                           ┌──────────────────────── tools :8001 ──────────────────────┐
                           │ FastAPI: /tools/*, /sources, /sources/{id}/...            │
                           │ collect/  registr → stažení → text → ověření → normalizace │
                           │ sources/  nástroje pro agenty (čtou databázi)              │
                           │ data/prices.sqlite, data/raw/, data/opendata/             │
                           └──────────────────────────────┬─────────────────────────────┘
                                                          │ HTTP(S), robots.txt
                    weby prodejců (feedy, Shoptet, ceníky HTML/PDF/obrázky), ČSÚ, ARES
```

| Část | Balíček | Port | Hlavní závislosti | Kontejner |
|---|---|---|---|---|
| `tools/` | `podpalto_tools` | 8001 | FastAPI, SQLite, httpx, pypdf, Playwright, Tesseract | `tools/Dockerfile` |
| `app/` | `podpalto_app` | 8000 | CrewAI, FastAPI | `app/Dockerfile` |
| `frontend/` | — | — | zatím nevybráno | — |

## Služba `tools`: data

Nezávisí na CrewAI. Dělá vše, co musí být deterministické a kontrolovatelné.

| Modul | Úloha |
|---|---|
| `collect/sources.yaml`, `source_registry.py` | registr zdrojů; nic mimo něj se nestahuje |
| `collect/collector.py` | robots.txt, stahování s pauzami, snímky, ověření řádků od crew, kontrola odlehlých cen |
| `collect/heureka.py`, `shoptet.py` | parsery Heureka feedu a mikrodat Shoptet stránek |
| `collect/pricelist.py` | text ceníku z HTML/PDF, kontrola citací, čtení čísel, odstranění duplicit |
| `collect/browser.py` | vykreslení stránek s JavaScriptem (headless Chromium) |
| `collect/ocr.py` | čtení ceníků v obrázcích (Tesseract, tabulky po buňkách) |
| `collect/normalize.py` | kontrakt `SolidFuelPriceRecord`, klasifikace paliv, převody jednotek, energie |
| `collect/store.py` | SQLite: snímky a záznamy |
| `collect/ares.py` | IČO ze stránek prodejce a ověření v ARES |
| `collect/opendata.py` | Sčítání 2021 (vytápění po krajích) |
| `sources/*.py` | nástroje pro agenty (viz tabulka níže) |

### Cesty sběru podle typu zdroje (`kind`)

```
heureka_feed ──┐                                   ┌─▶ normalize ─▶ prices.sqlite
shoptet_html ──┴─▶ POST /sources/{id}/collect ─────┘     (bez LLM)

static_html ───┐
rendered_html ─┼─▶ POST /sources/{id}/pages ─▶ text stránky ─▶ ExtractionCrew (app)
image_ocr ─────┘    (HTML, PDF, prohlížeč, OCR)                  │ citované řádky
                                                                 ▼
               POST /sources/{id}/extraction ─▶ ověření citací ─▶ čtení čísel ─▶ normalize ─▶ prices.sqlite
               (?dry_run=true = guardrail crew)
```

- **Strukturované zdroje** čte a přepočítává jen kód.
- **Ceníky** mají každý jiný tvar, proto je čte crew. Výstup crew ale nejde do databáze
  přímo: projde stejnou kontrolou jako cokoli jiného.
- Nezměněný ceník (stejný otisk textu) se crew znovu neposílá; předchozí záznamy se
  potvrdí s novým datem.

### API služby `tools`

| Metoda | Cesta | Účel |
|---|---|---|
| GET | `/health` | stav |
| GET | `/tools` | katalog nástrojů pro agenty (název, popis, JSON schéma, `mock`) |
| POST | `/tools/{name}` | spuštění nástroje |
| GET | `/sources` | registr a poslední snímek každého zdroje |
| POST | `/collect` | sběr strukturovaných zdrojů na pozadí |
| POST | `/sources/{id}/collect` | krok Flow: feed nebo Shoptet |
| POST | `/sources/{id}/pages` | krok Flow: text ceníku (`?reuse_stored=true` = z disku) |
| POST | `/sources/{id}/extraction` | krok Flow: ověření a uložení řádků (`?dry_run=true`) |
| POST | `/sources/{id}/failure` | krok Flow: zápis selhání crew |

### Nástroje pro agenty

| Nástroj | Data | Kdo ho používá |
|---|---|---|
| `eshop_catalog` | ceny produktů, filtry palivo / prodejce / kraj / skladem | `pricing_analyst` |
| `price_comparison` | min / průměr / max Kč/t nebo Kč/prms, Kč/kWh, nejlevnější nabídky; odlehlé ceny mimo statistiku | `pricing_analyst` |
| `heating_demand` | kolik bytů v kraji topí uhlím, dřevem, peletami (ČSÚ 2021) | `market_analyst` |
| `market_statistics` | **mock**: roční řady cen a spotřeby | `market_analyst` |
| `news_search` | **mock**: zprávy o regulaci, dotacích, cenách | `regulation_analyst` |
| `customer_reviews` | **mock**: recenze prodejců | `customer_insights_analyst` |
| `page_text` | text libovolné stránky | nikomu nepřiřazený |

Každá odpověď nástroje nese `source` a `mock`, aby agenti i report věděli, odkud data jsou.

## Služba `app`: agenti a orchestrace

### CollectionFlow (sběr, PDF 4.1)

```
@start   load_sources ◀── GET /sources (jen zapnuté, volitelně vybrané id)
@router  next_source ── podle kind ──▶ "structured" | "extraction" | "unsupported" | "finished"
@router  collect_structured  ──▶ POST /sources/{id}/collect
@router  extract_price_list  ──▶ POST /pages ─▶ ExtractionCrew po stránkách ─▶ POST /extraction
@router  skip_unsupported
         ... každá větev vrací "source_done" → zpět na next_source
@listen  save_summary ──▶ outputs/collection-<čas>.json
```

- Stav je Pydantic model `FuelPipelineState` (fronta zdrojů, výsledky, `reextract`).
- Flow jen rozhoduje a loguje. Neúspěšný běh crew (chyba LLM) zopakuje jednou
  (`MAX_CREW_ATTEMPTS = 2`) a selhání zapíše do databáze. Odmítnutý požadavek na web
  se nikdy neopakuje.
- `uv run collect --reextract <id>` pošle uložené stránky znovu přes crew bez stahování;
  `uv run podpalto-renormalize` (tools) přepočítá uložené řádky bez LLM.

### ExtractionCrew (čtení ceníků, PDF 4.2)

```
price_list_extractor ──▶ market_qa_auditor          Process.sequential, bez nástrojů
  doslovné citace řádků     vyřadí ne-paliva (doprava, skládání, zálohy, samovýroba,
  ceníku                    doporučené ceny), opraví kategorii, jednotku, DPH, varianty
                            └─ guardrail: dry-run kontrola ve službě tools, až 3 opravy
```

- Výstup obou úloh: `SellerPriceExtractionList` (`output_pydantic`), viz
  [database.md](database.md#surové-kopie-dataraw).
- Guardrail volá `POST /sources/{id}/extraction?dry_run=true` a auditorovi vrátí přesné
  důvody, proč řádek neprošel (citace na stránce není, víc cen v jedné citaci, jednotka
  odporuje citaci, chybí hmotnost balení).

### MarketResearchFlow a SolidFuelsCrew (report)

```
prepare (kontrola tools služby) ─▶ SolidFuelsCrew.kickoff ─▶ save_report (outputs/*.md)

                    research_manager  (Process.hierarchical, deleguje a kontroluje)
   ┌────────────────┬───────────────────┼───────────────────┬──────────────────┐
pricing_analyst  market_analyst  regulation_analyst  customer_insights_   report_writer
                                                     analyst
```

Úlohy (`tasks.yaml`) nemají pevně přiřazeného agenta, rozděluje je manažer. Vstupy:
`fuel_types`, `region` (CZ nebo kraj, předává se nástrojům jako filtr), `focus`. Výstup je
Markdown report pro domácnosti. Agenti čísla jen citují z nástrojů.

### Modely LLM

| Proměnná | Pro koho | Doporučení v `.env.example` |
|---|---|---|
| `MANAGER_MODEL` | `research_manager` | `anthropic/claude-opus-5-5` |
| `AGENT_MODEL` | všichni ostatní agenti (report i extrakce) | `anthropic/claude-sonnet-5-5` |
| `MODEL` | záloha pro nevyplněnou z obou | — |

Klíč `llm:` u agenta v YAML má přednost. Trasování CrewAI je ve výchozím stavu vypnuté
(`CREWAI_TRACING_ENABLED=false`), aby běh nečekal na interaktivní dotaz.

## Datový kontrakt a normalizace (PDF 3 a 4.3)

Každá cena končí jako `SolidFuelPriceRecord` (sloupce v [database.md](database.md)):

- 7 kategorií paliv; jakost (ENplus A1, Rekord, SD Bílina);
- cena přesně podle zdroje + jednotka (`kg`, `q`, `t`, `bag`, `pallet`, `m3`, `prmr`, `prms`);
- Kč/kg, Kč/t (paliva na váhu), Kč/prms (dřevo), Kč/kWh z výhřevnosti prodejce nebo PDF;
- doprava, cena s dopravou, kraj prodejce a oblast platnosti ceny;
- příznaky kvality.

Převody: 1 q = 100 kg; 1 prmr = 1,6 prms; 1 m³ plného dřeva ≈ 2,22 prms; tvrdé dřevo
337 kg/prms, měkké 227 kg/prms; DPH 21 %. Kontroly: pásma věrohodnosti, odlehlé ceny proti
mediánu ostatních prodejců, odstranění duplicit, sloučení variant (`group_id`).

## Provoz

```bash
uv sync                                               # prostředí
uv run uvicorn podpalto_tools.api:app --port 8001     # služba tools
uv run collect [id ...]                               # sběr (CollectionFlow)
uv run kickoff wood_pellets --region "Kraj Vysočina"  # report
uv run uvicorn podpalto_app.api.app:app --port 8000   # API služby app
docker compose up --build                             # obě služby v kontejnerech
```

Pomocné příkazy tools: `podpalto-collect` (jen feedy a Shoptet), `podpalto-renormalize`,
`podpalto-verify-sellers`, `podpalto-load-opendata`. Konfigurace je v `.env`
(viz `.env.example`) a v README obou služeb.

## Testy

`uv run pytest` (přes 200 testů) běží bez sítě a bez LLM. Služba tools běží v testech
uvnitř procesu a app s ní mluví stejným HTTP rozhraním, takže testy hlídají i kontrakt mezi
službami. Weby prodejců jsou nahrazené smyšlenými stránkami na doméně `.example`, crew
stubem, prohlížeč a OCR falešnými funkcemi. Guardrail a ověření řádků běží naostro.

## Kde se odchylujeme od PDF a proč

| PDF | U nás | Proč |
|---|---|---|
| agenti mají scrapovací nástroje (crewai_tools) | stahuje jen služba tools, agenti dostanou text | pravidla robots.txt, pauzy a registr platí na jednom místě |
| Firecrawl, rotace proxy proti Heurece | nepoužíváme | bylo by to obcházení blokace |
| crew zapisuje čísla do Pydantic modelu | crew citace, čísla čte kód | ochrana proti vymyšleným a přepočítaným číslům |
| report crew sekvenční | hierarchická s manažerem | rozhodnutí vlastníka projektu |
| PostgreSQL / TimescaleDB | SQLite | na současný objem stačí (viz TODO) |
| ČSÚ CEN0101E s cenami paliv | Sčítání 2021 (poptávka po krajích) | ČSÚ ceny pevných paliv nevede |
| VisionTool pro obrázky | Tesseract po buňkách | dočasné rozhodnutí, viz TODO |
