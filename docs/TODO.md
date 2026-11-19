# Co je ještě potřeba udělat nebo změnit

Průběžný seznam otevřených úkolů a dočasných rozhodnutí. Hotové věci odsud mažeme;
důležitá rozhodnutí přesouváme do README příslušné služby. Datum = kdy byla položka
zapsána nebo naposledy změněna.

## Přehled k 19. 11. 2026 (Franta / Claude) – co je hotové a co zbývá

**Hotovo (agenti a data):**
- Export sběru do Supabase (`tools` `GET /export` → worker `export.py`), první import
  18. 11. (34 prodejců, 574 cen), statistiky přepočítané.
- Railway: služby `tools` a `worker` běží, nasazují **jen z `main`** (produkce); test jobu
  `collect` prošel end-to-end. `main` = produkce, `dev` = vývoj (sekce „Vydání“).
- Kvalita: rozpětí cen podle paliva, `price_jump` (skok > 30 %), varianty cen (akce,
  množstevní ceny, pásma Havelky), `delivery_included` z názvu, varianty mimo kontrolu
  vůči trhu, stabilní klíče prodejce a položek, poloha prodejců z ARES a RÚIAN.
- Zdroje: 41 v registru; nově Moravskoslezský (3), Karlovarský (Golem), Vysočina
  (PREMIUM PELLETS), Pardubický (Polička, DMdřevo, Litomyšl), Olomoucký (OL-IN, Ludwig),
  Plzeňský (Makový). Ceníky ve Wordu (.doc, .docx) čte `collect/worddoc.py`.
- Požadavky z handoffů #02 a #04 splněné.

**Zbývá – v pořadí:**
1. **Vydat `dev` → `main`** (nové zdroje, Word, `price_jump`, úpravy z #04 jsou jen v `dev`)
   a v administraci spustit „Sběr cen“ – teprve pak budou nové kraje na webu.
2. **Lukáš:** Vercel *Production Branch* = `main`; schválit 2 varianty Lesů Liberec a rozhodnout
   2 odlehlé ceny v Data od agentů; zvážit ochranu `main` na GitHubu.
3. **Frekvence sběru:** dnes jeden měsíční job; e-shopy a feedy týdně, ceníky měsíčně.
4. **Pokrytí:** Jihomoravský kraj a Praha (po 1 místním prodejci) – ceníky na webu se
   nedaří najít; stage 1 zdroje níže (uhlipro, cdpaliva, Lesy ČR, VLS…).
5. **Doprava prodejců** (bod 10) – dnes u všech `null`, kalkulačka nemá data.
6. **CI Studio:** ověřit `MarketResearchFlow` nad reálnými daty (cena běhu), napsat
   `SellerProfileFlow` a analýzu `url`.
7. **Rozhodnutí:** kWh konstanty (bod 6), externí hodnocení (bod 11), dřevo v „m³“ bez
   upřesnění, souhlas prodejců se zobrazením cen, pobočky řetězců.

## Stav k 18. 11. 2026 večer: frontend + Supabase (Lukáš / Claude)

Nasazeno v projektu Podpalto (migrace `frontend/supabase/migrations/2026111812*` až `…150000`,
v tomto pořadí; ověřeno testy v transakci s rollbackem):

- **`20261118120000_agent_output.sql` (Franta)** nasazená. Při kontrole se našla chyba
  v triggerech kontroly: schválený záznam se vracel do fronty, když agent poslal stejné příznaky
  v jiném pořadí nebo přidal jen informační příznak, a schválený prodejce bez polohy po každé
  změně příznaků.
- **`20261118130000_review_fixes.sql`** – opraveno: triggery porovnávají jen množinu
  blokujících příznaků; když blokující příznaky zmizí (čistá cena, dohledaná poloha), záznam se
  sám vrátí do `ok`. Dále: vlastník prodejce smí vkládat produkty a ceny jen do vybraných
  sloupců (ne `review_status`, `flags`…), základ varianty jen vlastní produkt; historie cen jen
  u viditelných produktů; unikátní `(source_key, snapshot_id)` v `scrape_runs`;
  `seller_intel.threat_level` zrušen, nově `market_comparison` (jsonb); tabulka
  `heating_census` se Sčítáním 2021 (15 řádků, data z `census2021_heating.json`).
- **`20261118140000_ci_queue_and_review_queue.sql`** – fronta analýz: `analysis_runs.kind`
  (`url` | `market` | `seller`), `params`, `subject_seller_id`, `claimed_by/at`,
  `competitor_url` nepovinné; `claim_analysis_run(worker)` pro službu app (jen service role);
  `analysis_runs` v publikaci Realtime; `analysis_reports.kind/params`; RPC
  `api_review_queue()` pro admina.
- **`20261118150000_public_teaser.sql`** – ukázková data pro nepřihlášené:
  `api_public_overview()` a `api_public_seller_sample()` (5 prodejců denně, bez CI shrnutí).

Frontend:

- **REST větve smazané**, `NEXT_PUBLIC_API_URL` zrušena. Bez Supabase = offline režim nad
  `src/data/`. Kontrakt je v `frontend/README.md` kap. 5 (tabulka volání + fronta analýz).
- **„Neuvedeno“ (bod 3) hotové:** typy, `estimateDelivery` vrací `unknown`, odznak skladu,
  doprava v detailu, katalogu, kalkulačce a poptávce.
- **Fronta kontroly (bod 4):** stránka `/admin/kontrola` (jen admin) – schválit / zamítnout.
- **CI Studio:** analýzu vkládá do `analysis_runs` a polluje stav; bez workera zůstane
  „Ve frontě“. Odznak „hrozby“ odstraněn z detailu prodejce i katalogu.
- **Ukázkové verze pro nepřihlášené:** výchozí stránka je mapa – heat mapa krajů a žebříček
  krajů podle ceny místo prodejců; `/prodejci` 5 prodejců denně + zamčený zbytek; `/trendy`
  6 měsíců + zamčené sekce. Za registrací: kalkulačka, detail prodejce, CI Studio (Pro),
  editor blogu, administrace.

**Co je teď na straně `app` / `tools` (Franta):**

1. [x] **Worker** – smyčka obou front, export a joby `collect` / `market_report` hotové
   (18. 11.); chybí jen flows pro analýzy `seller` a `url` (bod 5).
2. [x] **Zápis do Supabase** (export podle `docs/agent-output-spec.md`, upsert přes
   `sellers.external_key` a `products (seller_id, external_id)`) – hotovo, první import 18. 11.
3. [x] **`market_stats`** (bod 5) – v databázi je hotová funkce `public.refresh_market_stats()`
   (migrace `…170000_refresh_market_stats.sql`); po jobu `collect` ji volá sama
   `finish_agent_job_run`, po ručním importu `select public.refresh_market_stats();`. Mediány ze schválených nabídek,
   bez akcí, převod na PRMS / tunu, kraj bez nabídky nemá hodnotu.
4. [ ] Rozhodnout body **6, 10–12** níže (kWh konstanty, doprava, hodnocení, doprava
   celostátních e-shopů); body 7 a 8 (pásma, klíč prodejce) rozhodnuté 18. 11.
5. [ ] `MarketResearchFlow` (ověřit naostro) / `SellerProfileFlow` (napsat) podle rozhodnutí
   o CI Studiu (DB část hotová).

**Média na Cloudflare R2** (zapsáno 18. 11. 2026): obrázky blogu, fotky prodejců a avatary
přesunout ze Supabase Storage a `frontend/public/` do R2 přes `media.podpalto.cz`, spolu
s přesunem DNS z Wedosu na Cloudflare. Postup v `frontend/README.md`, kap. 7
(„TODO – obrázky z Cloudflare R2“). Fotky prodejců od agentů pak ukládat rovnou do R2.

**SEO a GEO** (zapsáno 18. 11. 2026): veřejné stránky `/ceny` (rozcestník, 14 krajů, 4 paliva),
`/metodika`, `/llms.txt`, náhledové obrázky (Open Graph), JSON-LD (Organization, WebSite,
BreadcrumbList, FAQPage, Dataset, BlogPosting), sitemapa a robots s povolenými AI crawlery;
na blogu 8 nových článků. Indexace je **vypnutá**, dokud na produkci není
`NEXT_PUBLIC_SITE_INDEXABLE=true` – zapnout až s vlastní doménou a **až v databázi budou
reálné ceny** (stránky `/ceny` čtou průměry z `api_public_overview`; s demo daty by se
indexovala smyšlená čísla). Postup v `frontend/README.md`, kap. 7 („TODO – vlastní doména“).
Co přijde až později (veřejné profily prodejců, stránky měst, IndexNow, Seznam Webmaster…):
`frontend/README.md`, kap. 7 („TODO – SEO a GEO do budoucna“).

**Stav 18. 11. 2026 – právní stránky, převzetí profilu, akce** (Lukáš / Claude):
- Hotovo: `/obchodni-podminky` a `/ochrana-osobnich-udaju` (odkazy v patičce a u registrace),
  převzetí profilu prodejcem (žádost na detailu prodejce → admin `/admin/kontrola` → záložka
  „Převzetí profilů“ → vlastník upravuje popis, kontakty, dopravu a nahraje vlastní fotku),
  akční a množstevní ceny na detailu prodejce (API `api_sellers` → pole `offers`),
  kontrola celého UI po úpravách (bod 9) – zkontrolováno ručně.
- [ ] **Údaje provozovatele do právních stránek:** ve Vercelu vyplnit `NEXT_PUBLIC_LEGAL_OPERATOR_NAME`,
      `NEXT_PUBLIC_LEGAL_OPERATOR_ICO`, `NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS` a případně
      `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` (výchozí `info@podpalto.cz` – zřídit schránku s doménou).
      Dokud nejsou vyplněné, stránky uvádějí jen „provozovatel služby podpalto.cz“ a e-mail.
      Texty nechat před spuštěním zkontrolovat právníkem (hlavně tarify, odstoupení, zpracovatelé).
- [ ] **Převzetí profilu – dotáhnout s platbami:** schvalovat až po zaplacení tarifu Prodejce
      (dnes schválení v `approve_seller_claim` tarif Prodejce rovnou přidělí), e-mail žadateli
      o schválení / zamítnutí, automatická kontrola IČO v ARES a shody domény e-mailu s webem
      (v administraci se dnes jen zvýrazní), úprava ceníku (produktů) vlastníkem v UI – práva
      v DB už jsou (`products`: vlastník s tarifem Prodejce smí přidávat, upravovat, mazat).
- [ ] **(do budoucna) Trendy – karta Sčítání 2021:** podíl domácností podle vytápění po krajích
      (tabulka `heating_census` už je a čtou ji stránky `/ceny`).
- [ ] **(do budoucna) Vlastní SMTP pro e-maily z účtů** (např. Resend, odesílatel
      `noreply@podpalto.cz`): vestavěný e-mail Supabase má nízký hodinový limit – při větším počtu
      registrací přestanou chodit potvrzovací e-maily. Postup a DNS záznamy (SPF, DKIM, DMARC)
      v `frontend/README.md`, kap. 7, „TODO – vlastní doména“.

### Napojení agentů na web: Vercel + Supabase + Railway (pro Frantu, připraveno 18. 11. 2026)

**Jak to spolu mluví:** web (Lukáš, Vercel) a agenti (Franta, Railway) se **nikdy nevolají
napřímo** – oba se připojují jen k Supabase. Web zakládá úlohy do front a čte výsledky; worker
na Railway si úlohy z front bere a výsledky zapisuje. Žádná veřejná URL backendu, CORS ani
API klíč mezi Vercelem a Railway.

```
 Vercel (Next.js)                 Supabase (Postgres)                      Railway
 ───────────────                  ───────────────────                      ───────
 admin → Agenti ─ request_agent_job ─▶ agent_job_runs ◀─ claim_agent_job ── worker
 (plán, Spustit nyní)                  agent_jobs (plán)   finish_agent_job_run  (python -m
 CI Studio (Pro) ─ insert ─────────▶ analysis_runs  ◀─ claim_analysis_run ──  podpalto_app.worker)
 Trh, Trendy, mapa ◀─ select ─────── products, price_observations,              │ HTTP (privátní síť)
 archiv reportů                      commodity_price_stats, analysis_reports ◀──┤
                                                                                ▼
                                                                         tools (+ volume /data)
```

**Co je hotové (Lukáš / Claude):**
- DB: plán jobů `agent_jobs` (výchozí jednou měsíčně: sběr 1. v 3:00, přehled trhu 2. v 6:00),
  fronta `agent_job_runs`, RPC `claim_agent_job` (sama zakládá naplánované běhy – **worker
  nepotřebuje cron**), `finish_agent_job_run` (po úspěšném sběru přepočítá statistiky),
  fronta CI Studia `analysis_runs` + `claim_analysis_run`. Migrace nahrané v Supabase.
- Web: administrace → záložka **Agenti** (plán, ruční spuštění, historie, upozornění, když
  worker neběží), CI Studio zakládá analýzy do fronty.
- **Worker** `app/src/podpalto_app/worker/` – hotová smyčka: převzetí běhů z obou front,
  průběh a logy do Supabase, heartbeat, chyby, ukončení při restartu (SIGTERM), testy
  `app/tests/test_worker.py` (bez LLM a sítě). Klient Supabase je jen ze standardní knihovny –
  žádná nová závislost, `uv.lock` beze změny.
- Joby a analýzy už napojené na flows: `collect` → `CollectionFlow`, `market_report`
  a analýza `market` → `MarketResearchFlow` → report do `analysis_reports` (archiv CI Studia).
- Railway: `railway/tools.json` a `railway/worker.json` (Dockerfile, start, healthcheck),
  služba `worker` v `docker-compose.yml`, proměnné v `.env.example`.

**Co zbývá Frantovi (v pořadí):**
- [x] **1. Export sběru do Supabase** – kód hotový a první import proběhl (18. 11. 2026):
      - `tools`: `GET /export?since=…` a `uv run podpalto-export` (JSON do `outputs/`)
        v `collect/export.py` – převod kategorií a jednotek (spec 6.6, 6.7), atributy z názvu
        (dřevo, pelety, brikety, uhlí), řádky, které web neumí ukázat, v `skipped` s důvodem.
      - `app`: `worker/export.py` zapisuje `sellers` → `products` → `price_observations` →
        `scrape_runs`. Existujícímu prodejci mění jen sloupce sběru (adresa, poloha, IČO,
        registr, příznaky), název a popis z webu zůstávají; převzaté profily (`owner_id`)
        nechává být; aktuální cenu produktu nemění (rozhoduje trigger); produkty, které
        zdroj už neuvádí, dostanou `active = false`; snímek exportovaný podruhé přeskočí
        (`scrape_runs` `source_key + snapshot_id`). Job `collect` exportuje jen snímky
        svého běhu, s `params.export_all = true` nejnovější snímek každého zdroje.
      - [x] **Požadavky z handoffu #02 (Lukáš), splněno 18. 11.:** Havelka se neexportuje
        (`export: false` v registru, sběr běží dál pro nástroje); Bauhaus má IČO ověřené
        na `bauhaus.cz/impressum`; update existujícího prodejce neposílá prázdné hodnoty
        (`ico`, `lat`/`lng`, `website`…), příznaky ano. `valid_in_regions` jde u každé ceny.
        Sklad Ridera Ostrava je samostatný prodejce (s `ridepal` by se stal celostátním
        a zmizel z mapy).
      - [x] **První import proběhl** (18. 11. 2026 večer, z lokálních dat): 34 prodejců
        (všichni `ok`, všichni se souřadnicemi), 574 produktů (4 akce, 16 množstevních cen),
        574 cen, 35 běhů; vynecháno 39 řádků (20× dřevo v nejasných m³, 17× neznámé balení,
        baumax bez adresy, Havelka `export: false`). **4 produkty čekají na kontrolu**
        (`outlier_vs_market`) v administraci → Data od agentů. `refresh_market_stats()`
        spuštěno: mediány ČR i 13 krajů (chybí Pardubický).
        Postup pro další ruční import: `uv run uvicorn podpalto_tools.api:app --port 8001`,
        `uv run python -m podpalto_app.worker.export --dry-run`, pak bez `--dry-run`, nakonec
        `select public.refresh_market_stats();`. Pozor: `tools` po změně kódu restartovat
        (uvicorn bez `--reload` drží starý kód i model registru).
      - [x] Akční a množstevní ceny (18. 11. 2026): export je pozná z textu varianty
        (`price_tier`, `is_promo`, `base_product_key`, spec §7). Cenová pásma Havelky
        sloučí do jednoho produktu s cenou „od“. Na lokálních datech 13 množstevních cen
        (OLVAN, kb_uhli), 2 + 4 u Lesů Liberec (bez základu, je nejednoznačný), Havelka
        z 36 řádků na 9 produktů.
      - Známá omezení: dřevo na paletě bez objemu (`package_prm`) a „m³“ bez upřesnění
        se neposílají; doprava prodejce je `null` (neuvedeno).
      - [x] Příprava dat (18. 11. 2026): klíč prodejce = `id` zdroje, rozpětí cen podle
        paliva, kód kraje (`Region.code`), klíč položky ceníku ze slugu názvu a jednotky
        (`/cenik/#koks-20-40-mm-q` místo `#<pořadí>`), adresa a poloha prodejců z ARES
        a RÚIAN v `tools/.../collect/seller_locations.json` (`podpalto-locate-sellers`).
      - [x] **Sklady místo sídel** (18. 11. 2026, z kontaktních stránek prodejců povolených
        robots.txt): 18 z 31 prodejců má polohu skladu nebo prodejny (`location` v
        `sources.yaml` s poznámkou, odkud adresa je). Opraven kraj v registru u drevosrot
        (sklad Černčice, ULK), briketymelnik (Mělník, STC) a valdex (Ústí n. L., ULK).
        Doplněno IČO: waldera (z kontaktů), dek (Stavebniny DEK a.s., z „O nás“),
        drevopraha (Zafido s.r.o., z kontaktů), bauhaus (BAUHAUS k.s., ověřeno na
        `bauhaus.cz/impressum`).
      - [ ] **Zůstává sídlo s příznakem `location_is_registered_office` (12):** havelka
        (jen závozová pásma, adresy skladů na webu nejsou), olvan („Běloveská 237“ v RÚIAN
        není), znz, deblicelesy, palivapolice (web uvádí jen sídlo), alsol (střediska),
        e-shopy a řetězce unihobby, mountfield, dek, bauhaus, drevopraha. Příznak neblokuje,
        jen upozorňuje (rozhodnuto 18. 11.).
      - [ ] **Přesnost na ulici** (sklad bez čísla): stefl (bod areálu SPOKAR, „za areálem“),
        korbicka (Nádražní, areál pily), lesy_liberec (Londýnská u ČOV, dlouhá ulice – bod
        může být až ~1 km vedle). Upřesnit, až bude známé číslo nebo souřadnice.
      - [ ] **baumax:** bez IČO a polohy (kontaktní stránka vrací HTTP 502) →
        `location_unknown`, na mapě nebude. kvalitniuhli: poloha z mapy na webu, IČO chybí.
      - [x] **`price_jump`** (19. 11.): skok ceny položky o víc než 30 % proti předchozímu
        snímku zdroje → ruční kontrola (`flag_price_jumps` v `collector.py`).
      - [x] **Handoff #04** (19. 11.): akce a množstevní ceny bez `outlier_vs_market`
        a `price_jump`; `delivery_included = true` z názvu („s dopravou“, „doprava zdarma“).
        Data z prvního importu se zpětně nemění (2 varianty Lesů Liberec schválí admin).
      - [ ] **Řetězce a více skladů:** havelka (14 skladů, sídlo Praha 4), unikom (Čáslav,
        Uhlířské Janovice, Zbraslavice), korbicka (Nové Město, Bystřice), alsol (2 střediska)
        a hobby markety s celostátní cenou (unihobby, mountfield…) mají dnes jeden bod.
        Pobočky = `<id>-<slug pobočky>`, viz spec §4; souvisí s bodem 12 (celostátní doprava).
- [ ] **2. Vstupy `MarketResearchFlow`:** worker převádí `fuel_category` (wood / pellets /
      briquettes / coal) na `FuelType` a kód kraje (`STC`) na jeho název z tabulky `regions`
      (`handlers.py`, `FUELS_BY_CATEGORY`). Zkontrolovat, že flow s tím dává dobrý report;
      volitelně vracet i strukturovaná data (`swot`, ceny) do `analysis_reports`.
- [ ] **3. Analýza `seller`** (`SellerProfileFlow` → `analysis_reports` kind `seller` + upsert
      `seller_intel`) a **analýza `url`** (formulář v CI Studiu) – v `handlers.py` je místo nich
      `not_ready(…)`: běh skončí srozumitelnou chybou místo věčného čekání ve frontě.
- [x] **4. Railway** (viz níže) a test end-to-end (18. 11. 2026): projekt `podpalto`, služby
      `tools` a `worker` běží z větve **`main`** (produkční, viz „Vydání“ níže). Test: job
      `collect` s `source_ids: ["peletypremium"]` převzal `railway-worker`, sběr na Railway,
      export (snímek 1000001, 4 ceny) a přepočet statistik za 12 s. Další naplánovaný sběr
      1. 12. ve 3:00 (všechny zdroje, ceníky přes Claude API; volume `/data` na Railway
      začíná prázdný), přehled trhu 2. 12. v 6:00.

#### Přístupy a klíče – co si vyžádat od Lukáše

Do Supabase přístup nemáš a **nepotřebuješ ho**: worker mluví s databází přes REST API
s jedním klíčem a schéma je celé v repozitáři (`frontend/supabase/migrations/`, výtah níže).
Tajné hodnoty v repozitáři nejsou – **až tohle budeš číst, napiš Lukášovi**, ať ti pošle
(bezpečně, ne v otevřeném e-mailu – např. Bitwarden Send / 1Password):

| Proměnná | Co to je | Kdo ji dodá |
|---|---|---|
| `SUPABASE_SECRET_KEY` | secret klíč projektu Podpalto (obchází RLS, smí zapisovat) | Lukáš |
| `ANTHROPIC_API_KEY` | klíč k Claude API pro crew | **tvůj vlastní** (dohodnuto 18. 11.) |
| účet admin na webu | k testu: admin → Agenti → *Spustit nyní* | **hotovo**: tvůj účet má roli `admin` a tarif Pro |

Netajné hodnoty (můžeš rovnou): `SUPABASE_URL=https://sdhinkqouseaaesodqyy.supabase.co`,
`MANAGER_MODEL=anthropic/claude-opus-5-5`, `AGENT_MODEL=anthropic/claude-sonnet-5-5`.
Klíč nikdy necommituj (`.env` je v `.gitignore`) a nedávej ho do frontendu.

#### Databáze bez dashboardu Supabase

Prohlížení dat přes REST (stejný klíč jako worker), např. v PowerShellu / bash:

```bash
curl "https://sdhinkqouseaaesodqyy.supabase.co/rest/v1/sellers?select=id,slug,name,external_key&limit=5" \
  -H "apikey: $SUPABASE_SECRET_KEY"
curl "https://sdhinkqouseaaesodqyy.supabase.co/rest/v1/agent_job_runs?select=*&order=requested_at.desc&limit=5" \
  -H "apikey: $SUPABASE_SECRET_KEY"
```

Secret klíč smí všechno včetně mazání – **nic nemaž a nepřepisuj hromadně** (jsou tam reálná
data webu). Změny schématu (nové sloupce, funkce) neposílej přímo do databáze: napiš migraci
do `frontend/supabase/migrations/` (název `RRRRMMDDHHMMSS_popis.sql`) a dej vědět Lukášovi,
nahraje ji. Mapování polí je v `docs/agent-output-spec.md` (kap. 4–8, 10, 11).

**Výtah schématu pro export** (povinné = NOT NULL bez výchozí hodnoty):

| Tabulka | Klíč pro upsert | Povinné sloupce | Pozor |
|---|---|---|---|
| `sellers` | `external_key` (unique) | `slug`, `name`, `city`, `zip`, `region` | `slug` jen `a-z0-9-`, unikátní; `ico` 8 číslic; `lat`/`lng` obojí nebo nic; `location_precision` ∈ address_point/building/street/municipality; `location_source` ∈ ruian/geocoder_mapy/geocoder_nominatim/seller_map/manual |
| `products` | `seller_id, external_id` | `seller_id`, `name`, `category`, `price_czk`, `unit` | `unit` paleta/pytel ⇒ `package_kg` nebo `package_prm`; dřevěné atributy jen u `category = wood`; `price_czk > 0` |
| `price_observations` | – (vždy insert) | `product_id`, `price_czk` | `observed_at` = čas stažení; `original_unit` ∈ kg/q/t/bag/pallet/m3/prmr/prms; `vat_status` ∈ included/added/assumed; trigger sám aktualizuje `products.price_czk` |
| `scrape_runs` | – | – | `status` ∈ running/success/failed/blocked; `job_run_id` = id běhu jobu; `source_key` + `snapshot_id` unikátní dvojice |

Číselníky (enumy): `region_code` PHA STC JHC PLK KVK ULK LBK HKK PAK VYS JHM OLK ZLK MSK ·
`fuel_category` wood pellets briquettes coal · `price_unit` PRMS PRM PLM t paleta pytel ·
`wood_species` buk dub habr jasan briza smrk borovice modrin mix-tvrde mix-mekke ·
`wood_group` hard soft birch · `wood_form` sypane rovnane metrovky paleta ·
`moisture` dry semi fresh · `pellet_certification` „ENplus A1“ „ENplus A2“ DINplus „bez certifikace“ ·
`briquette_type` RUF „PINI KAY“ válcové hnědouhelné · `coal_type` „hnědé ořech 1“ „hnědé ořech 2“
„hnědé kostka“ „černé ořech“ „černé kostka“ koks · `stock_level` in_stock low out_of_stock preorder ·
`data_source` scraper seller manual. Nový prodejce / cena s blokujícím příznakem (`flags`) jde
sám do ruční kontroly (`review_status = needs_review`, admin → Data od agentů).

#### Vydání: `dev` → `main` (od 18. 11. 2026)

- **`dev`** = vývoj, pushuje se kdykoli; nic se z něj automaticky nenasazuje na Railway.
- **`main`** = produkce. Railway (`tools`, `worker`) nasazuje každý push do `main`.
  `main` byl 18. 11. posunut na tehdejší `dev` (commit `627117a`), dřív obsahoval jen
  „Initial commit“.
- **Vydání:** na GitHubu pull request `dev` → `main` (testy prošly, lokálně ověřeno), merge.
  Před vydáním zkontrolovat, že neběží job (redeploy rozdělaný běh ukončí).
- [ ] **Lukáš:** na Vercelu nastavit *Production Branch* na `main` (pokud dnes produkce
      jede z `dev`), aby web a agenti vydávali stejně; `dev` jako Preview.
- [ ] Na GitHubu zvážit ochranu `main` (jen přes pull request) a `main` jako výchozí větev.

#### Railway – krok za krokem (poprvé)

**Stav 18. 11. 2026 večer:** projekt `podpalto` je založený přes API Railway (token
workspace `RAILWAY_API_TOKEN` v `.env`; CLI s tokenem workspace nefunguje, ptá se na uživatele).
Služby `tools` (volume `/data`) a `worker` z `Tosf0/podpalto_cz`, větev **`main`** (do 18. 11.
22:50 `dev`), proměnné podle
kroků 3 a 4 níže. **Config as Code (`railway/*.json`) Railway pro nové služby odmítá**
(„deprecated, use Infrastructure as Code“), proto jsou hodnoty z `railway/tools.json`
a `railway/worker.json` (Dockerfile, start command, healthcheck, restart, watch patterns)
nastavené přímo v nastavení služeb a `RAILWAY_DOCKERFILE_PATH`. Při změně těchto souborů je
potřeba změnit i nastavení služby (nebo přejít na `.railway/railway.ts`). Návod níže platí
pro ruční nastavení přes dashboard. Navíc oproti návodu: `tools` má `PORT=8001` (healthcheck
jde na `PORT`), start na `0.0.0.0` a `EXPORT_SNAPSHOT_OFFSET=1000000`: databáze snímků na
Railway čísluje od 1, Supabase pozná exportovaný snímek podle (zdroj, číslo) a lokální první
import čísla do ~100 už použil. `worker` má `CREW_VERBOSE=false` (19. 11.): podrobný výpis
CrewAI (celé texty stránek, výstupy agentů) překračoval limit Railway 500 řádků logu za
sekundu a Railway řádky zahazoval.

1. **Účet:** <https://railway.com> → *Login* → **přes GitHub** (účet, pod kterým je repozitář
   `podpalto_cz`). Pro trvalý běh je potřeba placený plán **Hobby** (cca 5 USD měsíčně včetně
   kreditu na provoz; ověř aktuální ceník) – Settings → Plans, zadat kartu.
2. **Projekt:** *New Project* → *Deploy from GitHub repo* → *Configure GitHub App* → povolit
   přístup k repozitáři `podpalto_cz` → vybrat ho. Railway založí první službu a zkusí ji
   sestavit – první build může spadnout, než se nastaví konfigurace v dalším kroku, to nevadí.
3. **Služba `tools`** (ta první):
   - Settings → název služby **`tools`** (přesně, worker se na ni odkazuje jménem),
   - Settings → Source → *Branch* `dev` (později `main`), *Root Directory* nechat prázdné
     (Dockerfily se sestavují z kořene repozitáře),
   - Settings → *Config-as-code* → cesta **`/railway/tools.json`** (Dockerfile, start na `0.0.0.0:8001`,
     healthcheck `/health`),
   - **Volume:** na plátně projektu pravým tlačítkem na službu (nebo Ctrl+K → „Volume“) →
     *Add Volume* → připojit k `tools`, mount path **`/data`** (SQLite se snímky přežije redeploy),
   - Variables: `TOOLS_DATA_DIR=/data`, `COLLECTOR_USER_AGENT=podpalto-bot/1.0 (+https://podpalto.cz/bot)`,
   - Settings → Networking: **negenerovat veřejnou doménu** (služba je jen pro worker),
   - *Deploy* → v Logs má být `Uvicorn running on http://0.0.0.0:8001` a healthcheck zelený (proměnná `PORT=8001`, jinak healthcheck hlásí *service unavailable*).
4. **Služba `worker`:** na plátně *+ Create* → *GitHub Repo* → stejný repozitář:
   - název **`worker`**, branch `dev`, config-as-code **`/railway/worker.json`**,
   - bez volume a bez veřejné domény, Replicas = 1,
   - Variables → *Raw Editor* a vložit (doplnit dva tajné klíče):
     ```
     TOOLS_API_URL=http://${{tools.RAILWAY_PRIVATE_DOMAIN}}:8001
     SUPABASE_URL=https://sdhinkqouseaaesodqyy.supabase.co
     SUPABASE_SECRET_KEY=<od Lukáše>
     ANTHROPIC_API_KEY=<dohodnutý klíč>
     MANAGER_MODEL=anthropic/claude-opus-5-5
     AGENT_MODEL=anthropic/claude-sonnet-5-5
     WORKER_ID=railway-worker
     ```
   - *Deploy* → v Logs `worker railway-worker started, polling every 30s`.
5. **Test:** na webu admin → **Agenti** → u „Přehled trhu“ *Spustit nyní* → do minuty
   „Běží“ (hláška „Worker … naposledy převzal běh“), na konci „Hotovo“ a report v CI Studiu.
   „Sběr cen“ sesbírá a exportuje do Supabase (ceníky přes Claude API stojí kredit).
6. **Provoz:** Railway nasazuje z větve **`main`**, ne z `dev` (od 18. 11. 2026): worker
   zapisuje do jediné, produkční Supabase, takže na Railway smí jen vydaný kód. Push do `main`
   znovu nasadí jen dotčenou službu (watch patterns v nastavení služby). Rozdělaný běh při redeployi skončí „Worker se ukončil … spusťte znovu“.
   V Anthropic konzoli nastav měsíční limit útraty. Služba `app` s HTTP API (`/runs`)
   na Railway **není potřeba**.

**Když něco nejde:**
- worker loguje `HTTP 401` / `Invalid API key` → špatný `SUPABASE_SECRET_KEY`,
- `tools service is not reachable` → služba se nejmenuje `tools`, nebo neběží, nebo neposlouchá
  na `0.0.0.0:8001` (start command v nastavení služby; `::` v Pythonu poslouchá jen IPv6 a healthcheck ho nenajde; nová prostředí Railway mají privátní síť i přes IPv4),
- build spadne na `uv sync --frozen` → `uv.lock` neodpovídá `pyproject.toml`: `uv lock`, commit,
- v administraci „Běh čeká ve frontě od …“ → worker neběží nebo nemá připojení k Supabase,
- lokální a Railway worker si berou úlohy ze stejné fronty – při lokálním testu Railway worker
  zastav (Settings → *Remove deployment* / Replicas 0).

#### Lokální test před nasazením

```bash
copy .env.example .env      # doplnit ANTHROPIC_API_KEY a SUPABASE_SECRET_KEY
uv sync
uv run pytest app/tests/test_worker.py
uv run uvicorn podpalto_tools.api:app --port 8001      # terminál 1
uv run python -m podpalto_app.worker                   # terminál 2
```

Nebo `docker compose up --build` (tools + app + worker). Pak na webu admin → Agenti →
*Spustit nyní* u „Přehled trhu“ a sledovat log workeru i historii běhů v administraci.

#### Do budoucna – mimo tuto integraci

Stripe (platby tarifů), vlastní SMTP, karta Sčítání 2021 v Trendech, média na Cloudflare R2,
údaje provozovatele v právních stránkách a souhlasy prodejců s fotkami řeší Lukáš – viz
„Do budoucna (Lukáš)“ níže. Pro worker z toho nic nevyplývá.

**Časová osa (kontrola 18. 11.):** databáze historii drží – každá cena je řádek
v `price_observations` s `observed_at` (a `snapshot_id`), měsíční mediány jsou
v `commodity_price_stats` a `region_stats` (sloupec `month`) a `api_price_trends` z nich
skládá graf za posledních 12 měsíců. Zatím je tam jediný den (18. 11.), takže graf bude mít
smysl až po dalších sběrech. Opraveno v téže migraci: `refresh_market_stats(měsíc)` dřív vždy
počítal z *dnešních* cen, takže přepočet minulého měsíce by do něj zapsal dnešní ceny;
nově pro minulé měsíce bere poslední pozorování ceny před koncem měsíce (backfill funguje)
a jde volat víckrát v jedné transakci. Přidán index `price_observations (product_id, observed_at)`.
Pravidlo pro sběr: **neupdatovat staré řádky `price_observations`, vždy vkládat nové**, jinak
se historie ztratí.

**Čistý start pro pipeline agentů** (18. 11. 2026 večer): dočasná data od subagentů Claude
(81 prodejců, 371 produktů a cen, statistiky za listopad) a 5 ukázkových reportů CI Studia jsou
**smazané** – databáze je prázdná a připravená na první import z pipeline (`tools` → worker,
handoff `handoff/2026-11-18-01-export-do-supabase.md`). Mapa, katalog, Trendy a archiv CI Studia
budou prázdné, dokud import neproběhne. Blog, účty, tarify, Sčítání 2021 a plán jobů zůstaly.
- **Záloha** (JSON, jeden řádek na tabulku): `backup.snapshot_20261118` v Supabase (soukromé
  schéma, není v API). Stažení: SQL Editor → `select data from backup.snapshot_20261118 where
  name = 'sellers';` → zkopírovat / exportovat. Tabulky: sellers, products, price_observations,
  commodity_price_stats, region_stats, analysis_reports, scrape_sources. Až nebude potřeba:
  `drop schema backup cascade;`.
- **Fotky prodejců z jejich webů** (bez svolení, jen pro vývoj) jsou z `frontend/public/sellers/`
  smazané, zůstaly jen obecné fotky podle paliva (`public/sellers/generic/`, volné licence,
  autoři v CREDITS.md). Přepínač v Nastavení administrace je na „Jen obecné fotky“. Vlastní fotku
  nahraje prodejce po převzetí profilu (bucket `seller-photos`).
- Párování se stávajícími prodejci (`link_sellers`, handoff bod 3.1) už není potřeba.

**Blog se schvalováním** (zapsáno 18. 11. 2026): článek napíše kdokoli přihlášený a odešle ke
schválení (`blog_posts.status = 'pending'`); publikuje, zamítá (s poznámkou), upravuje a maže admin
v `/admin/kontrola` → záložka Blog. Fotky jsou zatím v Supabase Storage (`blog-images/<uid>/…`),
u smazaných a zamítnutých článků se mažou. **Do budoucna přesunout na Cloudflare R2** – viz
„TODO – obrázky z Cloudflare R2“ v `frontend/README.md`. Migrace `20261118160000_blog_review.sql`.

**Zbývá na frontendu:** CI Studio se záložkami „Trh“ / „Prodejce“ (až poběží worker, viz „Napojení agentů na web“ výše).
Akční a množstevní ceny na detailu prodejce jsou hotové (18. 11.), *Leaked password protection* je zapnutá.

### Do budoucna (Lukáš)

- [ ] **Platby přes Stripe:** tarify Pro a Prodejce za 490 Kč / 20 € měsíčně (tabulka `plans`:
      `price_czk_month`, `price_eur_month`, `stripe_price_id`; stránka `/plany`). Produkt a ceny
      ve Stripe (CZK i EUR), Checkout ze stránky plánů, webhook (route handler v Next.js nebo
      edge funkce) zapisuje `subscriptions`, zákaznický portál pro zrušení / změnu karty,
      faktury s DPH (Stripe Tax / Invoicing). Klíče jen na serveru (Vercel env, ne `NEXT_PUBLIC_`).
- [ ] **Převzetí profilu až po zaplacení** tarifu Prodejce (dnes ho `approve_seller_claim`
      přidělí rovnou) + e-mail žadateli – viz „Převzetí profilu – dotáhnout s platbami“ výše.
- [ ] **Vlastní SMTP** (Resend, `noreply@podpalto.cz`) – viz výše.
- [ ] **Údaje provozovatele** v právních stránkách (Vercel env) a kontrola textů právníkem.
- [ ] **Trendy – karta Sčítání 2021** (`heating_census`).
- [ ] **Média na Cloudflare R2** a **souhlasy prodejců s fotkami** – viz výše.
- [ ] **CI Studio – záložky „Trh“ a „Prodejce“** na frontendu, až worker umí `market` a `seller`.

## Rozhodnutí: jediný zdroj dat je Supabase (18. 11. 2026)

Stav: frontend na produkci už čte **všechna data jen ze Supabase** (projekt Podpalto).
REST větve v `frontend/src/lib/api/*` (`apiFetch` na `NEXT_PUBLIC_API_URL`) jsou pozůstatek
původního zadání a nikdy se nespustí. Jediné skutečné volání REST je spuštění analýzy v CI
Studiu (`POST /api/analyze` + polling `GET /api/analyze/{run_id}`), dnes simulované.

Cíl: **agenti zapisují do Supabase, frontend čte ze Supabase, žádné veřejné REST API.**

- [x] **Agenti → Supabase:** výstup podle `docs/agent-output-spec.md` (prodejci s polohou,
      produkty, ceny, běhy). Hotovo 18. 11.: `podpalto-export` (JSON soubor) a přímý zápis
      workerem se *secret* klíčem v pořadí `sellers` → `products` → `price_observations` →
      `scrape_runs`.
- [x] **Frontend: smazat REST větve** (hotovo 18. 11.) v `src/lib/api/sellers.ts`, `market.ts`, `reports.ts`,
      `analysis.ts` a `client.ts`; ukázková data ponechat jen jako offline režim bez
      Supabase. V `frontend/README.md` nahradit kapitolu 5 (REST kontrakt) odkazem na schéma
      (`frontend/supabase/migrations/`) a `docs/agent-output-spec.md`.
- [ ] **CI Studio přes frontu v databázi místo REST:** DB, frontend i worker hotové (18. 11.);
      analýza `market` běží, `seller` a `url` končí srozumitelnou chybou (flows chybí).
      - frontend vloží řádek do `analysis_runs` (tabulka a RLS pro tarif Pro už existují),
      - služba `app` si nové řádky (`status = 'queued'`) vyzvedává – polling, nebo
        databázový webhook / Supabase Realtime – a spustí příslušný flow,
      - během běhu zapisuje do řádku `status`, `progress`, `steps`, `logs`, na konci
        `report_id` a výsledek do `analysis_reports` (+ `seller_intel` u profilu prodejce),
      - frontend sleduje řádek přes Supabase Realtime (žádná URL backendu, CORS ani
        veřejný endpoint na Railway).
- [x] Na straně databáze doplnit sloupce pro frontu a typy reportů (hotovo 18. 11.) (viz rozhodnutí o CI
      Studiu níže) a `sellers.external_key` pro upsert od agentů.

### Opravy API: současný stav (18. 11. 2026)

Databázová část rozhodnutí 1–4 je hotová v migraci
`frontend/supabase/migrations/20261118120000_agent_output.sql`, **nasazená** v projektu
Podpalto (18. 11. večer, spolu s opravami) a ověřená prvním importem 18. 11.

| Rozhodnutí | Stav |
|---|---|
| (1) akce a pásma jako produkt | Hotovo: DB, §7 specu, export (rozpozná varianty), detail prodejce („Od 1 palety“). |
| (2) chybějící pole | Hotovo, viz poznámky k mapování níže. |
| (3) „neuvedeno“ | Hotovo (DB i frontend, 18. 11.). |
| (4) stav kontroly | Hotovo: DB, opravené triggery (`…130000_review_fixes.sql`) a stránka `/admin/kontrola`. |
| (5) `market_stats` | Hotovo: funkce `refresh_market_stats()` v DB, volá ji `finish_agent_job_run` po jobu `collect`. |
| (9) fronta CI | Hotovo pro analýzu `market` (DB, frontend, worker); `seller` a `url` čekají na flows. |

Co migrace dělá navíc nebo jinak, než říká text rozhodnutí níže:

- **Mapování specu na sloupce:** `company_ico` ze specu = stávající `sellers.ico` (druhý
  sloupec by IČO jen zdvojil); `seller_key` = `sellers.external_key`; `product_key` =
  `products.external_id` (unikátní v rámci prodejce); `base_product_key` se ukládá jako
  `products.base_product_id` (uuid, zapisovač převede klíč na id); `price_tier` jsou dva
  sloupce `price_tier_min_quantity` a `price_tier_unit`; přesná délka polen jde do
  `log_length_cm_exact` (`log_length_cm` dál bere jen 25/33/40/50/100).
- **„Neuvedeno“ i u polohy a velikosti firmy:** `sellers.lat/lng` a `sellers.size` mohou být
  NULL. Prodejce bez polohy dostane automaticky `location_unknown` a na mapu se nedostane.
- **Blokující příznaky** jsou ve funkci `review_blocking_flags()`: `outlier_vs_market`,
  `unit_price_implausible`, `price_jump`, `package_size_unknown`, `volume_stacking_unknown`,
  `location_unknown`, `location_region_mismatch`. Vyhodnocují je triggery při vložení ceny
  a při změně příznaků nebo polohy.
- **Upřesnění bodu 4:** produkt, který admin schválil, se znovu otevře jen tehdy, když
  přijde blokující příznak **a jiná cena**. Jinak by se stejná odlehlá cena vracela do
  fronty po každém sběru. Zamítnutý (`rejected`) zůstává zamítnutý.
- **RLS:** neschválené prodejce a produkty vidí jen vlastník a admin. `api_sellers` vrací
  jen schválené prodejce s polohou a jen běžné produkty (bez akcí a pásem); tvar
  odpovědi se nezměnil.
- **Běhy agentů (spec §8):** `scrape_sources.source_key` (id z `sources.yaml`),
  `scrape_runs` + `source_key`, `snapshot_id`, `agent_version`, `model`, `http_status`,
  `content_sha256`, `changed`, `rejected_count`; stav `blocked` pro `blocked_by_robots`.
- **Pravidlo pro zapisovač:** při vložení produktu nastavit `price_updated_at` na
  `observed_at` první ceny, jinak trigger starší zjištění nepoužije.

**Pozor na pořadí:** `api_sellers` vynechává NULL hodnoty, takže frontend by u reálných dat
dostal `stock`, `size` a pole dopravy jako `undefined`. Frontend pro „neuvedeno“ (bod 3)
musí být hotový dřív, než do produkce zapíšeme první reálná data.

### Opravy API: rozhodnutí z kontroly specu (18. 11. 2026)

Kontrola `docs/agent-output-spec.md` proti schématu Supabase (`frontend/supabase/migrations/`)
a frontendu. Čísla odpovídají bodům kontroly.

- [x] **(1) Akční a množstevní ceny = samostatný produkt.** Hotovo: DB, §7 specu, export je rozpoznává (18. 11.), detail prodejce s reálnými daty zkontroloval Lukáš (#04). Trigger `apply_price_observation`
      přepisuje aktuální cenu produktu posledním zjištěním, takže akční cena nebo cena
      „od 10 PRMS“ poslaná ke stejnému produktu by na mapě nahradila běžnou cenu.
      - Akce a množstevní pásmo dostanou vlastní `product_key` (např.
        `<seller_key>:<item_id>~promo`, `~od-10-prms`) a v `products` pole `is_promo`,
        `promo_valid_until`, `price_tier` (`min_quantity`, `unit`) a `base_product_key`
        (vazba na běžný produkt).
      - Mapa, srovnání a statistiky berou jen běžné produkty (`is_promo = false`, bez
        `price_tier`); detail prodejce je ukáže jako varianty.
      - Upravit §7 v `agent-output-spec.md` (dnes říká „samostatné záznamy ceny“).
- [x] **(2) Chybějící pole doplnit do Supabase** (nová migrace), aby se data ze specu
      při zápisu neztratila:
      - `price_observations`: `flags`, `vat_status`, `original_price`, `original_unit`,
        `original_quantity`, `original_price_includes_vat`, `valid_in_regions`,
        `delivery_included`, `normalized` (jsonb), `snapshot_id`,
      - `products`: `flags`, `briquette_material`, `coal_origin`, `grain_mm`, `quality_raw`,
        `name_raw`, `wood_species_raw`, `certificate_id`, `delivery_days`,
        `delivery_override` (jsonb) + pole z bodu 1,
      - `sellers`: `external_key`, `company_ico` (vedle `ico` provozovny), `branch_name`,
        `ruian_address_code`, `location_source`, `location_precision`,
        `location_checked_at`, `flags`, `registry` (jsonb), `delivery_zones` (jsonb),
        `delivery_free_over_quantity_unit`, `delivery_evidence` (jsonb).
- [x] **(3) „Neuvedeno“ musí jít uložit i zobrazit.** (hotovo 18. 11.)
      - `products.stock` bez `not null` a bez výchozího `'in_stock'`; `null` = neuvedeno.
      - Doprava v `sellers`: sloupce bez výchozích nul, `own_delivery = null` = neznámo.
      - Frontend: `lib/pricing.ts` při neznámé dopravě vrátí „doprava neuvedena“ (ne
        „nedováží“), sklad „neuvedeno“; štítky (`skladem`, `vlastni-doprava`…) se
        z `null` neodvozují. Upravit typy v `src/types/index.ts` a RPC `api_sellers`.
- [x] **(4) Podezřelé ceny skrýt přes stav kontroly, ne přes `active`.** (hotovo 18. 11., vč. obrazovky pro admina) `active` dál znamená
      jen „produkt u zdroje existuje“. Nově:
      - `products.review_status` (`ok` | `needs_review` | `rejected`) a `review_reasons`
        (pole příznaků, které kontrolu vyvolaly),
      - zápis od agentů nastaví `needs_review`, když poslední cena nese blokující příznak
        (`outlier_vs_market`, `unit_price_implausible`, `price_jump`, `location_unknown`
        u prodejce…); seznam blokujících příznaků je na jednom místě v kódu,
      - `api_sellers` a statistiky trhu berou jen `review_status = 'ok'`; historie cen
        zůstává celá (audit),
      - fronta ruční kontroly pro roli admin (schválit = `ok`, zamítnout = `rejected`);
        další zjištění s blokujícím příznakem vrátí produkt do `needs_review`.
- [x] **(5) Statistiky trhu počítá deterministický kód, ne LLM a ne frontend** – hotovo
      jako DB funkce `refresh_market_stats()` (ne nástroj v `tools`); zbývá jen dát stejná
      čísla nástrojům pro `MarketResearchFlow` a doplnit §12 specu. Původní zadání:
      - z aktuálních cen (jen `review_status = 'ok'`, bez akcí a pásem, jedna položka na
        produkt v nejlevnější variantě jako u `price_comparison`) spočítá měsíční průměry
        komodit ČR a krajů (`commodity_price_stats`: `hardWoodPrms`, `softWoodPrms`,
        `pelletsT`, `briquettesT`, `coalT`, `sample_size`) a `region_stats` (`seller_count`,
        `price_index`, `change_pct`),
      - definice komodit sladit s popisky frontendu (např. `coalT` = „hnědé uhlí ořech 2“),
      - výsledek zapisuje krok zápisu do Supabase a zároveň je to nástroj pro agenty
        (`MarketResearchFlow`), takže report i web ukazují stejná čísla,
      - doplnit §12 v `agent-output-spec.md` („spočítáme z cen“ = tento nástroj).
- [x] **(9) Fronta CI v `analysis_runs` zatím nejde spustit – v pořádku.** Řeší se až s úkoly
      CI Studia: tabulku přidat do publikace `supabase_realtime`, rozšířit grant na insert
      (dnes jen `competitor_url`) a uvolnit `competitor_url not null` pro tržní report
      (`kind = 'market'`, `params`).

### Opravy API: zbývá rozhodnout (18. 11. 2026)

- [ ] **(6) Kde se počítá Kč/kWh a s jakými konstantami.** TODO (stage 3) ho dává do
      `normalize.py`, spec (§12) do aplikace. Konstanty se liší: frontend
      (`frontend/src/lib/constants.ts`) koks 7,9 kWh/kg, černé uhlí 7,8, tvrdé dřevo
      1 260 kWh/prms; `normalize.py` (PDF) koks 8,8, černé uhlí 7,4, tvrdé dřevo 1 320.
      Doporučení: jedna tabulka z PDF; `tools` posílá energii na jednotku produktu,
      frontend jen dělí cenou a násobí účinností kotle.
- [x] **(7) Pásma věrohodnosti cen** (rozhodnuto 18. 11. 2026): rozpětí podle paliva jen
      v `normalize.py` (`PLAUSIBLE_CZK_PER_TONNE`, `PLAUSIBLE_CZK_PER_PRMS`), nastavená
      podle sběru 18. 11. (373 cen, žádná mimo rozpětí). Zachytí jen špatně přečtenou
      jednotku; odchylku od trhu řeší `outlier_vs_market` vůči mediánu. Spec §9 upravený.
- [x] **(8) Stabilní `seller_key`** (rozhodnuto 18. 11. 2026): umělý klíč = `id` zdroje
      v `sources.yaml` (u řetězců `<id>-<slug pobočky>`), nikdy se nemění; IČO, adresa,
      RÚIAN a poloha jsou jen údaje a při exportu se přepíšou. Dva zdroje jednoho prodejce
      sdílí klíč přes pole `seller_key` v registru. `id` zdroje se po prvním exportu
      nepřejmenovává. Spec §4 upravený.
- [ ] **(10) Geolokace a doprava kódem.** Poloha z ARES a RÚIAN podle kódu adresního místa
      je hotová (`locate.py`, 18. 11. 2026, viz spec §5.3); zbývá doprava a případně geokodér
      pro sklady bez adresního místa. RÚIAN, ARES a geokodéry jsou deterministická API,
      „dedikovaný agent“ má být kód. Čísla dopravy z textu (paušál, Kč/km) musí projít
      stejnou kontrolou citací jako ceny. Nominatim vyžaduje identifikující User-Agent
      s kontaktem (dnes posíláme obecný): rozhodnout, jaký kontakt uvést, nebo ho nepoužít.
- [ ] **(11) Zdroj externího hodnocení.** Google přes stahování stránek ne (podmínky), Firmy.cz
      zakazuje robots.txt. Zbývá placené Google Places API, nebo jen recenze z aplikace.
- [ ] **(12) Další otevřené body:**
      - ~~26 fiktivních prodejců~~ – smazáni 18. 11. 2026, nahrazeni reálnými prodejci (viz níže),
      - doprava celostátních e-shopů: frontend ji počítá podle vzdálenosti od pinu, což
        u kurýrní dopravy palet nesedí (potřeba typ „celostátní ceník dopravy“),
      - po smazání REST větví upravit `docs/architecture.md` a `frontend/ARCHITECTURE.md`
        (Railway, `/runs`, šipka frontend → app).

### Opravy API: doporučené pořadí dalších kroků

1. ~~**Migrace Supabase:** body 1–4~~ – nasazená 18. 11. 2026.
2. **Rozhodnout body 6–8** – 7 a 8 rozhodnuté 18. 11., bod 6 (kWh) zbývá, export neblokuje.
3. ~~**`tools`:** `market_stats` a JSON export~~ – hotovo 18. 11. (statistiky jako DB funkce,
   export `GET /export` / `podpalto-export`); validace proti JSON Schema zatím ne (export
   validují pydantic modely).
4. ~~**Frontend:** „neuvedeno“, REST větve~~ – hotovo; zbývá dokumentace (bod 12).
5. ~~**Zápis do Supabase**~~ – hotovo, první import 18. 11.
6. **Fronta CI Studia** – `market` hotová, `seller` a `url` zbývají (CI Studio níže).

## Rozhodnutí: co je CI Studio (18. 11. 2026)

Otázka: je CI Studio (a) report o trhu podle paliv a kraje (`MarketResearchFlow`), nebo
(b) profil prodejce podle URL (plní `seller_intel`, flow se musí napsat znovu)? Pole
`threatLevel` a sekce „Recommendations for podpalto.cz“ předpokládají, že podpalto.cz je
konkurent prodejců – to nesedí s neutrálním přehledem pro domácnosti.

Rozhodnutí: **obojí, ale neutrálně a z pohledu uživatele, který si platí Pro** (analytik,
obchodník, prodejce), ne z pohledu podpalto.cz. Podpalto.cz je srovnávač, ne konkurent.

1. **Tržní report = výchozí typ (MVP, hned).** Uživatel zvolí palivo a kraj → `MarketResearchFlow`.
   Obsah: ceny a jejich rozptyl, průměr kraje vs. ČR, vývoj v čase, nejlevnější nabídky
   vč. dopravy, sezónnost, srovnání paliv v Kč/kWh, poptávka (Sčítání 2021).
2. **Profil prodejce = druhý typ (až budou data podle `agent-output-spec.md`).**
   Prodejce se vybírá **z našeho katalogu**, ne libovolnou URL (data už sbíráme; URL jen
   jako „navrhnout nový zdroj“ do registru). Neutrální popis: sortiment, ceny vůči průměru
   kraje a ČR (cenový index), doprava, silné a slabé stránky (SWOT ponechat, je popisná),
   zdroje s citacemi.
3. **Odstranit perspektivu konkurenta:** zrušit `threatLevel` (v `seller_intel` sloupec
   `threat_level` a ve frontendu odznak „hrozba“) a sekci „Recommendations for podpalto.cz“.
   Nahradit ji sekcí **„Srovnání s trhem“** (kde je prodejce levnější / dražší a v čem).
4. **Doporučení jen pro prodejce o jeho vlastním obchodě:** uživatel s tarifem *Prodejce*
   a schváleným profilem (`sellers.owner_id`) dostane u svého profilu navíc sekci
   „Doporučení pro váš obchod“ (cena vůči okolí, doprava, chybějící údaje). Nikdy
   doporučení „jak porazit konkrétní firmu“.
5. `seller_intel` na detailu prodejce zůstává jen pro Pro a zobrazuje neutrální profil.

Úkoly:

- [ ] `app`: `MarketResearchFlow` vstup `{fuel_category, region}` → výstup Markdown podle
      osnovy v bodě 1 + strukturovaná data (ceny, index, počet nabídek) pro grafy.
      Vstup napojený (worker, 18. 11.); zbývá ověřit report nad reálnými daty a cenu běhu
      a přidat strukturovaná data.
- [ ] `app`: nový `SellerProfileFlow` vstup `{seller_key}` → Markdown + strukturovaný
      profil do `seller_intel` (bez `threat_level`, se „Srovnáním s trhem“).
- [x] DB: `analysis_reports.kind` (`market` | `seller`), `analysis_reports.params` (hotovo 18. 11.: `kind` má navíc `url` pro dnešní formulář)
      (jsonb: palivo, kraj), `analysis_reports.subject_seller_id`; stejné sloupce
      v `analysis_runs`; z `seller_intel` odstranit `threat_level`, přidat
      `market_comparison` (jsonb).
- [ ] Frontend CI Studio: dvě záložky „Trh“ (palivo + kraj) a „Prodejce“ (výběr
      z katalogu); přejmenovat „Competitor analysis“ → „Analýza trhu a prodejců“,
      odstranit odznak hrozby a sekci doporučení pro podpalto.cz; ukázkové reporty přepsat
      do nové osnovy.

## Plán: co ze zadávajícího dokumentu (PDF) ještě zbývá (18. 11. 2026)

Pořadí: nejdřív stage 1, pak 2, pak 3. Čísla stránek a sekcí odkazují na PDF
„Zdroje dat o pevných palivech“.

### Stage 1: chybějící zdroje z PDF (vyřešit co nejdřív)

U každého zdroje nejdřív zkontrolovat robots.txt a jestli jsou ceny v HTML (jeden
požadavek na robots a jeden na stránku), pak záznam v `sources.yaml` (většinou
`static_html`, bez nového kódu), sběr `uv run collect <id>`, kontrola výsledků
a `podpalto-verify-sellers`. Adresy jsou z PDF; před zápisem je ověřit.

**Pilíř 1: e-shopy a výrobci**

Prověřeno 18. 11. (robots.txt, ceny v HTML, IČO a kraj sídla); výsledky u položek.

- [ ] **optimtop.cz** a drevenepelety.cz (stejný provozovatel): uhelné brikety, koks,
      balené uhlí, pelety; množstevní slevy podle počtu palet, doprava zdarma (PDF s. 6).
      Ceny až na stránkách produktů; celostátní e-shop (Olomoucký kraj sídla).
- [ ] **biomac.cz**: pelety a brikety, doprava není v ceně (1 050 Kč/paleta) (PDF s. 6–7).
      Vlastní platforma, `Crawl-delay: 20`, ceny „dle pobočky“ – odloženo.
- [ ] **cdp.cz**: pelety, brikety, balené uhlí, dřevo; ceny v Kč/kg, manipulační poplatek
      u 1 palety (PDF s. 7). 19 cen v HTML, celostátní e-shop (Praha).
- [ ] **okpaliva.cz**: pelety, brikety, uhlí, dřevo; ceny vč. dopravy, pozor na lokální URL
      pro jednotlivé obce (PDF s. 9). Opakovaně shazuje spojení našeho klienta – neobcházíme.
- [x] pelety-premium.cz (Golčův Jeníkov) – zdroj `peletypremium` (Heureka feed, 18. 11.).
- [ ] ekopelety.cz (Stará Huť) (PDF s. 9–10): 9 cen v HTML, IČO na webu nenalezeno.

**Pilíř 2: uhelné sklady a těžba**

- [ ] **uhlipro.cz** (`/Cenik`, 10 cen, MSK), **uhlinemcova.cz** (`/cenik`, 19 cen, STC)
      (PDF s. 13–14)
- [x] palivamakovy.cz (`palivamakovy`, 19. 11.) a golem-paliva.cz (`golem`, 18. 11.).
- [ ] cdpaliva.cz (`/cenik`, 47 cen, JHC), coxys.cz (`/cenik` bez cen v HTML, KVK),
      paliva-police.cz (`/cenik/`, uhlí, 15 cen; stejná firma jako `palivapolice` → stejný
      `seller_key`) (PDF s. 14–15)
- [x] **Moravskoslezský kraj** (18. 11. 2026): `uhli_pribor` a `uhli_opava` (Uhlí Morava,
      pobočky Příbor a Velké Hoštice, každá s vlastním ceníkem, 18 + 18 cen) a
      `ridera_ostrava` (ceník skladu Ostrava-Mariánské Hory, 17 cen, samostatný prodejce
      vedle celostátního e-shopu `ridepal`). Ostatní stránky Ridery: Karviná-Barbora jen recyklát, Dolní Suchá a Malé
      Březno bez ceníku. Akční paleta Ridery („E-SHOP – AKČNÍ NABÍDKA“ v nadpisu, ne v řádku)
      se jako akce nepozná.
- [x] **Kraje bez prodejce a s jedním prodejcem** (19. 11. 2026, handoff #04 bod 3), lokálně
      ověřeno sběrem, **v produkci až po vydání `dev` → `main` a jobu „Sběr cen“**:
      Pardubický `lesy_policka` (Městské lesy Polička, 5 cen) a `dmdrevo` (Starý Mateřov,
      8 cen); Olomoucký `olin` (OL-IN Šternberk, 12 cen) a `drevoludwig` (Samotišky, 5 cen);
      Plzeňský `palivamakovy` (Chocenický Újezd, 8 cen). Pardubický navíc `lesy_litomysl`
      (Městské lesy Litomyšl, 7 cen) – ceník je jen Word 97 (.doc); čte ho nový
      `collect/worddoc.py` (.doc i .docx standardní knihovnou, bez nové závislosti; zdroj
      typu `static_html` s `document_link` jako u PDF). Nenalezeno s ceníkem:
      Městské lesy Vysoké Mýto, Raledo, Dřevo Zámrsk (bez
      adresy skladu), okpaliva.cz (shazuje spojení). Jihomoravský kraj a Praha: hledání
      vrací jen adresáře (Firmy.cz) bez ceníků – zbývá. Kandidáti mimo slabé kraje: Uhlí
      Doležal (`uhlidolezal.cz`, sklad Uhlířská Lhota, STC), Uhelné sklady Jan Maria
      (`uhli-janmaria.cz`, MSK).
- [ ] **SD Bílina, velkoobchodní PDF ceník** (`sd-bilinskeuhli.cz/dokumenty/cenik-2025.pdf`):
      ceny bez DPH a bez spotřební daně, jen jako referenční velkoobchodní cena, ne cena
      pro domácnosti; rozmyslet, jak ji v datech odlišit (PDF s. 10)
- [ ] Sokolovská uhelná / SUAS (suas.cz): ověřit, zda vůbec publikuje ceny pro domácnosti

**Pilíř 3: hobby markety**

- [ ] OBI: najít stránku kategorie paliv (PDF uvádí jen jeden produkt)

**Pilíř 4: lesy a prodejci dřeva**

- [ ] **Lesy ČR** (`lesycr.cz/o-nas/prodej-drivi-verejnosti/`) a lesní správy s cenami
      štípaného dříví (např. `lstelc.lesycr.cz/prodej-palivoveho-drivi/`); rozcestník
      na 60+ lesních správ (PDF s. 18–19)
- [ ] **Vojenské lesy a statky** (`vls.cz/cs/pro-verejnost/prodej-drivi-na-otop`): ceny
      bez DPH po krajích, `price_includes_vat: false` (PDF s. 19–20); 19 cen v HTML.
- [ ] Městské lesy Hradec Králové (`mestske-lesy.cz/prodej-paliva-stepky-a-mulcovaci-kury/`,
      31 cen v HTML, HKK)
- [x] drevo-ludwig.cz (`drevoludwig`, 19. 11.)
- [ ] palivove-drevo-libeznice.cz (bez cen v HTML), drevo-domu.cz (bez cen v HTML),
      palivakozma.cz (11 cen, STC), prodejpalivovehodreva.eu (2 ceny, STC) (PDF s. 21–23)

**Pilíř 5: statistika**

- [ ] **ČSÚ Indexy cen v lesnictví (surové dříví)**: čtvrtletní XLSX s průměrnými cenami
      surového dříví (Tab. 5, 10, 12); jediná oficiální cenová řada k palivům, jen
      velkoobchod a dříví (PDF s. 23)
- [ ] TZB-info: metodické výhřevnosti a ceny plynu a elektřiny 2026 pro srovnání tuhých
      paliv s jinými způsoby vytápění; ověřit robots.txt a podmínky (PDF s. 23)

### Stage 2: funkční části z PDF, které nejsou hotové

- [ ] **Discovery & Feed Hunter** (PDF 4.2, modul 1): automaticky procházet seznamy
      295 certifikovaných skladů SD Bílina (zlatá, stříbrná, bílá známka) a adresáře
      koupitpelety.cz / koupitbrikety.cz, zkoušet feed a sitemapu a navrhovat nové
      záznamy registru ke schválení. Dnes se každý zdroj přidává ručně.
- [ ] **Feedy jiných platforem než Shoptet** (PDF 1): eBrána
      (`/editor/filestore/io_folder/heureka.xml`), Upgates, WooCommerce (WPify Woo),
      OpenCart. Parser Heureka feedu stačí, chybí zdroje a hledání adres feedu.
- [ ] **Ceny podle PSČ** (PDF 4.2, modul 3): vyplnění referenčního PSČ v prohlížeči
      (waldera.cz, ridepal.eu u černého uhlí; PDF uvádí např. Zaječov 26763). Teď
      čteme jen ceny „od“ / bez příplatku. Pravidla to dovolují, není to obcházení blokace.
- [ ] **Sezónnost a akční nabídky** (PDF 3.3): odlišit běžný ceník od akcí a jarních
      nabídek (příznak akce, případně platnost ceníku). Časové razítko už máme. Akce podle
      textu řádku („akce“, „věrnostní sleva“) export pozná od 18. 11.; platnost ceníku ani
      akce uvedená jen v nadpisu sekce (Ridera) zatím ne.
- [ ] **Provoz podle PDF 4.4:**
  - [ ] frekvence sběru podle typu zdroje (sklady a lesy čtvrtletně nebo k 1. 4., 1. 9.,
        1. 10., e-shopy a hobby markety týdně). Plánovač už je (`agent_jobs` v Supabase,
        worker na Railway, 18. 11.), ale jen jeden měsíční job pro všechny zdroje,
  - [ ] paralelní sběr nezávislých zdrojů,
  - [ ] kontrola platnosti SSL certifikátu prodejce,
  - [ ] seznam známých podvodných domén (PDF zmiňuje bio-max.cz).
- [ ] **QA proti oficiálnímu měřítku** (PDF 4.2, modul 4): odlehlé ceny teď měříme jen
      proti ostatním prodejcům; u dřeva doplnit srovnání s ČSÚ Indexy cen v lesnictví
      (po stage 1).
- [ ] **PostgreSQL/TimescaleDB** (PDF 4), až SQLite přestane stačit.

### Stage 3: užitečné teplo a náklady dopravy

- [ ] **Cena užitečného tepla** (PDF 3.2): vedle ceny energie v palivu počítat Kč/kWh
      tepla s účinností typického kotle (50–90 % podle paliva a typu kotle, tabulka v PDF)
      a vlivem vlhkosti dřeva. Čistě deterministický výpočet v `normalize.py`.
- [ ] **Náklady na dopravu** (PDF 3.3): `price_total_delivered_vat` i pro sklady a lesy
      (Kč/km tam i zpět, doprava zdarma od 20–40 q nebo 10–15 prms, skládání pásem
      300–500 Kč) a cena pro zadané PSČ. Teď se podmínky dopravy ukládají jen jako
      citovaný text (`delivery_fee_note`).

## Dočasná rozhodnutí (přehodnotit)

### Ceníky v obrázcích čte Tesseract OCR (17. 11. 2026)

Pro zdroje typu `image_ocr` (zatím jen alsol.cz) jsme zvolili **Tesseract OCR** jako
dočasné řešení.

- Jak to funguje (`tools/src/podpalto_tools/collect/ocr.py`): OCR celé stránky + zvláštní
  čtení tabulky. Mřížka tabulky se najde z tmavých čar, každá buňka se přečte **dvakrát**
  s jiným předzpracováním a přijme se, jen když se obě čtení shodnou (aspoň v číslicích).
  Jinak je v textu „?“ a cena z buňky se nevytěží. Záznamy nesou příznak `read_by_ocr`.
- Proč dočasně: kontrola „citace je doslova na stránce“ u OCR ověřuje jen proti textu,
  který vyrobilo OCR, takže chybně přečtenou číslici sama neodhalí. Dvojí čtení buněk
  riziko snižuje, ale nevylučuje. Prosté OCR celé stránky tabulky nečetlo vůbec (0–3 z 12
  cen), proto vzniklo čtení po buňkách; to je odladěné na třech plakátech jednoho prodejce.
- Zvažovaná alternativa: **dvojí nezávislý přepis obrázku multimodálním LLM** a
  deterministické porovnání obou přepisů (přijmout jen shodná čísla). Bez systémových
  závislostí, asi tři volání LLM na obrázek navíc, a obecnější pro jiné rozvržení než
  tabulku s mřížkou.
- Přehodnotit, když: přibudou další ceníky v obrázcích s jiným rozvržením (bez mřížky),
  OCR začne vracet „?“ u podstatné části cen, nebo se objeví chybně přečtená cena.
- Známé nedostatky teď: u Zlechova a Chropyně je záhlaví prvního sloupce (délka polen)
  nečitelné, takže jeho ceny chybí; názvy záznamů neobsahují středisko, a protože obě
  střediska mají stejný ceník, vypadají jejich záznamy stejně.
- Lokálně: Tesseract 5.4 (UB Mannheim, winget) v `C:\Program Files\Tesseract-OCR`, česká
  data v `data/ocr/tessdata` (nastavení je najde samo). Docker image instaluje
  `tesseract-ocr` a `tesseract-ocr-ces`.

### Dřevo v „m³“ bez upřesnění se nepřevádí (17. 11. 2026)

Nabídky e-shopů „klec 1,2 m3“, „PackFix 1,6 m3“ apod. neříkají, zda jde o sypané, rovnané,
nebo plné m³, a proto nedostanou Kč/prms (příznak `volume_stacking_unknown`). Ze srovnání
tak vypadne velká část nabídek dřeva z e-shopů (u palivos 19 z 22). **Čeká na
rozhodnutí:** nechat přísně podle PDF, nebo např. klece brát jako sypané s příznakem.

## Zdroje k vyřešení

### Zboží.cz (zapsáno 17. 11. 2026)

- **Proč ho chceme:** v druhém návrhu (dokument „Ověření datových zdrojů“) je to hlavní
  zdroj cen. Kategorie tuhých paliv má kolem 565 produktů, filtr podle druhu paliva
  a filtr osobního odběru po krajích (důležitý pro mapu). Jsou v ní i nabídky
  Srovnejdrevo.cz s obcí v názvu.
- **Proč ho zatím nemáme:**
  - robots.txt kategorii `/tuha-paliva/` povoluje,
  - obsah se ale vykresluje až JavaScriptem,
  - headless prohlížeč web odmítá („Něco nám brání v načtení stránky … VPN či proxy“), tedy
    detekce botů. Podle pravidel projektu ji neobcházíme (žádné „stealth“ úpravy).
- **Další úskalí:**
  - Podmínky užití Zboží.cz se nepodařilo dohledat.
  - Zboží API skončilo 16. 3. 2026 a jeho nástupce Sklik API Fénix je jen pro vlastní
    inzerci obchodu, ne pro čtení cen konkurence (PDF, sekce 1).
  - PDF upozorňuje, že kategorie je zkreslená grilovacím sortimentem.
- **Možnosti:**
  1. Dohoda se Seznamem o přístupu k datům (ideálně exportem nebo rozhraním).
  2. Ověřit podmínky užití a zjistit, zda Seznam nabízí partnerský nebo affiliate přístup
     k nabídkám.
  3. Nahradit ho: stejné prodejce číst přímo (jejich feedy a ceníky), jako u ostatních
     zdrojů. Částečně už děláme.
- **Kdo rozhoduje:** vlastník projektu; technicky je zdroj připravený přidat jako
  `rendered_html`, jakmile bude přístup povolený.

## Zdroje

- [ ] **Zboží.cz:** viz sekce „Zdroje k vyřešení“ výše.
- [ ] **Hornbach:** místo stránek i robots.txt vrací ochranu proti botům. Neobcházíme.
- [ ] **Firmy.cz:** robots.txt zakazuje stránky tagů jiným robotům než Googlebotu.
      Metrika „počet prodejců v kraji“ z druhého návrhu proto zatím nemá zdroj.
- [ ] **Ceny podle PSČ** a **další uhelné sklady ze seznamů SD Bílina**: viz stage 2.
- [ ] **Havelka:** sklady v několika krajích a cenová pásma 0–III; chybí převod pásma na
      oblast/PSČ, proto nemá kraj. Od 18. 11. `export: false` (sbírá se, na web nejde).
- [ ] **Městské lesy Liberec:** slevové řádky („věrnostní sleva“, „při odběru 10 a více
      prm“) jsou metrové dříví, ale délka je jen v nadpisu tabulky, takže se převádí jako
      krátká polena. Od 19. 11. jdou jako akce / množstevní ceny bez kontroly vůči trhu;
      základní produkt k nim zůstává nevyplněný (nejednoznačný).
- [ ] **Jihomoravský kraj a Praha:** po jednom místním prodejci; hledání (19. 11.) našlo jen
      adresáře a „cena na dotaz“. Zkusit e-shopy s rozvozem jen po Brně / Praze.

## Kvalita dat

- [ ] **Prodejci bez IČO:** zbývají kvalitniuhli.cz a baumax.cz (kontakty vracely HTTP 502).
      Doplněno 18. 11.: drevopraha, dek, waldera, bauhaus (ze stránek prodejců).
- [ ] **DPH předpokládané z registru** (`vat_assumed_from_registry`) u ceníků, které DPH
      neuvádí (např. Havelka, UNIKOM, OLVAN, hobby markety). Ověřit u prodejců.
- [ ] **Bříza, směs dřevin** se nepřevádí na kg ani Kč/kWh (PDF dává jen tvrdé/měkké).
- [ ] **Souhlas prodejců** (`consent` v registru) se nevynucuje; nutné vyřešit před
      veřejným zobrazením cen.

## Statistika a mocky

- [ ] `market_statistics`, `news_search`, `customer_reviews` jsou stále **mock**. ČSÚ
      spotřebitelské ceny pevných paliv nevede (terénní šetření skončilo v lednu 2026);
      pro cenový vývoj zbývá vlastní historie snímků v `prices.sqlite`.

## Provoz a infrastruktura

- [x] **Docker image** – sestavují se na Railway (18. 11.): `tools` s Tesseractem a Chromiem,
      `app` pro worker; obě nasazení prošla.
- [ ] **Crew pro report** (MarketResearchFlow) zatím neproběhla naostro nad skutečnými
      daty; ověřit výstup a cenu běhu.
- [ ] **Frekvence sběru** (plánovač je, viz stage 2) a **PostgreSQL/TimescaleDB**.
- [x] **Sjednotit API mezi frontendem a backendem** – vše přes Supabase (18. 11.).
- [x] **Mapa po krajích** – heat mapa krajů na webu (Lukáš, 18. 11.); data mají kraj prodejce
      a oblast platnosti ceny (`valid_in_regions`).
- [ ] **Sledování nákladů na LLM** (extrakce a report) zatím žádné; v Anthropic konzoli
      nastavit měsíční limit útraty.
