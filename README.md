# podpalto_cz

Přehled trhu tuhých paliv pro koncové zákazníky: platforma **podpalto.cz**

## O projektu

podpalto.cz žádná paliva neprodává. Cílem je dát domácnostem nezávislý přehled: co které
palivo stojí, kde je nejlevnější v přepočtu na jednotku a na kWh a co se na trhu děje.

Systém sbírá data o trhu tuhých paliv (hnědé a černé uhlí, koks, uhelné brikety, dřevěné
pelety a brikety, palivové dřevo) z e-shopů, uhelných skladů a prodejců dřeva a tým AI agentů
z nich sestaví přehled pro kupující. Všechna čísla počítá obyčejný kód; agenti ceníky čtou
(citují), kontrolují, porovnávají a komentují.

> Tuto sekci doplň: konkrétní cíle a rozsah sledovaných prodejců.

## Architektura

Architektura vychází z rešerše „Zdroje dat o pevných palivech“ (PDF, sekce 4): deterministický
**CrewAI Flow** navenek, specializované **Crews** uvnitř kroků a striktní **Pydantic**
kontrakt (`SolidFuelPriceRecord`). Backend tvoří dvě samostatné služby (dva kontejnery),
které spolu mluví jen přes HTTP.

```
frontend ──HTTP──▶ app :8000 ─────────────────────────────HTTP──▶ tools :8001 ──▶ weby prodejců
                   CollectionFlow: @router podle druhu zdroje      robots.txt, stahování,
                     ├ feed / Shoptet ─────────────────────────▶   ověření citací, normalizace
                     └ ceník ─▶ ExtractionCrew (extraktor →         (Kč/t, Kč/prms, Kč/kWh),
                                QA auditor, cituje, nepočítá)      SQLite, nástroje pro agenty
                   MarketResearchFlow: hierarchická crew ──────▶   (ceny skutečné, zbytek mock)
                     (manažer → specialisté → RemoteTool)
```

```
podpalto_cz/
├── pyproject.toml       # kořen uv workspace (členové: app, tools) + dev nástroje
├── uv.lock              # zamčené verze závislostí (společné pro obě služby)
├── docker-compose.yml   # spustí oba backend kontejnery
├── .env.example         # šablona proměnných prostředí (zkopíruj do .env)
├── app/                 # služba s agenty: API, flows, crews, klient nástrojů  → app/README.md
├── tools/               # služba s nástroji: zdroje dat pro agenty            → tools/README.md
├── frontend/            # uživatelské rozhraní (framework zatím nevybrán)     → frontend/README.md
├── data/                # databáze snímků a kopie feedů služby tools (neverzuje se)
└── outputs/             # vygenerované reporty (neverzují se)
```

| Část | Balíček | Port | Závislosti |
|---|---|---|---|
| `tools/` | `podpalto_tools` | 8001 | FastAPI, SQLite (bez CrewAI) |
| `app/` | `podpalto_app` | 8000 | CrewAI, FastAPI; na `tools` jen přes `TOOLS_API_URL` |
| `frontend/` | — | — | jen API služby `app` |

Služby na sobě nezávisí kódem: `app` neimportuje `podpalto_tools`. Seznam nástrojů včetně
popisů a schémat argumentů si načítá z `GET /tools`, takže nový zdroj dat stačí přidat
ve službě `tools` a přiřadit agentovi v YAML.

## Jak začít

Projekt používá [uv](https://docs.astral.sh/uv/) (stejný nástroj, který používá CrewAI CLI).

```bash
git clone https://github.com/Tosf0/podpalto_cz.git
cd podpalto_cz

pip install uv           # nebo: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
uv sync                  # vytvoří .venv a nainstaluje app + tools + dev závislosti

copy .env.example .env   # Windows (macOS/Linux: cp) a doplň ANTHROPIC_API_KEY
```

### Lokální běh (dva terminály)

```bash
uv run uvicorn podpalto_tools.api:app --port 8001     # 1. služba s nástroji
uv run collect                                        # 2. sběr cen do ./data (stačí občas)
uv run uvicorn podpalto_app.api.app:app --port 8000   # 3. služba s agenty
```

Sběr (`CollectionFlow`) projde 22 zdrojů z registru `tools/src/podpalto_tools/collect/sources.yaml`:
deset e-shopů (feed nebo veřejné produktové stránky, bez LLM) a dvanáct ceníků uhelných skladů
a prodejců dřeva (čte je extrakční crew, takže potřebuje `MODEL` a API klíč). Respektuje
`robots.txt` a trvá kolem 15 minut. Bez sběru cenové nástroje vrací chybu s návodem. Pravidla
sběru a normalizace popisuje [tools/README.md](tools/README.md), flows a crews
[app/README.md](app/README.md).

Interaktivní dokumentace API: <http://localhost:8000/docs> a <http://localhost:8001/docs>.
Průzkum se spouští přes `POST /runs` (nejpohodlněji tlačítkem „Try it out“ v `/docs`):

```json
{ "fuel_types": ["wood_pellets", "wood_briquettes"], "region": "Kraj Vysočina",
  "focus": "cheapest heat per kWh this winter" }
```

Odpověď obsahuje `run_id`; stav a hotový report vrací `GET /runs/{run_id}`.

Bez API jde jeden průzkum spustit i přímo (služba `tools` musí běžet):

```bash
uv run kickoff wood_pellets wood_briquettes --focus "cheapest heat per kWh this winter"
```

### Docker

```bash
docker compose up --build                  # tools na :8001, app na :8000, reporty do ./outputs
docker compose exec app collect            # první spuštění: sběr cen do ./data
```

### Vývoj

```bash
uv run pytest         # testy (bez volání LLM)
uv run ruff check .   # lint
uv run ruff format .  # formátování
```

Citlivé údaje (API klíče apod.) patří do souboru `.env`, který se nikdy nenahrává na GitHub.

## Autor

[Tosf0](https://github.com/Tosf0)
