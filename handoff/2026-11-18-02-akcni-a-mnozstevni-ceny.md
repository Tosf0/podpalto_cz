# Handoff 2026-11-18 #02: akční, množstevní a zónové ceny v exportu

**Od:** Franta (s Claude) · **Pro:** Lukáš · **Navazuje na:** `2026-11-18-01-export-do-supabase.md`

**Shrnutí:** Export teď rozpozná varianty cen podle spec §7. Mění to čísla z handoffu #01
a odpadá bod „Akční a množstevní ceny export zatím nerozpozná“ (3.5). Konflikty 3.1–3.4
z #01 platí dál.

## Co se změnilo

| Případ | Příklad | V exportu |
|---|---|---|
| Množstevní cena | OLVAN „cena nad 15q“, kb_uhli „při odběru 1t a více“ | `price_tier_min_quantity` + `price_tier_unit`, `base_product_id` na běžnou cenu („cena do 15q“) |
| Celá paleta | OLVAN „paletový prodej“ vs. „kusový prodej“ | pásmo `1 paleta`, základem je kusový prodej |
| Věrnostní sleva | Lesy Liberec „pro zákazníky, kteří v roce 2025 odebrali…“ | `is_promo = true` (nová zákaznice ji nedostane) |
| Cenová pásma podle oblasti | Havelka „0.–III. cenové pásmo“ (rozdíl 0–10 Kč/q) | jeden produkt s nejlevnějším pásmem, název bez pásma, příznak `price_from`; ostatní pásma vynechána |

Čísla na lokálních datech: **316 produktů** místo 343. Havelka má 9 produktů místo 36,
13 množstevních cen má základní produkt. U Lesů Liberec zůstávají 2 množstevní ceny
a 4 slevy bez základu, protože ceník nedává jednoznačně najevo, ke které délce polen patří.

## Co prosím zkontroluj

- **Detail prodejce:** varianty jsou v `offers` (`api_sellers`), ale s reálnými daty je ještě
  nikdo neviděl. Hlavně OLVAN, kde jeden produkt má tři ceny podle množství.
- **Mapa a statistiky:** varianty vynechávají správně (`is_promo`, `price_tier_*`). Produkt
  jen s `base_product_id` ukazuje mapa jako běžný. Export takový nevytváří: každá varianta
  má pásmo nebo akci.
- **Havelka s cenou „od“:** je to v pořádku, nebo raději pásmo 0 bez příznaku? Pásma jsou
  oblasti dodání. Správně by je řešily pobočky se závozovou oblastí (#01, bod 3.2).
