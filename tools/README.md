# tools — služba s nástroji (zdroje dat)

Python balíček `podpalto_tools`: samostatná FastAPI služba, přes kterou agenti získávají data.
Nezávisí na CrewAI ani na balíčku `app`, takže běží ve vlastním malém kontejneru.

```
src/podpalto_tools/
├── api.py                   # FastAPI aplikace (endpointy se generují z registru)
├── registry.py              # ToolSpec = kontrakt jednoho nástroje
├── schemas.py               # sdílené modely (FuelType, ToolResult)
└── sources/                 # jeden modul = jeden zdroj dat
    ├── __init__.py          # ALL_TOOLS: seznam registrovaných nástrojů
    ├── eshop_catalog.py     # MOCK  nabídka konkurenčních e-shopů
    ├── price_comparison.py  # MOCK  cenová hladina trhu (min / průměr / max)
    ├── market_statistics.py # MOCK  roční řady cen a spotřeby
    ├── news_search.py       # MOCK  zprávy: regulace, dotace, ceny, dodávky
    ├── customer_reviews.py  # MOCK  recenze prodejců
    └── page_text.py         # REAL  stáhne stránku a vrátí její text
```

## API

| Metoda | Cesta | Účel |
|---|---|---|
| `GET` | `/health` | kontrola, že služba běží |
| `GET` | `/tools` | katalog: název, popis, příznak `mock` a JSON schéma vstupu každého nástroje |
| `POST` | `/tools/{name}` | spustí nástroj; tělo požadavku odpovídá jeho vstupnímu modelu |

```bash
uv run uvicorn podpalto_tools.api:app --port 8001
```

Nástroje jde vyzkoušet ručně na <http://localhost:8001/docs>, např. `price_comparison`
s tělem `{"fuel_type": "briquettes", "product_query": "RUF"}`.

## Mock data

Mock nástroje vrací pevná, smyšlená data (prodejci `MockPaliva`, `DemoTopivo`, `TestBrikety`,
`SampleFuel`, adresy na doméně `.example`). Každá odpověď nese `"mock": true` a `source`,
aby agenti i výsledný report věděli, že nejde o skutečná tržní data.
Podporovaná paliva: `firewood`, `briquettes`, `coal`.

`page_text` je jediný skutečný nástroj (stahuje živé stránky). Zatím není přiřazený
žádnému agentovi.

## Nový nebo skutečný zdroj dat

1. Vytvoř modul v `sources/` se vstupním a výstupním Pydantic modelem (výstup dědí
   z `ToolResult`), funkcí `run(params)` a konstantou `TOOL = ToolSpec(...)`.
   Popisy (`description`) piš anglicky: čte je LLM.
2. Přidej `TOOL` do `ALL_TOOLS` v `sources/__init__.py`. Endpoint i položka v katalogu
   vzniknou automaticky.
3. Přiřaď název nástroje agentovi v `remote_tools` v `agents.yaml` služby `app`.
4. Přidej test do `tests/`.

Nahrazení mocku skutečným zdrojem znamená přepsat tělo `run()` a nastavit `mock=False`.
Dokud se nezmění vstupní a výstupní model, služba `app` se měnit nemusí.
Selhání zdroje hlas výjimkou `ToolError`: API ji převede na HTTP 502 a agent dostane
chybovou zprávu, na kterou může reagovat.
