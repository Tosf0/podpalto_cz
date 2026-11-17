# Data a databáze

Co projekt ukládá, v jakém formátu a co znamenají jednotlivé sloupce. Všechna data leží ve
složce `data/` (v `.gitignore`, do repozitáře se nenahrává) a ve složce `outputs/`. Zapisuje
je jen služba `tools`, kromě souhrnů a reportů v `outputs/`, které zapisuje služba `app`.

Stav popsaný níže odpovídá kódu k 17. 11. 2026. Zdroj pravdy je
`tools/src/podpalto_tools/collect/store.py` (tabulky) a `collect/normalize.py`
(`SolidFuelPriceRecord`, tedy sloupce tabulky `records`).

## Přehled souborů

| Cesta | Formát | Obsah | Kdo zapisuje |
|---|---|---|---|
| `data/prices.sqlite` | SQLite | **hlavní databáze**: snímky sběru a normalizované ceny | tools: sběr, extrakce, přepočet |
| `data/raw/<zdroj>/<čas>.xml` | XML | nezměněná kopie Heureka feedu | tools: `heureka_feed` |
| `data/raw/<zdroj>/<čas>.json` | JSON | položky přečtené z produktových stránek Shoptet | tools: `shoptet_html` |
| `data/raw/<zdroj>/pages/<sha256>.json` | JSON | text stažené stránky ceníku (HTML, PDF, OCR) | tools: krok `pages` |
| `data/raw/<zdroj>/<čas>.extraction.json` | JSON | řádky od extrakční crew a výsledky jejich kontroly | tools: krok `extraction` |
| `data/raw/opendata/sldb2021_byty_energie.csv` | CSV | originál dat ČSÚ, Sčítání 2021 | `podpalto-load-opendata` |
| `data/opendata/census2021_heating.json` | JSON | souhrn Sčítání 2021 po krajích | `podpalto-load-opendata` |
| `data/sellers.json` | JSON | výsledek ověření IČO prodejců v ARES | `podpalto-verify-sellers` |
| `data/ocr/tessdata/*.traineddata` | binární | jazyková data Tesseractu (čeština) | ruční instalace |
| `outputs/collection-<čas>.json` | JSON | souhrn jednoho běhu sběru | app: CollectionFlow |
| `outputs/<čas>_<paliva>.md` | Markdown | report pro domácnosti | app: MarketResearchFlow |

`<čas>` je UTC ve tvaru `20261117T120813Z` (u `outputs` místní čas `20261117-130813`).
Starší soubor `data/podpalto.sqlite` z první verze sběru se už nečte.

## SQLite `data/prices.sqlite`

Dvě tabulky. Každý sběr zdroje přidá jeden řádek do `snapshots` a k němu řádky do
`records`. Nic se nepřepisuje, takže historie cen je obyčejný dotaz přes starší snímky.
Agenti a nástroje čtou jen **nejnovější úspěšný snímek každého zapnutého zdroje**.

### Tabulka `snapshots`: jeden pokus o sběr jednoho zdroje

| Sloupec | Typ | Význam |
|---|---|---|
| `id` | INTEGER | primární klíč; vyšší = novější |
| `source_id` | TEXT | id zdroje z registru `sources.yaml` |
| `fetched_at` | TEXT | čas stažení dat (UTC, ISO 8601). U přepočtu (`podpalto-renormalize`) zůstává původní čas stažení |
| `status` | TEXT | `ok`, `error` nebo `blocked_by_robots` |
| `http_status` | INTEGER | HTTP kód odpovědi, pokud je znám |
| `content_sha256` | TEXT | otisk staženého obsahu (u ceníků otisk všech stránek); slouží k poznání „beze změny“ |
| `raw_path` | TEXT | cesta k surové kopii relativně k `data/` (feed, položky, nebo `.extraction.json`) |
| `changed` | INTEGER | 1 = obsah se od minulého úspěšného snímku změnil, 0 = stejný |
| `item_count` | INTEGER | počet přečtených položek (feed, stránky) nebo řádků od crew |
| `offer_count` | INTEGER | počet uložených záznamů v `records` (jen u `ok`) |
| `error` | TEXT | popis chyby nebo odmítnutí (u `error`, `blocked_by_robots`) |

Snímek `error` nebo `blocked_by_robots` nemá záznamy; nástroje dál podávají poslední `ok`.
Selhání extrakční crew se ukládá jako `error` s popisem chyby. Ceník, jehož text se
nezměnil, dostane nový snímek `ok` s `changed = 0` a kopií předchozích záznamů s novým
`scraped_at` (cena potvrzená k novému datu bez volání LLM).

Index: `snapshots_by_source (source_id, id)`.

### Tabulka `records`: jedna cena jednoho prodejce

Sloupce odpovídají kontraktu `SolidFuelPriceRecord` z PDF (sekce 4.3). Navíc má tabulka
`id` (primární klíč) a `snapshot_id` (odkaz na `snapshots.id`). Index:
`records_by_snapshot (snapshot_id, fuel_category)`. Logické hodnoty (`bool`) jsou uložené
jako 0/1, `NULL` znamená „neuvedeno / nelze určit“.

**Identifikace a čas**

| Sloupec | Typ | Význam |
|---|---|---|
| `seller_name` | TEXT | prodejce (doména z registru, např. `uhlikorbicka.cz`) |
| `seller_ico` | TEXT | IČO prodejce z registru (ověřené v ARES), jinak NULL |
| `source_id` | TEXT | id zdroje v registru |
| `source_url` | TEXT | stránka, ze které cena pochází (produkt, ceník, PDF, obrázek) |
| `scraped_at` | TEXT | kdy byla cena přečtena u prodejce (UTC) |
| `item_id` | TEXT | id položky: `ITEM_ID` z feedu, SKU ze Shoptetu, u ceníku `<url>#<pořadí řádku>` |
| `group_id` | TEXT | společné pro varianty jednoho produktu (velikosti, délky, cenová pásma) |

**Klasifikace a jakost**

| Sloupec | Typ | Význam |
|---|---|---|
| `fuel_category` | TEXT | jedna ze 7 kategorií (viz Číselníky) |
| `product_name_raw` | TEXT | název přesně podle zdroje; u ceníků doplněný o rozlišující údaj („Ceník tvrdé dřevo – Délka polene - 25 cm“) |
| `category_raw` | TEXT | kategorie produktu ve feedu/obchodě (u ceníků prázdné) |
| `quality_standard` | TEXT | jakost nebo původ: `ENplus A1`, `Rekord 4"`, `SD Bílina`, nebo citace z ceníku |

**Cena a balení přesně podle zdroje**

| Sloupec | Typ | Význam |
|---|---|---|
| `original_price` | REAL | cena, jak ji prodejce uvádí (Kč) |
| `price_includes_vat` | INTEGER | 1 = cena je s DPH, 0 = bez DPH |
| `original_price_vat` | REAL | cena s 21 % DPH (u cen bez DPH dopočtená) |
| `original_unit` | TEXT | za co je cena: `kg`, `q` (100 kg), `t`, `bag`, `pallet`, `m3`, `prmr`, `prms`; NULL = balení neznámé velikosti |
| `original_quantity` | REAL | kolik `original_unit` cena kupuje (obvykle 1; např. 2 u „2 PRMR“) |
| `package_weight_kg` | REAL | hmotnost pytle/palety v kg, pokud je známá |

**Normalizované údaje** (počítá výhradně kód, nikdy LLM)

| Sloupec | Typ | Význam |
|---|---|---|
| `normalized_price_per_kg_vat` | REAL | Kč za kg s DPH |
| `normalized_price_per_ton_vat` | INTEGER | Kč za tunu s DPH; jen paliva prodávaná na váhu (vše kromě dřeva) |
| `normalized_price_per_prms_vat` | INTEGER | Kč za sypaný prostorový metr s DPH; jen palivové dřevo |
| `calorific_value_mj_kg` | REAL | výhřevnost v MJ/kg použitá pro výpočet Kč/kWh |
| `calorific_source` | TEXT | `seller` (uvádí prodejce) nebo `typical` (tabulka z PDF) |
| `energy_price_per_kwh_vat` | REAL | cena 1 kWh energie v palivu (bez účinnosti kotle) |

**Doprava, oblast, dostupnost**

| Sloupec | Typ | Význam |
|---|---|---|
| `delivery_included` | INTEGER | 1 = doprava v ceně, 0 = není, NULL = neuvedeno |
| `delivery_fee_czk` | REAL | nejnižší cena dopravy (feed, Shoptet); ve feedech často zástupná 0/1 Kč |
| `delivery_fee_note` | TEXT | podmínky dopravy citované z ceníku |
| `price_total_delivered_vat` | REAL | cena včetně dopravy, jen když je doprava v ceně nebo je znám skutečný poplatek |
| `target_psc_region` | TEXT | kde cena platí: kraj, `CZ` = celostátně, NULL = neznámo |
| `seller_region` | TEXT | kraj, kde prodejce sídlí / má sklad |
| `delivery_days` | INTEGER | dodací lhůta ve dnech (feed), 0 = skladem |
| `in_stock` | INTEGER | 1 = skladem, 0 = není, NULL = neuvedeno |

**Kontrola kvality**

| Sloupec | Typ | Význam |
|---|---|---|
| `flags` | TEXT | JSON seznam příznaků, např. `["vat_assumed_from_registry", "read_by_ocr"]` (viz níže) |

### Příznaky (`flags`)

| Příznak | Kdo ho dává | Co znamená | Dopad |
|---|---|---|---|
| `package_size_unknown` | normalizace | velikost balení nejde určit | bez jednotkové ceny, mimo srovnání |
| `package_size_from_shipping_weight` | normalizace | velikost balení vzata z hmotnosti zásilky (Shoptet) | jen informace |
| `unit_price_implausible` | normalizace | jednotková cena mimo 2 000–40 000 Kč/t nebo 300–6 000 Kč/prms | jednotková cena zahozena |
| `unit_not_by_weight` | normalizace | palivo na váhu má cenu v objemové jednotce | bez jednotkové ceny |
| `vat_added` | normalizace | cena byla bez DPH, 21 % přičteno | jen informace |
| `volume_converted_prmr_to_prms` | normalizace | rovnaný metr převeden ×1,6 na sypaný | jen informace |
| `volume_converted_m3_to_prms` | normalizace | plnometr převeden ×2,22 na sypaný | jen informace |
| `volume_stacking_unknown` | normalizace | „m³“ bez upřesnění (sypané/rovnané) | bez Kč/prms, mimo srovnání |
| `long_wood_not_comparable` | normalizace | metrové dříví nebo klády | bez Kč/prms, mimo srovnání |
| `mass_estimated_from_volume` | normalizace | hmotnost dřeva odhadnuta (tvrdé 337, měkké 227 kg/prms) | Kč/kg a Kč/kWh jsou odhad |
| `wood_species_unknown` | normalizace | dřevina neuvedena nebo směs, bříza | bez Kč/kg a Kč/kWh |
| `fresh_wood_no_energy_value` | normalizace | čerstvé/syrové dřevo | bez Kč/kWh |
| `unit_judged_by_extractor` | kontrola ceníku | jednotku určila crew, v citaci není | jen informace |
| `vat_assumed_from_registry` | kontrola ceníku | ceník DPH neuvádí, použit výchozí stav z registru | jen informace |
| `price_from` | kontrola ceníku | cena „od“ (nejlevnější varianta nebo oblast) | jen informace |
| `read_by_ocr` | sběr | cena přečtena z obrázku pomocí OCR | jen informace |
| `outlier_vs_market` | sběr | pod polovinou / nad dvojnásobkem mediánu ostatních prodejců (aspoň 3) | `price_comparison` ji nepočítá do min/průměr/max |

### Číselníky

| Hodnota `fuel_category` | Česky (PDF) |
|---|---|
| `brown_coal` | hnědé uhlí |
| `black_coal` | černé uhlí |
| `coke` | koks |
| `coal_briquettes` | uhelné brikety (Rekord) |
| `wood_pellets` | dřevěné pelety |
| `wood_briquettes` | dřevěné brikety (i rašelinové) |
| `firewood` | palivové dřevo |

Kraje (`target_psc_region`, `seller_region`) mají úřední názvy, např. `Kraj Vysočina`,
`Hlavní město Praha`, `Středočeský kraj`; celá republika je `CZ`.

Typické výhřevnosti (`calorific_source = typical`, MJ/kg): pelety 16,9; dřevěné brikety
17,9; hnědé uhlí 18,0; uhelné brikety 19,45; černé uhlí 26,55; koks 31,75; suché dřevo 14,1.

### Příklad záznamu

```json
{
  "seller_name": "uhlikorbicka.cz", "seller_ico": "18533973", "source_id": "korbicka",
  "source_url": "https://www.uhlikorbicka.cz/cenik-uhli/", "scraped_at": "2026-11-17T12:44:24+00:00",
  "item_id": "https://www.uhlikorbicka.cz/cenik-uhli/#0",
  "group_id": "https://www.uhlikorbicka.cz/cenik-uhli/#113 kostka a",
  "fuel_category": "brown_coal", "product_name_raw": "113 kostka A", "quality_standard": "SD Bílina",
  "original_price": 677.6, "price_includes_vat": 1, "original_price_vat": 677.6,
  "original_unit": "q", "original_quantity": 1.0, "package_weight_kg": null,
  "normalized_price_per_kg_vat": 6.78, "normalized_price_per_ton_vat": 6776,
  "calorific_value_mj_kg": 18.0, "calorific_source": "typical", "energy_price_per_kwh_vat": 1.36,
  "target_psc_region": "Kraj Vysočina", "seller_region": "Kraj Vysočina", "flags": "[]"
}
```

### Užitečné dotazy

```sql
-- aktuální ceny (nejnovější úspěšný snímek každého zdroje)
SELECT r.* FROM records r
WHERE r.snapshot_id IN (SELECT MAX(id) FROM snapshots WHERE status = 'ok' GROUP BY source_id);

-- vývoj ceny jednoho produktu v čase
SELECT r.scraped_at, r.original_price_vat, r.normalized_price_per_ton_vat
FROM records r WHERE r.source_id = 'korbicka' AND r.product_name_raw = '113 kostka A'
ORDER BY r.scraped_at;

-- poslední pokus u každého zdroje (i neúspěšný)
SELECT s.* FROM snapshots s
WHERE s.id IN (SELECT MAX(id) FROM snapshots GROUP BY source_id);
```

## Surové kopie (`data/raw/`)

Ukládají se kvůli dohledatelnosti: z čeho přesně cena vznikla.

- **Feed** (`<čas>.xml`): soubor tak, jak ho poslal obchod. Nová kopie jen při změně obsahu.
- **Shoptet** (`<čas>.json`): seznam položek přečtených z produktových stránek: `item_id`,
  `name`, `url`, `price_vat_czk`, `group_id`, `category`, `delivery_days`, `in_stock`,
  `delivery_fee_czk`, `params` (tabulka parametrů), `shipping_weight_kg`.
- **Stránka ceníku** (`pages/<sha256>.json`): `page_id` (otisk textu), `url`, `text`
  (viditelný text; buňky tabulek oddělené ` | `), `truncated` (text zkrácen na 40 000 znaků),
  `read_by` (`text` nebo `ocr`).
- **Extrakce** (`<čas>.extraction.json`):
  - `extractions`: pro každou stránku `page_id` a výstup crew `{price_list_found, rows, notes}`.
    Řádek má `product_name`, `variant_text`, `price_text`, `unit_text`, `package_text`,
    `original_unit`, `fuel_category`, `price_includes_vat`, `quality_standard`,
    `delivery_note`, `qa_status`, `qa_note`. Textová pole jsou doslovné citace.
  - `verdicts`: pro každý přijatý řádek `index`, `product_name`, `accepted`, `reasons`.

## Ostatní soubory

**`data/opendata/census2021_heating.json`**

```json
{"source": "https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data",
 "census_date": "2021-03-26", "downloaded_at": "...",
 "regions": {"CZ": {"total": 4480139, "coal_coke_briquettes": 240623,
                    "wood_and_wood_briquettes": 357583, "wood_pellets": 23953}, "Kraj Vysočina": {...}}}
```

Počty obydlených bytů podle hlavního zdroje energie k vytápění za ČR a 14 krajů.

**`data/sellers.json`**: seznam výsledků ověření prodejce: `source_id`, `seller`,
`registry_ico`, `registry_region`, `found_icos`, `found_on` (stránka s IČO), `ico`,
`ares_name`, `ares_address`, `ares_region`, `active`, `region_matches`, `status`
(`verified`, `ico_not_found`, `not_in_ares`, `ceased`, `error`), `detail`. Nové běhy
doplňují a přepisují jen zkontrolované zdroje. Registr se podle souboru mění ručně.

**`outputs/collection-<čas>.json`**: jeden řádek na zdroj: `source_id`, `kind`, `route`
(`structured`, `extraction`, `none`), `status`, `detail`, `records`, `rejected_rows`.

## Co v databázi teď je (17. 11. 2026)

- 373 aktuálních záznamů z 22 zdrojů (ve všech snímcích 943 záznamů, 54 snímků).
- Kategorie: palivové dřevo 158, hnědé uhlí 70, dřevěné brikety 58, uhelné brikety 35,
  pelety 30, černé uhlí 12, koks 10.
- Z e-shopů je zatím sebraný jen feed `palivos`; zbylých 9 e-shopů (feedy a Shoptet)
  se při dalším `uv run collect` doplní.
- Nejčastější příznaky: `vat_assumed_from_registry` 147, `mass_estimated_from_volume` 93,
  `unit_judged_by_extractor` 77, `read_by_ocr` 23, `volume_stacking_unknown` 19.
