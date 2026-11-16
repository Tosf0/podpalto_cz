# podpalto_cz

Projekt z oblasti **Competitive Intelligence** (analýza konkurence) pro **podpalto.cz**

## O projektu

Cílem projektu je sbírat, zpracovat a vyhodnotit informace o konkurenci a trhu tak, aby z nich vznikla využitelná doporučení pro podpalto.cz.

Systém sbírá data o trhu tuhých paliv (dřevo, brikety, uhlí) z více zdrojů a tým AI agentů z nich sestaví report s doporučeními.

> Tuto sekci doplň: konkrétní cíle, zkoumané konkurenty a použité metody.

## Architektura

Monorepo se třemi částmi. Backend tvoří dvě samostatné služby (dva kontejnery), které spolu
mluví jen přes HTTP. Multiagentní systém je postavený na frameworku
[CrewAI](https://docs.crewai.com) s hierarchickým procesem (manažer deleguje na specialisty).

```
frontend ──HTTP──▶ app :8000 ──────────────────────HTTP──▶ tools :8001 ──▶ zdroje dat
                   FastAPI → flow → hierarchický crew      FastAPI, jeden modul = jeden zdroj
                   (manažer → specialisté → RemoteTool)    (zatím mock data)
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
└── outputs/             # vygenerované reporty (neverzují se)
```

| Část | Balíček | Port | Závislosti |
|---|---|---|---|
| `tools/` | `podpalto_tools` | 8001 | FastAPI (bez CrewAI) |
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
uv run uvicorn podpalto_app.api.app:app --port 8000   # 2. služba s agenty
```

Interaktivní dokumentace API: <http://localhost:8000/docs> a <http://localhost:8001/docs>.
Průzkum se spouští přes `POST /runs` (nejpohodlněji tlačítkem „Try it out“ v `/docs`):

```json
{ "fuel_types": ["briquettes", "coal"], "focus": "pricing before winter" }
```

Odpověď obsahuje `run_id`; stav a hotový report vrací `GET /runs/{run_id}`.

Bez API jde jeden průzkum spustit i přímo (služba `tools` musí běžet):

```bash
uv run kickoff briquettes coal --focus "pricing before winter"
```

### Docker

```bash
docker compose up --build   # tools na :8001, app na :8000, reporty do ./outputs
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
