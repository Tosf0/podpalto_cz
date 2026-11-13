# tools — vlastní nástroje pro agenty

Python balíček `podpalto_tools`. Obsahuje vlastní CrewAI nástroje (`crewai.tools.BaseTool`),
které agenti v [`app/`](../app) používají. Nástroje nemají žádnou vazbu na konkrétní crew,
takže je lze samostatně testovat a sdílet.

```
src/podpalto_tools/
├── __init__.py        # re-export všech nástrojů
└── web/               # nástroje pro čtení webu
    └── page_text.py   # PageTextTool – stáhne stránku a vrátí její text
```

## Nový nástroj

1. Vytvoř modul ve vhodné složce (`web/`, `data/`, `reports/` …) se třídou dědící z `BaseTool`
   a `args_schema` jako Pydantic modelem.
2. Exportuj ho v `__init__.py` dané složky a v `podpalto_tools/__init__.py`.
3. Přidej test do `tests/`.

Hotové nástroje (vyhledávání, scraping …) nabízí také balíček `crewai-tools`.
