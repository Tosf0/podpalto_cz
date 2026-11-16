# Zadání pro Claude Code: Kompletní návrh a implementace frontendu `podpalto.cz`

> **Jak tento soubor použít v Claude Code:**
> Zkopíruj obsah tohoto souboru přímo do Claude Code, nebo v Claude Code napiš:
> `Přečti si soubor frontend/ZADANI_PRO_CLAUDE_CODE.md a kompletně podle něj navrhni a naimplementuj aplikaci ve složce frontend/.`

---

## 1. Instrukce pro orchestraci agentů (Opus Orchestrator + Sonnet/Haiku Subagenti)

Pracuj v režimu **Hlavního Architekta a Orchestrátora (Claude Opus)**. Tvým úkolem je řídit celý vývoj frontendu `podpalto.cz` ve složce `frontend/`.

### Pravidla delegování práce:
1. **Ty (Opus – Orchestrátor):**
   - Navrhneš přesnou architekturu, datové kontrakty (TypeScript rozhraní kompatibilní s naším Python/CrewAI backendem), strukturu složek a design systém.
   - Rozdělíš práci na logické, nezávislé bloky a deleguješ psaní kódu na subagenty (pomocí nástroje `Task`), abys šetřil svůj kontext a maximalizoval rychlost i kvalitu.
   - Na konci zkontroluješ integraci všech částí, opravíš případné typové nebo build chyby (`npm run build`) a ověříš běh na `localhost`.

2. **Sonnet Subagenti (`model: "sonnet"`) – pro středně těžké a komplexní úkoly:**
   - Implementace interaktivní open-source mapy (MapLibre GL / React-Leaflet), klastrování markerů, vykreslení rádiusu dopravy a interakce mapa ↔ seznam.
   - Pokročilý filtrovací a vyhledávací engine (filtrace podle typu paliva, dřeviny, vlhkosti, kraje, PSČ + výpočet reálné ceny včetně dopravy a přepočet na Kč/kWh).
   - Složité interaktivní stránky: Srovnávač / Kalkulačka nákladů, Analytické grafy (Recharts) a **Competitive Intelligence (CI) Studio** pro prohlížení a spouštění CrewAI analýz konkurentů.
   - Návrh API vrstvy a stavu aplikace.

3. **Haiku Subagenti (`model: "haiku"`) – pro jednoduché, rychlé a repetitivní úkoly:**
   - Generování bohatých a realistických mock dat pro český trh tuhých paliv (prodejci ve všech 14 krajích ČR, ceníky dřeva, pelet, briket, uhlí, ukázkové SWOT Markdown reporty z CrewAI).
   - Tvorba základních UI primitiv (badge, karty, patička, hlavička, statické sekce, ikony, konstanty, formátovače měn a jednotek).
   - Sepsání přehledné technické dokumentace do `frontend/README.md` a `frontend/ARCHITECTURE.md`.

### Zásadní omezení (Constraints):
- **Pracuj VÝHRADNĚ ve složce `frontend/`** (`c:\dev\podpalto_app\frontend`). Nijak neměň soubory ve složkách `app/` ani `tools/` (na těch pracuje kolega, který vyvíjí CrewAI backend).
- **Zatím pouze lokálně (`localhost`):** Aplikaci inicializuj, sestav a otestuj lokálně. **NEDĚLEJ `git commit`, `git push` ani nasazení na Vercel** – nejprve si vše lokálně zkontroluji na `localhost:3000`.
- **Dokumentace:** Ve složce `frontend/` aktualizuj `frontend/README.md` (a případně vytvoř `frontend/ARCHITECTURE.md`), kde kompletně zdokumentuješ architekturu frontendu, použité knihovny, spuštění, strukturu složek a připravené API endpointy pro napojení na CrewAI (Railway).

---

## 2. O projektu a kontextu `podpalto.cz`

**`podpalto.cz`** je moderní česká platforma, která spojuje dva světy:
1. **Veřejný / zákaznický portál – Interaktivní mapa cen všech tuhých paliv v ČR:**
   Umožňuje lidem i firmám okamžitě najít nejvýhodnější palivové dřevo (štípané, metrovky, tvrdé/měkké, suché/syrové), dřevěné pelety (ENplus A1/A2), dřevěné i uhelné brikety a uhlí v jejich okolí. Řeší největší bolest trhu: **nepřehledné jednotky** (PRMS vs. PRM vs. PLM vs. paleta vs. tuna) a **skryté ceny za dopravu**.
2. **Competitive Intelligence (CI) & Analytický modul (poháněný CrewAI na Railway):**
   Na pozadí běží multiagentní systém v CrewAI (repozitář má části `app/` a `tools/`), který prochází weby konkurenčních prodejců tuhých paliv v ČR, sbírá jejich ceníky, dopravu, sortiment, USP a generuje strukturované SWOT analýzy a doporučení pro `podpalto.cz`. Frontend bude nasazený na **Vercelu (Next.js)** a s **CrewAI backendem na Railway** bude komunikovat přes REST API / JSON (případně sdílenou DB).

---

## 3. Technologický stack

Postav aplikaci na moderním, produkčně připraveném stacku:
- **Framework:** Next.js (nejnovější stabilní verze s **App Routerem**, TypeScript, `src/` adresářová struktura).
- **Styling & UI komponenty:**
  - **Tailwind CSS**
  - **shadcn/ui** (Radix UI primitiva) + **Lucide React** ikony.
  - Čistá typografie: např. `Plus Jakarta Sans` nebo `Inter` pro UI + `JetBrains Mono` pro ceny, jednotky (`Kč/PRMS`, `Kč/kWh`) a analytická čísla.
- **Interaktivní Open-Source Mapa (bez nutnosti placeného API klíče):**
  - Použij **React-Leaflet (`leaflet` + `react-leaflet`)** nebo **MapLibre GL JS (`maplibre-gl` + `react-map-gl/maplibre`)** s bezplatnými open-source dlaždicemi (např. CartoDB Positron / Voyager nebo OpenStreetMap, které vypadají čistě a moderně).
  - Mapa musí být načítaná dynamicky (`next/dynamic` se `ssr: false`), aby nedocházelo k SSR chybám s `window`.
- **Grafy a vizualizace dat:** **Recharts** (pro cenové trendy v čase, srovnání krajů a porovnání ceny za kWh).
- **Vykreslování CrewAI reportů:** `react-markdown` (pro zobrazení Markdown SWOT reportů vygenerovaných CrewAI flow).
- **Architektura datové vrstvy:**
  - Vytvoř čistou servisní vrstvu (`src/lib/api/`), která je připravená na volání env proměnné `NEXT_PUBLIC_API_URL` (budoucí FastAPI + CrewAI na Railway), ale **ve výchozím stavu plynule vrací bohatá, realistická mock data**, takže celá aplikace funguje na 100 % hned po spuštění na `localhost:3000`.

---

## 4. Vizuální identita, barvy a UX ("Modern Nordic Hearth & Clean Data")

Design musí být **čistý, vzdušný, moderní a důvěryhodný**, barevně ladící s tématem dřeva, tepla, energie a datové analytiky (žádný zastaralý „lesnický web z roku 2008“, ale úroveň moderních produktů jako Airbnb / Stripe / Linear v kombinaci s přírodními tóny):

- **Barevná paleta:**
  - **Pozadí (Light mode – výchozí):** Teplá krémová / kamenná bílá (`#FAF8F5` / `stone-50`) s čistě bílými kartami (`#FFFFFF`) a jemným ohraničením (`stone-200`).
  - **Pozadí (Dark mode – přepínatelný):** Hluboký uhelný / břidlicový odstín (`#121316` / `zinc-950` a `zinc-900`).
  - **Primární akcent ("Podpal to" – oheň / teplo):** Jantarová / plamenná oranžová (`#EA580C` – `orange-600` až `amber-500`) pro hlavní CTA prvky, aktivní filtry a zvýraznění.
  - **Sekundární akcent (Dřevo / Les / Výhodná cena):** Lesní smrková zelená (`#15803D` – `emerald-700` / `green-600`) pro odznaky „Nejlepší cena v okolí“, ekologické parametry a pozitivní cenové delty.
  - **Doplňkové tóny podle typu paliva (pro odlišení na mapě a v grafech):**
    - 🪵 **Palivové dřevo:** Teplá dubová / jantarová (`amber-600`)
    - 🌾 **Dřevěné pelety:** Smrková zelená (`emerald-600`)
    - 🧱 **Brikety:** Cihlová / měděná (`orange-700`)
    - ⚫ **Uhlí:** Břidlicová / antracitová (`slate-700`)
- **UI prvky:**
  - Jemné stíny, zaoblené rohy (`rounded-xl` / `rounded-2xl`), přehledné tabulky a karty s okamžitě čitelnou cenou, mikro-animace při najetí na prodejce (zvýraznění odpovídajícího špendlíku na mapě).

---

## 5. Struktura stránek, navigace a funkcionalita

### Globální navigace (Sticky Top Navbar)
- **Logo `podpalto.cz`** s ikonou plamene/dřeva a podtitulem *Cenová mapa & CI tuhých paliv*.
- **Hlavní odkazy:**
  1. 🗺️ **Mapa cen** (`/`)
  2. 🧮 **Kalkulačka & Srovnávač** (`/kalkulacka`)
  3. 🏪 **Prodejci v ČR** (`/prodejci`)
  4. 📈 **Trh a trendy** (`/trendy`)
  5. 🤖 **CI Studio (CrewAI)** (`/ci-studio`)
- **Rychlé akce v hlavičce:**
  - Přepínač měrné jednotky zobrazení: *Cena za jednotku (PRMS/t)* vs. *Přepočet na výhřevnost (Kč/kWh)*.
  - Rychlý výběr lokality (např. „📍 Praha a Střední Čechy“ nebo zadání PSČ).
  - Přepínač Light / Dark mode.

---

### Stránka 1: `/` – Interaktivní Mapa cen & Vyhledávač (Vlajková loď webu)
Hlavní obrazovka kombinující rychlý přehled trhu a interaktivní mapu ČR.
- **Horní KPI lišta (Market Pulse):**
  - Průměrná cena tvrdého štípaného dřeva (Kč/PRMS), měkkého dřeva (Kč/PRMS), pelet ENplus A1 (Kč/t) a briket (Kč/t) v ČR + procentuální změna oproti minulému měsíci.
- **Pokročilý panel filtrů a vyhledávání:**
  - **Vyhledávání:** Podle názvu prodejce, města nebo PSČ + slider pro **dojezdový rádius** (10 km – 100 km).
  - **Kategorie paliva (Pills s ikonami):** Vše | Palivové dřevo | Pelety | Brikety | Uhlí.
  - **Dynamické podfiltry (např. pro dřevo):**
    - Druh dřeviny: Tvrdé (buk, dub, habr, jasan) vs. Měkké (smrk, borovice, modřín) vs. Bříza.
    - Zpracování: Sypané štípané (PRMS) | Rovnané (PRM) | Metrové kulatiny | Palety/klece.
    - Vlhkost: Suché k okamžitému topení (< 20 %) vs. Polosuché vs. Čerstvé/syrové.
    - délka polen: 25 cm, 33 cm, 40 cm, 50 cm.
  - **Řazení:** Nejlevnější celkem (vč. dopravy) | Nejlevnější za jednotku | Nejlepší cena za 1 kWh | Nejblíže | Nejlépe hodnocené.
- **Split-view Layout (Seznam vlevo + Interaktivní Mapa vpravo, na mobilu přepínatelné):**
  - **Interaktivní Open-Source Mapa ČR:**
    - Vlastní cenové špendlíky (Price Pills přímo na mapě, např. `1 490 Kč/PRMS`), barevně odlišené podle hlavního paliva nebo výhodnosti ceny (zelená = pod průměrem kraje, oranžová = průměr, červená = drahé).
    - Při kliknutí na špendlík se otevře bohatý **Popup / Drawer** s detailem prodejce, ceníkem hlavních položek, cenou dopravy a tlačítkem *„Detail prodejce“* nebo *„Porovnat“*.
    - Při najetí myší na kartu prodejce v levém seznamu se příslušný špendlík na mapě zvýrazní/zapulzuje.
    - Možnost zapnout vrstvu **„Cenová teplotní mapa krajů ČR“** (choropleth / barevné odlišení krajů podle průměrné ceny).
  - **Karty prodejců a nabídek v seznamu:**
    - Název prodejce, město + kraj, vzdálenost v km.
    - Hlavní cena + přepočet na **Kč / kWh** a **odhad ceny dopravy**.
    - Štítky: *Skladem*, *Vlastní doprava s hydraulickou rukou*, *Certifikace ENplus A1*, *Suché <18%*.

---

### Stránka 2: `/kalkulacka` – Chytrá kalkulačka vytápění & Převodník jednotek
Praktický nástroj, který přitáhne organickou návštěvnost a pomůže lidem spočítat reálnou cenu za sezónu:
1. **Převodník jednotek dřeva a výhřevnosti:**
   - Interaktivní převod mezi **PRMS** (prostorový metr sypaný), **PRM** (prostorový metr rovnaný) a **PLM** (plný metr / kubík) podle druhu dřeviny a vlhkosti.
   - Jasné vysvětlení, proč zdánlivě levné čerstvé sypané dřevo může být po přepočtu na výhřevnost (kWh) dražší než sušené rovnané dřevo nebo brikety.
2. **Kalkulačka sezónního nákupu vč. dopravy:**
   - Uživatel zadá: PSČ, požadované množství (např. 10 PRMS tvrdého dřeva nebo 4 tuny pelet).
   - Kalkulačka automaticky seřadí prodejce podle **celkové konečné částky (palivo + doprava na danou vzdálenost)** a ukáže, kolik ušetří oproti průměru v kraji.

---

### Stránka 3: `/prodejci` a `/prodejci/[slug]` – Katalog a detailní profil prodejce (Konkurenta)
- **Katalog (`/prodejci`):** Přehledová tabulka / mřížka všech sledovaných prodejců tuhých paliv v ČR s filtrováním podle kraje, velikosti, dostupnosti dopravy a šíře sortimentu.
- **Detail prodejce (`/prodejci/[slug]`):**
  - Kompletní ceník všech produktů prodejce (historie změn ceny, stav skladu).
  - Podmínky a ceník dopravy (zdarma nad X palet, cena za km, složení hydraulickou rukou).
  - **Sekce Competitive Intelligence (z dat CrewAI):** Silné a slabé stránky prodejce (SWOT), positioning na trhu, tón komunikace, srovnání jeho cen s průměrem ČR a s `podpalto.cz`.

---

### Stránka 4: `/trendy` – Analytika trhu & Cenové indexy v ČR
- **Graf vývoje cen v čase (Recharts):** Vývoj průměrných cen za posledních 12 měsíců (tvrdé dřevo, měkké dřevo, pelety, brikety, uhlí) – ukázka sezónnosti (jaro/léto vs. topná sezóna podzim/zima).
- **Srovnání 14 krajů ČR:** Sloupcový graf a tabulka porovnávající, kde v ČR je nejlevnější a nejdražší dřevo a pelety.
- **Srovnání ceny za 1 kWh tepla:** Přehledný graf porovnávající náklady na 1 kWh energie z různých paliv (štípaný buk vs. smrk vs. pelety vs. brikety vs. hnědé uhlí).

---

### Stránka 5: `/ci-studio` – Competitive Intelligence Studio (Rozhraní pro CrewAI)
Tato stránka přímo propojuje frontend s prací kolegy v `app/` (`CompetitorAnalysisFlow` a `ResearchCrew`):
- **Spuštění nové AI analýzy konkurenta:**
  - Formulář pro zadání `competitor_url` (přesně odpovídá vstupu `CompetitorAnalysisFlow().kickoff(inputs={"competitor_url": url})`).
  - Vizualizace stavu běhu CrewAI pipeline krok za krokem:
    1. `validate_input` (Validace URL konkurenta)
    2. `run_research` – Agent **`web_researcher`** (*Competitive Intelligence Web Researcher* + `PageTextTool` stahuje a parsuje web)
    3. `run_research` – Agent **`market_analyst`** (*Market Analyst for podpalto.cz* tvoří SWOT a cenové srovnání)
    4. `save_report` (Uložení Markdown reportu)
  - *(Dokud neběží Railway backend, nasimuluj realistický interaktivní průběh s živým logem kroků a následným zobrazením reportu; pokud je nastavené `NEXT_PUBLIC_API_URL`, volej reálný endpoint).*
- **Archiv vygenerovaných reportů (`outputs/`):**
  - Seznam vygenerovaných Markdown reportů konkurentů s vyhledáváním, filtrováním a pěkným zobrazením celé struktury reportu:
    - *Summary*
    - *Offering & Pricing*
    - *Positioning*
    - *SWOT matice (vizuální 2×2 mřížka + Markdown)*
    - *Actionable Recommendations for podpalto.cz*

---

## 6. Požadavky na kvalitu kódu, Mock data a Dokumentaci

1. **Realistická česká data:**
   - Vytvoř v `src/data/` bohatý dataset minimálně **20–25 realistických prodejců tuhých paliv napříč celou ČR** (všechny kraje, reálné české souřadnice GPS, reálné rozmezí cen v Kč, reálné parametry dřeva/pelet/briket/uhlí a 4–5 detailních ukázkových CrewAI SWOT reportů).
2. **Kontrakt pro Railway Backend (`src/types/` a `src/lib/api/`):**
   - Jasně definuj TypeScript typy pro `Seller`, `FuelProduct`, `DeliveryTerms`, `RegionStats` a `CrewAnalysisReport` (odpovídající `CompetitorAnalysisState` z `app/src/podpalto_app/flows/competitor_analysis.py`).
3. **Dokumentace ve složce `frontend/`:**
   - Přepiš `frontend/README.md` tak, aby obsahoval kompletní dokumentaci frontendu:
     - Přehled stránek a funkcí
     - Použité technologie a knihovny
     - Architektura složek v `frontend/src/`
     - Popis REST API kontraktu pro kolegu vyvíjejícího CrewAI část na Railway (jaké endpointy frontend očekává, např. `POST /api/analyze`, `GET /api/reports`, `GET /api/sellers`)
     - Návod na lokální spuštění (`npm install`, `npm run dev`, proměnné prostředí `.env.local`)
4. **Ověření funkčnosti:**
   - Po dokončení kódu subagenty spusť kontrolu typů a produkční build (`npm run build`), oprav případné chyby a ujisti se, že lokální server (`npm run dev`) běží čistě bez chyb.
