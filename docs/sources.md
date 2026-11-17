# Zdroje dat

Jaké zdroje projekt používá, jak k nim přistupuje a jaká data z nich dostává. Stav
k 17. 11. 2026. Zdroj pravdy je registr `tools/src/podpalto_tools/collect/sources.yaml`;
nic, co v něm není, se nestahuje. Pilíře jsou skupiny zdrojů z rešerše (PDF, sekce 2).

Související: [database.md](database.md) (kam data ukládáme),
[architecture.md](architecture.md) (jak sběr běží), [TODO.md](TODO.md) (co chybí).

## Pravidla přístupu (platí pro všechny zdroje)

- Před každým webem se načte `robots.txt`; stahují se jen povolené adresy. Chybějící
  robots.txt (4xx) znamená „vše povoleno“, nedostupný znamená „nic“.
- Mezi požadavky na tentýž web je pauza 1,5 s (nebo delší `Crawl-delay`).
- Odpověď 401, 403, 429 nebo detekce botů ukončí sběr zdroje; nic se neopakuje ani neobchází.
- Stejný zdroj nejdřív za hodinu (`COLLECT_MIN_INTERVAL_S`).
- User-Agent je obecný (`solid-fuel-price-collector/0.1`); pro pravidelný provoz ho lze
  nastavit na identifikovatelný (`COLLECTOR_USER_AGENT`).

## Přehled zdrojů

31 zapnutých zdrojů cen + 2 doplňkové zdroje (ČSÚ, ARES). Sloupec „Záznamů“ = počet
aktuálních cen v databázi; „–“ = zdroj ještě nebyl v této databázi sebrán.

### Pilíř 1: e-shopy a výrobci (balené palivo, palety)

| Id | Prodejce | Přístup | Kraj (sídlo) | IČO | Záznamů |
|---|---|---|---|---|---|
| `drevosrot` | eshop.drevosrot.cz | Heureka feed `/heureka/export/products.xml` | Praha | 27602231 | – |
| `peletynovybor` | peletynovybor.cz | Heureka feed | Liberecký | 09371788 | – |
| `briketymelnik` | briketymelnik.cz | Heureka feed | Praha | 08693676 | – |
| `palivazdemar` | palivazdemar.cz | Heureka feed | Ústecký | 25025589 | – |
| `palivos` | palivos.cz | Heureka feed | Ústecký | 04423046 | 63 |
| `a1pelety` | a1pelety.cz | Shoptet stránky (feed vrací 403) | Zlínský | 25839586 | – |
| `bkpaliva` | bkpaliva.cz | Shoptet stránky (feed 403) | Vysočina | 72124016 | – |
| `valdex` | valdex.cz | Shoptet stránky (feed 403) | Praha | 17842794 | – |
| `woodhell` | woodhell.cz | Shoptet stránky (feed 403) | Ústecký | 07645121 | – |
| `latop` | latop.cz | Shoptet stránky (feed 403), filtr adres paliv | Jihočeský | 45022747 | – |
| `waldera` | waldera.cz | ceník HTML `/brikety`, `/pelety` (ceny „od“) | – | – | 3 |

### Pilíř 2: uhelné sklady

| Id | Prodejce | Přístup | Kde cena platí | IČO | Záznamů |
|---|---|---|---|---|---|
| `stefl` | uhelnesklady-stefl.cz | ceník HTML `/cz/cenik` | Vysočina | 19240538 | 11 |
| `unikom` | prodejuhli.unikom.cz | ceník HTML `/cenik` | Středočeský | 46355821 | 16 |
| `korbicka` | uhlikorbicka.cz | ceník HTML `/cenik-uhli/` | Vysočina | 18533973 | 5 |
| `kb_uhli` | kb-uhli.cz | ceník HTML `/cenik/` | Jihomoravský | 41609638 | 8 |
| `havelka` | havelka.cz | ceník HTML `/` (cenová pásma 0–III) | více krajů | 07772815 | 36 |
| `olvan` | olvannachod.cz | ceník HTML `/paliva/uhelne-sklady` | Královéhradecký | 27464547 | 27 |
| `alvepal` | alvepal.cz | ceník HTML `/cenik/` | Jihočeský | 26057778 | 9 |
| `kvalitniuhli` | kvalitniuhli.cz | ceník HTML `/cenik.html` | Středočeský | – | 9 |
| `znz` | znz.cz | **PDF** ceník, odkaz ze stránky `/paliva-pisky-sterky` | Plzeňský | 49790757 | 4 |
| `ridepal` | ridepal.eu | e-shop HTML `/` (palety s dopravou) | celá ČR | 26847833 | 10 |

### Pilíř 3: hobby markety a stavebniny (balení 8–15 kg, celá ČR)

| Id | Prodejce | Přístup | IČO | Záznamů |
|---|---|---|---|---|
| `baumax` | baumax.cz | kategorie HTML | – | 8 |
| `unihobby` | unihobby.cz | kategorie HTML `/paliva` | 24711594 | 8 |
| `mountfield` | mountfield.cz | kategorie HTML `/brikety-a-pelety` | 25620991 | 7 |
| `dek` | dek.cz | kategorie HTML | – | 3 |
| `bauhaus` | bauhaus.cz | kategorie, **vykreslená v prohlížeči** (JavaScript) | – | 16 |

### Pilíř 4: lesy a prodejci palivového dřeva

| Id | Prodejce | Přístup | Kde cena platí | IČO | Záznamů |
|---|---|---|---|---|---|
| `deblicelesy` | deblicelesy.cz | ceník HTML `/cenik` | Středočeský | 27103803 | 67 |
| `lesy_liberec` | mestske-lesy-liberec.cz | ceník HTML `/cenik-s16CZ` | Liberecký | 72053984 | 11 |
| `drevopraha` | drevopraha.cz | ceník HTML | Praha | – | 13 |
| `palivapolice` | palivapolice.cz | ceník HTML `/palivove-drevo-cenik/` | Královéhradecký | 15047881 | 16 |
| `alsol` | alsol.cz | ceníky jako **obrázky PNG**, čtené OCR | více krajů | 01559109 | 23 |

### Pilíř 5: statistika a ověření

| Zdroj | Přístup | Data |
|---|---|---|
| ČSÚ, Sčítání 2021 | CSV z [otevřených dat](https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data), `podpalto-load-opendata` | obydlené byty podle hlavního zdroje energie k vytápění, po krajích |
| ARES (Ministerstvo financí) | REST `ares.gov.cz/.../ekonomicke-subjekty/{ico}`, `podpalto-verify-sellers` | název firmy, adresa sídla, kraj, zda firma zanikla |

## Jak přistupujeme a co dostáváme

### Heureka XML feed (`heureka_feed`)

**Přístup:** 2 požadavky: robots.txt a soubor `/heureka/export/products.xml`, který
Shoptet obchody generují pro srovnávače. Nová surová kopie se uloží jen při změně.

**Z každé položky `<SHOPITEM>` čteme:**

| Pole feedu | Co z něj je |
|---|---|
| `ITEM_ID` | `item_id` |
| `ITEMGROUP_ID` | `group_id` (varianty jednoho produktu) |
| `PRODUCTNAME` / `PRODUCT` | název; z něj kategorie paliva, jakost, velikost balení |
| `URL` | `source_url` |
| `PRICE_VAT` | cena s DPH |
| `CATEGORYTEXT` | `category_raw`; pomáhá s klasifikací |
| `DELIVERY_DATE` | `delivery_days`, `in_stock` (0 = skladem) |
| `DELIVERY/DELIVERY_PRICE` | nejnižší cena dopravy (často zástupná 0/1 Kč) |
| `PARAM` (`PARAM_NAME`, `VAL`) | hmotnost balení, výhřevnost a další parametry |

Feed neobsahuje kraj ani IČO; ty doplňuje registr. Velikost balení není standardizovaná,
čte se z názvu a parametrů.

### Shoptet produktové stránky (`shoptet_html`)

**Přístup:** robots.txt → sitemap (index a gzip sitemapy, nejvýš 5 dílčích) → veřejné
produktové stránky povolené robots.txt, nejvýš 150 stránek za běh (`max_pages`), pauza
mezi stránkami. U `latop` jen adresy odpovídající `pelet|briket|uhli|drev|koks`.

**Ze stránky (mikrodata schema.org, vykreslená na serveru) čteme:** název (`name`),
kategorii (`category`), `productID`, pro každou variantu (`offers`): `sku`, cenu (`price`),
dostupnost (`availability`), ceny dopravy (`shippingDetails`); tabulku parametrů; názvy
variant (Shoptet `trackingScript`) a hmotnost zásilky (`dataLayer`, záložní velikost balení).

### Ceníky (`static_html`, `rendered_html`, `image_ocr`)

**Přístup:**

| Typ | Jak se získá text | Zdroje |
|---|---|---|
| `static_html` | stránka z `page_paths`; viditelný text, buňky tabulek oddělené ` \| ` | uhelné sklady, lesy, hobby markety, Ridepal, Waldera |
| `static_html` + PDF | na stránce se najde odkaz podle `document_link`, PDF se převede na text (`pypdf`) | `znz` |
| `rendered_html` | stránka se vykreslí v headless Chromiu (Playwright), pak jako výše | `bauhaus` |
| `image_ocr` | na stránce se najdou obrázky podle `document_link`, Tesseract je přečte, tabulky po buňkách a každou dvakrát | `alsol` |

Text jde extrakční crew. Ta vrátí **doslovné citace**: název produktu, rozlišující údaj
(délka, množstevní pásmo, cenové pásmo), text s cenou, jednotku, balení, jakost
a podmínky dopravy. K tomu přidá úsudky: kategorii paliva, k čemu se cena vztahuje
a zda je s DPH. Kód pak ověří, že citace na stránce opravdu jsou, a sám z nich přečte
čísla.

**Z ceníku tak dostáváme:** název a variantu, cenu (s DPH nebo bez), jednotku (q, t, kg,
pytel, paleta, prms, prmr, m³), hmotnost balení, jakost (např. SD Bílina, ENplus A1),
podmínky dopravy a skládání. Kraj, IČO a výchozí DPH doplňuje registr. Dostupnost
skladem ceníky většinou neuvádějí; crew vynechává položky „není skladem“.

### ČSÚ, Sčítání 2021

**Přístup:** jednorázové stažení CSV (12 MB) příkazem `podpalto-load-opendata`, robots.txt
csu.gov.cz se kontroluje.

**Dostáváme:** počet obydlených bytů celkem a podle hlavního zdroje energie k vytápění
(stav k 26. 3. 2021) za ČR a 14 krajů. Používáme skupiny „Uhlí, koks, uhelné brikety“,
„Dřevo, dřevěné brikety“ a „Dřevěné pelety“. CSV obsahuje i okresy a obce, ty zatím
nevyužíváme. Data podává nástroj `heating_demand`. Jde o poptávku, ne o prodeje.

### ARES

**Přístup:** `podpalto-verify-sellers` najde IČO na stránkách prodejce (ceník, úvodní
stránka, `/kontakt/`, `/kontakty/`, `/obchodni-podminky/`; jen povolené robots.txt; kontrola
kontrolní číslice) a pošle ho do ARES.

**Dostáváme:** obchodní jméno, adresu sídla, kraj sídla a informaci, zda firma nezanikla.
Výsledek je v `data/sellers.json`; IČO a kraje se do registru přepisují ručně po kontrole.

## Poznámky ke konkrétním zdrojům

| Zdroj | Co je dobré vědět |
|---|---|
| `havelka` | 4 cenová pásma podle vzdálenosti; každé je samostatná varianta (`group_id` je slučuje). Kraj neuveden. |
| `olvan` | ceny podle odebraného množství (do 15 q, nad 15 q, nad 30 q) a kusový/paletový prodej jako varianty |
| `ridepal` | ceny palet včetně dopravy po ČR; crew bere cenu za kg; příplatek za černé uhlí do Čech podle PSČ nečteme |
| `waldera` | jen ceny „od“ (`price_from`); konečná cena a dostupnost až po zadání PSČ; pelety bez PSČ cenu neukazují |
| `znz` | PDF má stránku dvakrát; adresa PDF se s každým ceníkem mění |
| `lesy_liberec` | ceny bez DPH i s DPH (ukládá se jen s DPH); metrové dříví se do Kč/prms nepřevádí; slevové řádky viz TODO |
| `deblicelesy` | délky 25/33/50 cm, sypané, v bednách, metrové kuláče, klády, pytle štěpin |
| `palivapolice` | ceny podle délky polen; palety bez hmotnosti crew vyřazuje |
| `alsol` | tři střediska (Písečná, Zlechov, Chropyně); nečitelné buňky OCR chybí; záznamy mají `read_by_ocr` |
| `bauhaus` | ceny jako „184,-“ bez „Kč“; obsah se načítá i bez odkliknutí cookies |
| `mountfield` | vedle ceny přeškrtnutá „doporučená cena“; crew bere jen prodejní |
| `dek` | část cen je v HTML rozdělená do více prvků („13 ,79“) a nedá se citovat; takové řádky chybí |
| `kvalitniuhli`, `drevopraha`, `baumax`, `dek`, `waldera`, `bauhaus` | IČO na povolených stránkách není |

## Zdroje, které nepoužíváme

| Zdroj | Proč | Stav |
|---|---|---|
| **Zboží.cz** | headless prohlížeč web odmítá (detekce botů); podmínky užití nedohledány | **k vyřešení**, viz TODO |
| Hornbach | místo stránek i robots.txt vrací ochranu proti botům | neobcházíme |
| Firmy.cz | robots.txt zakazuje stránky tagů jiným robotům než Googlebotu | nepoužitelné |
| Heureka.cz | žádné veřejné API; kategorie zkreslená grilovacím sortimentem (PDF) | nepoužíváme |
| Zboží API / Sklik API Fénix | Zboží API skončilo 16. 3. 2026, Fénix je jen pro vlastní inzerci | nepoužitelné |
| ČSÚ ceny pevných paliv | terénní šetření průměrných cen skončilo v lednu 2026; CEN0101E jsou jen indexy | nahrazeno cenami prodejců |
| e-shopy s feedem 403 | feed blokovaný | čteme jejich veřejné produktové stránky (Shoptet) |
| Bazoš, Sbazar | z druhého návrhu; soukromé inzeráty s osobními údaji | zatím ne |

## Jak zdroje obnovit

```bash
uv run uvicorn podpalto_tools.api:app --port 8001   # služba tools musí běžet
uv run collect                                      # všechny zapnuté zdroje
uv run collect stefl alsol                          # vybrané
uv run podpalto-load-opendata                       # ČSÚ (stačí jednou)
uv run podpalto-verify-sellers                      # IČO a kraje (občas)
```

Nový zdroj = záznam v `sources.yaml`; postup podle typu je v
[tools/README.md](../tools/README.md#nový-zdroj-dat).
