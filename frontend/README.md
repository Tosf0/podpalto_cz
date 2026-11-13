# frontend — uživatelské rozhraní

Zatím prázdné. Framework ještě není vybraný (např. Next.js / React + Vite, nebo Streamlit
pro rychlý interní prototyp).

Frontend nebude volat CrewAI napřímo. Plánovaná komunikace:

```
frontend  ──HTTP/JSON──▶  API vrstva (app/, např. FastAPI)  ──▶  flows / crews  ──▶  tools
```

Po výběru frameworku sem patří jeho projekt (`package.json`, `src/` …); `node_modules/`
je už vyloučený v kořenovém `.gitignore`.
