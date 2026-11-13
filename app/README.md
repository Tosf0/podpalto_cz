# app — agenti a orchestrace (CrewAI)

Python balíček `podpalto_app`. Obsahuje vše, co je specifické pro multiagentní systém:
agenty, úlohy (tasks), týmy agentů (crews) a jejich orchestraci (flows).

```
src/podpalto_app/
├── main.py                    # vstupní body: kickoff, plot
├── settings.py                # konfigurace z .env (model, výstupní složka …)
├── crews/                     # jeden podbalíček = jeden crew
│   └── research_crew/
│       ├── config/
│       │   ├── agents.yaml    # role, cíle a backstory agentů
│       │   └── tasks.yaml     # popis úloh a očekávané výstupy
│       └── crew.py            # skládá agenty + úlohy + nástroje do Crew
└── flows/                     # řízení celého procesu (může spouštět více crews)
    └── competitor_analysis.py # research konkurenta → uložení reportu do outputs/
```

## Pojmy

| Vrstva | Co dělá | Kde |
|---|---|---|
| **Tool** | jedna konkrétní schopnost (stáhni stránku, hledej …) | [`tools/`](../tools) |
| **Agent** | role + cíl + nástroje, rozhoduje se pomocí LLM | `crews/*/config/agents.yaml` |
| **Task** | zadání pro agenta s očekávaným výstupem | `crews/*/config/tasks.yaml` |
| **Crew** | tým agentů řešící jeden úkol | `crews/*/crew.py` |
| **Flow** | stavový proces, který řetězí crews a Python kroky | `flows/` |

## Spuštění

```bash
uv run kickoff https://www.konkurent.cz   # bez URL se použije COMPETITOR_URL z .env
uv run plot                               # vygeneruje HTML diagram flow
```

## Nový crew

1. Zkopíruj `crews/research_crew/` pod novým názvem.
2. Uprav `agents.yaml`, `tasks.yaml` a metody v `crew.py` (názvy metod = klíče v YAML).
3. Zavolej crew z některého flow v `flows/`.
