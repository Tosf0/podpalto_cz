# Handoff 2026-11-18 #01: export sběru do Supabase

**Od:** Franta (s Claude) · **Pro:** Lukáš · **Větev:** `dev` (commity `c51f49c`, `f0b2c11`, `c0138b1`, nepushnuto)

**Shrnutí:** Export cen z pipeline do Supabase je napsaný a otestovaný „na sucho“ proti živé
databázi (jen čtení). **Nic se zatím nezapsalo.** Před prvním zápisem prosím projdi
sekci 3 (Konflikty k rozhodnutí): týkají se dat, která už na webu jsou.

---

## 1. Co je hotové

| Část | Kde | Co dělá |
|---|---|---|
| Klíč prodejce | `tools/.../collect/source_registry.py`, spec §4 | `seller_key` = `id` zdroje ze `sources.yaml`. Nikdy se nemění; IČO, adresa a RÚIAN jsou jen údaje. Dva zdroje jednoho prodejce sdílí klíč přes pole `seller_key`. |
| Rozpětí cen | `normalize.py` (`PLAUSIBLE_CZK_PER_TONNE`), spec §9 | Rozpětí podle paliva, nastavená ze sběru 18. 11. (373 cen, žádná mimo). Chytá jen špatně přečtenou jednotku; odchylku od trhu dál řeší `outlier_vs_market`. |
| Klíč položky ceníku | `pricelist.py` | `/cenik/#koks-20-40-mm-q` (slug názvu a jednotky) místo pořadí řádku, takže přidaný řádek neposune ostatní ceny. |
| Poloha prodejců | `collect/locate.py`, `collect/ruian.py`, `seller_locations.json` | Deterministicky z ARES a RÚIAN (ČÚZK) podle kódu adresního místa, bez LLM a bez textového geokodéru. Výsledek je commitnutý JSON, takže změny jsou vidět v diffu. Příkaz `uv run podpalto-locate-sellers`. |
| Sklady místo sídel | `sources.yaml` (`location`) | Z kontaktních stránek prodejců (jen stránky povolené v robots.txt): 18 z 31 prodejců má polohu skladu nebo prodejny, u každého je v poznámce zdroj adresy. |
| Export v `tools` | `collect/export.py`, `GET /export?since=…`, `uv run podpalto-export` | Balík podle spec §10. Převádí kategorie a jednotky (§6.6, §6.7) a z názvu čte druh dřeva, délku polen, certifikaci pelet, typ briket a uhlí. Co web neumí ukázat, vynechá a uvede důvod. |
| Zápis v `app` | `worker/export.py` | Pořadí `sellers` → `products` → `price_observations` → `scrape_runs`. Pravidla v sekci 2. |
| Párování se stávajícími | `worker/link_sellers.py` | Spáruje prodejce exportu s těmi, co už na webu jsou (podle domény, pak IČO). Bez `--apply` nic nezapisuje. |

Testy: 264 (`tools` + `app`), všechny prochází, včetně testu smlouvy `GET /export` → zápis.

**Na lokálních datech:** 21 prodejců, 343 produktů, 343 cen, 22 běhů. Vynechaných je 23 řádků:
19 klecí a kontejnerů v „m³“ bez upřesnění, 3 bez jednotky a 1 prodejce bez adresy (baumax).

## 2. Pravidla zápisu (prosím zkontroluj, jestli sedí s webem)

- **Prodejce:** nový dostane slug, název a adresu. U existujícího se mění jen sloupce sběru:
  adresa, poloha, IČO, `registry`, `flags`, `last_scraped_at`. **Název, popis, kontakty a
  doprava z webu se nepřepisují.**
- **Převzatý profil** (`owner_id` vyplněné): export ho vůbec nemění, ani jeho produkty a ceny.
- **Produkt:** upsert podle `(seller_id, external_id)`. U existujícího produktu export
  **nemění `price_czk`**, cenu posune až trigger `apply_price_observation`. Ten totiž podle
  rozdílu staré a nové ceny rozhoduje o ruční kontrole. Nový produkt dostane
  `price_updated_at` = čas první ceny.
- **Produkty, které zdroj už neuvádí**, dostanou `active = false`. Nic se nemaže.
- **Ceny** jsou vždy nové řádky. Příznaky ceny (`outlier_vs_market`…) jdou jen do
  `price_observations.flags`, příznaky produktu (`wood_species_unknown`, `certification_unverified`…)
  do `products.flags`.
- **Idempotence:** snímek, který už v `scrape_runs` je (`source_key` + `snapshot_id`),
  se přeskočí. Dvojí spuštění tedy ceny nezdvojí.
- **Job `collect`** exportuje jen snímky ze svého běhu. S `params.export_all = true` vezme
  nejnovější snímek každého zdroje.

## 3. Konflikty k rozhodnutí

### 3.1 Stávajících 81 prodejců od subagentů má `external_key` = slug

Subagenti uložili do `external_key` slug, ne id zdroje. S našimi 21 prodejci se překrývají
jen dva. `link_sellers` takový zástupný klíč přepíše na náš, klíč nastavený exportem nikdy.

| Náš zdroj | Prodejce na webu | Dopad spárování |
|---|---|---|
| `alsol` | Arcibiskupské lesy a statky Olomouc (ALSOL) | stejná adresa; dosud bez produktů, přibude 23 cen |
| `havelka` | Havelka Uhelné sklady (sklad Křinec) | jeho **7 produktů od subagentů dostane `active = false`**, nahradí je 36 cen z ceníku; **poloha se změní** (viz 3.2) |

Zbylých 79 prodejců od subagentů export nezmění. Na webu tak budou vedle sebe data ze
dvou zdrojů: z pipeline (citace a snímek stránky) a jednorázově od subagentů (neověřené,
viz TODO „Reálná data místo demo dat“). Statistiky trhu je počítají dohromady.

> **Rozhodni:** souhlasíš se spárováním obou? Má pipeline časem subagentní data nahradit,
> nebo je chceme držet dál?

### 3.2 Havelka: sklad Křinec ve skutečnosti není sklad

- Bod od subagentů leží na **náměstí v Křinci** (u domů Náměstí 15–17), je to tedy střed obce
  z geokodéru. Spec §5.3 takovou polohu nepřijímá.
- Havelka nikde neuvádí adresu skladu. Stránky poboček (`/krinec`, `/chrudim` a dalších 17)
  mají jen závozová místa a objednávky po telefonu, pobočky jen rozváží.
- Podle dohodnutého pravidla („když se sklad nenajde, poloha sídla s příznakem“) export dá
  sídlo **Praha 4** a příznak `location_is_registered_office`. Do Prahy ale Havelka podle
  svých pásem nevozí.
- Název „…(sklad Křinec)“ export nepřepíše, ale adresa bude pražská. Název je potřeba opravit
  v administraci.

> **Rozhodni:** (a) spárovat a přijmout Prahu, (b) Havelku zatím neexportovat, nebo
> (c) udělat pobočky jako samostatné prodejce se závozovou oblastí. Varianta (c) je
> správné řešení, ale potřebuje oblast doručení na mapě, viz bod 3.3.

### 3.3 Poloha v sídle: neblokující příznak (12 prodejců)

Dohodli jsme, že `location_is_registered_office` **neblokuje** zobrazení, jen upozorňuje.
Týká se prodejců havelka, olvan, znz, deblicelesy, palivapolice, alsol a e-shopů nebo řetězců
unihobby, mountfield, dek, bauhaus a drevopraha. U řetězců s celostátní cenou je špendlík
v centrále (Praha, Brno, Strančice) zavádějící. Souvisí s bodem 12 v TODO: doprava
celostátních e-shopů se počítá od špendlíku.

> **Rozhodni:** stačí příznak, nebo má frontend takové prodejce zobrazit jinak
> (např. „rozváží po ČR“ bez špendlíku, nebo jen v seznamu)?

### 3.4 Poloha s přesností na ulici (3 prodejci)

Tito prodejci uvádějí sklad jen ulicí bez čísla, takže mají `location_precision = street`:
- stefl: bod areálu SPOKAR, protože web píše „za areálem Spokar“,
- korbicka: Nádražní ulice, areál pily,
- lesy_liberec: Londýnská ulice u čistírny odpadních vod. Ulice je dlouhá, bod může být
  až asi 1 km vedle.

> **Rozhodni:** zobrazovat normálně, nebo s upozorněním „přibližná poloha“?

### 3.5 Menší body

- **baumax:** nemá IČO ani adresu (kontaktní stránka vracela HTTP 502), export ho vynechá.
- **bauhaus:** IČO 49435388 (BAUHAUS k.s.) je dohledané v ARES podle jména, na jejich webu
  není. Sedí jen „Brno 639 00“ ze stránky „O nás“.
- **Akční a množstevní ceny** (rozhodnutí 1 v TODO) export zatím nerozpozná. Například
  OLVAN „do 15 q / nad 15 q“ budou dva běžné produkty.
- **Doprava prodejce** je u všech `null` (neuvedeno), pipeline ji zatím strukturovaně
  nesbírá.
- **Ověření proti DB:** zkouška jen četla. Zápis do enumů a polí (`wood_species[]`,
  `certification`, `coal_type`, kontroly `log_length_cm`…) je otestovaný jen proti náhradě
  PostgRESTu v testech. První ostrý běh doporučuju sledovat.

## 4. Postup prvního importu (až odsouhlasíš)

Potřebuje `.env` se `SUPABASE_URL` a `SUPABASE_SECRET_KEY`. Lokální data jsou v `data/`.

```bash
uv run uvicorn podpalto_tools.api:app --port 8001         # terminál 1

uv run python -m podpalto_app.worker.link_sellers         # terminál 2: návrh, nic nezapíše
uv run python -m podpalto_app.worker.link_sellers --apply # spáruje alsol a havelku (3.1)
uv run python -m podpalto_app.worker.export --dry-run     # čekáme 19 nových, 2 upravené
uv run python -m podpalto_app.worker.export               # zápis
```

Pak v SQL Editoru spustit `select public.refresh_market_stats();`. Indexaci `/ceny`
(`NEXT_PUBLIC_SITE_INDEXABLE`) bych zapnul až po kontrole dat na webu.

## 5. Kde hledat víc

- `docs/TODO.md`: sekce „Co zbývá Frantovi“, bod 1 (podbody s tímto stavem).
- `docs/agent-output-spec.md`: §4 klíče, §5.3 poloha, §9 kontroly, §10 formát.
- `tools/src/podpalto_tools/collect/sources.yaml`: u každého skladu `location.note` se zdrojem adresy.
