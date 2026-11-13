# podpalto_cz

Projekt z oblasti **Competitive Intelligence** (analýza konkurence) pro **podpalto.cz**

## O projektu

Cílem projektu je sbírat, zpracovat a vyhodnotit informace o konkurenci a trhu tak, aby z nich vznikla využitelná doporučení pro podpalto.cz.

> Tuto sekci doplň: konkrétní cíle, zkoumané konkurenty a použité metody.

## Architektura

Monorepo se třemi částmi. Multiagentní systém je postavený na frameworku [CrewAI](https://docs.crewai.com).

```
frontend  ──▶  app (flows → crews → agenti)  ──▶  tools  ──▶  web / data
```

```
podpalto_cz/
├── pyproject.toml     # kořen uv workspace (členové: app, tools) + dev nástroje
├── .python-version
├── .env.example       # šablona proměnných prostředí (zkopíruj do .env)
├── app/               # aplikace: agenti, úlohy, crews a flows (CrewAI)  → app/README.md
├── tools/             # vlastní CrewAI nástroje sdílené agenty           → tools/README.md
├── frontend/          # uživatelské rozhraní (framework zatím nevybrán)  → frontend/README.md
└── outputs/           # vygenerované reporty (neverzují se)
```

| Část | Balíček | Závisí na |
|---|---|---|
| `tools/` | `podpalto_tools` | `crewai` |
| `app/` | `podpalto_app` | `crewai`, `podpalto_tools` |
| `frontend/` | — | API z `app/` |

Závislosti tečou jen jedním směrem: `tools` nic neví o agentech, `app` nic neví o frontendu.

## Jak začít

Projekt používá [uv](https://docs.astral.sh/uv/) (stejný nástroj, který používá CrewAI CLI).

```bash
git clone https://github.com/Tosf0/podpalto_cz.git
cd podpalto_cz

pip install uv           # nebo: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
uv sync                  # vytvoří .venv a nainstaluje app + tools + dev závislosti

copy .env.example .env   # Windows (macOS/Linux: cp) a doplň ANTHROPIC_API_KEY

uv run kickoff https://www.konkurent.cz   # spustí analýzu konkurenta → outputs/
uv run pytest                             # testy
uv run ruff check .                       # lint
```

Citlivé údaje (API klíče apod.) patří do souboru `.env`, který se nikdy nenahrává na GitHub.

## Autor

[Tosf0](https://github.com/Tosf0)
