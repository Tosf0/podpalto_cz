# app — služba s agenty (CrewAI)

Python balíček `podpalto_app`: agenti, jejich orchestrace a veřejné API pro frontend.
Nástroje nevlastní, volá je přes HTTP ve službě [`tools`](../tools).

```
src/podpalto_app/
├── api/                      # FastAPI: veřejné rozhraní služby
│   ├── app.py                # endpointy /health, /runs
│   ├── runs.py               # evidence průzkumů a jejich běh na pozadí (zatím v paměti)
│   └── schemas.py            # modely požadavků a odpovědí
├── flows/
│   └── market_research.py    # kontrola vstupů → crew → uložení reportu do outputs/
├── crews/
│   └── solid_fuels_crew/
│       ├── config/
│       │   ├── agents.yaml   # manažer + specialisté (role, cíl, remote_tools)
│       │   └── tasks.yaml    # úlohy a očekávané výstupy
│       └── crew.py           # Process.hierarchical, manažer = research_manager
├── remote_tools/             # klientská strana služby tools
│   ├── client.py             # ToolsClient (httpx)
│   └── tool.py               # RemoteTool: CrewAI nástroj vytvořený z katalogu GET /tools
├── domain.py                 # FuelType
├── settings.py               # konfigurace z prostředí
└── main.py                   # CLI: kickoff, plot
```

## Hierarchický model

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
čtyř předchozích jako kontext. Přidáním `agent: <název>` k úloze omezíš manažera na delegaci
jen tomuto agentovi.

YAML soubory jsou anglicky (čte je LLM). Vstupy `{fuel_types}`, `{region}` a `{focus}`
se dosazují jen do úloh, ne do definic agentů.

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
| `MODEL` | — | LLM pro všechny agenty, např. `anthropic/claude-opus-5-5` |
| `ANTHROPIC_API_KEY` | — | klíč k LLM |
| `TOOLS_API_URL` | `http://localhost:8001` | adresa služby `tools` |
| `TOOLS_API_TIMEOUT_S` | `30` | časový limit volání nástroje |
| `OUTPUT_DIR` | `outputs` | kam se ukládají reporty |

## Rozšiřování

- **Nový nástroj pro agenta:** přidej ho ve službě `tools` a jeho název dopiš do
  `remote_tools` u agenta v `agents.yaml`. Kód v `app` se nemění.
- **Nový specialista:** blok v `agents.yaml` + metoda s `@agent` v `crew.py`
  (`return self._specialist("nazev")`). Manažer ho uvidí mezi spolupracovníky automaticky.
- **Nová úloha:** blok v `tasks.yaml` + metoda s `@task` v `crew.py`. Pořadí metod určuje
  pořadí úloh.
- **Nový crew nebo proces:** další podbalíček v `crews/` a flow v `flows/`, které ho volá.

## Testy

Testy v `tests/` nevolají LLM. Službu `tools` spouští uvnitř testovacího procesu a mluví
s ní stejným HTTP rozhraním jako v provozu, takže hlídají i kontrakt mezi oběma službami.
