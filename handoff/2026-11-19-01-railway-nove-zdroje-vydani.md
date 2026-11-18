# Handoff 2026-11-19 #01: Railway běží, nové kraje, vydávání přes `main`

**Od:** Franta (s Claude) · **Pro:** Lukáš · **Navazuje na:** #04 (kontrola prvního importu)

**Shrnutí:** Agenti běží na Railway a test sběru prošel až do Supabase. Railway nasazuje
**jen z `main`**, takže `main` je teď produkční větev. Tvoje požadavky z #04 jsou hotové.
Přibylo 6 zdrojů pro kraje bez cen a čtení ceníků ve Wordu. Na web se to dostane
**až po vydání `dev` → `main` a sběru**. Od tebe potřebuji tři věci (sekce 4).

## 1. Railway (agenti)

- Projekt `podpalto`: služba `tools` (s diskem `/data`) a služba `worker`, obě z větve
  **`main`**. Vše je založené přes API Railway. Konfigurační soubory `railway/*.json`
  Railway u nových služeb odmítá (formát je zastaralý), proto jsou jejich hodnoty nastavené
  přímo ve službách.
- **Test:** job `collect` jen pro `peletypremium`. Převzal ho `railway-worker`, sesbíral
  feed, zapsal 4 ceny a přepočítal statistiky, celé za 12 s.
- Cestou opraveno:
  - `tools` poslouchá na `0.0.0.0` s `PORT=8001`, jinak ho healthcheck Railway nenašel.
  - `EXPORT_SNAPSHOT_OFFSET=1000000`: databáze snímků na Railway čísluje od 1 a Supabase
    pozná už exportovaný snímek podle (zdroj, číslo). Bez posunu by Railway snímky
    kolidovaly s čísly z prvního importu.
- **Plán jobů:** sběr 1. 12. ve 3:00, přehled trhu 2. 12. v 6:00. Disk na Railway začíná
  prázdný, takže první plný sběr čte všechny ceníky přes Claude API (stojí kredit).

## 2. Požadavky z #04 – hotovo

| Bod | Stav |
|---|---|
| 1. `outlier_vs_market` a `price_jump` ne u akcí a množstevních cen | Hotovo v exportu. Data z prvního importu se zpětně nemění, takže **2 varianty Lesů Liberec schval v Data od agentů**. |
| 2. `delivery_included = true` u cen „s dopravou“ | Hotovo: z názvu („s dopravou do 30 km“, „VČETNĚ DOPRAVY“, „doprava zdarma“). Ceny z Tábora ho dostanou při dalším sběru. |
| 3. Pokrytí krajů | Pardubický 0 → 3, Olomoucký 1 → 3, Plzeňský 1 → 2 (sekce 3). Jihomoravský a Praha zůstávají po 1. |

Navíc: **`price_jump`**. Cena položky, která se proti předchozímu sběru změní o víc než
30 %, jde do ruční kontroly. Databáze ho měla mezi blokujícími příznaky, jen ho nikdo
nevytvářel.

## 3. Nové zdroje (zatím jen v `dev`)

| Kraj | Zdroj | Ceny |
|---|---|---|
| Pardubický | Městské lesy Polička (sklad Pomezí) | 5, dřevo za prm |
| Pardubický | Palivové DMdřevo (Starý Mateřov) | 8, dřevo za PRMS a PRMR |
| Pardubický | Městské lesy Litomyšl | 7, ceník je **jen soubor Word (.doc)** |
| Olomoucký | OL-IN Šternberk | 12: uhlí, brikety, pelety, dřevo |
| Olomoucký | Dřevo Ludwig (Samotišky) | 5, dřevo; neplátce DPH |
| Plzeňský | Paliva Makový (Chocenický Újezd) | 8: uhlí, brikety, dřevo |

K tomu z #03 a #04 (už v produkci): Moravskoslezský kraj (Uhlí Morava Příbor a Opava,
Ridera Ostrava), Karlovarský (Golem Lítov) a PREMIUM PELLETS (celostátní).

**Ceníky ve Wordu:** nový `tools/.../collect/worddoc.py` čte `.doc` (Word 97–2003)
i `.docx` jen standardní knihovnou, bez nové závislosti. Zdroj se nastaví stejně jako
u PDF (`document_link`).

## 4. Co potřebuji od tebe

1. **Vydání `dev` → `main`:** pull request na GitHubu, který po kontrole sloučíš (nebo mi
   dej vědět a sloučím ho já). Pak v administraci → Agenti → „Sběr cen“ → *Spustit nyní*.
   Před vydáním ověř, že neběží žádný job, protože nové nasazení ho ukončí.
2. **Vercel:** *Production Branch* nastavit na `main`, pokud produkce jede z `dev`, ať web
   a agenti vydávají stejně. `dev` jako Preview.
3. **Data od agentů:** schválit 2 varianty Lesů Liberec (bod 2) a rozhodnout dvě oprávněně
   odlehlé ceny z #04 (DřevoPraha „Krbový MIX“, Lesy Liberec „mix dřevin“).
4. *(doporučení)* Na GitHubu ochrana `main`: změny jen přes pull request.

## 5. Otevřené otázky

- **Frekvence sběru:** dnes jeden měsíční job pro všechno. Návrh: e-shopy a feedy týdně
  (zdarma), ceníky měsíčně (Claude API). Znamená to dva joby v `agent_jobs` a úpravu
  administrace. Souhlasíš?
- **Jihomoravský kraj a Praha:** nemáš tip na prodejce s ceníkem na webu? Hledání vrací
  jen adresáře a „cena na dotaz“.
- **Doprava prodejců** je u všech `null`, takže kalkulačka nemá data. Je to další velký
  krok na naší straně. Hodí se ti spíš paušál a Kč/km, nebo pásma podle vzdálenosti?

Podrobný stav všeho je v `docs/TODO.md`, sekce „Přehled k 19. 11. 2026“.
