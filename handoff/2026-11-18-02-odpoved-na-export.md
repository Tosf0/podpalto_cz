# Handoff 2026-11-18 #02: odpověď na export, čistá databáze

**Od:** Lukáš (s Claude) · **Pro:** Franta · **Větev:** `dev` · navazuje na #01

**Shrnutí:** Databáze je **prázdná** a připravená na tvůj první import. Rozhodnutí ke
konfliktům z #01 jsou níže, frontend už umí celostátní prodejce, sídlo firmy a přibližnou
polohu. Zbývá: dvě drobné úpravy exportu (sekce 3) a první ostrý import (sekce 4).

---

## 1. Čistý start

Dočasná data od subagentů jsou smazaná: 81 prodejců, 371 produktů, 371 cen, statistiky
za listopad a 5 ukázkových reportů CI Studia. Smazané jsou i fotky prodejců
z `frontend/public/sellers/` (zůstaly jen obecné v `generic/`). Blog, účty, tarify,
Sčítání 2021 a plán jobů zůstaly. Záloha je v Supabase v `backup.snapshot_20261118`
(soukromé schéma, přes API nedostupné).

Důsledky pro export:
- **`link_sellers` už není potřeba** – žádní stávající prodejci, žádné duplicity (bod 3.1 odpadá).
- Všichni prodejci z exportu budou nově založení (`sellers_new`), slugy nekolidují.
- Web bude prázdný (mapa, katalog, Trendy, archiv CI Studia), dokud import neproběhne.

## 2. Rozhodnutí ke konfliktům z #01

| Bod | Rozhodnutí |
|---|---|
| 3.1 párování | Odpadá (čistý start). |
| 3.2 Havelka | **(b) zatím neexportovat.** Pobočky se závozovou oblastí (c) později, až web umí oblast doručení. |
| 3.3 sídlo firmy | Příznak `location_is_registered_office` zůstává **neblokující**. Web ho ukáže (viz níže). |
| 3.4 přesnost „ulice“ | Zobrazit normálně, web přidá poznámku „přibližná poloha“. |
| 3.5 baumax | Vynechat, jak navrhuješ. |
| 3.5 bauhaus IČO | **Nevyplňovat**, dokud není ověřené na jejich webu nebo v obchodním rejstříku (ne jen dohledání v ARES podle jména). |
| 3.5 akce, doprava | Později; web zatím ukáže „Neuvedeno“. |

**Co už umí web a databáze** (migrace `frontend/supabase/migrations/20261118235000_location_info_nationwide.sql`, nahraná):
- **Celostátní prodejce** = má ceny s `valid_in_regions = ['CZ']` (z `price_region: CZ`
  v `sources.yaml`). Na mapě je bez špendlíku, v seznamu s „celá ČR“, filtr okruhem ho nevyřadí.
  Do mediánu kraje sídla se nepočítá, jen do celostátního (`refresh_market_stats`).
  → **Posílej `valid_in_regions` u každé ceny**, jinak se e-shop bude chovat jako místní sklad.
- **Sídlo firmy** (`flags` obsahuje `location_is_registered_office`) → poznámka
  „Poloha podle sídla firmy – sklad může být jinde“ v detailu a v panelu na mapě.
- **`location_precision` = `street` nebo `municipality`** → poznámka „Přibližná poloha“.

## 3. Prosím uprav v exportu (před prvním importem)

1. **Havelku vynech** z exportu (bod 3.2).
2. **Bauhaus bez IČO** (bod 3.5).
3. Drobnost do budoucna (při čistém startu se neprojeví): u **existujícího** prodejce
   v `_seller_columns` neposílej prázdné hodnoty (`ico`, `lat`/`lng`, `website`, `legal_name`),
   aby update nesmazal data, která na webu už jsou (např. doplněná ručně v administraci).

## 4. První import

Klíče: `SUPABASE_SECRET_KEY` ti pošle Lukáš, `ANTHROPIC_API_KEY` je tvůj. Na webu máš účet
s rolí **admin** a tarifem **Pro** (odhlásit a přihlásit, aby se projevilo).

```bash
uv run uvicorn podpalto_tools.api:app --port 8001          # terminál 1
uv run python -m podpalto_app.worker.export --dry-run      # terminál 2: jen čte, nic nezapíše
uv run python -m podpalto_app.worker.export                # zápis
```

Po ručním importu v SQL Editoru (nebo napiš Lukášovi) `select public.refresh_market_stats();`.
Při jobu `collect` z administrace se statistiky přepočítají samy (`finish_agent_job_run`).
Kontrola na webu: mapa a katalog (prodejci), detail prodejce (poznámky k poloze),
Administrace → **Data od agentů** (co čeká na ruční kontrolu), Trendy a heat mapa.

Potom Railway podle `docs/TODO.md`, „Napojení agentů na web“ → „Railway – krok za krokem“.
