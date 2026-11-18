# Co je ještě potřeba udělat nebo změnit

Průběžný seznam otevřených úkolů a dočasných rozhodnutí. Hotové věci odsud mažeme;
důležitá rozhodnutí přesouváme do README příslušné služby. Datum = kdy byla položka
zapsána nebo naposledy změněna.

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

1. **Worker fronty analýz** v `app` podle `frontend/README.md` kap. 5.2 (`claim_analysis_run`,
   průběžný zápis `progress/steps/logs`, report do `analysis_reports`, `status`).
2. **Zápis do Supabase** (export podle `docs/agent-output-spec.md`, upsert přes
   `sellers.external_key` a `products (seller_id, external_id)`; při vložení produktu
   `price_updated_at = observed_at` první ceny).
3. **`market_stats`** (bod 5) – v databázi je hotová funkce `public.refresh_market_stats()`
   (migrace `…170000_refresh_market_stats.sql`): po každém importu ji stačí zavolat
   (`select public.refresh_market_stats();`, service role). Mediány ze schválených nabídek,
   bez akcí, převod na PRMS / tunu, kraj bez nabídky nemá hodnotu.
4. Rozhodnout body **6–8, 10–12** níže (kWh konstanty, pásma, klíč prodejce, geolokace,
   hodnocení, smazání 26 fiktivních prodejců při prvním zápisu reálných dat).
5. `MarketResearchFlow` / `SellerProfileFlow` podle rozhodnutí o CI Studiu (DB část hotová).

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

### Joby agentů – plán a ruční spuštění (pro kolegu, připraveno 18. 11. 2026)

V administraci (`/admin/kontrola?sekce=agenti`) admin nastaví, jak často se joby spouští
(denně / týdně / měsíčně / čtvrtletně, den a hodina v čase Europe/Prague; **výchozí jednou
měsíčně**), a může job spustit ručně. Joby: `collect` (sběr cen, `CollectionFlow`) a
`market_report` (přehled trhu, `MarketResearchFlow`). Plánování řeší databáze – worker
nepotřebuje vlastní cron.

- [ ] **Nahrát migraci** `frontend/supabase/migrations/20261118230000_agent_jobs.sql` (Lukáš po
      kontrole; otestovaná v transakci s rollbackem). Do té doby záložka Agenti jen napíše,
      že tabulky chybí.
- [ ] **Worker v `app`** (stejný proces jako worker CI Studia, secret klíč ze Supabase):
  1. Každou ~minutu `select * from claim_agent_job('<id workeru>')`. Funkce sama založí
     naplánované běhy, jejichž čas nastal (zameškaný termín jen jednou), označí jako `failed`
     běhy bez zápisu déle než 2 h a vrátí nejstarší čekající běh přepnutý na `running`,
     nebo nic. Od každého jobu běží nejvýš jeden běh.
  2. Podle `job` spustit flow; `params` z řádku (u `market_report` `fuel_category`, `region`).
  3. Průběžně `update agent_job_runs set progress, logs where id = …` (každý update zároveň
     slouží jako „heartbeat“). Sběr zapisuje `scrape_runs` s `job_run_id` = id běhu a nové ceny
     do `price_observations` s `observed_at` = čas stažení (trigger sám aktualizuje
     `products.price_czk` a `price_updated_at`).
  4. Na konci `select finish_agent_job_run(id, 'completed' | 'failed', summary, error)`.
     `summary` (jsonb) se ukazuje v administraci, klíče: `sources`, `sources_failed`,
     `observations`, `products_new`, `sellers_new`, `report_id` (odkaz na report v CI Studiu).
     U úspěšného `collect` funkce sama zavolá `refresh_market_stats()` → Trh, Trendy, heat mapa.

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

### CI Studio – co zbývá na straně `app` (pro kolegu)

Databáze i frontend jsou hotové; analýzy čekají ve frontě, dokud je nezačne zpracovávat worker
ve službě `app`. Kontrakt je v `frontend/README.md`, kap. 5.2. Co je potřeba udělat:

1. **Připojení:** worker se připojí k Supabase *secret* klíčem (service role) z proměnných
   prostředí služby `app` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) – nikdy ne do frontendu ani repozitáře.
2. **Převzetí běhu:** ve smyčce (každé 2–5 s) volat RPC `select * from claim_analysis_run('<id workeru>')`.
   Vrátí nejstarší běh ve stavu `queued` a atomicky ho přepne na `running` (`claimed_by`, `claimed_at`),
   nebo nic. Místo pollingu lze poslouchat Supabase Realtime (INSERT do `analysis_runs`).
3. **Podle `kind` spustit crew:**
   - `url` – dnešní analýza konkurence z `competitor_url`,
   - `market` – `MarketResearchFlow` s `params = {"fuel_category": "...", "region": "STC"}`,
   - `seller` – `SellerProfileFlow` pro `subject_seller_id` (údaje prodejce z tabulky `sellers`,
     ceny z `products`).
4. **Průběh:** po každém kroku `update analysis_runs set progress, steps, logs where run_id = …`
   (`steps` = `CrewStep[]`, `logs` = `CrewLogEntry[]`, typy ve `frontend/src/types/index.ts`).
   Frontend běh každých 1,5 s načítá a zobrazuje.
5. **Výsledek:** `insert into analysis_reports (id, kind, params, competitor_url, competitor_name,
   competitor_domain, report, status, model, duration_s, seller_id, region, categories, swot,
   requested_by)` – `report` v Markdownu, `swot` jako `SwotMatrix` ze `src/types`, `requested_by`
   = `analysis_runs.user_id`. Pak `update analysis_runs set status = 'completed', report_id,
   finished_at = now(), progress = 100`.
6. **U `kind = seller`** navíc upsert `seller_intel (seller_id, report_id, positioning,
   tone_of_voice, usp, swot, price_index_vs_cz, market_comparison, analyzed_at)` – zobrazuje se
   v sekci „Analýza“ na detailu prodejce (Pro).
7. **Chyby:** `status = 'failed'`, text do `error`, `finished_at = now()`. Běhy, které visí ve stavu
   `running` déle než ~15 min (`claimed_at`), vrátit do `queued` nebo označit `failed`
   (při startu workeru nebo cronem).
8. **Test:** v aplikaci účet s tarifem Pro → CI Studio → spustit analýzu; běh se objeví
   v `analysis_runs` jako `queued`, worker ho převezme a frontend ukáže průběh a report.
9. Až worker poběží, na frontendu doplníme záložky „Trh“ (palivo + kraj) a „Prodejce“ (výběr z katalogu).

**Reálná data místo demo dat** (zapsáno 18. 11. 2026): 26 fiktivních prodejců a demo
statistiky jsou smazané. V databázi je **81 reálných prodejců** ze 14 krajů a **371 cen**
z jejich veřejných webů a ceníků (sběr: jednorázově subagenti Claude, ne pipeline v `tools`).
Každá cena má `source_url`, převody jednotek (q → t, kg → t, balení → t, pytel 1,6 PRMS → PRMS)
jsou v `price_observations.original_unit/original_price`. Statistiky přepočítává
`select public.refresh_market_stats();` (medián přes prodejce).
Stav pokrytí: 50 prodejců s cenou, 31 jen s kontaktem; 29 prodejců má polohu jen na úrovni obce;
Moravskoslezský kraj zatím bez jediné průměrné ceny, Praha, Ústecký, Vysočina, Olomoucký a Zlínský
kraj mají 1–2 prodejce s cenou. Přesnost cen je třeba ověřit (stahování stránek vracelo
shrnutí, ne surové HTML) – pro produkční data patří sběr do pipeline v `tools` podle
`docs/agent-output-spec.md` (snapshot stránky, citace ceny, ARES, RÚIAN).

**Fotky prodejců – JEN PRO VÝVOJ** (zapsáno 18. 11. 2026): fotky v `frontend/public/sellers/`
jsou převzaté z webů prodejců **bez jejich svolení** – slouží jen pro vývoj a ukázku (showcase).
Zdroj každé fotky je v `sellers.photo_source_url`. Přepínač v `/admin/kontrola` → Nastavení
(`app_settings.seller_photos`): „Fotky z webů prodejců“ (vývoj) / „Jen obecné fotky podle paliva“
(produkce – volné licence Unsplash/Pexels/Pixabay v `public/sellers/generic/`, autoři v CREDITS.md).
Před ostrým provozem:
- [ ] přepnout na „Jen obecné fotky podle paliva“,
- [ ] **požádat prodejce o svolení** s použitím jejich fotek (e-mail s odkazem na profil; souhlas
      evidovat – např. sloupec `sellers.photo_permission_at`), fotky bez souhlasu smazat
      z `public/sellers/` a z `sellers.photo_url`,
- [ ] dlouhodobě: fotky nahrává prodejce sám po převzetí profilu (bucket `seller-photos`, později R2),
- [ ] dokud jsou soubory v `public/`, jsou dostupné na přímé URL i v produkčním režimu – před
      spuštěním je z repozitáře odstranit nebo přesunout do úložiště s kontrolou přístupu.

**Blog se schvalováním** (zapsáno 18. 11. 2026): článek napíše kdokoli přihlášený a odešle ke
schválení (`blog_posts.status = 'pending'`); publikuje, zamítá (s poznámkou), upravuje a maže admin
v `/admin/kontrola` → záložka Blog. Fotky jsou zatím v Supabase Storage (`blog-images/<uid>/…`),
u smazaných a zamítnutých článků se mažou. **Do budoucna přesunout na Cloudflare R2** – viz
„TODO – obrázky z Cloudflare R2“ v `frontend/README.md`. Migrace `20261118160000_blog_review.sql`.

**Zbývá na frontendu:** CI Studio se záložkami „Trh“ / „Prodejce“ (až poběží worker, viz níže).
Akční a množstevní ceny na detailu prodejce jsou hotové (18. 11.), *Leaked password protection* je zapnutá.

## Rozhodnutí: jediný zdroj dat je Supabase (18. 11. 2026)

Stav: frontend na produkci už čte **všechna data jen ze Supabase** (projekt Podpalto).
REST větve v `frontend/src/lib/api/*` (`apiFetch` na `NEXT_PUBLIC_API_URL`) jsou pozůstatek
původního zadání a nikdy se nespustí. Jediné skutečné volání REST je spuštění analýzy v CI
Studiu (`POST /api/analyze` + polling `GET /api/analyze/{run_id}`), dnes simulované.

Cíl: **agenti zapisují do Supabase, frontend čte ze Supabase, žádné veřejné REST API.**

- [ ] **Agenti → Supabase:** výstup podle `docs/agent-output-spec.md` (prodejci s polohou,
      produkty, ceny, běhy). Nejdřív export do JSON souboru, pak přímý zápis se *secret*
      klíčem (jen na serveru) v pořadí `sellers` → `products` → `price_observations` →
      `scrape_runs`.
- [x] **Frontend: smazat REST větve** (hotovo 18. 11.) v `src/lib/api/sellers.ts`, `market.ts`, `reports.ts`,
      `analysis.ts` a `client.ts`; ukázková data ponechat jen jako offline režim bez
      Supabase. V `frontend/README.md` nahradit kapitolu 5 (REST kontrakt) odkazem na schéma
      (`frontend/supabase/migrations/`) a `docs/agent-output-spec.md`.
- [ ] **CI Studio přes frontu v databázi místo REST:** DB a frontend hotové 18. 11., zbývá worker v `app`.
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
`frontend/supabase/migrations/20261118120000_agent_output.sql`. Syntaxe je ověřená
parserem PostgreSQL, ale **migrace **je nasazená** (18. 11. večer, spolu s opravami)** v projektu Podpalto a neproběhla
proti živé databázi (lokálně není Docker ani Postgres).

| Rozhodnutí | Stav |
|---|---|
| (1) akce a pásma jako produkt | DB hotová. Zbývá: §7 ve specu, zobrazení variant na detailu prodejce. |
| (2) chybějící pole | Hotovo, viz poznámky k mapování níže. |
| (3) „neuvedeno“ | Hotovo (DB i frontend, 18. 11.). |
| (4) stav kontroly | Hotovo: DB, opravené triggery (`…130000_review_fixes.sql`) a stránka `/admin/kontrola`. |
| (5) `market_stats` | Funkce `refresh_market_stats()` v DB (18. 11.); služba `tools` ji jen zavolá po importu. |
| (9) fronta CI | DB (`…140000`) a frontend hotové; zbývá worker v `app`. |

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

- [ ] **(1) Akční a množstevní ceny = samostatný produkt.** DB a §7 specu hotové; zbývá zobrazení variant na detailu prodejce. Trigger `apply_price_observation`
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
- [ ] **(5) Statistiky trhu počítá nový deterministický nástroj v `tools`** (pracovně
      `market_stats`), ne LLM a ne frontend:
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
- [ ] **(7) Pásma věrohodnosti cen.** Spec (§9): dřevo 300–4 000 Kč/PRMS, pelety
      4 000–20 000 Kč/t, uhlí 2 500–20 000 Kč/t. Kód (`normalize.py`): 300–6 000 Kč/prms
      a 2 000–40 000 Kč/t pro všechna paliva na váhu. Vybrat jedny a držet je v kódu.
- [ ] **(8) Stabilní `seller_key`.** Spec skládá klíč z IČO a kódu RÚIAN; když se adresa
      dohledá později nebo opraví, klíč se změní a historie cen se rozpadne. Doporučení:
      `<source_id>-<slug pobočky>` jako klíč, RÚIAN jen jako údaj.
- [ ] **(10) Geolokace a doprava kódem.** RÚIAN, ARES a geokodéry jsou deterministická API,
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

1. ~~**Migrace Supabase:** body 1–4~~ – napsaná (18. 11. 2026), **zbývá nasadit** do
   projektu Podpalto (`npx supabase db push` nebo SQL Editor) a ověřit, že seed a frontend
   dál fungují.
2. **Rozhodnout body 6–8** (kWh, pásma, klíč prodejce), protože ovlivňují export.
3. **`tools`:** nástroj `market_stats` (bod 5) a JSON export podle `agent-output-spec.md`
   s validací proti JSON Schema.
4. **Frontend:** zobrazit „neuvedeno“ (bod 3), smazat REST větve, upravit dokumentaci
   (bod 12). Posunuto před zápis, viz „Pozor na pořadí“ výše.
5. **Zápis do Supabase** se *secret* klíčem (a rozhodnutí o fiktivních prodejcích).
6. **Fronta CI Studia** (bod 9) spolu s úkoly z rozhodnutí o CI Studiu.

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

- [ ] **optimtop.cz** a drevenepelety.cz (stejný provozovatel): uhelné brikety, koks,
      balené uhlí, pelety; množstevní slevy podle počtu palet, doprava zdarma (PDF s. 6)
- [ ] **biomac.cz**: pelety a brikety, doprava není v ceně (1 050 Kč/paleta) (PDF s. 6–7)
- [ ] **cdp.cz**: pelety, brikety, balené uhlí, dřevo; ceny v Kč/kg, manipulační poplatek
      u 1 palety (PDF s. 7)
- [ ] **okpaliva.cz**: pelety, brikety, uhlí, dřevo; ceny vč. dopravy, pozor na lokální URL
      pro jednotlivé obce (PDF s. 9)
- [ ] pelety-premium.cz (Golčův Jeníkov), ekopelety.cz (Stará Huť) (PDF s. 9–10)

**Pilíř 2: uhelné sklady a těžba**

- [ ] **uhlipro.cz** (`/Cenik`), **uhlinemcova.cz** (`/cenik`) (PDF s. 13–14)
- [ ] palivamakovy.cz, cdpaliva.cz (`/cenik`, uhlí i dřevo), coxys.cz (`/cenik`),
      golem-paliva.cz (`/aktualni-cenik-produktu/`), paliva-police.cz (`/cenik/`, uhlí; jiný
      web než palivapolice.cz se dřevem), uhli-pribor.cz, uhli-opava.cz (PDF s. 14–15)
- [ ] ridera.cz: statický ceník skladu Ostrava (`/provozovny/ostrava-marianske-hory/`), bez
      DPH i s DPH; doplní e-shop ridepal.eu (PDF s. 11–12)
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
      bez DPH po krajích, `price_includes_vat: false` (PDF s. 19–20)
- [ ] Městské lesy Hradec Králové (`mestske-lesy.cz/prodej-paliva-stepky-a-mulcovaci-kury/`)
- [ ] drevo-ludwig.cz, palivove-drevo-libeznice.cz, drevo-domu.cz, palivakozma.cz,
      prodejpalivovehodreva.eu (PDF s. 21–23)

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
      nabídek (příznak akce, případně platnost ceníku). Časové razítko už máme.
- [ ] **Provoz podle PDF 4.4:**
  - [ ] frekvence sběru podle typu zdroje (sklady a lesy čtvrtletně nebo k 1. 4., 1. 9.,
        1. 10., e-shopy a hobby markety týdně) a plánovač (cron); teď se sběr spouští ručně,
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
      oblast/PSČ, proto nemá kraj.
- [ ] **Městské lesy Liberec:** slevové řádky („věrnostní sleva“, „při odběru 10 a více
      prm“) jsou metrové dříví, ale délka je jen v nadpisu tabulky, takže se převádí jako
      krátká polena (dva z nich mají příznak odlehlé ceny).

## Kvalita dat

- [ ] **Prodejci bez IČO** na stránkách povolených robots.txt: kvalitniuhli.cz,
      drevopraha.cz, baumax.cz, dek.cz, waldera.cz, bauhaus.cz. U řetězců doplnit ručně
      z ARES podle názvu firmy.
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

- [ ] **Docker image nebyl sestaven** (Docker na vývojovém stroji není). Ověřit tools image
      s Tesseractem a Chromiem (`playwright install --with-deps chromium`).
- [ ] **Crew pro report** (MarketResearchFlow) zatím neproběhla naostro nad skutečnými
      daty; ověřit výstup a cenu běhu.
- [ ] **Plánování sběru** a **PostgreSQL/TimescaleDB**: viz stage 2.
- [ ] **Sjednotit API mezi frontendem a backendem** – rozhodnuto 18. 11. 2026, viz
      sekce „Rozhodnutí: jediný zdroj dat je Supabase“ níže.
- [ ] **Mapa/dashboard po krajích** z druhého návrhu (GeoJSON krajů, PSČ → kraj) zatím
      není; data mají kraj prodejce a oblast platnosti ceny.
- [ ] **Sledování nákladů na LLM** (extrakce a report) zatím žádné.
