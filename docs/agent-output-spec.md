# Výstup scraping agentů pro aplikaci podpalto.cz

Co musí obsahovat data, která agenti (služba `tools` a crew v `app`) předávají aplikaci, aby se
z nich dala bez ruční práce naplnit produkční databáze (Supabase, projekt **Podpalto**) a
všechny obrazovky webu: mapa cen, detail prodejce, kalkulačka, srovnání, trendy a CI Studio.

Dokument navazuje na `docs/database.md` (dnešní `prices.sqlite`) a na bod „Sjednotit API mezi
frontendem a backendem“ v `docs/TODO.md`. Cílové schéma databáze je ve
`frontend/supabase/migrations/` a typy v `frontend/src/types/index.ts`.

Stav k 18. 11. 2026. Vychází z rozboru výstupu ze 17. 11. 2026 (943 záznamů, 22 zdrojů, 54 snímků).

---

## 1. Shrnutí: co dnes máme a co chybí

Dnešní `prices.sqlite` je **dobrý cenový feed**: cena, DPH, jednotka, přepočty na kg / t / prms /
kWh, odkaz na zdroj, čas a příznaky kvality. Aplikace ale potřebuje i **prodejce jako místo na
mapě** a **parametry produktů pro filtry**. To dnes chybí úplně nebo jen ve volném textu.

| Oblast | Dnes | Potřeba | Priorita |
|---|---|---|---|
| Poloha prodejce (WGS84) | chybí | přesná `lat`/`lng` každé provozovny | **P0 – bez toho není mapa** |
| Adresa provozovny | jen kraj (65 %), sídlo z ARES u 5 prodejců | ulice, č. p., obec, PSČ, kraj, kód adresního místa RÚIAN | P0 |
| Podmínky dopravy | volný text (19 %), poplatek u 7 % | strukturovaně: paušál, Kč/km, zdarma do X km, dojezd, hydraulická ruka, osobní odběr | P0 |
| Kontakty | chybí | web, telefon, e-mail | P1 |
| IČO | 49 % záznamů | 100 % prodejců (ověřené v ARES) | P1 |
| Druh dřeva, tvrdé/měkké | jen v názvu, 79× `wood_species_unknown` | číselník (sekce 6.2) | P1 |
| Zpracování dřeva, vlhkost, délka polen | jen v názvu / textu | číselníky a čísla | P1 |
| Certifikace, typ briket, typ uhlí | volný text (`A1`, `Premium A1`, `Rekord 2"`) | číselníky | P1 |
| Skladem, minimální odběr | 0 % | `stock`, `min_order` | P2 |
| Hodnocení prodejce | chybí | externí hodnocení + počet recenzí + zdroj | P2 |
| Popis, otevírací doba, rok založení, velikost | chybí | viz sekce 5 | P2 |
| Řetězce (Bauhaus, Baumax, Mountfield, DEK, Unihobby) | jeden „prodejce“ = doména | **každá pobočka zvlášť** s vlastní adresou a polohou | P1 |

Co dnešní výstup má **navíc** a chceme si to nechat: přepočtené ceny (kontrola našich výpočtů),
výhřevnost a její zdroj, cenu za kWh, `flags`, otisk obsahu a příznak změny u snímku, ověření
v ARES, data ze Sčítání 2021. Data pro OCR a surové stránky do aplikace nepatří (zůstávají v `data/`).

---

## 2. Obecná pravidla

1. **Nic si nevymýšlet.** Co agent nezjistí, je `null` a k záznamu patří příznak (sekce 9).
   Odhad je povolený jen tam, kde to dokument výslovně uvádí, a vždy s příznakem.
2. **Důkaz u každého vytaženého údaje.** U textových údajů ze stránek (doprava, vlhkost,
   druh dřeva, adresa provozovny) poslat `evidence`: krátkou citaci a URL, odkud je.
3. **Kódování a formáty:** UTF-8, čas ISO 8601 v UTC (`2026-11-17T12:00:56Z`), čísla jako čísla
   (ne `"1 290 Kč"`), desetinná tečka, ceny v Kč **včetně DPH** za jednu jednotku.
4. **Stabilní identifikátory.** Stejná provozovna a stejný produkt musí mít v každém běhu stejný
   klíč (sekce 4), jinak se historie cen rozpadne.
5. **Číselníky přesně podle tohoto dokumentu** (hodnoty = enumy v databázi). Hodnota mimo
   číselník se neposílá do pole; patří do `*_raw` a k ní příznak.
6. **Robots.txt a podmínky webu platí dál** (jako dnes). Co nesmíme stáhnout, nestahujeme
   ani pro polohu, kontakty nebo recenze.

---

## 3. Architektura: kteří agenti co dělají

Jeden agent nemusí umět všechno. Výstup se skládá z kroků, každý vyplní svou část a zbytek
nechá `null`. Pořadí:

| # | Agent / krok | Vstup | Výstup (sekce) |
|---|---|---|---|
| 1 | **Sběr ceníků** (dnešní `collection`) | registr zdrojů | surové ceny, snímky (7, 8) |
| 2 | **Normalizace produktů** | názvy, varianty, popisy | parametry produktu podle číselníků (6) |
| 3 | **Profil prodejce** | web prodejce (kontakt, o nás, doprava, provozovny) | provozovny, adresy, kontakty, doprava, otevírací doba (5) |
| 4 | **Registr (ARES)** | IČO z webu | ověřené IČO, název, sídlo, kód adresního místa, rok vzniku (5.2) |
| 5 | **Geolokace** – *dedikovaný agent* | adresa provozovny / kód adresního místa | přesná `lat`/`lng` + přesnost a zdroj (5.3) |
| 6 | **Hodnocení** (volitelné) | povolené zdroje recenzí | externí hodnocení (5.6) |
| 7 | **QA** | vše výše | příznaky, odmítnuté záznamy, kontrola odlehlých cen (9) |
| 8 | **Export** | vše výše | jeden soubor na běh nebo zápis do Supabase (10) |

Kroky 3–6 se nemusí spouštět při každém sběru cen. Stačí při přidání zdroje a pak třeba jednou
týdně, nebo když se změní stránka „kontakt“ či „doprava“ (otisk obsahu jako u snímků).

---

## 4. Identita: klíče a vazby

| Entita | Klíč | Pravidlo |
|---|---|---|
| Firma | `company_ico` | 8 číslic, platný kontrolní součet (mod 11), ověřené v ARES |
| Provozovna (= bod na mapě) | `seller_key` | umělý klíč = `id` zdroje ze `sources.yaml` (např. `palivo_ricany`); řetězec s více provozovnami `<id zdroje>-<slug pobočky>`; čte-li prodejce víc zdrojů, mají v registru společný `seller_key` (= `id` prvního z nich) |
| Produkt | `product_key` | `<seller_key>:<item_id>`; `item_id` jako dnes (ITEM_ID z feedu, SKU, u ceníku stabilní slug řádku, **ne pořadí řádku**) |
| Cena | `(product_key, observed_at)` | každé zjištění ceny = nový záznam; potvrzení beze změny se posílá taky (s novým časem) |

**Klíč prodejce se nikdy nemění** (rozhodnuto 18. 11. 2026). Neskládá se z údajů o prodejci,
protože ty se dozvídáme postupně nebo se mění (IČO se dohledá v ARES, kód RÚIAN až
geolokací, prodejce opraví adresu nebo se přestěhuje). Kdyby byly součástí klíče, upsert by
po každé takové změně založil nového prodejce a historie cen by se rozpadla. IČO, adresa,
RÚIAN a poloha jsou jen údaje prodejce a při exportu se u stejného klíče přepíšou. Proto se
`id` zdroje po prvním exportu **nepřejmenovává**.

Pozor u ceníků: dnešní `<url>#<pořadí řádku>` se rozbije, když prodejce přidá řádek. Lepší je
slug ze jména + varianty, např. `bukove-stipane-33cm-sypane`.

**Řetězce a více skladů:** jedna firma (IČO) může mít více provozoven. Každá provozovna je
samostatný záznam `seller` se stejným `company_ico`, vlastní adresou, polohou a dopravou. Pokud
má řetězec jednotný ceník, produkty se zopakují u každé provozovny (stejný `item_id`, jiný
`seller_key`). Pokud cena platí jen v některých provozovnách nebo krajích, uvést to u ceny
(`valid_in_regions`, sekce 7).

---

## 5. Prodejce / provozovna (`seller`)

Odpovídá tabulce `sellers` (a typu `Seller` ve frontendu). **Tučně = povinné.**

### 5.1 Základní údaje

| Pole | Typ | Popis / pravidlo |
|---|---|---|
| **`seller_key`** | text | viz sekce 4 |
| **`source_id`** | text | id zdroje z registru |
| **`name`** | text | obchodní název, jak ho zná zákazník („Palivo Říčany“), ne doména |
| `branch_name` | text | název pobočky u řetězců („Bauhaus Praha-Čestlice“) |
| `company_ico` | text | 8 číslic |
| `legal_name` | text | název z ARES („Palivo Říčany s.r.o.“) |
| `dic` | text | `CZ` + číslice; plátce DPH ověřit v registru plátců DPH (rozhoduje o `vat_status`) |
| **`website`** | URL | hlavní web (`https://…`), bez sledovacích parametrů |
| `phone` | text | formát E.164: `+420603214880` |
| `email` | text | obecný kontakt (info@, objednavky@), ne osobní e-maily zaměstnanců |
| `description` | text | 1–3 věty česky, věcně, max. 300 znaků, shrnutí z webu (ne kopie reklamních hesel) |
| `photo_url` | URL | jen pokud to podmínky webu dovolují; jinak `null` |
| `founded_year` | int | z ARES (`datumVzniku`) |
| `size` | `small` \| `medium` \| `large` | podle počtu zaměstnanců z RES / ARES: do 9 / 10–49 / 50+; neznámo = `null` |
| `opening_hours` | objekt | `{"mon": [["07:00","16:00"]], "sat": [["08:00","12:00"]], "sun": []}`; neznámo = `null` |
| `tags` | pole | odvozené štítky, viz 5.5 |

### 5.2 Registr (ARES)

| Pole | Popis |
|---|---|
| `registry.status` | `verified` \| `ico_not_found` \| `ico_mismatch` \| `inactive` (jako dnes v `sellers.json`) |
| `registry.ico_found_on` | URL, kde bylo IČO nalezeno |
| `registry.name`, `registry.address` | název a sídlo z ARES |
| `registry.ruian_address_code` | `kodAdresnihoMista` sídla z ARES |
| `registry.active` | firma nezanikla |
| `registry.checked_at` | čas ověření |

Sídlo firmy **není** automaticky provozovna. Sklad, ze kterého se prodává a vozí, bývá jinde
(často je uvedený na stránce „Kontakt“, „Provozovna“, „Sklad“, „Kde nás najdete“). Sídlo
použít jako polohu jen tehdy, když web žádnou provozovnu neuvádí, a přidat příznak
`location_is_registered_office`.

### 5.3 Adresa a poloha: dedikovaný geolokační agent

Mapa potřebuje **přesný bod**. Nechceme řešit formát adresy ani to, jestli ji pochopí
OpenStreetMap, takže polohu dodává samostatný agent a vrací hotové souřadnice.

**Postup geolokačního agenta (v tomto pořadí):**

1. **Kód adresního místa RÚIAN** – nejpřesnější a jednoznačný.
   - Pro sídlo ho vrací ARES (`kodAdresnihoMista`).
   - Pro provozovnu z webu: vyhledat adresu v RÚIAN (ČÚZK, Vyhledávací služba nad daty RÚIAN /
     výdejní služby RÚIAN) a vzít kód adresního místa.
   - Z kódu adresního místa vzít souřadnice (RÚIAN je v S-JTSK, EPSG:5514 → převést na
     WGS84, EPSG:4326).
2. **Geokódování adresy**, když kód RÚIAN nejde dohledat (např. sklad bez čísla popisného,
   „areál bývalého JZD“): Mapy.com (Seznam) Geocoding API; až jako poslední možnost
   OSM Nominatim (dodržet limit 1 požadavek/s a jejich podmínky).
3. **Ručně z mapy na webu prodejce:** když web obsahuje vloženou mapu (Google / Mapy.cz)
   se souřadnicemi, lze je převzít (příznak `location_from_seller_map`).
4. **Nic z toho nejde:** `lat`/`lng` = `null`, příznak `location_unknown`. Takovou
   provozovnu na mapě nezobrazíme a dáme ji do fronty k ruční kontrole. **Střed obce ani kraje
   jako náhradu neposílat** – vzdálenost a doprava by byly špatně.

**Jak to dělá kód (18. 11. 2026):** místo agenta je to deterministický kód
`tools/src/podpalto_tools/collect/locate.py`, který spouští člověk příkazem
`uv run podpalto-locate-sellers`. Výsledek se zapíše do
`tools/src/podpalto_tools/collect/seller_locations.json` a commituje se, takže každá změna
polohy je vidět v diffu a export nepotřebuje síť.

1. `location.ruian` v `sources.yaml`: kód adresního místa skladu nebo prodejny. Vyhledá se
   na <https://vdp.cuzk.cz> nebo příkazem `podpalto-locate-sellers --find <PSČ> <č. p.> <obec>`.
2. `location` se souřadnicemi v `sources.yaml` (`lat`, `lng`, `city`, `zip`, přesnost
   `building` nebo `street`): sklad bez adresního místa. Střed obce se nepřijímá. Sklad
   uvedený jen ulicí („Nádražní ulice, areál pily“): střed ulice z RÚIAN příkazem
   `podpalto-locate-sellers --street <ulice> <obec>`, přesnost `street`. Souřadnice z mapy
   vložené na webu prodejce: `from_seller_map: true` → zdroj `seller_map` a příznak
   `location_from_seller_map`.
3. Sídlo firmy z ARES (`kodAdresnihoMista`) s příznakem `location_is_registered_office`.
   Sídlo často je sklad, ale ne vždy (sídlo v Praze, sklad ve Vimperku). Když sklad je
   v sídle, potvrdí se to zkopírováním kódu do `location.ruian` a příznak zmizí.
4. Nic z toho: `location_unknown`.

Souřadnice a textová adresa se berou z vrstvy AdresniMisto prohlížecí služby RÚIAN (ČÚZK,
ArcGIS REST, rovnou ve WGS84) a kraj z vrstvy krajů podle bodu. **Textový geokodér ČÚZK se
nepoužívá:** na „Ústrašín 65“ vrátil se skóre 100 adresu ve Stráži nad Ohří. Geokodéry
Mapy.com a Nominatim (bod 2 výše) zatím nejsou napojené.

**Kontroly výsledku:**

- bod leží v ČR (hrubě 48,55–51,06 s. š. a 12,09–18,86 v. d., přesně: uvnitř hranice ČR),
- kraj podle bodu = kraj z adresy (jinak příznak `location_region_mismatch`),
- když jsou k dispozici dva zdroje (RÚIAN a geokodér), jejich vzdálenost má být do 200 m
  (jinak `location_sources_disagree` a přednost má RÚIAN).

| Pole | Typ | Popis |
|---|---|---|
| **`address.street`** | text | ulice a číslo („Pražská 412“); u obcí bez ulic obec nebo její část a číslo („Ústrašín 65“) |
| **`address.city`** | text | obec nebo část obce, jak ji uvádí pošta |
| **`address.zip`** | text | `"251 01"` (5 číslic s mezerou) |
| `address.district` | text | okres |
| **`address.region`** | kód kraje | číselník v sekci 11 (`STC`, `PHA`, …) |
| `address.ruian_address_code` | int | kód adresního místa RÚIAN |
| **`location.lat`** | number | WGS84, alespoň 6 desetinných míst |
| **`location.lng`** | number | WGS84, alespoň 6 desetinných míst |
| **`location.source`** | text | `ruian` \| `geocoder_mapy` \| `geocoder_nominatim` \| `seller_map` \| `manual` |
| **`location.precision`** | text | `address_point` \| `building` \| `street` \| `municipality` (poslední jen s příznakem a nezobrazuje se) |
| `location.checked_at` | čas | kdy byla poloha ověřena |

### 5.4 Doprava (strukturovaně)

Odpovídá `DeliveryTerms` ve frontendu. Z toho se na mapě počítá **cena včetně dopravy** pro
adresu zákazníka, proto to musí být čísla, ne věty.

| Pole | Typ | Popis |
|---|---|---|
| **`delivery.own_delivery`** | bool | prodejce vozí vlastní dopravou |
| **`delivery.pickup_available`** | bool | osobní odběr na provozovně |
| `delivery.hydraulic_arm` | bool | složení hydraulickou rukou |
| `delivery.hydraulic_arm_fee` | Kč | příplatek za ruku |
| `delivery.base_fee` | Kč | paušál za dopravu |
| `delivery.price_per_km` | Kč | za km (jedna cesta), účtuje se nad `free_radius_km` |
| `delivery.free_radius_km` | km | do této vzdálenosti zdarma (0 = nikdy) |
| `delivery.free_over_quantity` | číslo | zdarma od tohoto množství (v jednotce produktu) |
| `delivery.free_over_quantity_unit` | jednotka | k čemu se množství vztahuje (`PRMS`, `t`, `paleta`…) |
| `delivery.max_radius_km` | km | maximální dojezd |
| `delivery.zones` | pole | když se platí po pásmech: `[{"from_km":0,"to_km":10,"fee":0},{"from_km":10,"to_km":30,"fee":590}]` (Havelka „pásma 0–III“ převést na km nebo obce) |
| `delivery.notes` | text | původní text podmínek (krátce), pro zobrazení |
| **`delivery.evidence`** | objekt | `{"quote": "...", "url": "..."}` |

Když se doprava liší podle druhu zboží (uhlí sklápěčem vs. palety vozíkem), poslat pravidla
u produktu (`product.delivery_override`) se stejnými poli.

### 5.5 Štítky (`tags`)

Odvozuje se **kódem** z vyplněných polí, ne LLM:

| Štítek | Kdy |
|---|---|
| `skladem` | aspoň jeden aktivní produkt má `stock = in_stock` |
| `hydraulicka-ruka` | `delivery.hydraulic_arm = true` |
| `enplus-a1` | prodává pelety s `certification = ENplus A1` |
| `suche-18` | prodává dřevo s `moisture_percent ≤ 18` |
| `vlastni-doprava` | `delivery.own_delivery = true` |
| `osobni-odber` | `delivery.pickup_available = true` |
| `platba-kartou` | web uvádí platbu kartou (s citací) |
| `doprava-zdarma` | `free_radius_km > 0` nebo `free_over_quantity` vyplněné |
| `fsc-pefc` | web uvádí certifikát FSC/PEFC (s číslem certifikátu) |
| `expres-48h` | web garantuje dodání do 48 h |

### 5.6 Hodnocení (volitelné)

| Pole | Popis |
|---|---|
| `rating.value` | 0–5, jedno desetinné místo |
| `rating.count` | počet recenzí |
| `rating.source` | `google` \| `firmy` \| `heureka` \| `web` |
| `rating.url`, `rating.fetched_at` | odkaz a čas |

Jen ze zdrojů, které to podmínky a robots.txt dovolují (Firmy.cz dnes ne). Texty recenzí
nestahujeme, jen hodnotu a počet. Recenze uživatelů podpalto.cz se sbírají v aplikaci.

---

## 6. Produkt (`product`)

Odpovídá tabulce `products` (typ `FuelProduct`). Jeden řádek = jedna prodejná varianta
(délka polena, balení, paleta…).

### 6.1 Společná pole

| Pole | Typ | Popis |
|---|---|---|
| **`product_key`**, **`item_id`**, `group_id` | text | viz sekce 4 |
| **`name`** | text | čitelný název („Bukové štípané dřevo 33 cm, suché (sypané)“), ne celý titulek e-shopu |
| `name_raw` | text | název přesně podle zdroje (jako dnes `product_name_raw`) |
| **`category`** | číselník | `wood` \| `pellets` \| `briquettes` \| `coal` (převod z dnešních 7 kategorií v 6.6) |
| **`unit`** | číselník | `PRMS` \| `PRM` \| `PLM` \| `t` \| `paleta` \| `pytel` (převod v 6.7) |
| `package_kg` | number | hmotnost pytle / palety; **povinné** pro `pytel` a `paleta` u pelet, briket a uhlí |
| `package_prm` | number | objem palety / klece v PRM; **povinné** pro dřevo prodávané po `paleta` |
| `min_order` | number | minimální odběr v `unit` |
| `stock` | číselník | `in_stock` \| `low` \| `out_of_stock` \| `preorder`; neznámo = `null` |
| `delivery_days` | int | dodací lhůta |
| **`source_url`** | URL | stránka produktu / ceníku |
| `declared_mj_per_kg` | number | výhřevnost, **jen pokud ji uvádí prodejce** (jinak `null`, tabulkovou dopočítáme) |
| `active` | bool | `false`, když produkt ze zdroje zmizel (místo mazání) |

### 6.2 Palivové dřevo (`category = wood`)

| Pole | Hodnoty | Pravidlo |
|---|---|---|
| **`wood_species`** | pole z: `buk`, `dub`, `habr`, `jasan`, `briza`, `smrk`, `borovice`, `modrin`, `mix-tvrde`, `mix-mekke` | „tvrdé“ bez upřesnění = `mix-tvrde`; „měkké / jehličnaté“ = `mix-mekke`; olše, topol, osika, lípa → `mix-mekke` + `wood_species_raw` |
| **`wood_group`** | `hard` \| `soft` \| `birch` | buk, dub, habr, jasan, mix-tvrde = `hard`; smrk, borovice, modřín, mix-mekke = `soft`; bříza = `birch` |
| **`wood_form`** | `sypane` \| `rovnane` \| `metrovky` \| `paleta` | prms = sypané, prmr = rovnané, 1 m kulatina/polena = metrovky, klec / paleta / PackFix = paleta |
| `moisture` | `dry` \| `semi` \| `fresh` | `dry` < 20 %, `semi` 20–35 %, `fresh` > 35 %; „suché“ bez čísla = `dry` + příznak `moisture_class_from_text` |
| `moisture_percent` | number | deklarovaná vlhkost, jen když ji prodejce uvádí |
| `log_length_cm` | number | **přesná délka** z nabídky (25, 30, 33, 35, 40, 50, 100…). Aplikace ji zaokrouhlí na 25 / 33 / 40 / 50 / 100 |
| `seasoning` | text | volitelně: „sušené 2 roky pod střechou“, „sušárna“ |

### 6.3 Pelety (`category = pellets`)

| Pole | Hodnoty |
|---|---|
| **`certification`** | `ENplus A1` \| `ENplus A2` \| `DINplus` \| `bez certifikace` |
| `certificate_id` | číslo certifikátu (`CZ 123` u ENplus), pokud je uvedené |
| `diameter_mm` | 6 nebo 8 |
| `wood_species_raw` | „smrk“, „buk“, „směs“, pokud je uvedeno |

`ENplus A1` posílat **jen když** text uvádí ENplus (nebo číslo certifikátu). Samotné „A1“,
„Premium A1“, „kvalita A1“ = `bez certifikace` + `quality_raw: "Premium A1"` + příznak
`certification_unverified`.

### 6.4 Brikety (`category = briquettes`)

| Pole | Hodnoty |
|---|---|
| **`briquette_type`** | `RUF` \| `PINI KAY` \| `válcové` \| `hnědouhelné` |
| `briquette_material` | `wood` \| `coal` (dřevěné vs. uhelné, pro výhřevnost) |
| `quality_raw` | např. `Rekord 4"`, `Německé brikety` |

`Rekord`, `REKORD 2"/4"/7"`, uhelné brikety = `hnědouhelné`. Hranol = `RUF`. S otvorem = `PINI KAY`.

### 6.5 Uhlí a koks (`category = coal`)

| Pole | Hodnoty |
|---|---|
| **`coal_type`** | `hnědé ořech 1` \| `hnědé ořech 2` \| `hnědé kostka` \| `černé ořech` \| `černé kostka` \| `koks` |
| `coal_origin` | těžební společnost / lom: `SD Bílina`, `Vršanská uhelná`, `Sokolovská uhelná`, polské… |
| `grain_mm` | zrnitost, pokud je uvedená („20–40 mm“) |
| `quality_raw` | původní označení |

Dnešní `quality_standard = "SD Bílina"` je **původ**, ne jakost – patří do `coal_origin`.

### 6.6 Převod kategorií z dnešního výstupu

| Dnes `fuel_category` | → `category` | doplnit |
|---|---|---|
| `firewood` | `wood` | 6.2 |
| `wood_pellets` | `pellets` | 6.3 |
| `wood_briquettes` | `briquettes` | `briquette_material = wood` |
| `coal_briquettes` | `briquettes` | `briquette_type = hnědouhelné`, `briquette_material = coal` |
| `brown_coal` | `coal` | `coal_type` hnědé… |
| `black_coal` | `coal` | `coal_type` černé… |
| `coke` | `coal` | `coal_type = koks` |

### 6.7 Převod jednotek z dnešního výstupu

| Dnes `original_unit` | → `unit` | cena |
|---|---|---|
| `prms` | `PRMS` | beze změny |
| `prmr` | `PRM` | beze změny |
| `t` | `t` | beze změny |
| `q` (100 kg) | `t` | × 10 |
| `kg` (volně) | `t` | × 1000 |
| `bag` | `pytel` | beze změny, **`package_kg` povinné** |
| `pallet` | `paleta` | beze změny, `package_kg` (paliva na váhu) nebo `package_prm` (dřevo) povinné |
| `m3` | podle textu: sypaný → `PRMS`, rovnaný → `PRM`, plnometr → `PLM`, klec / kontejner → `paleta` + `package_prm` | když nejde určit: neposílat do aplikace, příznak `volume_stacking_unknown` (jako dnes) |
| `null` | – | neposílat do aplikace, příznak `package_size_unknown` |

Původní hodnoty (`original_price`, `original_unit`, `original_quantity`) posílat dál v
cenovém záznamu, ať jde převod zpětně zkontrolovat.

---

## 7. Cena (`price_observation`)

Odpovídá tabulce `price_observations`. Aktuální cenu produktu databáze přepíše sama
(trigger), stačí posílat zjištění.

| Pole | Typ | Popis |
|---|---|---|
| **`product_key`** | text | vazba na produkt |
| **`price_czk`** | number | cena **s DPH** za 1 `unit` produktu (po převodu podle 6.7) |
| **`observed_at`** | čas | kdy byla cena na webu přečtena |
| **`vat_status`** | `included` \| `added` \| `assumed` | s DPH ze zdroje / dopočteno / předpokládáno z registru plátců |
| **`source_url`** | URL | odkud cena je |
| `original_price`, `original_unit`, `original_quantity`, `original_price_includes_vat` | | jako dnes |
| `valid_in_regions` | pole kódů krajů | kde cena platí (`["STC","PHA"]`); celostátně = `["CZ"]`; neznámo = `null` |
| `delivery_included` | bool | doprava je v ceně |
| `normalized` | objekt | dnešní přepočty pro kontrolu: `per_kg`, `per_t`, `per_prms`, `per_kwh`, `calorific_mj_kg`, `calorific_source` |
| `flags` | pole | sekce 9 |
| `snapshot_id` | int | vazba na běh (sekce 8) |

**Akční a množstevní ceny jsou samostatné produkty** (rozhodnutí 18. 11. 2026, bod 1 v
`docs/TODO.md`), ne další cena téhož produktu – trigger by jinak běžnou cenu přepsal akční:

| Pole produktu | Typ | Popis |
|---|---|---|
| `product_key` | text | vlastní klíč varianty, např. `<seller_key>:<item_id>~promo`, `~od-10-prms` |
| `base_product_key` | text | klíč běžného produktu, ke kterému varianta patří (zapisovač převede na `products.base_product_id`) |
| `is_promo` | bool | akční / sezónní cena (jarní slevy, „při odběru celého kontejneru“) |
| `promo_valid_until` | datum | do kdy akce platí |
| `price_tier` | objekt | množstevní cena: `{"min_quantity": 10, "unit": "PRMS"}` (v DB `price_tier_min_quantity`, `price_tier_unit`) |

Ceny variant se posílají jako běžné `price_observation` s `product_key` varianty. Mapa,
srovnání a statistiky berou jen běžné produkty (`is_promo = false`, bez pásma); detail
prodejce ukáže varianty zvlášť. Na mapě ukazujeme běžnou cenu za nejmenší rozumné množství.

---

## 8. Běh agenta (`scrape_run`)

Odpovídá tabulce `scrape_runs` (a zdrojům `scrape_sources`). Dnešní `snapshots` vyhovují,
přidat jen pár polí:

| Pole | Popis |
|---|---|
| `snapshot_id`, `source_id`, `fetched_at`, `status`, `http_status`, `content_sha256`, `changed`, `item_count`, `offer_count`, `error` | jako dnes |
| `agent` | `collection` \| `normalize` \| `seller_profile` \| `registry` \| `geocode` \| `ratings` \| `qa` |
| `agent_version` | verze kódu / commit |
| `model` | LLM, pokud byl použit |
| `finished_at` | konec běhu |
| `rejected_count` | kolik řádků QA odmítla |

---

## 9. Kvalita: příznaky a QA

Dnešní příznaky ponechat a doplnit nové. Každý příznak je řetězec v poli `flags`.

| Příznak | Význam | Co s tím aplikace udělá |
|---|---|---|
| `vat_assumed_from_registry`, `vat_added` | DPH dopočtené / předpokládané | zobrazí, ale s poznámkou |
| `mass_estimated_from_volume`, `volume_converted_prmr_to_prms` | přepočet | jen informace |
| `unit_judged_by_extractor`, `read_by_ocr` | jednotku určil LLM / text z OCR | nižší důvěra |
| `wood_species_unknown`, `long_wood_not_comparable` | chybí druh / metrovky | mimo srovnání |
| `outlier_vs_market`, `unit_price_implausible` | podezřelá cena | **neukazovat**, do ruční kontroly |
| `price_from` | cena „od“ | zobrazit jako „od“ |
| `package_size_unknown`, `volume_stacking_unknown` | nejde převést | **neposílat** do aplikace |
| *nové:* `location_unknown`, `location_is_registered_office`, `location_region_mismatch`, `location_sources_disagree`, `location_from_seller_map` | poloha | `location_unknown` se na mapě nezobrazí |
| *nové:* `moisture_class_from_text`, `certification_unverified`, `delivery_terms_unclear`, `ico_not_found` | odvozené údaje | nižší důvěra, do ruční kontroly |

QA má dvě úrovně (rozhodnuto 18. 11. 2026):

1. **Pevné rozpětí podle paliva → `unit_price_implausible`.** Zachytí špatně přečtenou
   jednotku nebo balení (q místo t = 10×, kg místo t = 1000×, pytel místo palety). Cena za
   jednotku se nespočítá ani nepublikuje. Rozpětí jsou jen v kódu,
   `PLAUSIBLE_CZK_PER_TONNE` a `PLAUSIBLE_CZK_PER_PRMS` v
   `tools/src/podpalto_tools/collect/normalize.py`. Zhruba polovina nejnižší a dvojnásobek
   nejvyšší ceny ze sběru 18. 11. 2026 (373 cen, s DPH):

   | Palivo | Rozpětí | Zjištěno 18. 11. |
   |---|---|---|
   | dřevo | 300–6 000 Kč/PRMS | 1 044–3 400 |
   | pelety | 5 000–30 000 Kč/t | 11 667–16 620 |
   | dřevěné brikety | 4 000–30 000 Kč/t | 8 300–14 300 |
   | hnědé uhlí | 2 000–20 000 Kč/t | 2 990 (hruboprach)–11 560 |
   | uhelné brikety | 4 000–25 000 Kč/t | 6 990–13 200 |
   | černé uhlí | 5 000–30 000 Kč/t | 9 490–19 200 (kovářské) |
   | koks | 5 000–30 000 Kč/t | 9 000–13 990 |

2. **Odchylka od trhu → `outlier_vs_market`.** Cena pod polovinou nebo nad dvojnásobkem
   mediánu ostatních prodejců téhož paliva (`flag_market_outliers` v `collector.py`). Cena se
   publikuje, ale jde do ruční kontroly. Pásmo jde s trhem, proto tu nejsou pevná čísla.

Navíc meziběhová změna ceny o víc než 30 % → příznak `price_jump` a do ruční kontroly.

---

## 10. Formát předání

**Teď (soubor):** jeden JSON soubor na běh exportu, např. `outputs/podpalto-export-20261118T060000Z.json`
(hodnoty v příkladu jsou ilustrační, kód RÚIAN i souřadnice jsou smyšlené):

```json
{
  "schema_version": "1.0",
  "generated_at": "2026-11-18T06:00:00Z",
  "runs": [ { "snapshot_id": 101, "source_id": "palivo_ricany", "agent": "collection", "status": "ok", "fetched_at": "2026-11-18T05:12:03Z", "content_sha256": "…", "changed": 1, "item_count": 6, "offer_count": 6 } ],
  "sellers": [
    {
      "seller_key": "palivo_ricany",
      "source_id": "palivo_ricany",
      "name": "Palivo Říčany",
      "company_ico": "27891045",
      "legal_name": "Palivo Říčany s.r.o.",
      "website": "https://www.palivo-ricany.cz",
      "phone": "+420603214880",
      "email": "info@palivo-ricany.cz",
      "description": "Rodinná firma prodávající suché tvrdé dřevo a pelety pro Prahu-východ.",
      "founded_year": 2009,
      "size": "medium",
      "address": { "street": "Pražská 412", "city": "Říčany", "zip": "251 01", "district": "Praha-východ", "region": "STC", "ruian_address_code": 21844832 },
      "location": { "lat": 49.990213, "lng": 14.660087, "source": "ruian", "precision": "address_point", "checked_at": "2026-11-18T05:20:00Z" },
      "opening_hours": { "mon": [["07:00", "16:00"]], "sat": [["08:00", "12:00"]], "sun": [] },
      "delivery": {
        "own_delivery": true, "pickup_available": true, "hydraulic_arm": true, "hydraulic_arm_fee": 450,
        "base_fee": 590, "price_per_km": 32, "free_radius_km": 10, "free_over_quantity": 6, "free_over_quantity_unit": "PRMS",
        "max_radius_km": 80, "zones": null,
        "notes": "Doprava zdarma do 10 km při odběru od 6 PRMS.",
        "evidence": { "quote": "Doprava zdarma do 10 km od Říčan při odběru od 6 PRMS", "url": "https://www.palivo-ricany.cz/doprava" }
      },
      "registry": { "status": "verified", "name": "Palivo Říčany s.r.o.", "ruian_address_code": 21844832, "active": true, "checked_at": "2026-11-18T05:15:00Z" },
      "rating": { "value": 4.6, "count": 318, "source": "google", "url": "https://…", "fetched_at": "2026-11-18T05:30:00Z" },
      "tags": ["skladem", "hydraulicka-ruka", "vlastni-doprava", "osobni-odber", "doprava-zdarma"],
      "flags": []
    }
  ],
  "products": [
    {
      "product_key": "palivo_ricany:bukove-stipane-33cm-sypane",
      "seller_key": "palivo_ricany",
      "item_id": "bukove-stipane-33cm-sypane",
      "name": "Bukové štípané dřevo 33 cm, suché (sypané)",
      "name_raw": "Buk štípaný 33 cm – suchý, sypaný",
      "category": "wood",
      "wood_species": ["buk"], "wood_group": "hard", "wood_form": "sypane",
      "moisture": "dry", "moisture_percent": 16, "log_length_cm": 33,
      "unit": "PRMS", "min_order": 2, "stock": "in_stock",
      "source_url": "https://www.palivo-ricany.cz/cenik",
      "active": true, "flags": []
    }
  ],
  "price_observations": [
    {
      "product_key": "palivo_ricany:bukove-stipane-33cm-sypane",
      "price_czk": 2290, "observed_at": "2026-11-18T05:12:03Z", "vat_status": "included",
      "source_url": "https://www.palivo-ricany.cz/cenik",
      "original_price": 2290, "original_unit": "prms", "original_quantity": 1, "original_price_includes_vat": true,
      "is_promo": false, "valid_in_regions": ["STC", "PHA"], "delivery_included": false,
      "normalized": { "per_prms": 2290, "per_kwh": 1.62, "calorific_mj_kg": 14.6, "calorific_source": "typical" },
      "snapshot_id": 101, "flags": []
    }
  ]
}
```

**Později (přímý zápis):** služba `tools` zapisuje rovnou do Supabase se *secret* klíčem
(jen na serveru, nikdy ve frontendu ani v repozitáři), v pořadí `sellers` → `products` →
`price_observations` → `scrape_runs`, upsert podle klíčů ze sekce 4. Na straně aplikace k tomu
přidáme sloupce pro externí klíče (`sellers.external_key`, `products.external_id` už je).

---

## 11. Číselník krajů

| Kód | Kraj | Kód | Kraj |
|---|---|---|---|
| `PHA` | Hlavní město Praha | `HKK` | Královéhradecký kraj |
| `STC` | Středočeský kraj | `PAK` | Pardubický kraj |
| `JHC` | Jihočeský kraj | `VYS` | Kraj Vysočina |
| `PLK` | Plzeňský kraj | `JHM` | Jihomoravský kraj |
| `KVK` | Karlovarský kraj | `OLK` | Olomoucký kraj |
| `ULK` | Ústecký kraj | `ZLK` | Zlínský kraj |
| `LBK` | Liberecký kraj | `MSK` | Moravskoslezský kraj |

Dnešní plné názvy („Středočeský kraj“) převést na kódy; celostátní platnost = `CZ`.

---

## 12. Co agenti posílat nemusí (počítá aplikace / databáze)

- průměrné ceny ČR a krajů po měsících (`commodity_price_stats`, `region_stats`) – počítá
  deterministický nástroj `market_stats` ve službě `tools` (bod 5 v `docs/TODO.md`) z cen se
  `review_status = 'ok'`, bez akcí a pásem,
- cenu včetně dopravy pro konkrétní adresu zákazníka – počítá aplikace z polí v 5.4,
- cenu za kWh užitečného tepla (s účinností kotle) – počítá aplikace,
- slugy pro URL prodejců, souhrnné hodnocení (kombinace externího a recenzí z aplikace).

Data ze Sčítání 2021 jsou v tabulce `heating_census` (nahraná 18. 11. 2026 z
`census2021_heating.json`); při novém sčítání stačí upsert podle kódu kraje (`CZ` = celá ČR).

---

## 13. Akceptační kritéria (kdy je výstup „hotový“)

- [ ] ≥ 95 % aktivních provozoven má `location.precision` `address_point` nebo `building`.
- [ ] 100 % provozoven má adresu s krajem a PSČ; ≥ 90 % má ověřené IČO.
- [ ] ≥ 80 % provozoven má strukturovanou dopravu (nebo výslovně `own_delivery = false`).
- [ ] 100 % produktů dřeva má `wood_group` a `wood_form`; ≥ 80 % má `wood_species`.
- [ ] 100 % pelet má `certification`, 100 % uhlí `coal_type`, 100 % briket `briquette_type`.
- [ ] Žádný záznam s `package_size_unknown` / `volume_stacking_unknown` v exportu pro aplikaci.
- [ ] `product_key` je stabilní mezi dvěma po sobě jdoucími běhy (stejný produkt = stejný klíč).
- [ ] Export projde validací JSON Schema (připravíme podle tohoto dokumentu).
