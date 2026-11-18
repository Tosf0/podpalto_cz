# Co je ještě potřeba udělat nebo změnit

Průběžný seznam otevřených úkolů a dočasných rozhodnutí. Hotové věci odsud mažeme;
důležitá rozhodnutí přesouváme do README příslušné služby. Datum = kdy byla položka
zapsána nebo naposledy změněna.

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
- [ ] **Frontend: smazat REST větve** v `src/lib/api/sellers.ts`, `market.ts`, `reports.ts`,
      `analysis.ts` a `client.ts`; ukázková data ponechat jen jako offline režim bez
      Supabase. V `frontend/README.md` nahradit kapitolu 5 (REST kontrakt) odkazem na schéma
      (`frontend/supabase/migrations/`) a `docs/agent-output-spec.md`.
- [ ] **CI Studio přes frontu v databázi místo REST:**
      - frontend vloží řádek do `analysis_runs` (tabulka a RLS pro tarif Pro už existují),
      - služba `app` si nové řádky (`status = 'queued'`) vyzvedává – polling, nebo
        databázový webhook / Supabase Realtime – a spustí příslušný flow,
      - během běhu zapisuje do řádku `status`, `progress`, `steps`, `logs`, na konci
        `report_id` a výsledek do `analysis_reports` (+ `seller_intel` u profilu prodejce),
      - frontend sleduje řádek přes Supabase Realtime (žádná URL backendu, CORS ani
        veřejný endpoint na Railway).
- [ ] Na straně databáze doplnit sloupce pro frontu a typy reportů (viz rozhodnutí o CI
      Studiu níže) a `sellers.external_key` pro upsert od agentů.

### Opravy API: současný stav (18. 11. 2026)

Databázová část rozhodnutí 1–4 je hotová v migraci
`frontend/supabase/migrations/20261118120000_agent_output.sql`. Syntaxe je ověřená
parserem PostgreSQL, ale **migrace zatím není nasazená** v projektu Podpalto a neproběhla
proti živé databázi (lokálně není Docker ani Postgres).

| Rozhodnutí | Stav |
|---|---|
| (1) akce a pásma jako produkt | DB hotová. Zbývá: §7 ve specu, zobrazení variant na detailu prodejce. |
| (2) chybějící pole | Hotovo, viz poznámky k mapování níže. |
| (3) „neuvedeno“ | DB hotová. **Zbývá frontend** (typy, `pricing.ts`, štítky, odznak skladu). |
| (4) stav kontroly | DB hotová (sloupce, triggery, RLS, admin RPC). Zbývá: obrazovka fronty kontroly pro admina. |
| (5) `market_stats` | Nezačato. Tabulky `commodity_price_stats` a `region_stats` už existují, změna DB není potřeba. |
| (9) fronta CI | Odloženo podle rozhodnutí, migrace na ni nesahá. |

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

- [ ] **(1) Akční a množstevní ceny = samostatný produkt.** Trigger `apply_price_observation`
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
- [ ] **(3) „Neuvedeno“ musí jít uložit i zobrazit.**
      - `products.stock` bez `not null` a bez výchozího `'in_stock'`; `null` = neuvedeno.
      - Doprava v `sellers`: sloupce bez výchozích nul, `own_delivery = null` = neznámo.
      - Frontend: `lib/pricing.ts` při neznámé dopravě vrátí „doprava neuvedena“ (ne
        „nedováží“), sklad „neuvedeno“; štítky (`skladem`, `vlastni-doprava`…) se
        z `null` neodvozují. Upravit typy v `src/types/index.ts` a RPC `api_sellers`.
- [ ] **(4) Podezřelé ceny skrýt přes stav kontroly, ne přes `active`.** `active` dál znamená
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
      - 26 fiktivních prodejců v produkčním Supabase: smazat při prvním zápisu reálných dat?
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
- [ ] DB: `analysis_reports.kind` (`market` | `seller`), `analysis_reports.params`
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
