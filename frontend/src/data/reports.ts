import type { CrewAnalysisReport, Swot } from "@/types";

/** Položky SWOT → Markdown odrážky. Zaručí, že text v reportu odpovídá poli `swot`. */
const bullets = (items: string[]): string => items.map((item) => `- ${item}`).join("\n");

/* ------------------------------------------------------------------ */
/* 1) Brněnské palivo – velký provozovatel s e-shopem, pelety          */
/* ------------------------------------------------------------------ */

const BRNO_SWOT: Swot = {
  strengths: [
    "Široký sortiment ve třech kategoriích (dřevo, pelety, brikety) na jednom místě",
    "Pelety ENplus A1 skladem po celý rok a online platba kartou",
    "Silná pozice v Brně a okolí, expedice do 48 hodin",
    "Vlastní e-shop s průběžnou aktualizací cen a skladových zásob",
  ],
  weaknesses: [
    "Doprava mimo Brno a okolí je výrazně dražší a složitější",
    "Chybí uhlí a údaje o vlhkosti dřeva u větší části nabídky",
    "Web je funkční, ale nenabízí srovnání Kč/kWh ani cenové mapy",
    "Vyšší provozní náklady e-shopu se promítají do marže u briket",
  ],
  opportunities: [
    "Rozšíření nabídky o pytlové pelety pro menší domácnosti",
    "Cílení na regionální dotazy typu „palivové dřevo Brno cena“",
    "Partnerství s realitními makléři a správci bytových domů",
    "Sezonní slevy na pelety v předjaří a cílení na předobjednávky",
  ],
  threats: [
    "Cenová válka s Hradeckými peletami v kategorii pelet",
    "Rostoucí konkurence velkých e-shopů s nižšími náklady na dopravu",
    "Regulace emisí v Brně může snížit poptávku po kotlích na tuhá paliva",
    "Omezení vjezdu do centra Brna zdražuje logistiku posledních kilometrů",
  ],
};

const BRNO_REPORT = `# Competitor Analysis: Brněnské palivo (brnenske-palivo.cz)

> Zdroj: https://www.brnenske-palivo.cz · Analyzováno: 12. 11. 2026 · Agenti: web_researcher → market_analyst

## Summary

Brněnské palivo je největší z analyzovaných prodejců v Jihomoravském kraji. Provozuje internetový obchod s nabídkou tvrdého i měkkého palivového dřeva, pelet ENplus A1 a dřevěných briket. Zboží expeduje ze skladu v Modřicích a obsluhuje Brno i okolí do 60 km.

Web působí jako plnohodnotný e-shop: produkty mají online košík, platbu kartou a ceny aktualizované zhruba každý měsíc. Silnou stránkou je šířka sortimentu a dostupnost skladem. Slabinou je menší důraz na lokální dopravu v okrajových částech kraje a vyšší cena dopravy mimo Brno. Pro podpalto.cz je Brněnské palivo hlavní cenovou referencí v peletách v JHM.

## Offering & Pricing

Ceny jsou uvedené v Kč vč. DPH a odpovídají stavu ke konci října 2026, s ověřením na webu k 12. 11. 2026.

| Produkt | Jednotka | Cena (Kč vč. DPH) | Kč/kWh | Zdroj |
|---|---|---|---|---|
| Tvrdé štípané dřevo, suché (buk, dub, habr) | PRMS | 2 090 | 1,6 | /palivove-drevo/tvrde |
| Měkké štípané dřevo (smrk, borovice) | PRMS | 1 390 | 1,3 | /palivove-drevo/mekke |
| Pelety ENplus A1, volně ložené | t | 7 690 | 1,6 | /pelety |
| Pelety ENplus A1, pytel 15 kg | pytel | 128 | 1,7 | /pelety/pytle |
| Dřevěné brikety RUF, pytel 10 kg | pytel | 85 | 1,8 | /brikety |
| Dřevěné brikety RUF, paleta 600 kg | paleta | 5 090 | 1,8 | /brikety/paleta |
| Pelety ENplus A1, paleta 60 pytlů (900 kg) | paleta | 6 390 | 1,4 | /pelety/palety |

### Doprava

- Vlastní doprava: paušál 390 Kč, zdarma do 20 km od skladu v Modřicích (zdroj: /doprava)
- Nad 20 km účtováno 18 Kč za každý km v jedné cestě, maximální dojezd 60 km (zdroj: /doprava)
- Při objednávce nad 4 PRMS doprava zdarma v celém dosahu (zdroj: /doprava)
- Hydraulická ruka není k dispozici, paletové dodávky se vykládají vysokozdvižným vozíkem za příplatek 690 Kč (zdroj: /doprava)
- Osobní odběr ve skladu zdarma, po předchozí objednávce online (zdroj: /doprava)
- Dobírka za 40 Kč, platba převodem bez poplatku (zdroj: /platba)

## Positioning

- Cílový zákazník: domácnosti v Brně a JHM s pravidelnou spotřebou, které porovnávají ceny online (zdroj: /o-nas)
- Tón komunikace: věcný a informativní, důraz na dostupnost a rychlost expedice (zdroj: /o-nas)
- USP: zboží skladem na pobočce v Modřicích, expedice do 48 hodin, certifikované pelety ENplus A1 (zdroj: /o-nas, /pelety)
- Kanály: e-shop, Facebook, Bazoš a Google Ads na frázi „pelety Brno“ (zdroj: /o-nas)
- Věrnost: sleva 3 % pro registrované zákazníky při opakované objednávce (zdroj: /registrace)
- Obsah: návody na skladování dřeva a výpočet roční spotřeby na blogu (zdroj: /blog)
- Recenze: průměrné hodnocení 4,6 z 5 podle veřejných recenzí (zdroj: /recenze)

## SWOT

### Strengths

${bullets(BRNO_SWOT.strengths)}

### Weaknesses

${bullets(BRNO_SWOT.weaknesses)}

### Opportunities

${bullets(BRNO_SWOT.opportunities)}

### Threats

${bullets(BRNO_SWOT.threats)}

## Recommendations for podpalto.cz

1. **Srovnávací stránka Kč/kWh:** publikovat na podpalto.cz přehled pelet a briket v Kč/kWh, kde je Brněnské palivo referenční cenou v JHM.
2. **Ceníky per kraj:** vytvořit landing pages „palivové dřevo Brno cena“ a „pelety Jihomoravský kraj“ s aktuálními cenami a dojezdem.
3. **Dopravní kalkulačka:** přidat kalkulátor, který počítá paušál i kilometry, aby zákazník viděl celkovou cenu dodávky mimo Brno.
4. **Partnerství se správci bytů:** nabídnout správcům domů hromadné objednávky briket s fakturací a pravidelným dodáním.
5. **SEO klíčová slova:** cílit na „palivové dřevo Brno cena“, „pelety Brno akce“ a „brikety RUF Brno“.
6. **Sledování akcí:** týdenní monitoring slev Brněnského paliva a upozornění, když rozdíl v ceně pelet přesáhne 5 %.
7. **Měsíční cenová zpráva:** publikovat přehled změn cen v JHM a vysvětlit, proč se ceny mění, aby se zákazníci lépe orientovali.
`;

/* ------------------------------------------------------------------ */
/* 2) Palivo Říčany – prémiové suché dřevo u Prahy                    */
/* ------------------------------------------------------------------ */

const RICANY_REPORT = `# Competitor Analysis: Palivo Říčany (palivo-ricany.cz)

> Zdroj: https://www.palivo-ricany.cz · Analyzováno: 3. 11. 2026 · Agenti: web_researcher → market_analyst

## Summary

Palivo Říčany je prémiový prodejce suchého tvrdého dřeva pro Prahu-východ a Středočeský kraj. Nabízí dřevo s deklarovanou vlhkostí pod 18 %, rozvoz hydraulickou rukou přímo na pozemek a dřevěné brikety RUF. Cenově patří mezi nejdražší prodejce v okolí Prahy, ale prodává jistotu kvality a pohodlí.

Web je přehledný, obsahuje fotografie skladu, měření vlhkosti u každé dodávky a kalkulačku dopravy podle PSČ. Slabinou je úzký sortiment, bez pelet a uhlí, a chybějící ceník pro velké objemy a firemní odběratele. Pro podpalto.cz je Palivo Říčany hlavní konkurencí v segmentu prémiového dřeva ve STC.

## Offering & Pricing

Ceny jsou v Kč vč. DPH, stav k listopadu 2026. Hodnoty Kč/kWh jsou přepočítané podle výhřevnosti dřeva a briket.

| Produkt | Jednotka | Cena (Kč vč. DPH) | Kč/kWh | Zdroj |
|---|---|---|---|---|
| Tvrdé štípané dřevo, suché (<18 %), buk a dub | PRMS | 2 290 | 1,9 | /cenik |
| Tvrdé rovnané dřevo, suché | PRM | 1 980 | 1,7 | /cenik |
| Měkké štípané dřevo, smrk | PRMS | 1 450 | 1,4 | /cenik |
| Dřevěné brikety RUF, pytel 10 kg | pytel | 88 | 1,9 | /brikety |
| Dřevěné brikety RUF, paleta 600 kg | paleta | 5 340 | 1,9 | /brikety/paleta |
| Směs tvrdého dřeva, sypaná (buk, habr) | PRMS | 2 050 | 1,8 | /cenik |

### Doprava

- Hydraulická ruka: složení přímo na pozemek, příplatek 490 Kč za každou dodávku (zdroj: /doprava)
- Paušál za dopravu 350 Kč, zdarma do 15 km od Říčan (zdroj: /doprava)
- Nad 15 km účtováno 24 Kč za každý km v jedné cestě (zdroj: /doprava)
- Maximální dojezd vlastní dopravy 70 km, pokrývá Prahu a většinu Středočeského kraje (zdroj: /doprava)
- Osobní odběr v Říčanech bez poplatku po domluvě telefonicky (zdroj: /kontakt)
- Platba kartou nebo převodem, faktura do 24 hodin (zdroj: /doprava)
- Obsah: průvodce skladováním dřeva a měřením vlhkosti na blogu (zdroj: /blog)

## Positioning

- Cílový zákazník: rodiny s rodinnými domy a chalupami na Praze-východ a ve Středočeském kraji, které chtějí suché dřevo bez práce (zdroj: /o-nas)
- Tón komunikace: klidný a expertní, důraz na měření vlhkosti a kontrolu kvality (zdroj: /o-nas)
- USP: deklarovaná vlhkost pod 18 %, fotodokumentace každé dodávky, hydraulická ruka (zdroj: /doprava, /kvalita)
- Kanály: web, Instagram, Google Ads na „suché palivové dřevo Praha“ a lokální inzerce v regionu (zdroj: /kontakt)
- Věrnost: rezervace zimní dodávky s 5% slevou, pokud se objedná do 31. 8. (zdroj: /cenik)

## SWOT

### Strengths

- Suché dřevo s deklarovanou vlhkostí pod 18 % a měřením každé dodávky
- Hydraulická ruka přímo na pozemek, bez přenášení polen
- Silná lokální značka na Praze-východ a Říčansku

### Weaknesses

- Nejvyšší ceny za tvrdé dřevo v okolí Prahy
- Úzký sortiment, bez pelet a uhlí
- Chybí objemové slevy a ceník pro firemní odběratele

### Opportunities

- Rozšíření o pytlované brikety pro byty v Praze
- Předobjednávky pro domácnosti s chalupami
- Spolupráce s developery rodinných domů při prvním topení

### Threats

- Pražští prodejci s e-shopem a rychlejší expresí
- Pokles cen dřeva na konci sezóny v konkurenčním segmentu
- Rostoucí regulace kotlů v Praze může zúžit cílovou skupinu

## Recommendations for podpalto.cz

1. **Vlhkost jako standard:** u dodávek v STC uvádět naměřenou vlhkost a fotodokumentaci, aby podpalto.cz konkurovalo důvěrou, ne jen cenou.
2. **Cenové stránky pro Prahu a STC:** zveřejnit ceny prémiového dřeva za PRMS a Kč/kWh vedle levnějších variant, aby byl rozdíl srozumitelný.
3. **Hydraulická ruka u partnerů:** najít dopravce s hydraulickou rukou a nabídnout ji v kalkulaci dopravy jako volitelný příplatek.
4. **Zimní předobjednávky:** spustit slevu za objednávku do konce srpna s jasným termínem a odpočtem dostupného množství.
5. **SEO klíčová slova:** cílit na „suché palivové dřevo Praha“, „palivové dřevo Říčany“ a „dřevo s vlhkostí pod 18“.
6. **Recenze zákazníků:** po každé dodávce žádat o recenzi a zobrazovat ji na kartě prodejce a na srovnávací stránce.
7. **Mapa pokrytí:** zobrazit na webu přehled obcí, kam Palivo Říčany vozí zdarma, a srovnat je s pokrytím podpalto.cz.
`;

/* ------------------------------------------------------------------ */
/* 3) Plzeňské dřevo – tradiční pila, levné dřevo, slabý web          */
/* ------------------------------------------------------------------ */

const PLZEN_REPORT = `# Competitor Analysis: Plzeňské dřevo (plzenske-drevo.cz)

> Zdroj: https://www.plzenske-drevo.cz · Analyzováno: 28. 10. 2026 · Agenti: web_researcher → market_analyst

## Summary

Plzeňské dřevo je tradiční pila s prodejnou v okolí Plzně. Prodává výhradně palivové dřevo, převážně měkké a smíšené, a v analyzovaných datech má nejnižší ceny ze všech konkurentů. Webová prezentace je jednoduchá, bez e-shopu a s částečně neaktuálním ceníkem. Objednávky probíhají telefonicky nebo e-mailem.

Silou firmy je cena, zkušenost a vlastní zdroj surovin z pily. Zákazník z regionu ale na webu nenajde údaje o vlhkosti, délce polen ani o podmínkách dopravy. Pro podpalto.cz je Plzeňské dřevo spíše zdrojem cenové inspirace v segmentu levného dřeva než přímou konkurencí na digitálním kanálu.

## Offering & Pricing

Ceny jsou v Kč vč. DPH, stav k říjnu 2026. Ceník na webu je částečně neaktuální, proto jsou některé hodnoty ověřené telefonicky.

| Produkt | Jednotka | Cena (Kč vč. DPH) | Kč/kWh | Zdroj |
|---|---|---|---|---|
| Měkké štípané dřevo, smíšené | PRMS | 1 190 | 1,2 | /cena |
| Měkké rovnané dřevo, borovice | PRM | 1 410 | 1,4 | /cena |
| Tvrdé štípané dřevo, buk a habr, sypané | PRMS | 1 690 | 1,4 | /cena |
| Tvrdé metrovky 1 m, buk | PRM | 1 760 | 1,5 | /cena/metrovky |
| Štípané měkké dřevo, paleta (cca 1 PRM) | paleta | 1 080 | 1,2 | /cena/palety |
| Měkké štípané dřevo, smrk, sypané | PRMS | 1 230 | 1,2 | /cena |

### Doprava

- Vlastní doprava vozem pily: paušál 450 Kč v Plzni a okolí (zdroj: /doprava)
- Zdarma do 10 km od pily, nad tuto hranici 15 Kč za každý km v jedné cestě (zdroj: /doprava)
- Maximální dojezd 40 km (zdroj: /doprava)
- Hydraulická ruka není k dispozici, složení z ulice ručně za 300 Kč (zdroj: /doprava)
- Odběr přímo na pile bez poplatku, po domluvě telefonicky (zdroj: /kontakt)
- Platba v hotovosti nebo převodem, faktura na vyžádání (zdroj: /kontakt)

## Positioning

- Cílový zákazník: starší domácnosti a chalupáři v Plzeňském kraji citliví na cenu (zdroj: /o-nas)
- Tón komunikace: prostý, „poctivé dřevo od pily“, bez marketingových frází (zdroj: /o-nas)
- USP: vlastní pila, nízká cena, rodinná tradice od roku 1968 (zdroj: /o-nas)
- Kanály: telefon, e-mail, Facebook místních skupin a inzerát na Bazoši (zdroj: /kontakt)
- Web: jednoduchý informační web bez objednávkového formuláře a bez e-shopu (zdroj: /)
- Obsah: žádný blog ani návody, informace jsou jen v ceníku a při telefonátu (zdroj: /)

## SWOT

### Strengths

- Nejnižší cena měkkého i tvrdého dřeva v Plzeňském kraji
- Vlastní pila, takže minimum mezičlánků a stabilní zásoba
- Dlouhodobá tradice a důvěra místních zákazníků

### Weaknesses

- Web bez e-shopu, bez ceníku v aktuální podobě a bez fotografií
- Chybí údaje o vlhkosti, délce polen a původu dřeva
- Objednávky jen telefonicky nebo e-mailem

### Opportunities

- Digitalizace ceníku a jednoduchý objednávkový formulář
- Google Ads v regionu Plzně s nízkým rozpočtem
- Rozšíření o brikety přes stávající zákaznickou základnu

### Threats

- Rostoucí ceny surového dřeva mohou smazat cenovou výhodu
- Chybí nástupce a investice do provozu pily
- E-shopy s briketami a peletami v Plzni

## Recommendations for podpalto.cz

1. **Cenová reference v PLK:** využít Plzeňské dřevo jako nejnižší referenci pro měkké dřevo a zobrazit ji na stránce pro Plzeňský kraj.
2. **Údaje o vlhkosti:** zdůraznit u podpalto.cz deklarovanou vlhkost a délku polen, které Plzeňské dřevo na webu neuvádí.
3. **Formulář „zavolejte mi“:** nabídnout zákazníkům z Plzně jednoduchý kontakt, protože část poptávky stále běží telefonicky.
4. **Lokální inzerce:** cílit na „palivové dřevo Plzeň cena“ a „měkké dřevo Plzeň“ a využít místní Facebook skupiny.
5. **Partnerství s pilami:** oslovit menší pily v PLK jako dodavatele měkkého dřeva pro podpalto.cz s vlastní dopravou.
6. **Kalkulátor dopravy:** ukázat zákazníkovi celkovou cenu včetně paušálu a kilometrů, což Plzeňské dřevo na webu nedělá.
7. **Jednoduchý e-mailový kontakt:** zavést pro Plzeň automatickou odpověď s cenou a termínem, aby část poptávky nezůstávala bez odpovědi.
`;

/* ------------------------------------------------------------------ */
/* 4) Hradecké pelety – specialista na pelety, agresivní ceny         */
/* ------------------------------------------------------------------ */

const HRADEC_SWOT: Swot = {
  strengths: [
    "Nejnižší cena pelet ENplus A1 v Královéhradeckém kraji",
    "Doprava zdarma nad 1 t a expresní doručení do 48 hodin",
    "Skladem celoročně, i v sezóně s vysokou poptávkou",
    "Silná obchodní značka v Hradci Králové a okolních obcích",
  ],
  weaknesses: [
    "Úzký sortiment, bez dřeva a uhlí",
    "Omezený dojezd a nutnost vysokozdvižného vozíku při vykládce",
    "Na webu chybí podrobnější údaje o původu a kvalitě pelet",
    "Závislost na jednom druhu paliva a citlivost na výkyvy ceny surovin",
  ],
  opportunities: [
    "Rozšíření o pytlové pelety pro menší domácnosti a chalupy",
    "Spolupráce s instalatéry a servisy pelletových kotlů",
    "Letní předobjednávky s výhodnou cenou",
    "Vstup do briket v rámci stejné logistiky",
  ],
  threats: [
    "Cenová válka v kategorii pelet, která může snížit marži i podpalto.cz",
    "Dobře optimalizované Google Ads v regionu Hradce Králové",
    "Rostoucí poptávka po peletách může přilákat další levné prodejce",
    "Případné zpřísnění dotací na pelety pro domácnosti",
  ],
};

const HRADEC_REPORT = `# Competitor Analysis: Hradecké pelety (hradecke-pelety.cz)

> Zdroj: https://www.hradecke-pelety.cz · Analyzováno: 21. 10. 2026 · Agenti: web_researcher → market_analyst

## Summary

Hradecké pelety jsou specialista na pelety ENplus A1 a DINplus v Královéhradeckém kraji a části Pardubického. Cenovou strategií přímo útočí na podpalto.cz: pelety A1 nabízí zhruba o 8 až 12 % levněji než průměr ČR a objednávky nad 1 t dopravují zdarma v celém dosahu. Vedle pelet prodávají brikety RUF.

Web je jednoduchý, ale rychlý, s kalkulačkou úspory oproti plynu a výrazným banner „nejnižší cena v kraji“. Firma tak vytváří silný cenový tlak v kategorii pelet. Slabinou je úzký sortiment bez dřeva a uhlí a omezený dojezd. Hrozba pro podpalto.cz je vysoká, zejména v HKK a PAK.

## Offering & Pricing

Ceny jsou v Kč vč. DPH, stav k říjnu 2026. Pelety jsou nabízeny volně ložené, v pytlích a na paletách.

| Produkt | Jednotka | Cena (Kč vč. DPH) | Kč/kWh | Zdroj |
|---|---|---|---|---|
| Pelety ENplus A1, volně ložené | t | 6 990 | 1,4 | /pelety |
| Pelety ENplus A1, pytel 15 kg | pytel | 109 | 1,5 | /pelety/pytle |
| Pelety DINplus, volně ložené | t | 6 750 | 1,4 | /pelety/dinplus |
| Pelety ENplus A1, paleta 60 pytlů (900 kg) | paleta | 6 310 | 1,4 | /pelety/palety |
| Dřevěné brikety RUF, pytel 10 kg | pytel | 79 | 1,7 | /brikety |
| Dřevěné brikety RUF, paleta 600 kg | paleta | 4 690 | 1,7 | /brikety/paleta |
| Pelety ENplus A1, big bag 1 000 kg | t | 6 890 | 1,4 | /pelety/bigbag |

### Doprava

- Doprava zdarma při objednávce nad 1 t pelet v dosahu 50 km (zdroj: /doprava)
- Paušál 290 Kč do 20 km, za každý km nad 20 km 14 Kč v jedné cestě (zdroj: /doprava)
- Maximální dojezd 80 km (zdroj: /doprava)
- Hydraulická ruka není k dispozici, palety se dodávají s vysokozdvižným vozíkem (zdroj: /doprava)
- Expresní doručení pelet do 48 hodin v Hradci Králové a okolí (zdroj: /doprava)
- Vykládka do garáže nebo haly za příplatek 150 Kč (zdroj: /doprava)

## Positioning

- Cílový zákazník: majitelé domů s pelletovými kotli, citliví na cenu a na roční úspory (zdroj: /o-nas)
- Tón komunikace: agresivní a cenově orientovaný, s konkrétními sliby typu „ušetříte X Kč ročně“ (zdroj: /o-nas)
- USP: nejnižší cena pelet v kraji, doprava zdarma nad 1 t, celoroční skladem (zdroj: /cenik)
- Kanály: Google Ads na „pelety cena Hradec Králové“, Facebook, srovnávače cen a Bazoš s pravidelnými akcemi (zdroj: /o-nas, /kontakt)
- Web: kalkulačka úspory oproti plynu jako hlavní konverzní nástroj (zdroj: /)
- Obsah: články o úsporách a výpočtu spotřeby pelet (zdroj: /blog)

## SWOT

### Strengths

${bullets(HRADEC_SWOT.strengths)}

### Weaknesses

${bullets(HRADEC_SWOT.weaknesses)}

### Opportunities

${bullets(HRADEC_SWOT.opportunities)}

### Threats

${bullets(HRADEC_SWOT.threats)}

## Recommendations for podpalto.cz

1. **Cenová obrana v peletách:** v HKK a PAK pravidelně porovnávat cenu ENplus A1 s Hradeckými peletami a držet cenovou hladinu v toleranci 3 %.
2. **Doprava zdarma nad 1 t:** otestovat stejný práh v kraji HKK, aby podpalto.cz nebylo v rozhodování o objednávce znevýhodněno.
3. **Placená inzerce:** cílit na „pelety Hradec Králové cena“ a „pelety ENplus A1 Hradec“, kde Hradecké pelety investují do Google Ads.
4. **Letní předobjednávky:** nabídnout výhodnou cenu za předobjednávku pelet v červnu až srpnu s pevně danou dodávkou na podzim.
5. **Servisní partnerství:** oslovit instalatéry a servisy pelletových kotlů v KHK a nabídnout jim provizi za doporučení.
6. **Týdenní sledování hrozby:** zavést automatické hlídání cen Hradeckých pelet a upozornění při změně nad 5 %.
7. **Obsah o úsporách:** publikovat srovnání nákladů na vytápění peletami a dřevem v Kč/kWh pro region HKK.
`;

/* ------------------------------------------------------------------ */
/* 5) Ostravské uhlí a dřevo – uhlí, dřevo, regulace                  */
/* ------------------------------------------------------------------ */

const OSTRAVA_SWOT: Swot = {
  strengths: [
    "Jediný analyzovaný prodejce s širokou nabídkou uhlí, dřeva i briket",
    "Sklad s vlastní váhou a osobním odběrem, nízké náklady na logistiku",
    "Nejlevnější hnědé uhlí ořech 2 v Moravskoslezském kraji",
    "Dlouholetá zkušenost s odběrem domácností v kraji",
  ],
  weaknesses: [
    "Zastaralý web bez e-shopu a bez online objednávek",
    "Ceník je jen v PDF, bez přepočtu Kč/kWh a bez údajů o vlhkosti dřeva",
    "Slabá viditelnost ve výsledcích vyhledávání mimo lokální dotazy",
    "Chybějící online objednávky a pomalá odezva na dotazy",
  ],
  opportunities: [
    "Přechod zákazníků z uhlí na brikety a dřevo, které nepodléhá omezení",
    "Digitalizace ceníku s porovnáním Kč/kWh",
    "Dotační programy na výměnu kotlů jako příležitost k prodeji dřeva a briket",
    "Dodávky briket pro obce a příspěvkové organizace",
  ],
  threats: [
    "Plánované omezení uhelných kotlů a přísnější emisní limity pro tuhá paliva v MSK",
    "Pokles poptávky po hnědém uhlí, který může vést k výprodejům a tlaku na marži",
    "Konkurence levného dřeva z regionálních pil a e-shopů",
    "Vyšší náklady na dopravu těžkými vozy v městské zástavbě",
  ],
};

const OSTRAVA_REPORT = `# Competitor Analysis: Ostravské uhlí a dřevo (ostravske-uhli-a-drevo.cz)

> Zdroj: https://www.ostravske-uhli-a-drevo.cz · Analyzováno: 8. 10. 2026 · Agenti: web_researcher → market_analyst

## Summary

Ostravské uhlí a dřevo je tradiční skladový prodejce v Ostravě a okolí. Nabízí hnědé uhlí, palivové dřevo a dřevěné brikety. Je to jediný z analyzovaných konkurentů s výraznou nabídkou uhlí, a hnědé uhlí ořech 2 zde stojí nejméně v kraji.

Web je starší a bez e-shopu, ceny jsou psané v PDF ceníku. Firma reaguje na regulaci tím, že uhlí doplňuje o dřevo a brikety jako přechodové řešení pro domácnosti. Vzhledem k plánovanému omezení uhelných kotlů v MSK a emisním limitům pro tuhá paliva je dlouhodobý prostor pro uhlí omezený. Pro podpalto.cz je to příležitost v segmentu dřeva a briket v kraji.

## Offering & Pricing

Ceny jsou v Kč vč. DPH, stav k říjnu 2026. Uhlí se prodává výhradně na tunu a odběr je možný jen s přístupem nákladního vozu.

| Produkt | Jednotka | Cena (Kč vč. DPH) | Kč/kWh | Zdroj |
|---|---|---|---|---|
| Hnědé uhlí ořech 2 | t | 4 690 | 1,0 | /uhli |
| Hnědé uhlí kostka | t | 5 240 | 1,1 | /uhli |
| Tvrdé štípané dřevo, sypané (buk, dub) | PRMS | 1 950 | 1,6 | /drevo |
| Měkké štípané dřevo, smrk, sypané | PRMS | 1 280 | 1,2 | /drevo |
| Dřevěné brikety RUF, pytel 10 kg | pytel | 84 | 1,8 | /brikety |
| Dřevěné brikety RUF, paleta 600 kg | paleta | 4 980 | 1,8 | /brikety/paleta |
| Štípané dřevo, paleta (cca 1 PRM), buk | paleta | 1 690 | 1,4 | /drevo/palety |

### Doprava

- Vlastní doprava nákladním vozem: paušál 490 Kč na území Ostravy (zdroj: /doprava)
- Zdarma do 12 km od skladu, za každý km nad tuto hranici 19 Kč v jedné cestě (zdroj: /doprava)
- Maximální dojezd 45 km (zdroj: /doprava)
- Uhlí a palety se dodávají pouze na pozemek s přístupem nákladního vozu, hydraulická ruka není k dispozici (zdroj: /doprava)
- Osobní odběr ze skladu bez poplatku (zdroj: /kontakt)
- Platba v hotovosti při odběru nebo převodem, faktura e-mailem (zdroj: /kontakt)

## Positioning

- Cílový zákazník: domácnosti s tuhými kotli v Ostravě a okolí, včetně starších topenišť a sociálně citlivých segmentů (zdroj: /o-nas)
- Tón komunikace: tradiční, věcný, bez marketingových frází (zdroj: /o-nas)
- USP: široká nabídka uhlí i dřeva na jednom místě, vlastní váha na skladu, osobní odběr (zdroj: /o-nas)
- Kanály: místní inzerce, tištěné letáky, Bazoš a Facebook (zdroj: /kontakt)
- Web: pouze statický ceník v PDF bez Google Ads a bez online objednávky (zdroj: /cenik)
- Kontakt: telefon a osobní návštěva skladu v pracovní době (zdroj: /kontakt)

## SWOT

### Strengths

${bullets(OSTRAVA_SWOT.strengths)}

### Weaknesses

${bullets(OSTRAVA_SWOT.weaknesses)}

### Opportunities

${bullets(OSTRAVA_SWOT.opportunities)}

### Threats

${bullets(OSTRAVA_SWOT.threats)}

## Recommendations for podpalto.cz

1. **Brikety místo uhlí:** na podpalto.cz zdůraznit brikety RUF a dřevo jako čistší alternativu pro domácnosti v MSK.
2. **Obsah o emisních limitech:** připravit přehled regulace tuhých paliv v Moravskoslezském kraji a přechodných řešení, která pomohou zákazníkům s plánováním.
3. **Kalkulačka dotací:** přidat přehled dotací na výměnu kotle s odkazem na prodej dřeva a briket, které jsou pro nové kotle vhodné.
4. **Kč/kWh pro MSK:** zveřejnit srovnání uhlí, dřeva a briket v Kč/kWh na stránce pro Moravskoslezský kraj.
5. **SEO klíčová slova:** cílit na „brikety Ostrava cena“, „palivové dřevo Ostrava“ a „dřevěné brikety RUF Ostrava“.
6. **Opatrnost u uhlí:** kategorii uhlí zatím neotevírat a sledovat regulaci, aby podpalto.cz neinvestovalo do segmentu s klesající perspektivou.
7. **Kontaktní formulář:** nabídnout Ostravě objednávku s odběrem v předem domluveném termínu, který nahradí telefonickou komunikaci.
`;

/* ------------------------------------------------------------------ */
/* Seznam reportů                                                      */
/* ------------------------------------------------------------------ */

export const REPORTS: CrewAnalysisReport[] = [
  {
    id: "20261112-160933_https-www-brnenske-palivo-cz",
    competitor_url: "https://www.brnenske-palivo.cz",
    competitor_name: "Brněnské palivo",
    competitor_domain: "brnenske-palivo.cz",
    created_at: "2026-11-12T16:09:33Z",
    status: "completed",
    model: "anthropic/claude-opus-5-5",
    duration_s: 312,
    report: BRNO_REPORT,
    report_path: "outputs/20261112-160933_https-www-brnenske-palivo-cz.md",
    seller_id: "s19",
    region: "JHM",
    categories: ["wood", "pellets", "briquettes"],
    swot: BRNO_SWOT,
  },
  {
    id: "20261103-091512_https-www-palivo-ricany-cz",
    competitor_url: "https://www.palivo-ricany.cz",
    competitor_name: "Palivo Říčany",
    competitor_domain: "palivo-ricany.cz",
    created_at: "2026-11-03T09:15:12Z",
    status: "completed",
    model: "anthropic/claude-opus-5-5",
    duration_s: 241,
    report: RICANY_REPORT,
    report_path: "outputs/20261103-091512_https-www-palivo-ricany-cz.md",
    seller_id: "s01",
    region: "STC",
    categories: ["wood", "briquettes"],
  },
  {
    id: "20261028-143005_https-www-plzenske-drevo-cz",
    competitor_url: "https://www.plzenske-drevo.cz",
    competitor_name: "Plzeňské dřevo",
    competitor_domain: "plzenske-drevo.cz",
    created_at: "2026-10-28T14:30:05Z",
    status: "completed",
    model: "anthropic/claude-opus-5-5",
    duration_s: 178,
    report: PLZEN_REPORT,
    report_path: "outputs/20261028-143005_https-www-plzenske-drevo-cz.md",
    seller_id: "s07",
    region: "PLK",
    categories: ["wood"],
  },
  {
    id: "20261021-110247_https-www-hradecke-pelety-cz",
    competitor_url: "https://www.hradecke-pelety.cz",
    competitor_name: "Hradecké pelety",
    competitor_domain: "hradecke-pelety.cz",
    created_at: "2026-10-21T11:02:47Z",
    status: "completed",
    model: "anthropic/claude-opus-5-5",
    duration_s: 365,
    report: HRADEC_REPORT,
    report_path: "outputs/20261021-110247_https-www-hradecke-pelety-cz.md",
    seller_id: "s14",
    region: "HKK",
    categories: ["pellets", "briquettes"],
    swot: HRADEC_SWOT,
  },
  {
    id: "20261008-084520_https-www-ostravske-uhli-a-drevo-cz",
    competitor_url: "https://www.ostravske-uhli-a-drevo.cz",
    competitor_name: "Ostravské uhlí a dřevo",
    competitor_domain: "ostravske-uhli-a-drevo.cz",
    created_at: "2026-10-08T08:45:20Z",
    status: "completed",
    model: "anthropic/claude-opus-5-5",
    duration_s: 296,
    report: OSTRAVA_REPORT,
    report_path: "outputs/20261008-084520_https-www-ostravske-uhli-a-drevo-cz.md",
    seller_id: "s25",
    region: "MSK",
    categories: ["coal", "wood", "briquettes"],
    swot: OSTRAVA_SWOT,
  },
];
