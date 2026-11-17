# Co je ještě potřeba udělat nebo změnit

Průběžný seznam otevřených úkolů a dočasných rozhodnutí. Hotové věci odsud mažeme;
důležitá rozhodnutí přesouváme do README příslušné služby. Datum = kdy byla položka
zapsána nebo naposledy změněna.

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
- [ ] **Sjednotit API mezi frontendem a backendem** (zapsáno 18. 11. 2026, po merge do
      `dev`): frontend (`frontend/README.md`, kap. 5 „REST API kontrakt pro CrewAI backend“,
      typy v `frontend/src/types/index.ts`) očekává např. `GET /api/sellers`,
      `GET /api/sellers/{slug}`, `GET /api/reports/{id}`; služba `app` dnes nabízí jen
      `POST/GET /runs` a `/health`. Data pro mapu a prodejce jsou ve službě `tools`
      (`prices.sqlite`, nástroje `eshop_catalog`, `price_comparison`, `heating_demand`),
      ale veřejné API nad nimi není. Frontend zatím běží v mock režimu nebo nad Supabase.
- [ ] **Mapa/dashboard po krajích** z druhého návrhu (GeoJSON krajů, PSČ → kraj) zatím
      není; data mají kraj prodejce a oblast platnosti ceny.
- [ ] **Sledování nákladů na LLM** (extrakce a report) zatím žádné.
