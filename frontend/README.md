# frontend — uživatelské rozhraní

Zatím prázdné. Framework ještě není vybraný (např. Next.js / React + Vite, nebo Streamlit
pro rychlý interní prototyp).

Frontend nevolá CrewAI ani službu `tools` napřímo, jen API služby `app` (port 8000):

| Metoda | Cesta | Účel |
|---|---|---|
| `POST` | `/runs` | spustí průzkum (`fuel_types`, `region`, `focus`), vrátí `run_id` |
| `GET` | `/runs/{run_id}` | stav (`queued` / `running` / `completed` / `failed`) a hotový report v Markdownu |
| `GET` | `/runs` | seznam průzkumů |
| `GET` | `/health` | stav služby a dostupnost služby `tools` |

Průzkum trvá minuty, proto se spouští na pozadí a frontend se na stav dotazuje opakovaně.
Přesná schémata jsou na <http://localhost:8000/docs>.

Po výběru frameworku sem patří jeho projekt (`package.json`, `src/` …) a vlastní `Dockerfile`;
do `docker-compose.yml` pak přibude třetí služba. Pokud poběží na jiné adrese než API,
bude potřeba ve službě `app` povolit CORS.
