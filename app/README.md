# app — služba s agenty (CrewAI)

Python balíček `podpalto_app`: flows, crews, veřejné API pro frontend. Nástroje ani data
nevlastní, volá je přes HTTP ve službě [`tools`](../tools). Architektura sleduje rešerši
„Zdroje dat o pevných palivech“ (dále PDF), sekce 4: deterministický **CrewAI Flow** navenek,
specializované **Crews** uvnitř jednotlivých kroků a striktní **Pydantic** kontrakt výstupu.

```
src/podpalto_app/
├── api/                      # FastAPI: veřejné rozhraní služby
│   ├── app.py                # endpointy /health, /runs
│   ├── runs.py               # evidence průzkumů a jejich běh na pozadí (zatím v paměti)
│   └── schemas.py            # modely požadavků a odpovědí
├── flows/
│   ├── collection.py         # CollectionFlow: zdroj po zdroji, @router podle druhu zdroje
│   └── market_research.py    # MarketResearchFlow: kontrola vstupů → crew → report do outputs/
├── crews/
│   ├── extraction_crew/      # Extractor → QA Auditor (sekvenčně), čte ceníky
│   │   ├── config/agents.yaml
│   │   ├── config/tasks.yaml
│   │   └── crew.py           # output_pydantic + guardrail (max. 3 opravy)
│   └── solid_fuels_crew/     # report pro domácnosti
│       ├── config/agents.yaml   # manažer + specialisté (role, cíl, remote_tools)
│       ├── config/tasks.yaml    # úlohy a očekávané výstupy
│       └── crew.py              # Process.hierarchical, manažer = research_manager
├── remote_tools/             # klientská strana služby tools
│   ├── client.py             # ToolsClient (httpx): nástroje + kroky sběru
│   └── tool.py               # RemoteTool: CrewAI nástroj vytvořený z katalogu GET /tools
├── domain.py                 # FuelType (7 kategorií z PDF), ExtractedPriceRow, SellerPriceExtractionList
├── settings.py               # konfigurace z prostředí
└── main.py                   # CLI: collect, kickoff, plot
```

## Dva flows

```
CollectionFlow (sběr, PDF 4.1)                       MarketResearchFlow (report)
──────────────────────────────                       ───────────────────────────
@start  load_sources ◀── GET /sources                @start  prepare
@router next_source ─┬─ structured ─▶ POST /sources/{id}/collect      │
   ▲                 ├─ extraction ─▶ POST /sources/{id}/pages        @listen run_crew ─▶ SolidFuelsCrew
   │                 │                 └▶ ExtractionCrew (na stránku)  │                  (hierarchická)
   │                 │                 └▶ POST /sources/{id}/extraction│
   │                 └─ unsupported ─▶ přeskočit                       @listen save_report ─▶ outputs/*.md
   └──── source_done ◀┘
@listen save_summary ─▶ outputs/collection-*.json
```

`CollectionFlow` drží stav v Pydantic modelu `FuelPipelineState`. Rozhoduje jen o tom, co se
spustí dál, opakuje neúspěšný běh crew (chyba LLM, jeden pokus navíc) a loguje. Stahování,
`robots.txt`, pauzy, ověření i všechny výpočty dělá služba `tools`. Odmítnutý požadavek
(403, robots) se nikdy neopakuje.

## Extrakční crew (PDF 4.2, „Cognitive Processing Crew“)

```
price_list_extractor ──▶ market_qa_auditor          Process.sequential
   cituje řádky ceníku       vyřadí, co není palivo (doprava, skládání, zálohy, samovýroba),
   doslova ze stránky        opraví kategorii, jednotku a DPH, doplní chybějící řádky
                             └─ guardrail: dry run ověření ve službě tools, až 3 opravy
```

- Výstup obou úloh je `SellerPriceExtractionList` (`output_pydantic`).
- Agenti nemají nástroje a nic nestahují: dostanou text stránky, který stáhla služba `tools`.
- Agenti nepíšou žádná čísla. Cenu, jednotku a balení **citují**; služba `tools` ověří, že
  citace na stránce je, a číslo z ní přečte sama. Guardrail vrací auditorovi přesné
  důvody, proč řádek neprošel.
- Sekvenční proces (ne hierarchický) proto, že PDF předepisuje pevný postup extraktor →
  auditor a manažer by u dvou kroků jen přidal volání LLM. Crew pro report zůstává
  hierarchická.
- Ceník, jehož text se od minula nezměnil, se crew neposílá (šetří volání LLM).

## Crew pro report (hierarchická)

```
                    research_manager  (deleguje a kontroluje, sám nemá nástroje)
                                        │
   ┌────────────────┬───────────────────┼───────────────────┬──────────────────┐
pricing_analyst  market_analyst  regulation_analyst  customer_insights_   report_writer
                                                     analyst
eshop_catalog    market_         news_search         customer_reviews     (bez nástrojů)
price_comparison statistics
```

Úlohy v `tasks.yaml` záměrně nemají přiřazeného agenta. Každou dostane manažer a sám
rozhodne, kterému specialistovi ji deleguje. Poslední úloha `final_report` dostává výstupy
čtyř předchozích jako kontext.

YAML soubory jsou anglicky (čte je LLM). Vstupy `{fuel_types}`, `{region}` a `{focus}`
se dosazují jen do úloh. Je-li `region` kraj (např. `Kraj Vysočina`), předá ho cenový
analytik nástrojům jako filtr.

Výstupem je přehled pro domácnosti, ne doporučení pro prodejce: platforma sama nic neprodává
a žádného prodejce nezvýhodňuje. Agenti ceny nepočítají ani nepřevádějí. Citují čísla,
jednotky a čas sběru tak, jak je vrátí nástroje `eshop_catalog` a `price_comparison`.
Zbylé tři nástroje jsou zatím mock.

## Spuštění

```bash
uv run collect                       # sběr všech povolených zdrojů (feedy, Shoptet, ceníky)
uv run collect stefl drevopraha      # jen vybrané zdroje
uv run kickoff wood_pellets firewood --region "Kraj Vysočina" --focus "nejlevnější teplo"
uv run plot                          # HTML diagramy obou flows
```

`collect` potřebuje `AGENT_MODEL` (nebo `MODEL`) a API klíč jen kvůli ceníkům; feedy
a Shoptet obchody LLM nepoužívají.

Manažer a ostatní agenti mají každý svůj model (`MANAGER_MODEL`, `AGENT_MODEL`, viz
Konfigurace). Klíč `llm:` u agenta v YAML má přednost před oběma.

## API

| Metoda | Cesta | Účel |
|---|---|---|
| `POST` | `/runs` | spustí průzkum na pozadí, vrátí `202` a `run_id` |
| `GET` | `/runs/{run_id}` | stav a po dokončení report |
| `GET` | `/runs` | seznam průzkumů |
| `GET` | `/health` | stav služby a dostupnost služby `tools` |

## Konfigurace

| Proměnná | Výchozí | Význam |
|---|---|---|
| `MANAGER_MODEL` | `MODEL` | LLM manažera crew pro report, např. `anthropic/claude-opus-5-5` |
| `AGENT_MODEL` | `MODEL` | LLM všech ostatních agentů (specialisté, extrakční crew), např. `anthropic/claude-sonnet-5-5` |
| `MODEL` | — | záložní LLM pro tu z dvou proměnných výše, která není vyplněná |
| `ANTHROPIC_API_KEY` | — | klíč k LLM |
| `TOOLS_API_URL` | `http://localhost:8001` | adresa služby `tools` |
| `TOOLS_API_TIMEOUT_S` | `30` | časový limit volání nástroje |
| `COLLECT_TIMEOUT_S` | `900` | časový limit jednoho kroku sběru (Shoptet obchod trvá minuty) |
| `OUTPUT_DIR` | `outputs` | kam se ukládají reporty a souhrny sběru |

## Rozšiřování

- **Nový nástroj pro agenta:** přidej ho ve službě `tools` a jeho název dopiš do
  `remote_tools` u agenta v `agents.yaml`. Kód v `app` se nemění.
- **Nový specialista:** blok v `agents.yaml` + metoda s `@agent` v `crew.py`
  (`return self._specialist("nazev")`). Manažer ho uvidí mezi spolupracovníky automaticky.
- **Nová úloha:** blok v `tasks.yaml` + metoda s `@task` v `crew.py`. Pořadí metod určuje
  pořadí úloh.
- **Nový druh zdroje:** `SourceKind` a cesta ve službě `tools`, větev v `next_source`
  a metoda s `@router("<větev>")` v `flows/collection.py`.

## Testy

Testy v `tests/` nevolají LLM ani síť. Službu `tools` spouští uvnitř testovacího procesu a mluví
s ní stejným HTTP rozhraním jako v provozu, takže hlídají i kontrakt mezi oběma službami.
Extrakční crew v testech flow nahrazuje stub; guardrail i ověření řádků přitom běží naostro.
Databázi cen naplní smyšlený feed z `tools/tests/fixtures/` a smyšlený ceník uhelného skladu.
