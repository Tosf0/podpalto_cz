# Handoff 2026-11-18 #04: kontrola prvního importu

**Od:** Lukáš (s Claude) · **Pro:** Franta · **Navazuje na:** #01, #03

**Shrnutí:** První import v Supabase je v pořádku: 34 prodejců (všichni s polohou a na webu),
574 produktů a cen, 35 úspěšných běhů, statistiky za listopad přepočítané. Rozhodnutí z #02
sedí (Havelka mimo export, Bauhaus bez IČO). Mediány jsou věrohodné (pelety 13 000 Kč/t,
uhlí 7 725, brikety 11 500, tvrdé dřevo 1 895 Kč/prms, měkké 1 465). Ručně ověřené ceny,
které vypadaly podezřele, sedí (TRADEMIX klec 2 PRM, pelety Tábor 3 150 kg, tiery OLVAN).
Níže tři věci k úpravě.

## 1. Kontrola cen vůči trhu přeskakuje varianty

Dvě varianty Lesů Liberec jsou v ruční kontrole s `outlier_vs_market`, i když jsou levnější
schválně:
- „jehličnaté – PŘI ODBĚRU 10 A VÍCE PRM … BONUSOVÉ CENY“ (`price_tier_min_quantity = 10`),
- „jehličnaté – VĚRNOSTNÍ SLEVA …“ (`is_promo = true`).

> **Prosím:** `outlier_vs_market` (a `price_jump`) nepočítat u akcí a množstevních cen
> (`is_promo` nebo `price_tier_min_quantity`). Do statistik ani na mapu se varianty
> nedostanou, takže odchylka od trhu u nich nic neznamená.

Zbylé dvě položky v kontrole jsou oprávněné (DřevoPraha „Krbový MIX“ 3 400 Kč/prms,
Lesy Liberec „mix různých dřevin“ 532 Kč/PRM) – rozhodne admin v Data od agentů.

## 2. Cena s dopravou: `delivery_included`

Čtyři nabídky pelet z Tábora mají v názvu „s dopravou do 30 / 50 km“, ale
`price_observations.delivery_included` je `null` (true je jen u 13 jiných cen).

> **Prosím:** u ceny, která podle názvu nebo ceníku obsahuje dopravu, posílat
> `delivery_included = true`. Na webu pak doplníme, aby se taková cena nepočítala do mediánu
> (nebo se od ní odečetla doprava) a v detailu měla poznámku.

## 3. Pokrytí krajů

| Kraj | Místních prodejců |
|---|---|
| Pardubický | **0** |
| Praha, Plzeňský, Jihomoravský, Karlovarský, Olomoucký | 1 |
| ostatní | 2–5 |

Index kraje na heat mapě s jedním prodejcem je jen orientační. Při přidávání zdrojů prosím
dej přednost Pardubickému kraji a krajům s jedním prodejcem.

## 4. Na webu upraveno

- Množstevní cena za paletu / pytel: „Od 1 palety“, „Od 10 pytlů“ (dřív „Od 1 paleta“).
- Havelka a cena „od“ (otázka z #03): teď neplatí, Havelka se neexportuje; vrátíme se k tomu
  u poboček se závozovou oblastí (#01, bod 3.2).

**Další krok:** Railway podle `docs/TODO.md` → „Napojení agentů na web“ a pak test jobu
„Sběr cen“ z administrace (Agenti → Spustit nyní).
