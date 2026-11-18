-- podpalto.cz – ukázková data (vygenerováno scripts/generate-seed.mjs)
-- Spuštění: Supabase SQL Editor (celý soubor). Opakované spuštění nic nezdvojí.

-- ---------------------------------------------------------------------------
-- Prodejci
-- ---------------------------------------------------------------------------
insert into public.sellers (id, slug, name, legal_name, ico, website, phone, email, description, photo_url,
  street, city, zip, district, region, lat, lng, size, founded_year, tags,
  own_delivery, hydraulic_arm, pickup_available, delivery_base_fee, delivery_price_per_km, delivery_free_radius_km,
  delivery_free_over_quantity, hydraulic_arm_fee, delivery_max_radius_km, delivery_notes,
  external_rating, external_review_count, external_rating_source, status, source, last_scraped_at)
values
('fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 'palivo-ricany', 'Palivo Říčany', 'Palivo Říčany s.r.o.', '27891045', 'https://www.palivo-ricany.cz', '+420 603 214 880', 'info@palivo-ricany.cz', 'Rodinná firma z Říčan prodávající suché tvrdé dřevo a certifikované pelety pro domácnosti na Praze-východ. Dřevo skladujeme pod střechou a dovážíme vlastním vozem s hydraulickou rukou.', null, 'Pražská 412', 'Říčany', '251 01', 'Praha-východ', 'STC', 49.9902, 14.6601, 'medium', 2009, array['skladem', 'enplus-a1', 'suche-18', 'vlastni-doprava', 'hydraulicka-ruka']::public.seller_tag[], true, true, true, 590, 32, 10, 6, 450, 80, 'Doprava zdarma do 10 km od Říčan při odběru od 6 PRMS. Složení hydraulickou rukou za 450 Kč, do 5 min. od vozu.', 4.6, 318, 'import (demo)', 'active', 'scraper', '2026-11-13T09:00:00.000Z'),
('7ebffe5b-1517-8d95-2909-185664e23dd3', 'drevo-zbraslav', 'Dřevo Zbraslav', 'Dřevo Zbraslav s.r.o.', '04162375', 'https://www.drevo-zbraslav.cz', '+420 777 512 046', 'info@drevo-zbraslav.cz', 'Malý prodejce palivového dřeva ze Zbraslavi v Praze 5. Nabízíme suché štípané dřevo, rovnaná polena i pelety v pytlích pro byty s krby i rodinné domy.', null, 'Mostecká 58', 'Praha-Zbraslav', '156 00', 'Praha 5', 'PHA', 49.9688, 14.3977, 'small', 2014, array['skladem', 'enplus-a1', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'platba-kartou']::public.seller_tag[], true, false, true, 390, 28, 15, 6, null, 60, 'Doprava zdarma v okruhu 15 km od Zbraslavi při odběru od 6 PRMS. Palety dovážíme vlastním vozem s nakladačem bez hydraulické ruky.', 4.8, 187, 'import (demo)', 'active', 'scraper', '2026-11-08T09:00:00.000Z'),
('779d7f55-701f-1e58-48cf-32e3f61cc416', 'pelety-kladno', 'Pelety Kladno', 'Pelety Kladno s.r.o.', '26114578', 'https://www.pelety-kladno.cz', '+420 606 318 975', 'info@pelety-kladno.cz', 'Specialista na pelety a brikety z Kladna. Prodáváme ENplus A1 i A2 v paletách, pytlích a volně ložené na tuny, plus dřevěné brikety RUF a PINI KAY.', null, 'Dubská 1186', 'Kladno', '272 01', 'Kladno', 'STC', 50.1412, 14.1095, 'medium', 2006, array['skladem', 'enplus-a1', 'osobni-odber', 'vlastni-doprava', 'platba-kartou']::public.seller_tag[], true, false, true, 450, 24, 12, 3, null, 70, 'Při odběru 3 palet a více doprava zdarma v okruhu 12 km. Volně ložené pelety vyváží nákladní auto se sklápěčem.', 4.5, 412, 'import (demo)', 'active', 'scraper', '2026-11-05T09:00:00.000Z'),
('13039dcf-c9ec-be40-ce22-52b10f4ce593', 'krivoklatske-drevo', 'Křivoklátské dřevo', 'Křivoklátské dřevo s.r.o.', '45112897', 'https://www.krivoklatske-drevo.cz', '+420 732 904 157', 'info@krivoklatske-drevo.cz', 'Lesní pila a prodej palivového dřeva z Rakovnicka. Dřevo štípeme z místní těžby, sušíme na dvoře a prodáváme sypané i metrovky pro chalupy a rodinné domy.', null, 'Lidická 1024', 'Rakovník', '269 01', 'Rakovník', 'STC', 50.1098, 13.7281, 'small', 1998, array['suche-18', 'vlastni-doprava', 'osobni-odber']::public.seller_tag[], true, false, true, 690, 30, 0, 6, null, 50, 'Dopravu účtujeme od prvního kilometru, při odběru od 6 PRMS je základní paušál poloviční. Odběr na dvoře v Rakovníku bez poplatku.', 4.7, 96, 'import (demo)', 'active', 'scraper', '2026-11-02T09:00:00.000Z'),
('19875aca-124f-99c0-ba40-78bc2b1bc8d5', 'sumava-palivo', 'Šumava Palivo', 'Šumava Palivo s.r.o.', '28765310', 'https://www.sumava-palivo.cz', '+420 608 441 265', 'info@sumava-palivo.cz', 'Palivové dřevo a pelety z Prachatic a okolí Šumavy. Ceny držíme nízko díky místním zdrojům a jednoduché logistice v jižních Čechách.', null, 'Vodní 240', 'Prachatice', '383 01', 'Prachatice', 'JHC', 49.0185, 14.0061, 'small', 2012, array['skladem', 'suche-18', 'doprava-zdarma', 'vlastni-doprava', 'osobni-odber']::public.seller_tag[], true, false, true, 350, 22, 20, 6, null, 90, 'Doprava zdarma do 20 km od Prachatic při objednávce od 6 PRMS. Pelety ve velkoobjemových pytlích dovážíme na dvůr.', 4.4, 58, 'import (demo)', 'active', 'scraper', '2026-11-10T09:00:00.000Z'),
('42960afa-3a32-95de-284e-58ecd3f7ae0a', 'budejovicke-uhelne-sklady', 'Budějovické uhelné sklady', 'Budějovické uhelné sklady a.s.', '25194381', 'https://www.budejovicke-uhelne-sklady.cz', '+420 725 880 139', 'info@budejovicke-uhelne-sklady.cz', 'Uhelný sklad v Českých Budějovicích s nakládkou na vlastním dvoře. Prodáváme hnědé a černé uhlí, koks i hnědouhelné brikety na tuny i v pytlích.', null, 'Mánesova 67', 'České Budějovice', '370 04', 'České Budějovice', 'JHC', 48.9688, 14.4815, 'medium', 1994, array['skladem', 'osobni-odber', 'platba-kartou']::public.seller_tag[], false, false, true, 0, 0, 0, null, null, 0, 'Pouze osobní odběr na dvoře v Českých Budějovicích, nakládka nakladačem. Dopravu si zajistí zákazník vlastním vozem nebo přepravcem.', 4.3, 221, 'import (demo)', 'active', 'scraper', '2026-11-04T09:00:00.000Z'),
('41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 'plzenske-drevo', 'Plzeňské dřevo', 'Plzeňské dřevo s.r.o.', '25879214', 'https://www.plzenske-drevo.cz', '+420 602 170 548', 'info@plzenske-drevo.cz', 'Největší prodejce palivového dřeva v Plzni a okolí. Nabízíme suché a polosuché štípané dřevo, rovnané PRM i pelety ENplus A1 s dopravou hydraulickou rukou.', null, 'Borská 1520', 'Plzeň', '326 00', 'Plzeň-město', 'PLK', 49.7449, 13.3618, 'large', 2001, array['skladem', 'enplus-a1', 'suche-18', 'hydraulicka-ruka', 'vlastni-doprava', 'doprava-zdarma']::public.seller_tag[], true, true, true, 490, 26, 15, 6, 380, 100, 'Doprava zdarma v okruhu 15 km od Plzně při odběru od 6 PRMS. Složení hydraulickou rukou za 380 Kč.', 4.7, 462, 'import (demo)', 'active', 'scraper', '2026-11-14T09:00:00.000Z'),
('61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 'chodsko-pelety', 'Chodsko Pelety', 'Chodsko Pelety s.r.o.', '06518240', 'https://www.chodsko-pelety.cz', '+420 739 226 401', 'info@chodsko-pelety.cz', 'Mladá firma z Domažlic zaměřená na pelety a brikety pro domácnosti na Chodsku. Pelety prodáváme v paletách i pytlích, dřevo doplňkově.', null, 'Pivovarská 88', 'Domažlice', '344 01', 'Domažlice', 'PLK', 49.4337, 12.9362, 'small', 2016, array['enplus-a1', 'suche-18', 'osobni-odber', 'vlastni-doprava']::public.seller_tag[], true, false, true, 620, 38, 0, 3, null, 45, 'Palety vozíme vlastním vozem s čelem, při odběru 3 palet a více je doprava v okruhu 10 km zdarma.', 4.2, 34, 'import (demo)', 'active', 'scraper', '2026-10-31T09:00:00.000Z'),
('64a0aa23-18dd-9e88-8161-c85d3922af7e', 'krusnohorske-drevo', 'Krušnohorské dřevo', 'Krušnohorské dřevo s.r.o.', '46287139', 'https://www.krusnohorske-drevo.cz', '+420 774 395 082', 'info@krusnohorske-drevo.cz', 'Prodej dřeva a pelet z Karlovarska, s důrazem na suché buky a bříze pro krby. Dřevo sušíme ve vlastní sušárně pod Krušnými horami.', null, 'Sokolovská 1199', 'Karlovy Vary', '360 01', 'Karlovy Vary', 'KVK', 50.24, 12.864, 'medium', 1993, array['skladem', 'enplus-a1', 'suche-18', 'vlastni-doprava']::public.seller_tag[], true, false, true, 520, 34, 8, 6, null, 70, 'Doprava zdarma do 8 km od Karlových Varů při odběru od 6 PRMS.', 4.5, 143, 'import (demo)', 'active', 'scraper', '2026-11-07T09:00:00.000Z'),
('76eadb9e-22f8-d917-b0b3-2e189ffb9afd', 'uhelne-sklady-most', 'Uhelné sklady Most', 'Uhelné sklady Most s.r.o.', '26089436', 'https://www.uhelne-sklady-most.cz', '+420 605 127 934', 'info@uhelne-sklady-most.cz', 'Uhelný sklad v Mostě s nejlevnějším hnědým uhlím v kraji. Pouze osobní odběr, nakládka do vlastního vozu nebo do přívěsu.', null, 'Chomutovská 1245', 'Most', '434 01', 'Most', 'ULK', 50.5097, 13.6289, 'small', 2011, array['skladem', 'osobni-odber', 'platba-kartou']::public.seller_tag[], false, false, true, 0, 0, 0, null, null, 0, 'Pouze osobní odběr na skladu v Mostě, nakládka do vlastního vozidla nebo přívěsu. Doprava se nezajišťuje.', 4.1, 27, 'import (demo)', 'active', 'scraper', '2026-10-29T09:00:00.000Z'),
('9dad5075-f9ee-d773-cf7b-695a98b3ff6e', 'polabske-drevo', 'Polabské dřevo', 'Polabské dřevo s.r.o.', '45871230', 'https://www.polabske-drevo.cz', '+420 731 468 209', 'info@polabske-drevo.cz', 'Dřevo z Litoměřicka pro domácnosti v okolí Labe. Nabízíme suché štípané dřevo, čerstvé dřevo na sušení i metrovky pro zpracování vlastní pilou.', null, 'Terezínská 98', 'Litoměřice', '412 01', 'Litoměřice', 'ULK', 50.5289, 14.1401, 'medium', 2002, array['suche-18', 'vlastni-doprava', 'doprava-zdarma', 'fsc-pefc']::public.seller_tag[], true, false, true, 360, 24, 25, 6, null, 60, 'Doprava zdarma v okruhu 25 km od Litoměřic při odběru od 6 PRMS. Metrovky připravujeme na paletu na objednávku.', 4.6, 265, 'import (demo)', 'active', 'scraper', '2026-11-11T09:00:00.000Z'),
('daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', 'jizerske-palivo', 'Jizerské palivo', 'Jizerské palivo s.r.o.', '07124658', 'https://www.jizerske-palivo.cz', '+420 603 892 514', 'info@jizerske-palivo.cz', 'Malý prodejce z Liberce s dřevem z jizerských lesů, pelety A2 a válcovými briketami. Expresní expedice do 48 hodin v rámci Liberce a okolí.', null, 'Vratislavická 720', 'Liberec', '460 01', 'Liberec', 'LBK', 50.7701, 15.0481, 'small', 2015, array['suche-18', 'vlastni-doprava', 'expres-48h', 'osobni-odber']::public.seller_tag[], true, false, true, 580, 36, 0, 6, null, 55, 'Doprava se účtuje od prvního kilometru, při odběru od 6 PRMS je zdarma v Liberci. Expres do 48 h u skladem položek.', 4.2, 61, 'import (demo)', 'active', 'scraper', '2026-11-12T09:00:00.000Z'),
('f188079d-4521-4a7d-7972-01a52e60f9ae', 'podkrkonosske-drevo', 'Podkrkonošské dřevo', 'Podkrkonošské dřevo s.r.o.', '27644918', 'https://www.podkrkonosske-drevo.cz', '+420 776 033 651', 'info@podkrkonosske-drevo.cz', 'Prodej štípaného dřeva z Trutnovska se složením hydraulickou rukou. Sypané dřevo, rovnané PRM i bříza pro krb, vše skladem na dvoře v Trutnově.', null, 'Krkonošská 301', 'Trutnov', '541 01', 'Trutnov', 'HKK', 50.5638, 15.9052, 'medium', 2007, array['skladem', 'suche-18', 'hydraulicka-ruka', 'vlastni-doprava']::public.seller_tag[], true, true, true, 420, 27, 20, 6, 350, 100, 'Doprava zdarma do 20 km od Trutnova při odběru od 6 PRMS. Složení hydraulickou rukou za 350 Kč.', 4.7, 198, 'import (demo)', 'active', 'scraper', '2026-11-09T09:00:00.000Z'),
('977cb757-32fe-e7bf-9837-ded81ac1cb40', 'hradecke-pelety', 'Hradecké pelety', 'Hradecké pelety s.r.o.', '27561843', 'https://www.hradecke-pelety.cz', '+420 603 118 264', 'info@hradecke-pelety.cz', 'Regionální prodejce pelet ENplus A1 a A2 pro Hradecko a Pardubicko s rozvozem paletových objednávek. Doplňkově nabízí buková štípaná dřeva ze skladu u Hradce Králové.', null, 'Pražská 412', 'Hradec Králové', '500 02', null, 'HKK', 50.2148, 15.8207, 'medium', 2011, array['skladem', 'enplus-a1', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, false, true, 390, 24, 15, 3, null, 60, 'Doprava zdarma do 15 km od skladu a u paletových objednávek nad 3 palety. Paletu skládá řidič z vozíku, hydraulická ruka není k dispozici.', 4.7, 214, 'import (demo)', 'active', 'scraper', '2026-11-13T09:00:00.000Z'),
('bb891faf-b442-df04-95aa-30f297c30404', 'palivo-pardubice', 'Palivo Pardubice', 'Palivo Pardubice s.r.o.', '26093418', 'https://www.palivo-pardubice.cz', '+420 604 552 917', 'info@palivo-pardubice.cz', 'Pardubický prodejce tvrdého i měkkého palivového dřeva s rozšířenou nabídkou březového dřeva a hnědého uhlí pro domácnosti i menší firmy.', null, 'Teplého 1123', 'Pardubice', '530 02', null, 'PAK', 50.0292, 15.7866, 'medium', 2004, array['skladem', 'hydraulicka-ruka', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, true, true, 490, 28, 10, 6, 450, 80, 'Vlastní vozy s hydraulickou rukou dovezou dřevo do 80 km. Doprava v okruhu 10 km zdarma, nad 6 PRMS bez paušálu.', 4.4, 187, 'import (demo)', 'active', 'scraper', '2026-11-10T09:00:00.000Z'),
('bd3ca541-8923-405d-8d92-91a51cfb4eaa', 'orlicke-drevo', 'Orlické dřevo', 'Orlické dřevo s.r.o.', '25841072', 'https://www.orlicke-drevo.cz', '+420 728 340 615', 'info@orlicke-drevo.cz', 'Rodinná pila a prodejce dřeva z Orlických hor. Specializuje se na měkké dřevo a metrovky a dováží na objednávku v okruhu 50 km.', null, 'Průmyslová 287', 'Ústí nad Orlicí', '562 01', null, 'PAK', 49.9781, 16.3868, 'small', 2012, array['skladem', 'suche-18', 'vlastni-doprava', 'osobni-odber']::public.seller_tag[], true, false, true, 620, 32, 0, 6, null, 50, 'Dovoz vlastním vozidlem do 50 km, dřevo se skládá na zem u zákazníka. Objednávka nad 6 PRMS jede bez paušálu.', 4.1, 58, 'import (demo)', 'active', 'scraper', '2026-11-07T09:00:00.000Z'),
('f78d875b-4f24-be8e-094b-302e4920a050', 'drevo-vysocina', 'Dřevo Vysočina', 'Dřevo Vysočina s.r.o.', '28317609', 'https://www.drevo-vysocina.cz', '+420 606 219 873', 'info@drevo-vysocina.cz', 'Jihlavský dodavatel palivového dřeva s nejnižšími cenami tvrdého dřeva na Vysočině. Nabízí sypané i rovnané dřevo a složení hydraulickou rukou.', null, 'Jamská 45', 'Jihlava', '586 01', null, 'VYS', 49.4012, 15.5978, 'medium', 2009, array['platba-kartou', 'skladem', 'hydraulicka-ruka', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, true, true, 320, 22, 25, 6, 380, 90, 'Doprava zdarma do 25 km od Jihlavy. Hydraulická ruka dovezeme dřevo i na místa bez příjezdu nákladního vozu.', 4.6, 312, 'import (demo)', 'active', 'scraper', '2026-11-14T09:00:00.000Z'),
('a560021b-9876-ea92-655f-d03e94bec651', 'zdarske-pelety', 'Žďárské pelety', 'Žďárské pelety a.s.', '27904156', 'https://www.zdarske-pelety.cz', '+420 732 905 148', 'info@zdarske-pelety.cz', 'Specialista na pelety ENplus A1 a dřevěné brikety pro zákazníky, kteří topí automatickým kotlem nebo kamny na pelety. Dodává převážně paletově.', null, 'Vídeňská 1184', 'Žďár nad Sázavou', '591 01', null, 'VYS', 49.558, 15.9448, 'small', 2016, array['skladem', 'enplus-a1', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, false, true, 480, 26, 12, 3, null, 70, 'Pelety a brikety rozvážíme na paletách, nad 3 palety bez poplatku v okruhu 12 km. Vykládka paletovým vozíkem bez hydraulické ruky.', 4.3, 96, 'import (demo)', 'active', 'scraper', '2026-11-12T09:00:00.000Z'),
('2f30f387-bd92-7ab7-ea3c-14543226ea78', 'brnenske-palivo', 'Brněnské palivo', 'Brněnské palivo a.s.', '26471285', 'https://www.brnenske-palivo.cz', '+420 777 014 226', 'info@brnenske-palivo.cz', 'Největší brněnský dodavatel palivového dřeva, pelet a služeb. Nabízí nejširší výběr dřevin a forem v Jihomoravském kraji s vlastní flotilou a expresním rozvozem.', null, 'Křenová 61', 'Brno', '602 00', null, 'JHM', 49.2019, 16.6121, 'large', 2001, array['platba-kartou', 'expres-48h', 'skladem', 'hydraulicka-ruka', 'enplus-a1', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, true, true, 690, 38, 8, 6, 550, 100, 'Vlastní flotila s hydraulickou rukou, dojezd do 100 km. Doprava v okruhu 8 km od Brna zdarma, expresní rozvoz do 48 hodin v rámci kraje.', 4.8, 412, 'import (demo)', 'active', 'scraper', '2026-11-15T09:00:00.000Z'),
('8ec05a23-7324-f048-4bd7-b38b6ca94185', 'znojemske-drevo', 'Znojemské dřevo', 'Znojemské dřevo s.r.o.', '25613947', 'https://www.znojemske-drevo.cz', '+420 739 468 052', 'info@znojemske-drevo.cz', 'Dřevo z jižní Moravy, především dub a habr. Zákazníci si objednávky vyzvedávají na skladu ve Znojmě.', null, 'Dyjská 14', 'Znojmo', '669 02', null, 'JHM', 48.8612, 16.043, 'small', 1998, array['skladem', 'suche-18', 'osobni-odber']::public.seller_tag[], false, false, true, 0, 0, 0, null, null, 0, 'Pouze osobní odběr na skladu ve Znojmě, Dyjská 14. Dopravu zajišťuje zákazník vlastním vozem nebo přepravcem.', 4.2, 73, 'import (demo)', 'active', 'scraper', '2026-11-04T09:00:00.000Z'),
('07a9e77b-0877-afe7-866d-425eb604f2a5', 'hanacke-palivo', 'Hanácké palivo', 'Hanácké palivo s.r.o.', '28105734', 'https://www.hanacke-palivo.cz', '+420 601 735 089', 'info@hanacke-palivo.cz', 'Olomoucký dodavatel tvrdého dřeva, pelet a briket, který v nabídce drží i hnědé uhlí. Ceny patří k nižšímu pásmu v regionu.', null, 'Tovární 22', 'Olomouc', '779 00', null, 'OLK', 49.5876, 17.2573, 'medium', 2007, array['skladem', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, false, true, 360, 24, 20, 6, null, 60, 'Rozvoz po Olomouckém kraji vlastními vozy, do 20 km zdarma. Nad 6 PRMS nebo 6 t se paušál za dopravu neúčtuje.', 4.5, 264, 'import (demo)', 'active', 'scraper', '2026-11-11T09:00:00.000Z'),
('3b3577bd-8204-0de6-85a2-051300e8c7de', 'jesenicke-drevo', 'Jesenické dřevo', 'Jesenické dřevo s.r.o.', '27738209', 'https://www.jesenicke-drevo.cz', '+420 720 384 561', 'info@jesenicke-drevo.cz', 'Šumperský prodejce měkkého dřeva z Jeseníků, který nabízí smrk, borovici a březové dřevo. Vybavení s hydraulickou rukou usnadňuje dodávky do horských obcí.', null, 'Dukelská 9', 'Šumperk', '787 01', null, 'OLK', 49.9598, 16.9764, 'small', 1994, array['skladem', 'hydraulicka-ruka', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, true, true, 420, 30, 10, 6, 340, 80, 'Hydraulická ruka pro místa hůř přístupná v Jeseníkách. Doprava do 10 km od Šumperka zdarma.', 4, 39, 'import (demo)', 'active', 'scraper', '2026-11-08T09:00:00.000Z'),
('05e56c2e-a6a8-311f-1739-290680e4102b', 'valasske-drevo', 'Valašské dřevo', 'Valašské dřevo s.r.o.', '26082456', 'https://www.valasske-drevo.cz', '+420 775 620 304', 'info@valasske-drevo.cz', 'Vsetínská rodinná firma s vlastní pilou. Nabízí bukové a smíšené tvrdé dřevo za příznivé ceny a čerstvé smrkové dřevo pro přípravu na další sezónu.', null, 'Rožnovská 77', 'Vsetín', '755 01', null, 'ZLK', 49.3441, 17.9891, 'small', 2014, array['fsc-pefc', 'skladem', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, false, true, 260, 22, 25, 6, null, 50, 'Dovoz dřeva do 50 km po Valašsku, do 25 km zdarma. Složení dřeva zajišťuje řidič na místě bez hydraulické ruky.', 4.8, 128, 'import (demo)', 'active', 'scraper', '2026-11-09T09:00:00.000Z'),
('94551423-f6b2-8513-0ef0-ea2d3d70b032', 'zlinske-pelety-a-brikety', 'Zlínské pelety a brikety', 'Zlínské pelety a brikety s.r.o.', '28461730', 'https://www.zlinske-pelety-a-brikety.cz', '+420 605 931 477', 'info@zlinske-pelety-a-brikety.cz', 'Zlínský specialista na pelety a dřevěné brikety. Zboží je připraveno na skladě, zákazníci si ho vyzvedávají osobně.', null, 'Vavrečkova 5241', 'Zlín', '760 01', null, 'ZLK', 49.2213, 17.6758, 'medium', 2016, array['platba-kartou', 'skladem', 'enplus-a1', 'osobni-odber']::public.seller_tag[], false, false, true, 0, 0, 0, null, null, 0, 'Pouze osobní odběr ve skladu ve Zlíně. Objednávky lze vyzvednout po předchozí domluvě telefonicky nebo e-mailem.', 4.5, 201, 'import (demo)', 'active', 'scraper', '2026-11-06T09:00:00.000Z'),
('80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 'ostravske-uhli-a-drevo', 'Ostravské uhlí a dřevo', 'Ostravské uhlí a dřevo a.s.', '25960314', 'https://www.ostravske-uhli-a-drevo.cz', '+420 778 412 069', 'info@ostravske-uhli-a-drevo.cz', 'Ostravský velkoobchod s hnědým i černým uhlím, koksem a brikety. Doplňkově nabízí buková štípaná dřeva a je nejlevnějším zdrojem uhlí v Moravskoslezském kraji.', null, 'Hlubinská 45', 'Ostrava', '702 00', null, 'MSK', 49.8267, 18.2561, 'large', 1999, array['platba-kartou', 'skladem', 'suche-18', 'vlastni-doprava', 'osobni-odber', 'doprava-zdarma']::public.seller_tag[], true, false, true, 450, 34, 15, 5, null, 70, 'Uhlí a brikety vozíme nákladními vozy s překlápěním do 70 km. Doprava do 15 km od Ostravy zdarma u objednávek nad 5 t.', 4.6, 466, 'import (demo)', 'active', 'scraper', '2026-11-13T09:00:00.000Z'),
('fe747d70-d608-13b5-3fbe-716ea590e8f2', 'beskydske-drevo', 'Beskydské dřevo', 'Beskydské dřevo s.r.o.', '27319586', 'https://www.beskydske-drevo.cz', '+420 737 186 025', 'info@beskydske-drevo.cz', 'Dřevo z Beskyd, především smrk, modřín a březové dřevo. Dodává do Frýdku-Místku a okolních obcí vlastní technikou.', null, 'Těšínská 1020', 'Frýdek-Místek', '738 01', null, 'MSK', 49.6781, 18.3572, 'small', 2003, array['skladem', 'hydraulicka-ruka', 'suche-18', 'vlastni-doprava', 'osobni-odber']::public.seller_tag[], true, true, true, 690, 42, 0, 6, 580, 60, 'Dovoz do 60 km v Beskydech. Dřevo složí hydraulická ruka u zákazníka. Při objednávce nad 6 PRMS účtujeme pouze příplatek za ruku.', 4.1, 27, 'import (demo)', 'active', 'scraper', '2026-11-01T09:00:00.000Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Produkty
-- ---------------------------------------------------------------------------
insert into public.products (id, seller_id, external_id, name, category, wood_species, wood_group, wood_form, moisture,
  moisture_percent, log_length_cm, certification, briquette_type, coal_type, diameter_mm, declared_mj_per_kg,
  price_czk, unit, package_kg, package_prm, min_order, stock, price_updated_at, sort_order)
values
('f6eed9a2-cd00-d2ad-29d2-08605803392e', 'fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 's01-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 2290, 'PRMS', null, null, 2, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('6f4c85ed-0fb0-bbb0-2826-3734fc8ac31e', 'fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 's01-p2', 'Dubové štípané dřevo 33 cm, suché (sypané)', 'wood', array['dub']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 2350, 'PRMS', null, null, null, 'low', '2026-11-11T09:00:00.000Z', 1),
('6f6ad56e-089d-9ec2-32af-207b612264bf', 'fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 's01-p3', 'Mix tvrdých dřevin 33 cm, polosuché (sypané)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'semi', 27, 33, null, null, null, null, null, 1560, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 2),
('f46079bc-1a16-8ce7-d910-d2d7cd5169a4', 'fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 's01-p4', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1290, 'PRMS', null, null, null, 'in_stock', '2026-11-09T09:00:00.000Z', 3),
('74ee8543-de6c-095b-a998-1bc918d56495', 'fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 's01-p5', 'Břízové štípané dřevo 25 cm, suché (krb)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 15, 25, null, null, null, null, null, 1980, 'PRMS', null, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 4),
('8e8cae4f-d934-3e71-d1bf-a72b4fd5ba54', 'fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 's01-p6', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7490, 'paleta', 975, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 5),
('b2a68ad0-633a-1ab4-886d-798b1d971958', '7ebffe5b-1517-8d95-2909-185664e23dd3', 's02-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 2350, 'PRMS', null, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('c5a06f47-5f00-0622-60fe-d62ac11fdb41', '7ebffe5b-1517-8d95-2909-185664e23dd3', 's02-p2', 'Směs tvrdých dřevin 33 cm, suchá (sypaná)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'dry', 18, 33, null, null, null, null, null, 2180, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 1),
('dce60ab4-3173-d80f-4cbb-ca8446eee706', '7ebffe5b-1517-8d95-2909-185664e23dd3', 's02-p3', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1420, 'PRMS', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 2),
('5c5ff29b-71cf-8706-8f9b-de90b4db4977', '7ebffe5b-1517-8d95-2909-185664e23dd3', 's02-p4', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 18, 33, null, null, null, null, null, 3290, 'PRM', null, null, null, 'low', '2026-11-10T09:00:00.000Z', 3),
('382f24bf-f182-094d-e5f8-34c68f15e13d', '7ebffe5b-1517-8d95-2909-185664e23dd3', 's02-p5', 'Buk na paletě 1,5 PRM, suchý', 'wood', array['buk']::public.wood_species[], 'hard', 'paleta', 'dry', 17, 33, null, null, null, null, null, 5290, 'paleta', null, 1.5, null, 'in_stock', '2026-11-14T09:00:00.000Z', 4),
('239c6261-1d50-ae8d-06f5-d742bac1d65f', '7ebffe5b-1517-8d95-2909-185664e23dd3', 's02-p6', 'Pelety ENplus A1 6 mm – pytel 15 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 139, 'pytel', 15, null, null, 'in_stock', '2026-11-16T09:00:00.000Z', 5),
('bf46ab1e-0e3e-b2af-ed3c-a8c9c3e255d2', '779d7f55-701f-1e58-48cf-32e3f61cc416', 's03-p1', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7690, 'paleta', 975, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('2843bdfa-f4d6-3529-af17-01ebecb4a905', '779d7f55-701f-1e58-48cf-32e3f61cc416', 's03-p2', 'Pelety ENplus A1 6 mm – pytel 15 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 131, 'pytel', 15, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 1),
('59b57bcd-3ca7-1177-ae3c-836a21c7648a', '779d7f55-701f-1e58-48cf-32e3f61cc416', 's03-p3', 'Pelety ENplus A1 6 mm – na tuny', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7990, 't', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 2),
('bc3441a0-d920-f4c7-4399-00ce924223df', '779d7f55-701f-1e58-48cf-32e3f61cc416', 's03-p4', 'Pelety ENplus A2 6 mm – na tuny', 'pellets', null, null, null, null, null, null, 'ENplus A2', null, null, 6, null, 7420, 't', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 3),
('7f03c993-2825-5f77-f459-c453c9ca1ffd', '779d7f55-701f-1e58-48cf-32e3f61cc416', 's03-p5', 'Dřevěné brikety RUF – na tuny', 'briquettes', null, null, null, null, null, null, null, 'RUF', null, null, null, 8390, 't', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 4),
('021b27ce-9e29-e77d-a16b-e3f0c3fa6ac2', '779d7f55-701f-1e58-48cf-32e3f61cc416', 's03-p6', 'Dřevěné brikety PINI KAY – na tuny', 'briquettes', null, null, null, null, null, null, null, 'PINI KAY', null, null, null, 9480, 't', null, null, null, 'low', '2026-11-13T09:00:00.000Z', 5),
('cf909611-77d4-ff53-147b-a4678204ff07', '13039dcf-c9ec-be40-ce22-52b10f4ce593', 's04-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 2180, 'PRMS', null, null, 2, 'in_stock', '2026-11-13T09:00:00.000Z', 0),
('b898fb66-0c9a-ec0a-6f97-597d6b245310', '13039dcf-c9ec-be40-ce22-52b10f4ce593', 's04-p2', 'Jasan a habr štípané 33 cm, suché (sypané)', 'wood', array['jasan', 'habr']::public.wood_species[], 'hard', 'sypane', 'dry', 18, 33, null, null, null, null, null, 2060, 'PRMS', null, null, null, 'in_stock', '2026-11-08T09:00:00.000Z', 1),
('6587d379-f62a-0e90-658d-9d953003c1a6', '13039dcf-c9ec-be40-ce22-52b10f4ce593', 's04-p3', 'Smrk a borovice štípané 33 cm, suché (sypané)', 'wood', array['smrk', 'borovice']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1330, 'PRMS', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 2),
('4a55fe25-5806-c307-d571-0519812773f0', '13039dcf-c9ec-be40-ce22-52b10f4ce593', 's04-p4', 'Bukové štípané dřevo 33 cm, čerstvé (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'fresh', 46, 33, null, null, null, null, null, 1290, 'PRMS', null, null, null, 'low', '2026-11-06T09:00:00.000Z', 3),
('ec854c35-c446-e7c1-ecb7-3a59dbc27d80', '13039dcf-c9ec-be40-ce22-52b10f4ce593', 's04-p5', 'Bukové metrovky 100 cm, čerstvé (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'metrovky', 'fresh', 44, 100, null, null, null, null, null, 1640, 'PRM', null, null, 2, 'preorder', '2026-11-05T09:00:00.000Z', 4),
('6e8da983-0922-91bf-f8af-f5a241f565d2', '19875aca-124f-99c0-ba40-78bc2b1bc8d5', 's05-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1890, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 0),
('855ee48c-57c3-2b81-95f4-d902171ad543', '19875aca-124f-99c0-ba40-78bc2b1bc8d5', 's05-p2', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1190, 'PRMS', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 1),
('11829cd4-5c97-fb17-9784-41ea25d97e86', '19875aca-124f-99c0-ba40-78bc2b1bc8d5', 's05-p3', 'Mix tvrdých dřevin 33 cm, polosuché (sypané)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'semi', 25, 33, null, null, null, null, null, 1510, 'PRMS', null, null, null, 'in_stock', '2026-11-07T09:00:00.000Z', 2),
('fcc809dc-5a81-f2e1-4b0c-6e3f1267f0a8', '19875aca-124f-99c0-ba40-78bc2b1bc8d5', 's05-p4', 'Dubové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['dub']::public.wood_species[], 'hard', 'rovnane', 'dry', 17, 33, null, null, null, null, null, 2850, 'PRM', null, null, 1, 'low', '2026-11-09T09:00:00.000Z', 3),
('3bae253e-66ac-337b-3164-90c19dc46094', '19875aca-124f-99c0-ba40-78bc2b1bc8d5', 's05-p5', 'Pelety ENplus A2 6 mm – na tuny', 'pellets', null, null, null, null, null, null, 'ENplus A2', null, null, 6, null, 7340, 't', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 4),
('598f9e82-a10d-f5a5-36ee-79e1fda1d088', '42960afa-3a32-95de-284e-58ecd3f7ae0a', 's06-p1', 'Hnědé uhlí ořech 2 – na tuny', 'coal', null, null, null, null, null, null, null, null, 'hnědé ořech 2', null, null, 4680, 't', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('3f7bd77e-5776-374d-963e-fd745a213aaf', '42960afa-3a32-95de-284e-58ecd3f7ae0a', 's06-p2', 'Hnědé uhlí kostka – na tuny', 'coal', null, null, null, null, null, null, null, null, 'hnědé kostka', null, null, 5040, 't', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 1),
('2ad81ea5-74c4-a926-9448-a68d8953ba09', '42960afa-3a32-95de-284e-58ecd3f7ae0a', 's06-p3', 'Černé uhlí ořech – na tuny', 'coal', null, null, null, null, null, null, null, null, 'černé ořech', null, null, 9610, 't', null, null, null, 'low', '2026-11-12T09:00:00.000Z', 2),
('097f0545-ba11-28a2-02ca-f768d647fa46', '42960afa-3a32-95de-284e-58ecd3f7ae0a', 's06-p4', 'Koks – na tuny', 'coal', null, null, null, null, null, null, null, null, 'koks', null, null, 12940, 't', null, null, null, 'preorder', '2026-11-09T09:00:00.000Z', 3),
('f1498fc7-f962-dc1e-80f9-4a80523b3215', '42960afa-3a32-95de-284e-58ecd3f7ae0a', 's06-p5', 'Hnědouhelné brikety – na tuny', 'briquettes', null, null, null, null, null, null, null, 'hnědouhelné', null, null, null, 6240, 't', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 4),
('e12635e7-9a6a-4b11-9007-ee3b784cadd7', '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 's07-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1890, 'PRMS', null, null, 2, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('8f8d52db-339c-b496-8ae2-8096de01cdad', '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 's07-p2', 'Dubové štípané dřevo 33 cm, suché (sypané)', 'wood', array['dub']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1930, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 1),
('52f35a7b-1d3c-3d85-c9d1-11d1042fb1bb', '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 's07-p3', 'Mix tvrdých dřevin 33 cm, polosuché (sypané)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'semi', 24, 33, null, null, null, null, null, 1490, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 2),
('62a20c0e-c118-7bb9-1dc9-4876557cdc4d', '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 's07-p4', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1220, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 3),
('63b321cd-1a19-43a9-12b4-bac8f1876e81', '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 's07-p5', 'Břízové štípané dřevo 25 cm, suché (krb)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 15, 25, null, null, null, null, null, 1790, 'PRMS', null, null, null, 'in_stock', '2026-11-16T09:00:00.000Z', 4),
('a8a846b1-e995-f161-001d-75d9501a4bec', '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 's07-p6', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7190, 'paleta', 975, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 5),
('5b40e82c-7c31-4c35-40b4-8ebb1b72b20f', '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 's07-p7', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 18, 33, null, null, null, null, null, 2750, 'PRM', null, null, null, 'low', '2026-11-11T09:00:00.000Z', 6),
('df1ddc0c-02fb-106d-30fc-f8231d90e0a0', '61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 's08-p1', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7240, 'paleta', 975, null, null, 'low', '2026-11-13T09:00:00.000Z', 0),
('bf13584e-0ef7-ea03-b2d1-f33570969c8a', '61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 's08-p2', 'Pelety ENplus A1 6 mm – pytel 15 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 126, 'pytel', 15, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 1),
('bd7a4043-8743-b6ba-b00c-cc642d0700d8', '61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 's08-p3', 'Pelety ENplus A2 6 mm – na tuny', 'pellets', null, null, null, null, null, null, 'ENplus A2', null, null, 6, null, 7180, 't', null, null, null, 'in_stock', '2026-11-08T09:00:00.000Z', 2),
('2b0b67e3-9f70-b8ed-24f6-fe94fc69aac7', '61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 's08-p4', 'Dřevěné brikety RUF – na tuny', 'briquettes', null, null, null, null, null, null, null, 'RUF', null, null, null, 8340, 't', null, null, null, 'preorder', '2026-11-07T09:00:00.000Z', 3),
('2eb5747c-5e0b-6e9a-a10e-6b463784814b', '61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 's08-p5', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1820, 'PRMS', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 4),
('4521e0ab-b6c2-b0e8-50d6-8adaae2539fc', '61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 's08-p6', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1190, 'PRMS', null, null, null, 'low', '2026-11-04T09:00:00.000Z', 5),
('97b125f4-408d-e0a0-c82a-ec64f4dd08ff', '64a0aa23-18dd-9e88-8161-c85d3922af7e', 's09-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1940, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('3e297f62-b2e9-9ff1-4329-bc76dd0a08f5', '64a0aa23-18dd-9e88-8161-c85d3922af7e', 's09-p2', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1280, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 1),
('cae0bde7-cca6-f4c5-3cd2-aa66484e1502', '64a0aa23-18dd-9e88-8161-c85d3922af7e', 's09-p3', 'Břízové štípané dřevo 25 cm, suché (krb)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 15, 25, null, null, null, null, null, 1860, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 2),
('597a3ce2-7319-946d-5d37-c0b767ffd188', '64a0aa23-18dd-9e88-8161-c85d3922af7e', 's09-p4', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 18, 33, null, null, null, null, null, 2890, 'PRM', null, null, null, 'in_stock', '2026-11-09T09:00:00.000Z', 3),
('0cc92b6f-6b73-2dba-ded2-906cc9cace27', '64a0aa23-18dd-9e88-8161-c85d3922af7e', 's09-p5', 'Pelety ENplus A1 6 mm – na tuny', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7890, 't', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 4),
('eb823303-924b-018b-3a1a-2d31b002f04c', '76eadb9e-22f8-d917-b0b3-2e189ffb9afd', 's10-p1', 'Hnědé uhlí ořech 2 – na tuny', 'coal', null, null, null, null, null, null, null, null, 'hnědé ořech 2', null, null, 4390, 't', null, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('6147c199-ca8d-78c7-b84b-080f08a3955b', '76eadb9e-22f8-d917-b0b3-2e189ffb9afd', 's10-p2', 'Hnědé uhlí kostka – na tuny', 'coal', null, null, null, null, null, null, null, null, 'hnědé kostka', null, null, 4630, 't', null, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 1),
('c30c24d9-d4f2-fa16-d740-60e6463fd93b', '76eadb9e-22f8-d917-b0b3-2e189ffb9afd', 's10-p3', 'Černé uhlí ořech – na tuny', 'coal', null, null, null, null, null, null, null, null, 'černé ořech', null, null, 9240, 't', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 2),
('107f9206-4223-7b54-d63d-936c2c9872c3', '76eadb9e-22f8-d917-b0b3-2e189ffb9afd', 's10-p4', 'Koks – na tuny', 'coal', null, null, null, null, null, null, null, null, 'koks', null, null, 12580, 't', null, null, null, 'low', '2026-11-12T09:00:00.000Z', 3),
('fc06b209-b40c-4faf-fc7a-0d4ae8498458', '76eadb9e-22f8-d917-b0b3-2e189ffb9afd', 's10-p5', 'Hnědouhelné brikety – na tuny', 'briquettes', null, null, null, null, null, null, null, 'hnědouhelné', null, null, null, 5890, 't', null, null, null, 'in_stock', '2026-11-08T09:00:00.000Z', 4),
('f7bbaf15-0cbe-d0b5-09cf-38fe8c3b6bc4', '9dad5075-f9ee-d773-cf7b-695a98b3ff6e', 's11-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1840, 'PRMS', null, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('5d44a597-14c8-cd97-598d-6d30820def79', '9dad5075-f9ee-d773-cf7b-695a98b3ff6e', 's11-p2', 'Mix tvrdých dřevin 33 cm, polosuché (sypané)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'semi', 26, 33, null, null, null, null, null, 1470, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 1),
('43e8c1f9-3232-c772-de8e-2ca78e09a775', '9dad5075-f9ee-d773-cf7b-695a98b3ff6e', 's11-p3', 'Smrkové štípané dřevo 33 cm, čerstvé (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'fresh', 42, 33, null, null, null, null, null, 980, 'PRMS', null, null, null, 'in_stock', '2026-11-07T09:00:00.000Z', 2),
('3c871e06-01b3-ba16-f856-bf00c2936acb', '9dad5075-f9ee-d773-cf7b-695a98b3ff6e', 's11-p4', 'Břízové štípané dřevo 25 cm, suché (krb)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 16, 25, null, null, null, null, null, 1760, 'PRMS', null, null, null, 'low', '2026-11-10T09:00:00.000Z', 3),
('18e7c3e1-81dc-afff-266e-0e0c5f3edfc3', '9dad5075-f9ee-d773-cf7b-695a98b3ff6e', 's11-p5', 'Bukové metrovky 100 cm, čerstvé (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'metrovky', 'fresh', 40, 100, null, null, null, null, null, 1690, 'PRM', null, null, null, 'in_stock', '2026-11-06T09:00:00.000Z', 4),
('ca168cc5-701c-255d-0ba2-0c81e28c2795', 'daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', 's12-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1860, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 0),
('4b3b0569-23a4-085a-7d4d-1b5109f285be', 'daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', 's12-p2', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1210, 'PRMS', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 1),
('82591ac8-ec54-da00-1c30-6338f9161ac7', 'daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', 's12-p3', 'Smrkové štípané dřevo 33 cm, čerstvé (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'fresh', 44, 33, null, null, null, null, null, 890, 'PRMS', null, null, null, 'in_stock', '2026-11-08T09:00:00.000Z', 2),
('09460e89-7646-8f3d-324a-8b4908262a1c', 'daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', 's12-p4', 'Pelety ENplus A2 6 mm – na tuny', 'pellets', null, null, null, null, null, null, 'ENplus A2', null, null, 6, null, 7210, 't', null, null, null, 'low', '2026-11-14T09:00:00.000Z', 3),
('d57be739-b14b-8dae-8ef2-f7596113fe2c', 'daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', 's12-p5', 'Dřevěné válcové brikety – na tuny', 'briquettes', null, null, null, null, null, null, null, 'válcové', null, null, null, 7590, 't', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 4),
('40720a5e-c54f-510b-cb2e-f99f751c185e', 'f188079d-4521-4a7d-7972-01a52e60f9ae', 's13-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1760, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('be81ffc4-4395-71c0-6064-9e3dd70dac7f', 'f188079d-4521-4a7d-7972-01a52e60f9ae', 's13-p2', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1180, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 1),
('9cc4077b-c03c-9f72-bbd3-fa9a93e4b750', 'f188079d-4521-4a7d-7972-01a52e60f9ae', 's13-p3', 'Měkké štípané dřevo 33 cm, polosuché (sypané)', 'wood', array['mix-mekke']::public.wood_species[], 'soft', 'sypane', 'semi', 28, 33, null, null, null, null, null, 1290, 'PRMS', null, null, null, 'in_stock', '2026-11-09T09:00:00.000Z', 2),
('e82c8125-13a6-26c5-22d0-7d8f3614b846', 'f188079d-4521-4a7d-7972-01a52e60f9ae', 's13-p4', 'Břízové štípané dřevo 25 cm, suché (krb)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 15, 25, null, null, null, null, null, 1790, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 3),
('13ef5950-fad7-241b-0d97-437d4e7b9c21', 'f188079d-4521-4a7d-7972-01a52e60f9ae', 's13-p5', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 17, 33, null, null, null, null, null, 2720, 'PRM', null, null, null, 'low', '2026-11-10T09:00:00.000Z', 4),
('0f097b40-f4cd-24ff-cdb6-e0a2f0923958', '977cb757-32fe-e7bf-9837-ded81ac1cb40', 's14-p1', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 6890, 'paleta', 975, null, 1, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('4653cfed-9689-fc0b-fa6c-9a49f9d44851', '977cb757-32fe-e7bf-9837-ded81ac1cb40', 's14-p2', 'Pelety ENplus A1 6 mm – pytel 15 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 118, 'pytel', 15, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 1),
('c590c818-1a5e-dfb3-0b84-6856c31582be', '977cb757-32fe-e7bf-9837-ded81ac1cb40', 's14-p3', 'Pelety ENplus A1 6 mm – volně ložené, 1 t', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 6950, 't', null, null, 1, 'low', '2026-11-11T09:00:00.000Z', 2),
('a83a6b75-b7b2-17e4-da5e-87a8b1f9dbf5', '977cb757-32fe-e7bf-9837-ded81ac1cb40', 's14-p4', 'Pelety ENplus A2 8 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A2', null, null, 8, null, 6420, 'paleta', 975, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 3),
('dd00aae7-b680-2421-ddd1-0249bf5264c3', '977cb757-32fe-e7bf-9837-ded81ac1cb40', 's14-p5', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1790, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 4),
('cc50c5b7-4ef1-3815-8d51-7cd130319bb6', 'bb891faf-b442-df04-95aa-30f297c30404', 's15-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1980, 'PRMS', null, null, 2, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('353216d3-0f6f-fe81-110f-e53c736d8b7b', 'bb891faf-b442-df04-95aa-30f297c30404', 's15-p2', 'Dubové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['dub']::public.wood_species[], 'hard', 'rovnane', 'dry', 15, 33, null, null, null, null, null, 2910, 'PRM', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 1),
('50f08430-e47e-22ee-1505-2844e8321125', 'bb891faf-b442-df04-95aa-30f297c30404', 's15-p3', 'Březové štípané dřevo 25 cm, suché (sypané)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 14, 25, null, null, null, null, null, 1890, 'PRMS', null, null, null, 'low', '2026-11-08T09:00:00.000Z', 2),
('ee1c5e0c-946c-7d4b-119d-a395ea2723f7', 'bb891faf-b442-df04-95aa-30f297c30404', 's15-p4', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 14, 33, null, null, null, null, null, 1390, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 3),
('6542d902-87ec-5197-3ed2-51e0e2ba304d', 'bb891faf-b442-df04-95aa-30f297c30404', 's15-p5', 'Hnědé uhlí ořech 2 – volně ložené, 1 t', 'coal', null, null, null, null, null, null, null, null, 'hnědé ořech 2', null, null, 4980, 't', null, null, 1, 'in_stock', '2026-11-10T09:00:00.000Z', 4),
('9fb25c77-5676-398c-457e-e123dab45248', 'bd3ca541-8923-405d-8d92-91a51cfb4eaa', 's16-p1', 'Smrkové štípané dřevo 33 cm, čerstvé (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'fresh', 44, 33, null, null, null, null, null, 990, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 0),
('938669b6-df91-2634-bdbb-1bf4ac3b4ae5', 'bd3ca541-8923-405d-8d92-91a51cfb4eaa', 's16-p2', 'Borovicové štípané dřevo 33 cm, suché (sypané)', 'wood', array['borovice']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1340, 'PRMS', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 1),
('c0eafc34-4298-00c5-691f-e1b9585a1f56', 'bd3ca541-8923-405d-8d92-91a51cfb4eaa', 's16-p3', 'Bukové metrovky 100 cm, čerstvé', 'wood', array['buk']::public.wood_species[], 'hard', 'metrovky', 'fresh', 42, 100, null, null, null, null, null, 1640, 'PRM', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 2),
('8f4b449a-285c-c6aa-f3bb-78ef82dda491', 'bd3ca541-8923-405d-8d92-91a51cfb4eaa', 's16-p4', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 16, 33, null, null, null, null, null, 2850, 'PRM', null, null, null, 'low', '2026-11-14T09:00:00.000Z', 3),
('021f76ca-3f60-2ec3-7ae8-70da451dc469', 'bd3ca541-8923-405d-8d92-91a51cfb4eaa', 's16-p5', 'Smrkové dřevo na paletě 33 cm, suché', 'wood', array['smrk']::public.wood_species[], 'soft', 'paleta', 'dry', 17, 33, null, null, null, null, null, 4290, 'paleta', null, 1.8, null, 'in_stock', '2026-11-09T09:00:00.000Z', 4),
('bd8c0dd8-ff54-5d8b-602b-e9df7c18418d', 'f78d875b-4f24-be8e-094b-302e4920a050', 's17-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1690, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('2f5a9f25-1a8a-3248-5e3b-9d1a37f81534', 'f78d875b-4f24-be8e-094b-302e4920a050', 's17-p2', 'Dubové štípané dřevo 33 cm, suché (sypané)', 'wood', array['dub']::public.wood_species[], 'hard', 'sypane', 'dry', 15, 33, null, null, null, null, null, 1830, 'PRMS', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 1),
('a6845158-b088-5086-d1d2-bbe72349c077', 'f78d875b-4f24-be8e-094b-302e4920a050', 's17-p3', 'Mix tvrdých listnatých, čerstvé štípané (sypané)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'fresh', 45, 33, null, null, null, null, null, 1290, 'PRMS', null, null, null, 'in_stock', '2026-11-07T09:00:00.000Z', 2),
('ab11d509-be83-1d7c-e0ad-81d1222c046a', 'f78d875b-4f24-be8e-094b-302e4920a050', 's17-p4', 'Smrkové štípané dřevo 40 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 16, 40, null, null, null, null, null, 1180, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 3),
('9f894e72-765f-7461-2faf-f9615cff4191', 'f78d875b-4f24-be8e-094b-302e4920a050', 's17-p5', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 18, 33, null, null, null, null, null, 2690, 'PRM', null, null, 2, 'low', '2026-11-13T09:00:00.000Z', 4),
('998c2f38-deb6-c698-ad62-9df1966de96e', 'a560021b-9876-ea92-655f-d03e94bec651', 's18-p1', 'Pelety ENplus A1 6 mm – volně ložené, 1 t', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7150, 't', null, null, 1, 'in_stock', '2026-11-12T09:00:00.000Z', 0),
('130b3875-e56f-9edf-ec67-79cedbae8d1b', 'a560021b-9876-ea92-655f-d03e94bec651', 's18-p2', 'Pelety ENplus A1 6 mm – pytel 15 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 124, 'pytel', 15, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 1),
('d71e86f4-b65d-49cb-bf1f-0b8aa612da23', 'a560021b-9876-ea92-655f-d03e94bec651', 's18-p3', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7090, 'paleta', 975, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 2),
('67c0c268-832f-3e44-fff9-3afbc9db5df7', 'a560021b-9876-ea92-655f-d03e94bec651', 's18-p4', 'Dřevěné brikety RUF – paleta 960 kg', 'briquettes', null, null, null, null, null, null, null, 'RUF', null, null, null, 7390, 'paleta', 960, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 3),
('4696ff77-77b9-bc91-77ea-e8a2a5649567', 'a560021b-9876-ea92-655f-d03e94bec651', 's18-p5', 'Dřevěné brikety PINI KAY – volně ložené, 1 t', 'briquettes', null, null, null, null, null, null, null, 'PINI KAY', null, null, null, 9350, 't', null, null, 2, 'preorder', '2026-11-09T09:00:00.000Z', 4),
('a3c852f0-5646-898f-65b4-92ac0e926bca', '2f30f387-bd92-7ab7-ea3c-14543226ea78', 's19-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 2180, 'PRMS', null, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('5a07afd3-d551-535e-a30f-c3d5737f507f', '2f30f387-bd92-7ab7-ea3c-14543226ea78', 's19-p2', 'Dubové štípané dřevo 33 cm, suché (sypané)', 'wood', array['dub']::public.wood_species[], 'hard', 'sypane', 'dry', 15, 33, null, null, null, null, null, 2290, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 1),
('f7623bf7-31dc-f285-bb41-1b5651d0aec8', '2f30f387-bd92-7ab7-ea3c-14543226ea78', 's19-p3', 'Březové štípané dřevo 25 cm, suché (sypané)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 16, 25, null, null, null, null, null, 1960, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 2),
('f29dace2-501b-5abf-e266-342590b041d0', '2f30f387-bd92-7ab7-ea3c-14543226ea78', 's19-p4', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 15, 33, null, null, null, null, null, 3290, 'PRM', null, null, 2, 'in_stock', '2026-11-13T09:00:00.000Z', 3),
('06c95330-bc67-f1a6-2e39-ec49bb8b2c9f', '2f30f387-bd92-7ab7-ea3c-14543226ea78', 's19-p5', 'Bukové dřevo na paletě 33 cm, suché', 'wood', array['buk']::public.wood_species[], 'hard', 'paleta', 'dry', 16, 33, null, null, null, null, null, 4750, 'paleta', null, 1.8, null, 'in_stock', '2026-11-14T09:00:00.000Z', 4),
('d8749563-a91c-a5cb-999c-ddad28f54131', '2f30f387-bd92-7ab7-ea3c-14543226ea78', 's19-p6', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 8050, 'paleta', 975, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 5),
('cfc840fd-7046-0c08-f001-69916ce193b0', '8ec05a23-7324-f048-4bd7-b38b6ca94185', 's20-p1', 'Dubové štípané dřevo 33 cm, suché (sypané)', 'wood', array['dub']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1980, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 0),
('417b014f-5bbe-0caf-1e1d-bd528fa6f9b5', '8ec05a23-7324-f048-4bd7-b38b6ca94185', 's20-p2', 'Habrové štípané dřevo 33 cm, suché (sypané)', 'wood', array['habr']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1870, 'PRMS', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 1),
('2c07a94c-9355-5804-fd89-dba321167f86', '8ec05a23-7324-f048-4bd7-b38b6ca94185', 's20-p3', 'Dubové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['dub']::public.wood_species[], 'hard', 'rovnane', 'dry', 17, 33, null, null, null, null, null, 3050, 'PRM', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 2),
('733a7756-c9a7-4f86-9f05-accfca2c2127', '8ec05a23-7324-f048-4bd7-b38b6ca94185', 's20-p4', 'Mix tvrdých štípaných dřev, polosuché (sypané)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'semi', 27, 33, null, null, null, null, null, 1520, 'PRMS', null, null, null, 'in_stock', '2026-11-08T09:00:00.000Z', 3),
('0fd307af-1f91-d85a-e19a-c744adda6359', '8ec05a23-7324-f048-4bd7-b38b6ca94185', 's20-p5', 'Dubové metrovky 100 cm, čerstvé', 'wood', array['dub']::public.wood_species[], 'hard', 'metrovky', 'fresh', 46, 100, null, null, null, null, null, 1720, 'PRM', null, null, null, 'in_stock', '2026-11-07T09:00:00.000Z', 4),
('e5ee4e47-d03a-4c52-7959-554711a709cd', '07a9e77b-0877-afe7-866d-425eb604f2a5', 's21-p1', 'Habrové štípané dřevo 33 cm, suché (sypané)', 'wood', array['habr']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1720, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 0),
('0cf9ff18-5416-7073-7971-1b6e1ae82e72', '07a9e77b-0877-afe7-866d-425eb604f2a5', 's21-p2', 'Mix měkkých štípaných dřev, suché (sypané)', 'wood', array['mix-mekke']::public.wood_species[], 'soft', 'sypane', 'dry', 15, 33, null, null, null, null, null, 1210, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 1),
('76870ec7-1c05-f762-7dcf-a1181701fad7', '07a9e77b-0877-afe7-866d-425eb604f2a5', 's21-p3', 'Pelety ENplus A2 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A2', null, null, 6, null, 6540, 'paleta', 975, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 2),
('b14d8e17-1250-fc4b-ca8e-0c562bb33045', '07a9e77b-0877-afe7-866d-425eb604f2a5', 's21-p4', 'Hnědé uhlí kostka – volně ložené, 1 t', 'coal', null, null, null, null, null, null, null, null, 'hnědé kostka', null, null, 4790, 't', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 3),
('62af6fab-e7b3-e315-8b3e-7294804ecd6f', '07a9e77b-0877-afe7-866d-425eb604f2a5', 's21-p5', 'Dřevěné brikety válcové – volně ložené, 1 t', 'briquettes', null, null, null, null, null, null, null, 'válcové', null, null, null, 7640, 't', null, null, 1, 'low', '2026-11-09T09:00:00.000Z', 4),
('cf366ce0-55aa-047f-10fa-f8447689637d', '3b3577bd-8204-0de6-85a2-051300e8c7de', 's22-p1', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1290, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 0),
('c125ce97-f304-5ad7-7268-657f1108b2d6', '3b3577bd-8204-0de6-85a2-051300e8c7de', 's22-p2', 'Smrkové štípané dřevo 33 cm, čerstvé (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'fresh', 42, 33, null, null, null, null, null, 960, 'PRMS', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 1),
('d18a6558-de25-9882-c7bf-aa08f361035f', '3b3577bd-8204-0de6-85a2-051300e8c7de', 's22-p3', 'Borovicové štípané dřevo 33 cm, suché (sypané)', 'wood', array['borovice']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1250, 'PRMS', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 2),
('ae88630a-eeec-c4e0-f4f1-df52392b9ab5', '3b3577bd-8204-0de6-85a2-051300e8c7de', 's22-p4', 'Smrkové dřevo na paletě 33 cm, suché', 'wood', array['smrk']::public.wood_species[], 'soft', 'paleta', 'dry', 18, 33, null, null, null, null, null, 3980, 'paleta', null, 1.8, null, 'in_stock', '2026-11-12T09:00:00.000Z', 3),
('e2a62d38-77c3-3d49-20b6-c2ec4c6bcd5b', '3b3577bd-8204-0de6-85a2-051300e8c7de', 's22-p5', 'Březové štípané dřevo 25 cm, suché (sypané)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 15, 25, null, null, null, null, null, 1760, 'PRMS', null, null, null, 'low', '2026-11-13T09:00:00.000Z', 4),
('721b3d5c-da5e-f1eb-8201-ae48d3afb8b9', '05e56c2e-a6a8-311f-1739-290680e4102b', 's23-p1', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1710, 'PRMS', null, null, null, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('efa374cc-5715-9d3b-7f7f-5126b3c9e5a8', '05e56c2e-a6a8-311f-1739-290680e4102b', 's23-p2', 'Mix tvrdých štípaných dřev 33 cm, suché (sypané)', 'wood', array['mix-tvrde']::public.wood_species[], 'hard', 'sypane', 'dry', 16, 33, null, null, null, null, null, 1650, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 1),
('de735b43-e595-ee78-e423-2e92816fb4f8', '05e56c2e-a6a8-311f-1739-290680e4102b', 's23-p3', 'Smrkové štípané dřevo 33 cm, čerstvé (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'fresh', 41, 33, null, null, null, null, null, 870, 'PRMS', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 2),
('8d3186fb-9ec1-d487-9c3a-0bca3a69f921', '05e56c2e-a6a8-311f-1739-290680e4102b', 's23-p4', 'Bukové metrovky 100 cm, čerstvé', 'wood', array['buk']::public.wood_species[], 'hard', 'metrovky', 'fresh', 39, 100, null, null, null, null, null, 1520, 'PRM', null, null, null, 'in_stock', '2026-11-08T09:00:00.000Z', 3),
('8ab5b8f6-fa10-dfe9-85d6-714ccfcc80d5', '05e56c2e-a6a8-311f-1739-290680e4102b', 's23-p5', 'Bukové rovnané dřevo 33 cm, suché (PRM)', 'wood', array['buk']::public.wood_species[], 'hard', 'rovnane', 'dry', 17, 33, null, null, null, null, null, 2620, 'PRM', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 4),
('980105aa-a0fe-6aa4-ca68-cd768260eba8', '94551423-f6b2-8513-0ef0-ea2d3d70b032', 's24-p1', 'Pelety ENplus A1 6 mm – volně ložené, 1 t', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7390, 't', null, null, 1, 'in_stock', '2026-11-13T09:00:00.000Z', 0),
('7093288c-a056-a40f-0aea-6d6a2dd46f9f', '94551423-f6b2-8513-0ef0-ea2d3d70b032', 's24-p2', 'Pelety ENplus A1 6 mm – pytel 15 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 126, 'pytel', 15, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 1),
('d738ee61-6e1a-2b10-31b3-e984984f3379', '94551423-f6b2-8513-0ef0-ea2d3d70b032', 's24-p3', 'Pelety ENplus A1 6 mm – paleta 975 kg', 'pellets', null, null, null, null, null, null, 'ENplus A1', null, null, 6, null, 7190, 'paleta', 975, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 2),
('69a3d20e-2b18-eea7-0a98-e35313fb8b10', '94551423-f6b2-8513-0ef0-ea2d3d70b032', 's24-p4', 'Pelety ENplus A2 8 mm – volně ložené, 1 t', 'pellets', null, null, null, null, null, null, 'ENplus A2', null, null, 8, null, 6870, 't', null, null, null, 'low', '2026-11-10T09:00:00.000Z', 3),
('9ad8f658-6d67-1b2f-e018-a8369885039d', '94551423-f6b2-8513-0ef0-ea2d3d70b032', 's24-p5', 'Dřevěné brikety PINI KAY – paleta 960 kg', 'briquettes', null, null, null, null, null, null, null, 'PINI KAY', null, null, null, 8880, 'paleta', 960, null, null, 'preorder', '2026-11-12T09:00:00.000Z', 4),
('57cef3b6-5533-b938-92c7-6ff33943a5e1', '94551423-f6b2-8513-0ef0-ea2d3d70b032', 's24-p6', 'Dřevěné brikety válcové – volně ložené, 1 t', 'briquettes', null, null, null, null, null, null, null, 'válcové', null, null, null, 7690, 't', null, null, null, 'in_stock', '2026-11-09T09:00:00.000Z', 5),
('0d0b2e52-0b6c-dc3e-8709-0046ba8c344f', '80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 's25-p1', 'Hnědé uhlí ořech 2 – volně ložené, 1 t', 'coal', null, null, null, null, null, null, null, null, 'hnědé ořech 2', null, null, 4340, 't', null, null, 1, 'in_stock', '2026-11-15T09:00:00.000Z', 0),
('9f676216-20e7-adeb-b9c5-b2d7f6569dfb', '80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 's25-p2', 'Hnědé uhlí kostka – volně ložené, 1 t', 'coal', null, null, null, null, null, null, null, null, 'hnědé kostka', null, null, 4640, 't', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 1),
('46425532-3287-640b-a3ff-547cc64caf14', '80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 's25-p3', 'Černé uhlí ořech – volně ložené, 1 t', 'coal', null, null, null, null, null, null, null, null, 'černé ořech', null, null, 9280, 't', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 2),
('d2662c1d-e034-686e-acf3-c6ae452ccf0c', '80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 's25-p4', 'Koks – volně ložené, 1 t', 'coal', null, null, null, null, null, null, null, null, 'koks', null, null, 12690, 't', null, null, null, 'low', '2026-11-12T09:00:00.000Z', 3),
('119ca497-932d-f8b1-b7f5-ff2b57d7a6de', '80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 's25-p5', 'Hnědouhelné brikety – volně ložené, 1 t', 'briquettes', null, null, null, null, null, null, null, 'hnědouhelné', null, null, null, 5790, 't', null, null, null, 'in_stock', '2026-11-11T09:00:00.000Z', 4),
('3e4c3d45-5a20-07f5-9426-927e4add3d76', '80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 's25-p6', 'Bukové štípané dřevo 33 cm, suché (sypané)', 'wood', array['buk']::public.wood_species[], 'hard', 'sypane', 'dry', 17, 33, null, null, null, null, null, 1740, 'PRMS', null, null, null, 'in_stock', '2026-11-14T09:00:00.000Z', 5),
('6f40af5a-6396-a96f-db51-6a6d7bea7339', 'fe747d70-d608-13b5-3fbe-716ea590e8f2', 's26-p1', 'Smrkové štípané dřevo 33 cm, suché (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'dry', 18, 33, null, null, null, null, null, 1240, 'PRMS', null, null, null, 'in_stock', '2026-11-12T09:00:00.000Z', 0),
('85a18a1e-be17-57d2-564f-ea8f6dfe299c', 'fe747d70-d608-13b5-3fbe-716ea590e8f2', 's26-p2', 'Smrkové štípané dřevo 33 cm, čerstvé (sypané)', 'wood', array['smrk']::public.wood_species[], 'soft', 'sypane', 'fresh', 40, 33, null, null, null, null, null, 930, 'PRMS', null, null, null, 'in_stock', '2026-11-09T09:00:00.000Z', 1),
('7210ce87-07fa-323b-4898-8bf3f8e9be7c', 'fe747d70-d608-13b5-3fbe-716ea590e8f2', 's26-p3', 'Modřínové štípané dřevo 33 cm, suché (sypané)', 'wood', array['modrin']::public.wood_species[], 'soft', 'sypane', 'dry', 14, 33, null, null, null, null, null, 1430, 'PRMS', null, null, null, 'in_stock', '2026-11-13T09:00:00.000Z', 2),
('f4650016-7833-a827-3732-29c3920b5c63', 'fe747d70-d608-13b5-3fbe-716ea590e8f2', 's26-p4', 'Smrkové dřevo na paletě 33 cm, suché', 'wood', array['smrk']::public.wood_species[], 'soft', 'paleta', 'dry', 17, 33, null, null, null, null, null, 4390, 'paleta', null, 1.8, null, 'in_stock', '2026-11-11T09:00:00.000Z', 3),
('e17f1d7b-e8d9-2979-697d-726536725524', 'fe747d70-d608-13b5-3fbe-716ea590e8f2', 's26-p5', 'Bukové metrovky 100 cm, čerstvé', 'wood', array['buk']::public.wood_species[], 'hard', 'metrovky', 'fresh', 44, 100, null, null, null, null, null, 1690, 'PRM', null, null, null, 'in_stock', '2026-11-07T09:00:00.000Z', 4),
('e51ad4bb-5f08-3cdc-0905-7d1a5a4df7bf', 'fe747d70-d608-13b5-3fbe-716ea590e8f2', 's26-p6', 'Březové štípané dřevo 25 cm, suché (sypané)', 'wood', array['briza']::public.wood_species[], 'birch', 'sypane', 'dry', 15, 25, null, null, null, null, null, 1990, 'PRMS', null, null, null, 'in_stock', '2026-11-10T09:00:00.000Z', 5)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Historie cen – 12 měsíců zpět od aktuální ceny (sezónnost topné sezóny + šum ±1,5 %)
-- ---------------------------------------------------------------------------
insert into public.price_observations (product_id, price_czk, observed_at, source)
select
  p.id,
  case when m.i = 11 then p.price_czk
       else greatest(1, round(
         p.price_czk * (s.f[m.i + 1] / s.f[12])
           * (1 + ((('x' || substr(md5(p.id::text || m.i::text), 1, 6))::bit(24)::int / 16777215.0) - 0.5) * 0.03)
           / (case when p.unit = 'pytel' then 1 else 10 end)
       ) * (case when p.unit = 'pytel' then 1 else 10 end))
  end,
  case when m.i = 11 then p.price_updated_at
       else (date_trunc('month', p.price_updated_at) - make_interval(months => 11 - m.i) + interval '14 days 9 hours')
  end,
  'scraper'
from public.products p
cross join generate_series(0, 11) as m(i)
join (values
  ('wood'::public.fuel_category,       array[1.02, 1.03, 1.01, 0.97, 0.93, 0.92, 0.92, 0.93, 0.95, 0.98, 1.0, 1.0]),
  ('pellets'::public.fuel_category,    array[1.04, 1.05, 1.02, 0.96, 0.91, 0.9, 0.9, 0.92, 0.95, 0.98, 1.0, 1.0]),
  ('briquettes'::public.fuel_category, array[1.03, 1.04, 1.01, 0.97, 0.93, 0.92, 0.92, 0.93, 0.96, 0.98, 1.0, 1.0]),
  ('coal'::public.fuel_category,       array[1.01, 1.02, 1.01, 0.99, 0.97, 0.97, 0.97, 0.98, 0.98, 0.99, 1.0, 1.0])
) as s(category, f) on s.category = p.category
where not exists (select 1 from public.price_observations o where o.product_id = p.id);

-- ---------------------------------------------------------------------------
-- Zdroje pro scraping agenty (weby prodejců)
-- ---------------------------------------------------------------------------
insert into public.scrape_sources (seller_id, url, kind)
values
('fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 'https://www.palivo-ricany.cz', 'website'),
('7ebffe5b-1517-8d95-2909-185664e23dd3', 'https://www.drevo-zbraslav.cz', 'website'),
('779d7f55-701f-1e58-48cf-32e3f61cc416', 'https://www.pelety-kladno.cz', 'website'),
('13039dcf-c9ec-be40-ce22-52b10f4ce593', 'https://www.krivoklatske-drevo.cz', 'website'),
('19875aca-124f-99c0-ba40-78bc2b1bc8d5', 'https://www.sumava-palivo.cz', 'website'),
('42960afa-3a32-95de-284e-58ecd3f7ae0a', 'https://www.budejovicke-uhelne-sklady.cz', 'website'),
('41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 'https://www.plzenske-drevo.cz', 'website'),
('61e515c5-ba1d-d7c9-04c1-e8ecf2618238', 'https://www.chodsko-pelety.cz', 'website'),
('64a0aa23-18dd-9e88-8161-c85d3922af7e', 'https://www.krusnohorske-drevo.cz', 'website'),
('76eadb9e-22f8-d917-b0b3-2e189ffb9afd', 'https://www.uhelne-sklady-most.cz', 'website'),
('9dad5075-f9ee-d773-cf7b-695a98b3ff6e', 'https://www.polabske-drevo.cz', 'website'),
('daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', 'https://www.jizerske-palivo.cz', 'website'),
('f188079d-4521-4a7d-7972-01a52e60f9ae', 'https://www.podkrkonosske-drevo.cz', 'website'),
('977cb757-32fe-e7bf-9837-ded81ac1cb40', 'https://www.hradecke-pelety.cz', 'website'),
('bb891faf-b442-df04-95aa-30f297c30404', 'https://www.palivo-pardubice.cz', 'website'),
('bd3ca541-8923-405d-8d92-91a51cfb4eaa', 'https://www.orlicke-drevo.cz', 'website'),
('f78d875b-4f24-be8e-094b-302e4920a050', 'https://www.drevo-vysocina.cz', 'website'),
('a560021b-9876-ea92-655f-d03e94bec651', 'https://www.zdarske-pelety.cz', 'website'),
('2f30f387-bd92-7ab7-ea3c-14543226ea78', 'https://www.brnenske-palivo.cz', 'website'),
('8ec05a23-7324-f048-4bd7-b38b6ca94185', 'https://www.znojemske-drevo.cz', 'website'),
('07a9e77b-0877-afe7-866d-425eb604f2a5', 'https://www.hanacke-palivo.cz', 'website'),
('3b3577bd-8204-0de6-85a2-051300e8c7de', 'https://www.jesenicke-drevo.cz', 'website'),
('05e56c2e-a6a8-311f-1739-290680e4102b', 'https://www.valasske-drevo.cz', 'website'),
('94551423-f6b2-8513-0ef0-ea2d3d70b032', 'https://www.zlinske-pelety-a-brikety.cz', 'website'),
('80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 'https://www.ostravske-uhli-a-drevo.cz', 'website'),
('fe747d70-d608-13b5-3fbe-716ea590e8f2', 'https://www.beskydske-drevo.cz', 'website')
on conflict (url) do nothing;

-- ---------------------------------------------------------------------------
-- CI reporty (CrewAI)
-- ---------------------------------------------------------------------------
insert into public.analysis_reports (id, competitor_url, competitor_name, competitor_domain, report, report_path, status, model, duration_s, seller_id, region, categories, swot, created_at)
values ('20261112-160933_https-www-brnenske-palivo-cz', 'https://www.brnenske-palivo.cz', 'Brněnské palivo', 'brnenske-palivo.cz', '# Competitor Analysis: Brněnské palivo (brnenske-palivo.cz)

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

- Široký sortiment ve třech kategoriích (dřevo, pelety, brikety) na jednom místě
- Pelety ENplus A1 skladem po celý rok a online platba kartou
- Silná pozice v Brně a okolí, expedice do 48 hodin
- Vlastní e-shop s průběžnou aktualizací cen a skladových zásob

### Weaknesses

- Doprava mimo Brno a okolí je výrazně dražší a složitější
- Chybí uhlí a údaje o vlhkosti dřeva u větší části nabídky
- Web je funkční, ale nenabízí srovnání Kč/kWh ani cenové mapy
- Vyšší provozní náklady e-shopu se promítají do marže u briket

### Opportunities

- Rozšíření nabídky o pytlové pelety pro menší domácnosti
- Cílení na regionální dotazy typu „palivové dřevo Brno cena“
- Partnerství s realitními makléři a správci bytových domů
- Sezonní slevy na pelety v předjaří a cílení na předobjednávky

### Threats

- Cenová válka s Hradeckými peletami v kategorii pelet
- Rostoucí konkurence velkých e-shopů s nižšími náklady na dopravu
- Regulace emisí v Brně může snížit poptávku po kotlích na tuhá paliva
- Omezení vjezdu do centra Brna zdražuje logistiku posledních kilometrů

## Recommendations for podpalto.cz

1. **Srovnávací stránka Kč/kWh:** publikovat na podpalto.cz přehled pelet a briket v Kč/kWh, kde je Brněnské palivo referenční cenou v JHM.
2. **Ceníky per kraj:** vytvořit landing pages „palivové dřevo Brno cena“ a „pelety Jihomoravský kraj“ s aktuálními cenami a dojezdem.
3. **Dopravní kalkulačka:** přidat kalkulátor, který počítá paušál i kilometry, aby zákazník viděl celkovou cenu dodávky mimo Brno.
4. **Partnerství se správci bytů:** nabídnout správcům domů hromadné objednávky briket s fakturací a pravidelným dodáním.
5. **SEO klíčová slova:** cílit na „palivové dřevo Brno cena“, „pelety Brno akce“ a „brikety RUF Brno“.
6. **Sledování akcí:** týdenní monitoring slev Brněnského paliva a upozornění, když rozdíl v ceně pelet přesáhne 5 %.
7. **Měsíční cenová zpráva:** publikovat přehled změn cen v JHM a vysvětlit, proč se ceny mění, aby se zákazníci lépe orientovali.
', 'outputs/20261112-160933_https-www-brnenske-palivo-cz.md', 'completed', 'anthropic/claude-opus-5-5', 312,
  '2f30f387-bd92-7ab7-ea3c-14543226ea78', 'JHM', array['wood', 'pellets', 'briquettes']::public.fuel_category[], '{"strengths":["Široký sortiment ve třech kategoriích (dřevo, pelety, brikety) na jednom místě","Pelety ENplus A1 skladem po celý rok a online platba kartou","Silná pozice v Brně a okolí, expedice do 48 hodin","Vlastní e-shop s průběžnou aktualizací cen a skladových zásob"],"weaknesses":["Doprava mimo Brno a okolí je výrazně dražší a složitější","Chybí uhlí a údaje o vlhkosti dřeva u větší části nabídky","Web je funkční, ale nenabízí srovnání Kč/kWh ani cenové mapy","Vyšší provozní náklady e-shopu se promítají do marže u briket"],"opportunities":["Rozšíření nabídky o pytlové pelety pro menší domácnosti","Cílení na regionální dotazy typu „palivové dřevo Brno cena“","Partnerství s realitními makléři a správci bytových domů","Sezonní slevy na pelety v předjaří a cílení na předobjednávky"],"threats":["Cenová válka s Hradeckými peletami v kategorii pelet","Rostoucí konkurence velkých e-shopů s nižšími náklady na dopravu","Regulace emisí v Brně může snížit poptávku po kotlích na tuhá paliva","Omezení vjezdu do centra Brna zdražuje logistiku posledních kilometrů"]}'::jsonb, '2026-11-12T16:09:33Z')
on conflict (id) do nothing;
insert into public.analysis_reports (id, competitor_url, competitor_name, competitor_domain, report, report_path, status, model, duration_s, seller_id, region, categories, swot, created_at)
values ('20261103-091512_https-www-palivo-ricany-cz', 'https://www.palivo-ricany.cz', 'Palivo Říčany', 'palivo-ricany.cz', '# Competitor Analysis: Palivo Říčany (palivo-ricany.cz)

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
', 'outputs/20261103-091512_https-www-palivo-ricany-cz.md', 'completed', 'anthropic/claude-opus-5-5', 241,
  'fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', 'STC', array['wood', 'briquettes']::public.fuel_category[], null, '2026-11-03T09:15:12Z')
on conflict (id) do nothing;
insert into public.analysis_reports (id, competitor_url, competitor_name, competitor_domain, report, report_path, status, model, duration_s, seller_id, region, categories, swot, created_at)
values ('20261028-143005_https-www-plzenske-drevo-cz', 'https://www.plzenske-drevo.cz', 'Plzeňské dřevo', 'plzenske-drevo.cz', '# Competitor Analysis: Plzeňské dřevo (plzenske-drevo.cz)

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
', 'outputs/20261028-143005_https-www-plzenske-drevo-cz.md', 'completed', 'anthropic/claude-opus-5-5', 178,
  '41c3a97c-f6a4-4397-0ac7-7ecfc2951237', 'PLK', array['wood']::public.fuel_category[], null, '2026-10-28T14:30:05Z')
on conflict (id) do nothing;
insert into public.analysis_reports (id, competitor_url, competitor_name, competitor_domain, report, report_path, status, model, duration_s, seller_id, region, categories, swot, created_at)
values ('20261021-110247_https-www-hradecke-pelety-cz', 'https://www.hradecke-pelety.cz', 'Hradecké pelety', 'hradecke-pelety.cz', '# Competitor Analysis: Hradecké pelety (hradecke-pelety.cz)

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

- Nejnižší cena pelet ENplus A1 v Královéhradeckém kraji
- Doprava zdarma nad 1 t a expresní doručení do 48 hodin
- Skladem celoročně, i v sezóně s vysokou poptávkou
- Silná obchodní značka v Hradci Králové a okolních obcích

### Weaknesses

- Úzký sortiment, bez dřeva a uhlí
- Omezený dojezd a nutnost vysokozdvižného vozíku při vykládce
- Na webu chybí podrobnější údaje o původu a kvalitě pelet
- Závislost na jednom druhu paliva a citlivost na výkyvy ceny surovin

### Opportunities

- Rozšíření o pytlové pelety pro menší domácnosti a chalupy
- Spolupráce s instalatéry a servisy pelletových kotlů
- Letní předobjednávky s výhodnou cenou
- Vstup do briket v rámci stejné logistiky

### Threats

- Cenová válka v kategorii pelet, která může snížit marži i podpalto.cz
- Dobře optimalizované Google Ads v regionu Hradce Králové
- Rostoucí poptávka po peletách může přilákat další levné prodejce
- Případné zpřísnění dotací na pelety pro domácnosti

## Recommendations for podpalto.cz

1. **Cenová obrana v peletách:** v HKK a PAK pravidelně porovnávat cenu ENplus A1 s Hradeckými peletami a držet cenovou hladinu v toleranci 3 %.
2. **Doprava zdarma nad 1 t:** otestovat stejný práh v kraji HKK, aby podpalto.cz nebylo v rozhodování o objednávce znevýhodněno.
3. **Placená inzerce:** cílit na „pelety Hradec Králové cena“ a „pelety ENplus A1 Hradec“, kde Hradecké pelety investují do Google Ads.
4. **Letní předobjednávky:** nabídnout výhodnou cenu za předobjednávku pelet v červnu až srpnu s pevně danou dodávkou na podzim.
5. **Servisní partnerství:** oslovit instalatéry a servisy pelletových kotlů v KHK a nabídnout jim provizi za doporučení.
6. **Týdenní sledování hrozby:** zavést automatické hlídání cen Hradeckých pelet a upozornění při změně nad 5 %.
7. **Obsah o úsporách:** publikovat srovnání nákladů na vytápění peletami a dřevem v Kč/kWh pro region HKK.
', 'outputs/20261021-110247_https-www-hradecke-pelety-cz.md', 'completed', 'anthropic/claude-opus-5-5', 365,
  '977cb757-32fe-e7bf-9837-ded81ac1cb40', 'HKK', array['pellets', 'briquettes']::public.fuel_category[], '{"strengths":["Nejnižší cena pelet ENplus A1 v Královéhradeckém kraji","Doprava zdarma nad 1 t a expresní doručení do 48 hodin","Skladem celoročně, i v sezóně s vysokou poptávkou","Silná obchodní značka v Hradci Králové a okolních obcích"],"weaknesses":["Úzký sortiment, bez dřeva a uhlí","Omezený dojezd a nutnost vysokozdvižného vozíku při vykládce","Na webu chybí podrobnější údaje o původu a kvalitě pelet","Závislost na jednom druhu paliva a citlivost na výkyvy ceny surovin"],"opportunities":["Rozšíření o pytlové pelety pro menší domácnosti a chalupy","Spolupráce s instalatéry a servisy pelletových kotlů","Letní předobjednávky s výhodnou cenou","Vstup do briket v rámci stejné logistiky"],"threats":["Cenová válka v kategorii pelet, která může snížit marži i podpalto.cz","Dobře optimalizované Google Ads v regionu Hradce Králové","Rostoucí poptávka po peletách může přilákat další levné prodejce","Případné zpřísnění dotací na pelety pro domácnosti"]}'::jsonb, '2026-10-21T11:02:47Z')
on conflict (id) do nothing;
insert into public.analysis_reports (id, competitor_url, competitor_name, competitor_domain, report, report_path, status, model, duration_s, seller_id, region, categories, swot, created_at)
values ('20261008-084520_https-www-ostravske-uhli-a-drevo-cz', 'https://www.ostravske-uhli-a-drevo.cz', 'Ostravské uhlí a dřevo', 'ostravske-uhli-a-drevo.cz', '# Competitor Analysis: Ostravské uhlí a dřevo (ostravske-uhli-a-drevo.cz)

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

- Jediný analyzovaný prodejce s širokou nabídkou uhlí, dřeva i briket
- Sklad s vlastní váhou a osobním odběrem, nízké náklady na logistiku
- Nejlevnější hnědé uhlí ořech 2 v Moravskoslezském kraji
- Dlouholetá zkušenost s odběrem domácností v kraji

### Weaknesses

- Zastaralý web bez e-shopu a bez online objednávek
- Ceník je jen v PDF, bez přepočtu Kč/kWh a bez údajů o vlhkosti dřeva
- Slabá viditelnost ve výsledcích vyhledávání mimo lokální dotazy
- Chybějící online objednávky a pomalá odezva na dotazy

### Opportunities

- Přechod zákazníků z uhlí na brikety a dřevo, které nepodléhá omezení
- Digitalizace ceníku s porovnáním Kč/kWh
- Dotační programy na výměnu kotlů jako příležitost k prodeji dřeva a briket
- Dodávky briket pro obce a příspěvkové organizace

### Threats

- Plánované omezení uhelných kotlů a přísnější emisní limity pro tuhá paliva v MSK
- Pokles poptávky po hnědém uhlí, který může vést k výprodejům a tlaku na marži
- Konkurence levného dřeva z regionálních pil a e-shopů
- Vyšší náklady na dopravu těžkými vozy v městské zástavbě

## Recommendations for podpalto.cz

1. **Brikety místo uhlí:** na podpalto.cz zdůraznit brikety RUF a dřevo jako čistší alternativu pro domácnosti v MSK.
2. **Obsah o emisních limitech:** připravit přehled regulace tuhých paliv v Moravskoslezském kraji a přechodných řešení, která pomohou zákazníkům s plánováním.
3. **Kalkulačka dotací:** přidat přehled dotací na výměnu kotle s odkazem na prodej dřeva a briket, které jsou pro nové kotle vhodné.
4. **Kč/kWh pro MSK:** zveřejnit srovnání uhlí, dřeva a briket v Kč/kWh na stránce pro Moravskoslezský kraj.
5. **SEO klíčová slova:** cílit na „brikety Ostrava cena“, „palivové dřevo Ostrava“ a „dřevěné brikety RUF Ostrava“.
6. **Opatrnost u uhlí:** kategorii uhlí zatím neotevírat a sledovat regulaci, aby podpalto.cz neinvestovalo do segmentu s klesající perspektivou.
7. **Kontaktní formulář:** nabídnout Ostravě objednávku s odběrem v předem domluveném termínu, který nahradí telefonickou komunikaci.
', 'outputs/20261008-084520_https-www-ostravske-uhli-a-drevo-cz.md', 'completed', 'anthropic/claude-opus-5-5', 296,
  '80f8322a-f916-83fb-bc9b-8dd25d0d7c23', 'MSK', array['coal', 'wood', 'briquettes']::public.fuel_category[], '{"strengths":["Jediný analyzovaný prodejce s širokou nabídkou uhlí, dřeva i briket","Sklad s vlastní váhou a osobním odběrem, nízké náklady na logistiku","Nejlevnější hnědé uhlí ořech 2 v Moravskoslezském kraji","Dlouholetá zkušenost s odběrem domácností v kraji"],"weaknesses":["Zastaralý web bez e-shopu a bez online objednávek","Ceník je jen v PDF, bez přepočtu Kč/kWh a bez údajů o vlhkosti dřeva","Slabá viditelnost ve výsledcích vyhledávání mimo lokální dotazy","Chybějící online objednávky a pomalá odezva na dotazy"],"opportunities":["Přechod zákazníků z uhlí na brikety a dřevo, které nepodléhá omezení","Digitalizace ceníku s porovnáním Kč/kWh","Dotační programy na výměnu kotlů jako příležitost k prodeji dřeva a briket","Dodávky briket pro obce a příspěvkové organizace"],"threats":["Plánované omezení uhelných kotlů a přísnější emisní limity pro tuhá paliva v MSK","Pokles poptávky po hnědém uhlí, který může vést k výprodejům a tlaku na marži","Konkurence levného dřeva z regionálních pil a e-shopů","Vyšší náklady na dopravu těžkými vozy v městské zástavbě"]}'::jsonb, '2026-10-08T08:45:20Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- CI shrnutí prodejců
-- ---------------------------------------------------------------------------
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('fe6bbdd0-c0ce-fbba-7a20-ec4c4712b677', '20261103-091512_https-www-palivo-ricany-cz', 'Prémiový regionální prodejce suchého tvrdého dřeva a certifikovaných pelet pro zákazníky na okraji Prahy. Cílí na domácnosti, které chtějí jistotu vlhkosti a rychlé složení bez námahy.', 'Odborný a klidný, vykání, důraz na tradici řemesla a na měřitelné parametry (vlhkost, délka polena). Vyhýbá se slevovým heslům.', array['Deklarovaná vlhkost tvrdého dřeva pod 17 % s měřením u každé dodávky', 'Hydraulická ruka pro složení přímo do sklepa nebo kotelny', 'Vlastní sklad pod střechou a expedice do 48 hodin']::text[], '{"strengths":["Silná značka v Říčanech a okolí, vysoké hodnocení zákazníků","Vlastní hydraulická ruka a kontrola vlhkosti","Široká nabídka dřeva i pelet z jednoho místa"],"weaknesses":["Ceny o třetinu výš než u velkoobchodů v Kladně a Mostě","Omezená kapacita skladu v zimní špičce"],"opportunities":["Růst poptávky po suchém dřevě v okolí Prahy-východ","Předprodej pelet na podzimní sezónu přes web"],"threats":["Tlak pražských e-shopů s dopravou zdarma","Volatilita ceny vstupního dřeva z Vysočiny"]}'::jsonb, 4.5, '2026-11-03T09:15:12Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('19875aca-124f-99c0-ba40-78bc2b1bc8d5', null, 'Nízkonákladový lokální prodejce pro jižní Čechy, který soupeří hlavně cenou a dostupností.', 'Přátelský, neformální, oslovuje zákazníka tykáním.', array['Nízká cena u tvrdého dřeva v jižních Čechách', 'Doprava zdarma v okruhu 20 km']::text[], '{"strengths":["Nízké náklady a místní zdroje","Rychlá expedice v rámci regionu"],"weaknesses":["Slabší online prezentace a málo recenzí"],"opportunities":["Expanze do Pelhřimova a Písku"],"threats":["Konkurence velkých skladů v Českých Budějovicích"]}'::jsonb, -6.1, '2026-10-20T11:40:00Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('41c3a97c-f6a4-4397-0ac7-7ecfc2951237', '20261028-143005_https-www-plzenske-drevo-cz', 'Objemový hráč v Plzeňském kraji s nejširší nabídkou dřeva a dobrou dostupností. Cílí na střední třídu, která chce vyváženou cenu, rychlou dodávku a hydraulické složení.', 'Věcný a přívětivý, vykání, časté odkazy na lokální tradici a místní pracoviště. Zdůrazňuje transparentní ceny a kontrolu vlhkosti.', array['Nejširší sortiment tvrdého dřeva v Plzeňském kraji', 'Doprava zdarma v okruhu 15 km při odběru od 6 PRMS', 'Hydraulická ruka u všech dodávek v Plzni']::text[], '{"strengths":["Největší kapacita skladu v kraji a stabilní zásoby","Silný web a online objednávky s rezervací termínu","Cenová agresivita u tvrdého dřeva (index pod průměrem ČR)"],"weaknesses":["Omezený sortiment pelet – jen A1 v paletě","Slabší péče o zákazníky mimo Plzeň"],"opportunities":["Rozšíření pelet A1 na tuny a pytle","Expanze do Rokycan a Klatov přes partnerské dopravce"],"threats":["Tlak levnějších prodejců z Chodska na okrajových trasách","Rostoucí nájmy skladových ploch v Plzni"]}'::jsonb, -3.2, '2026-10-28T14:30:05Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('64a0aa23-18dd-9e88-8161-c85d3922af7e', null, 'Regionální prodejce suchých buků a bříz pro krby v Karlovarském kraji, s kvalitou sušení jako hlavním argumentem.', 'Tradiční a spolehlivý, vykání, důraz na místní výrobu a řemeslo.', array['Vlastní sušárna a měření vlhkosti', 'Bříza pro krb v nabídce celoročně']::text[], '{"strengths":["Kvalitní sušení a stabilní vlhkost","Dlouhodobá důvěra místních zákazníků"],"weaknesses":["Úzká geografická působnost","Zastaralý web bez online objednávek"],"opportunities":["Prodej pelet na tuny pro firmy v okolí"],"threats":["Pokles poptávky po dřevě kvůli plynofikaci"]}'::jsonb, 3, '2026-10-22T08:20:00Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('daec8ef5-d94c-a8ce-0fd8-05e9cc215dab', null, 'Lokální expresní prodejce pro Liberecký kraj, který vyhrává rychlostí dodávky a dostupností.', 'Mladý a rychlý, tykání, minimum odborných termínů.', array['Expedice do 48 hodin u položek skladem', 'Pelety A2 a válcové brikety v jedné objednávce']::text[], '{"strengths":["Rychlá expedice v Liberci","Moderní web s online objednávkou"],"weaknesses":["Malý objem skladu a rychle vyprodané položky"],"opportunities":["Dodávky firmám a penzionům v Jizerských horách"],"threats":["Konkurence větších skladů z Jablonce a Semil"]}'::jsonb, -1.4, '2026-10-18T16:05:00Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('f188079d-4521-4a7d-7972-01a52e60f9ae', null, 'Střední prodejce pro Trutnovsko a Krkonoše, který kombinuje širší sortiment dřeva s hydraulickým složením.', 'Vstřícný a praktický, vykání, důraz na dostupnost ze skladu.', array['Hydraulická ruka v ceně dopravy do 100 km', 'Sklad na dvoře s trvalou zásobou']::text[], '{"strengths":["Širší sortiment včetně měkkého polosuchého dřeva","Hydraulická ruka u všech dodávek"],"weaknesses":["Pomalejší reakce na poptávku mimo sezónu"],"opportunities":["Rozvoz do chat v Krkonoších v zimní sezóně"],"threats":["Konkurence z Polska na hranici"]}'::jsonb, -2.4, '2026-10-25T13:10:00Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('977cb757-32fe-e7bf-9837-ded81ac1cb40', '20261021-110247_https-www-hradecke-pelety-cz', 'Cenově agresivní regionální dodavatel pelet ENplus A1 a A2, který konkuruje hlavně cenou a rychlým rozvozem paletových objednávek do Hradce Králové a Pardubicka.', 'Věcný a přímý tón bez marketingových frází. Stavějí na číslech, úsporách a jasných podmínkách, oslovují zákazníka formálně.', array['Nejnižší cena paletových pelet ENplus A1 v kraji', 'Rozvoz paletových objednávek obvykle do 48 hodin', 'Pelety A2 jako levnější varianta pro běžný provoz kotle']::text[], '{"strengths":["Index ceny −5,8 % vůči průměru ČR, výrazně nejlevnější pelety v regionu","Široký výběr pelet v pytlech, paletách i volně ložených","Vlastní vozový park a sklad přímo v Hradci Králové"],"weaknesses":["Úzká nabídka dřeva, prodávají pouze buk sypaný","Nižší počet recenzí oproti větším dodavatelům"],"opportunities":["Expanze do Pardubicka a Náchodska, kde chybí levné pelety","Přechod zákazníků ze sypaného dřeva na pelety díky nižší ceně"],"threats":["Cenová válka s velkoobchodem v Pardubicích","Pokles cen pelet při vyšší sezónní nabídce by snížil jejich marži"]}'::jsonb, -5.8, '2026-10-21T11:02:47Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('f78d875b-4f24-be8e-094b-302e4920a050', null, 'Nejlevnější zdroj tvrdého dřeva na Vysočině, který cílí na zákazníky citlivé na cenu v okruhu 90 km od Jihlavy.', 'Srozumitelný a přátelský tón, zdůrazňuje férovost a krátké vyřízení objednávky.', array['Ceny tvrdého dřeva na spodní hranici pásma ČR', 'Složení hydraulickou rukou bez příplatku nad běžný rámec']::text[], '{"strengths":["Silná cenová pozice v tvrdém dřevě","Hodnocení 4,6 z více než 300 recenzí"],"weaknesses":["Slabší nabídka pelet a briket"],"opportunities":["Rozšíření rovnaného dřeva na Vysočinu i do Brna"],"threats":["Nedostatek suchého dřeva v jarní sezóně"]}'::jsonb, -3.1, '2026-10-29T10:12:00Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('2f30f387-bd92-7ab7-ea3c-14543226ea78', '20261112-160933_https-www-brnenske-palivo-cz', 'Prémiová brněnská značka s širokým portfoliem dřeva, pelet a služeb. Ceny jsou mírně nad průměrem ČR, zákazník platí za jistotu dodávky, servis a rychlost.', 'Profesionální a klidný tón s důrazem na spolehlivost, certifikace a osobní přístup. Oslovují formálně a používají odborné termíny.', array['Nejširší výběr dřevin a forem v Jihomoravském kraji', 'Expresní rozvoz do 48 hodin vlastní flotilou s hydraulickou rukou', 'Dřevo s vlhkostí pod 18 % dostupné po celý rok']::text[], '{"strengths":["Největší sklad a flotila v regionu, hodnocení 4,8","Široký sortiment včetně pelet ENplus A1 a rovnaného dřeva"],"weaknesses":["Ceny o 1,9 % nad průměrem ČR, citlivý zákazník může odejít k levnějšímu konkurentovi","Vyšší paušál za dopravu u menších objednávek"],"opportunities":["Cílit na firemní odběratele s pravidelnými dodávkami pelet","Rozšířit expresní službu i do Vysočiny a Znojemska"],"threats":["Levnější prodejci ze Znojma a Vysočiny v okrajových částech kraje","Vyšší mzdové náklady na rozvoz mohou tlačit ceny nahoru"]}'::jsonb, 1.9, '2026-11-12T16:09:33Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('07a9e77b-0877-afe7-866d-425eb604f2a5', null, 'Olomoucký hráč s nižšími cenami tvrdého dřeva a pelet, který oslovuje rodiny z okolních obcí.', 'Přátelský a regionální, s důrazem na domácí původ dřeva a osobní jednání.', array['Ceny tvrdého dřeva ve spodní části pásma pro Olomoucký kraj', 'Kombinace dřeva, pelet a briket z jednoho místa']::text[], '{"strengths":["Pevná pozice v Olomouci a okolí","Ceny pelet ENplus A2 pod průměrem"],"weaknesses":["Úzký sortiment briket a uhlí"],"opportunities":["Online objednávky pro zákazníky z Prostějova a Přerova"],"threats":["Konkurence velkých dodavatelů v Olomouci"]}'::jsonb, -2.4, '2026-11-04T14:30:00Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('05e56c2e-a6a8-311f-1739-290680e4102b', null, 'Lokální rodinná firma z Valašska, která stojí na poctivém tvrdém dřevu a osobní péči o zákazníka v okolních obcích.', 'Osobní a laskavý tón, zdůrazňuje rodinnou tradici a původ dřeva z regionu.', array['Vlastní pila a dřevo z lokálních zdrojů s certifikací FSC/PEFC', 'Doprava do 25 km zdarma']::text[], '{"strengths":["Vysoké hodnocení 4,8 od zákazníků","Konkurenceschopné ceny buku"],"weaknesses":["Nedostatečné kapacity při špičce sezóny"],"opportunities":["Rozšíření čerstvého dřeva pro přípravu na sezónu 2027"],"threats":["Kolísání dostupnosti surového dřeva z lesů"]}'::jsonb, 0.6, '2026-11-07T09:45:00Z')
on conflict (seller_id) do nothing;
insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, analyzed_at)
values ('80f8322a-f916-83fb-bc9b-8dd25d0d7c23', '20261008-084520_https-www-ostravske-uhli-a-drevo-cz', 'Levný dodavatel uhlí v Moravskoslezském kraji, který přitahuje zákazníky citlivé na cenu. Dřevo a brikety nabízí jako doplněk k uhlí.', 'Neformální a přátelský tón s regionálním nádechem. Zdůrazňují úsporu a jednoduchost objednávky.', array['Nejnižší cena hnědého uhlí ořech 2 v ČR', 'Uhlí, dřevo i brikety z jednoho místa', 'Osobní odběr ve skladu v Ostravě']::text[], '{"strengths":["Index ceny −7,4 % vůči průměru ČR, nejsilnější cenová pozice v uhlí","Velký sklad a vlastní flotila nákladních vozů"],"weaknesses":["Dřevo tvoří jen malou část tržeb a sortiment je úzký","Image levného uhlí, které některé zákazníky odrazuje od ekologičtějších paliv"],"opportunities":["Rozvoz briket a dřeva do Beskyd a na Těšínsko","Nabídka topné sezóny s předplatnými dodávkami uhlí"],"threats":["Regulace prodeje uhlí a přísnější emisní pravidla pro domácí topeniště","Přechod domácností na plyn a tepelná čerpadla snižuje poptávku"]}'::jsonb, -7.4, '2026-10-08T08:45:20Z')
on conflict (seller_id) do nothing;

-- ---------------------------------------------------------------------------
-- Statistiky trhu – průměry ČR (12 měsíců)
-- ---------------------------------------------------------------------------
insert into public.commodity_price_stats (month, region, commodity, avg_price_czk)
values ('2025-12-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1930),
  ('2025-12-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1385),
  ('2025-12-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7950),
  ('2025-12-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8600),
  ('2025-12-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 5000),
  ('2026-01-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1950),
  ('2026-01-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1398),
  ('2026-01-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 8030),
  ('2026-01-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8680),
  ('2026-01-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 5050),
  ('2026-02-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1910),
  ('2026-02-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1372),
  ('2026-02-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7800),
  ('2026-02-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8430),
  ('2026-02-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 5000),
  ('2026-03-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1840),
  ('2026-03-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1322),
  ('2026-03-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7340),
  ('2026-03-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8100),
  ('2026-03-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4900),
  ('2026-04-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1770),
  ('2026-04-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1268),
  ('2026-04-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 6960),
  ('2026-04-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 7760),
  ('2026-04-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4800),
  ('2026-05-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1745),
  ('2026-05-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1252),
  ('2026-05-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 6890),
  ('2026-05-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 7680),
  ('2026-05-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4800),
  ('2026-06-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1740),
  ('2026-06-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1250),
  ('2026-06-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 6890),
  ('2026-06-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 7680),
  ('2026-06-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4800),
  ('2026-07-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1760),
  ('2026-07-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1262),
  ('2026-07-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7040),
  ('2026-07-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 7760),
  ('2026-07-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4850),
  ('2026-08-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1800),
  ('2026-08-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1290),
  ('2026-08-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7270),
  ('2026-08-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8010),
  ('2026-08-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4850),
  ('2026-09-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1850),
  ('2026-09-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1331),
  ('2026-09-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7490),
  ('2026-09-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8170),
  ('2026-09-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4900),
  ('2026-10-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1853),
  ('2026-10-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1333),
  ('2026-10-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7500),
  ('2026-10-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8180),
  ('2026-10-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4925),
  ('2026-11-01'::date, null::public.region_code, 'hardWoodPrms'::public.commodity_key, 1890),
  ('2026-11-01'::date, null::public.region_code, 'softWoodPrms'::public.commodity_key, 1360),
  ('2026-11-01'::date, null::public.region_code, 'pelletsT'::public.commodity_key, 7650),
  ('2026-11-01'::date, null::public.region_code, 'briquettesT'::public.commodity_key, 8350),
  ('2026-11-01'::date, null::public.region_code, 'coalT'::public.commodity_key, 4950)
on conflict on constraint commodity_price_stats_key do update set avg_price_czk = excluded.avg_price_czk, computed_at = now();

-- ---------------------------------------------------------------------------
-- Statistiky trhu – kraje (poslední měsíc)
-- ---------------------------------------------------------------------------
insert into public.commodity_price_stats (month, region, commodity, avg_price_czk)
values ('2026-11-01'::date, 'PHA'::public.region_code, 'hardWoodPrms'::public.commodity_key, 2120),
  ('2026-11-01'::date, 'PHA'::public.region_code, 'softWoodPrms'::public.commodity_key, 1520),
  ('2026-11-01'::date, 'PHA'::public.region_code, 'pelletsT'::public.commodity_key, 8550),
  ('2026-11-01'::date, 'PHA'::public.region_code, 'briquettesT'::public.commodity_key, 9350),
  ('2026-11-01'::date, 'PHA'::public.region_code, 'coalT'::public.commodity_key, 5550),
  ('2026-11-01'::date, 'STC'::public.region_code, 'hardWoodPrms'::public.commodity_key, 2000),
  ('2026-11-01'::date, 'STC'::public.region_code, 'softWoodPrms'::public.commodity_key, 1440),
  ('2026-11-01'::date, 'STC'::public.region_code, 'pelletsT'::public.commodity_key, 8100),
  ('2026-11-01'::date, 'STC'::public.region_code, 'briquettesT'::public.commodity_key, 8850),
  ('2026-11-01'::date, 'STC'::public.region_code, 'coalT'::public.commodity_key, 5250),
  ('2026-11-01'::date, 'JHC'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1780),
  ('2026-11-01'::date, 'JHC'::public.region_code, 'softWoodPrms'::public.commodity_key, 1280),
  ('2026-11-01'::date, 'JHC'::public.region_code, 'pelletsT'::public.commodity_key, 7200),
  ('2026-11-01'::date, 'JHC'::public.region_code, 'briquettesT'::public.commodity_key, 7850),
  ('2026-11-01'::date, 'JHC'::public.region_code, 'coalT'::public.commodity_key, 4650),
  ('2026-11-01'::date, 'PLK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1910),
  ('2026-11-01'::date, 'PLK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1370),
  ('2026-11-01'::date, 'PLK'::public.region_code, 'pelletsT'::public.commodity_key, 7750),
  ('2026-11-01'::date, 'PLK'::public.region_code, 'briquettesT'::public.commodity_key, 8450),
  ('2026-11-01'::date, 'PLK'::public.region_code, 'coalT'::public.commodity_key, 5000),
  ('2026-11-01'::date, 'KVK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1950),
  ('2026-11-01'::date, 'KVK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1400),
  ('2026-11-01'::date, 'KVK'::public.region_code, 'pelletsT'::public.commodity_key, 7900),
  ('2026-11-01'::date, 'KVK'::public.region_code, 'briquettesT'::public.commodity_key, 8600),
  ('2026-11-01'::date, 'KVK'::public.region_code, 'coalT'::public.commodity_key, 5100),
  ('2026-11-01'::date, 'ULK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1830),
  ('2026-11-01'::date, 'ULK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1320),
  ('2026-11-01'::date, 'ULK'::public.region_code, 'pelletsT'::public.commodity_key, 7400),
  ('2026-11-01'::date, 'ULK'::public.region_code, 'briquettesT'::public.commodity_key, 8100),
  ('2026-11-01'::date, 'ULK'::public.region_code, 'coalT'::public.commodity_key, 4700),
  ('2026-11-01'::date, 'LBK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1890),
  ('2026-11-01'::date, 'LBK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1360),
  ('2026-11-01'::date, 'LBK'::public.region_code, 'pelletsT'::public.commodity_key, 7650),
  ('2026-11-01'::date, 'LBK'::public.region_code, 'briquettesT'::public.commodity_key, 8350),
  ('2026-11-01'::date, 'LBK'::public.region_code, 'coalT'::public.commodity_key, 4950),
  ('2026-11-01'::date, 'HKK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1870),
  ('2026-11-01'::date, 'HKK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1350),
  ('2026-11-01'::date, 'HKK'::public.region_code, 'pelletsT'::public.commodity_key, 7550),
  ('2026-11-01'::date, 'HKK'::public.region_code, 'briquettesT'::public.commodity_key, 8250),
  ('2026-11-01'::date, 'HKK'::public.region_code, 'coalT'::public.commodity_key, 4900),
  ('2026-11-01'::date, 'PAK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1850),
  ('2026-11-01'::date, 'PAK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1330),
  ('2026-11-01'::date, 'PAK'::public.region_code, 'pelletsT'::public.commodity_key, 7500),
  ('2026-11-01'::date, 'PAK'::public.region_code, 'briquettesT'::public.commodity_key, 8200),
  ('2026-11-01'::date, 'PAK'::public.region_code, 'coalT'::public.commodity_key, 4850),
  ('2026-11-01'::date, 'VYS'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1740),
  ('2026-11-01'::date, 'VYS'::public.region_code, 'softWoodPrms'::public.commodity_key, 1250),
  ('2026-11-01'::date, 'VYS'::public.region_code, 'pelletsT'::public.commodity_key, 7050),
  ('2026-11-01'::date, 'VYS'::public.region_code, 'briquettesT'::public.commodity_key, 7700),
  ('2026-11-01'::date, 'VYS'::public.region_code, 'coalT'::public.commodity_key, 4550),
  ('2026-11-01'::date, 'JHM'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1850),
  ('2026-11-01'::date, 'JHM'::public.region_code, 'softWoodPrms'::public.commodity_key, 1330),
  ('2026-11-01'::date, 'JHM'::public.region_code, 'pelletsT'::public.commodity_key, 7500),
  ('2026-11-01'::date, 'JHM'::public.region_code, 'briquettesT'::public.commodity_key, 8200),
  ('2026-11-01'::date, 'JHM'::public.region_code, 'coalT'::public.commodity_key, 4850),
  ('2026-11-01'::date, 'OLK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1760),
  ('2026-11-01'::date, 'OLK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1260),
  ('2026-11-01'::date, 'OLK'::public.region_code, 'pelletsT'::public.commodity_key, 7100),
  ('2026-11-01'::date, 'OLK'::public.region_code, 'briquettesT'::public.commodity_key, 7750),
  ('2026-11-01'::date, 'OLK'::public.region_code, 'coalT'::public.commodity_key, 4600),
  ('2026-11-01'::date, 'ZLK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1780),
  ('2026-11-01'::date, 'ZLK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1280),
  ('2026-11-01'::date, 'ZLK'::public.region_code, 'pelletsT'::public.commodity_key, 7200),
  ('2026-11-01'::date, 'ZLK'::public.region_code, 'briquettesT'::public.commodity_key, 7850),
  ('2026-11-01'::date, 'ZLK'::public.region_code, 'coalT'::public.commodity_key, 4650),
  ('2026-11-01'::date, 'MSK'::public.region_code, 'hardWoodPrms'::public.commodity_key, 1800),
  ('2026-11-01'::date, 'MSK'::public.region_code, 'softWoodPrms'::public.commodity_key, 1290),
  ('2026-11-01'::date, 'MSK'::public.region_code, 'pelletsT'::public.commodity_key, 7250),
  ('2026-11-01'::date, 'MSK'::public.region_code, 'briquettesT'::public.commodity_key, 7950),
  ('2026-11-01'::date, 'MSK'::public.region_code, 'coalT'::public.commodity_key, 4550)
on conflict on constraint commodity_price_stats_key do update set avg_price_czk = excluded.avg_price_czk, computed_at = now();
insert into public.region_stats (region, month, seller_count, price_index, change_pct)
values ('PHA', '2026-11-01', 74, 112, 2.4),
  ('STC', '2026-11-01', 95, 106, 1.8),
  ('JHC', '2026-11-01', 41, 94, 0.9),
  ('PLK', '2026-11-01', 52, 101, 1.5),
  ('KVK', '2026-11-01', 22, 103, 2.1),
  ('ULK', '2026-11-01', 36, 97, -0.6),
  ('LBK', '2026-11-01', 33, 100, 1),
  ('HKK', '2026-11-01', 38, 99, 0.7),
  ('PAK', '2026-11-01', 29, 98, -1.2),
  ('VYS', '2026-11-01', 27, 92, 3.1),
  ('JHM', '2026-11-01', 88, 98, 1.1),
  ('OLK', '2026-11-01', 31, 93, 2.6),
  ('ZLK', '2026-11-01', 26, 94, -1.9),
  ('MSK', '2026-11-01', 57, 95, -0.8)
on conflict (region, month) do update set seller_count = excluded.seller_count, price_index = excluded.price_index, change_pct = excluded.change_pct, computed_at = now();

-- ---------------------------------------------------------------------------
-- Blog – ukázkové články
-- ---------------------------------------------------------------------------
insert into public.blog_posts (id, slug, title, excerpt, content, cover_url, cover_alt, cover_credit, category, tags, author_name, author_role, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at)
values ('641e7fba-3fd5-43f6-f539-812804f5cb56', 'jak-poznat-suche-drevo', 'Jak poznat suché dřevo: 5 testů, které zvládnete přímo na dvoře', 'Vlhké dřevo hřeje o třetinu méně, zanáší komín a kouří. Ukážeme, jak suché dřevo poznat bez laboratoře – a kdy se vyplatí sáhnout po vlhkoměru.', 'Suché palivové dřevo má **vlhkost pod 20 %**. Čerstvě pokácený strom jí má i přes 50 % – a ta voda se musí v kamnech nejdřív odpařit, než začne dřevo pořádně hřát. Výsledek? Méně tepla, víc kouře a dehtu v komíně.

## Proč na vlhkosti tolik záleží

Každé procento vody navíc snižuje výhřevnost. Dřevo s vlhkostí 35 % dá zhruba o **třetinu méně tepla** než stejné dřevo vysušené na 18 %. Navíc hoří při nižší teplotě, takže se v komíně usazují dehty a saze.

> **Tip:** Kupujete-li „suché“ dřevo, zeptejte se prodejce, jak dlouho a kde schlo. Tvrdé dřevo potřebuje pod střechou zhruba 1,5–2 roky.

## 5 testů bez přístrojů

1. **Zvuk** – dvě suchá polena o sebe zvoní jasně a dutě. Vlhká jen tupě ťuknou.
2. **Praskliny na čele** – suché dřevo má na řezu paprskovité praskliny a tmavší, šedavý odstín.
3. **Kůra** – u suchého polena kůra snadno odpadává.
4. **Váha** – suché poleno je výrazně lehčí, než by čekal.
5. **Saponátový test** – natřete jeden konec polena saponátem a do druhého foukněte. Když se objeví bublinky, dřevo je suché a vzduch prochází cévami.

![Vlhkoměr zapíchnutý do čerstvě rozštípnutého polena](/blog/vlhkost.svg "Měřte vždy na čerstvě rozštípnuté ploše, ne na povrchu polena.")

## Kdy sáhnout po vlhkoměru

Jednoduchý hrotový vlhkoměr stojí pár stovek korun a vyplatí se hlavně při nákupu většího množství. Měřte vždy **uprostřed čerstvě rozštípnutého polena** – povrch bývá sušší než jádro.

| Naměřená vlhkost | Co to znamená |
|---|---|
| pod 20 % | Ideální, můžete topit |
| 20–25 % | Ještě dosušit, topit jen s dobrým tahem |
| nad 25 % | Nechte schnout do další sezóny |

## Shrnutí

Suché dřevo ušetří peníze i komín. Na [mapě cen](/) si můžete vyfiltrovat prodejce se štítkem **Suché < 18 %**.', '/blog/vlhkost.svg', 'Rozštípnuté poleno, kapky vody a vlhkoměr ukazující 18 %', null, 'rady', array['dřevo', 'vlhkost', 'topení']::text[],
  'Jana Dřevíčková', 'Lesní inženýrka', 'published', '2026-11-12T08:00:00.000Z', 2, null, null, '2026-11-12T08:00:00.000Z', '2026-11-14T10:30:00.000Z')
on conflict (slug) do nothing;
insert into public.blog_posts (id, slug, title, excerpt, content, cover_url, cover_alt, cover_credit, category, tags, author_name, author_role, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at)
values ('19542327-1dc6-d893-c518-fca0cb7fb5e5', 'prms-prm-plnometr-pruvodce-jednotkami', 'PRMS, PRM, nebo plnometr? Průvodce jednotkami palivového dřeva', 'Prodejci uvádějí ceny v různých jednotkách a srovnávat je není snadné. Vysvětlíme rozdíl mezi sypaným a rovnaným metrem a plnometrem.', 'Jeden prodejce nabízí dřevo za 1 450 Kč, druhý za 2 100 Kč – a přesto může být dražší ten první. Rozhoduje **jednotka**, ve které je cena uvedena.

## Tři základní jednotky

- **PLM – plnometr.** Krychle 1 × 1 × 1 m vyplněná čistým dřevem bez mezer. Používá se hlavně v lesnictví.
- **PRM – prostorový metr rovnaný.** Polena pečlivě naskládaná do krychle 1 m³. Mezi poleny jsou mezery.
- **PRMS – prostorový metr sypaný.** Štípaná polena volně nasypaná do 1 m³. Mezer je nejvíc.

## Kolik dřeva v jednotce skutečně je

| Jednotka | Podíl čistého dřeva |
|---|---|
| 1 PLM | 1,00 PLM |
| 1 PRM | ≈ 0,70 PLM |
| 1 PRMS | ≈ 0,45 PLM |

Z toho plyne, že **1 PRM odpovídá zhruba 1,5 PRMS**. Pokud tedy prodejce nabízí rovnané dřevo za 2 100 Kč/PRM, je to v přepočtu asi 1 350 Kč za sypaný metr.

> Ceny na podpalto.cz přepočítáváme na společnou jednotku a navíc na **cenu za kWh tepla** – to je nejférovější srovnání napříč palivy.

## Na co si dát pozor

1. Ověřte si **délku polen** – kratší polena (25 cm) se sypou hustěji než 50cm.
2. Zeptejte se, zda je cena **včetně dopravy** a složení.
3. U palet a klecí se informujte, kolik **PRM** paleta obsahuje.

Převod mezi jednotkami vám spočítá [kalkulačka](/kalkulacka).', '/blog/hranice-dreva.svg', 'Hranice palivového dřeva pod dřevěnou stříškou', null, 'pruvodce', array['jednotky', 'PRMS', 'nákup']::text[],
  'Redakce podpalto.cz', 'Tým podpalto.cz', 'published', '2026-11-05T07:30:00.000Z', 2, null, null, '2026-11-05T07:30:00.000Z', '2026-11-05T07:30:00.000Z')
on conflict (slug) do nothing;
insert into public.blog_posts (id, slug, title, excerpt, content, cover_url, cover_alt, cover_credit, category, tags, author_name, author_role, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at)
values ('6a2947be-10f8-496d-95e8-68a1f6672495', 'pelety-nebo-drevo-cena-za-kwh-2026', 'Pelety, nebo dřevo? Kolik vás v roce 2026 stojí 1 kWh tepla', 'Porovnali jsme průměrné ceny paliv z naší databáze a přepočítali je na cenu za kilowatthodinu dodaného tepla včetně účinnosti kotle.', 'Cena za tunu nebo metr toho moc neřekne – každé palivo má jinou výhřevnost a každý kotel jinou účinnost. Proto srovnáváme **cenu za 1 kWh dodaného tepla**.

## Jak počítáme

Cenu paliva vydělíme energií, kterou obsahuje, a výsledek upravíme o typickou účinnost spotřebiče:

- kusové dřevo v moderních kamnech ≈ 78 %
- pelety v automatickém kotli ≈ 90 %
- brikety ≈ 80 %, hnědé uhlí ≈ 72 %

## Výsledky (průměr ČR, listopad 2026)

| Palivo | Typická cena | Cena tepla |
|---|---|---|
| Měkké dřevo, sypané | 1 300 Kč/PRMS | ≈ 1,6 Kč/kWh |
| Tvrdé dřevo, sypané | 1 900 Kč/PRMS | ≈ 1,9 Kč/kWh |
| Pelety ENplus A1 | 7 600 Kč/t | ≈ 1,7 Kč/kWh |
| Dřevěné brikety | 8 300 Kč/t | ≈ 2,2 Kč/kWh |

*Hodnoty jsou orientační a vychází z ukázkových dat.*

## Co z toho plyne

- **Měkké dřevo** je nejlevnější, ale hoří rychle – hodí se na zátop a do kamen s velkým topeništěm.
- **Pelety** jsou cenově srovnatelné a hlavně pohodlné: kotel se o přikládání postará sám.
- U briket platíte za komfort skladování a stálou kvalitu.

![Automatický kotel na pelety vedle zásoby pytlů](/blog/pelety.svg "Pelety skladujte v suchu – vlhké pelety se rozpadají na prach.")

Aktuální ceny podle krajů najdete v sekci [Trh a trendy](/trendy).', '/blog/pelety.svg', 'Pytle pelet ENplus A1 a hromádka dřevěných pelet', null, 'trh', array['pelety', 'ceny', 'kWh']::text[],
  'Redakce podpalto.cz', 'Tým podpalto.cz', 'published', '2026-10-28T09:00:00.000Z', 1, null, null, '2026-10-28T09:00:00.000Z', '2026-11-02T12:00:00.000Z')
on conflict (slug) do nothing;
insert into public.blog_posts (id, slug, title, excerpt, content, cover_url, cover_alt, cover_credit, category, tags, author_name, author_role, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at)
values ('e0042932-12f1-2cd7-a27d-fd666d78deb9', 'kdy-nakoupit-drevo-na-zimu', 'Kdy nakoupit dřevo na zimu, abyste ušetřili', 'Ceny palivového dřeva během roku kolísají až o 15 %. Podívejte se, kdy je nejlepší čas na nákup a proč se vyplatí plánovat dopředu.', 'Když v listopadu udeří první mráz, telefony prodejců dřeva nezastaví. A s poptávkou rostou i ceny a čekací lhůty.

## Sezónnost cen

Z dat, která sbíráme, je vidět jasný vzorec:

1. **Duben až červen** – nejnižší ceny, prodejci vyprazdňují sklady a mají čas na rozvoz.
2. **Červenec až září** – ceny pozvolna rostou.
3. **Říjen až leden** – vrchol sezóny, nejvyšší ceny a nejdelší dodací lhůty.

> Nákupem na jaře ušetříte typicky **8–15 %** a navíc dřevo stihne přes léto doschnout.

## Plánujte dopředu

Nejlepší strategie je kupovat dřevo **o rok dopředu**: letos na jaře dřevo na zimu příští. Pod střechou s dobrým prouděním vzduchu doschne a vy budete topit opravdu suchým palivem.

## Kolik dřeva potřebujete

Spotřebu na celou sezónu – podle velikosti domu, izolace a druhu paliva – vám odhadne [sezónní kalkulačka](/kalkulacka).', '/blog/zima.svg', 'Zasněžená chalupa s kouřícím komínem uprostřed lesa', null, 'trh', array['sezóna', 'nákup', 'ceny']::text[],
  'Jana Dřevíčková', 'Lesní inženýrka', 'published', '2026-10-15T06:00:00.000Z', 1, null, null, '2026-10-15T06:00:00.000Z', '2026-10-15T06:00:00.000Z')
on conflict (slug) do nothing;
insert into public.blog_posts (id, slug, title, excerpt, content, cover_url, cover_alt, cover_credit, category, tags, author_name, author_role, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at)
values ('74e841cf-977a-b74b-7f34-cc1c2e3e6b07', 'jak-spravne-skladovat-palivove-drevo', 'Jak správně skladovat palivové dřevo', 'Dobře postavená hranice je základ. Poradíme, kam ji umístit, jak ji skládat a proč nepatří pod igelit.', 'Dřevo schne nejlépe **na slunci a ve větru**, chráněné jen shora. Uzavřená kůlna nebo igelitová plachta až k zemi naopak sušení brzdí.

## Pět pravidel dobré hranice

- **Ne přímo na zem** – použijte palety nebo hranoly, aby zespodu proudil vzduch.
- **Stříška, ne obal** – zakryjte jen vršek, boky nechte otevřené.
- **Mezera od zdi** – alespoň 10 cm, jinak u stěny vzniká vlhký kout.
- **Kůrou nahoru** – horní vrstva tak funguje jako malá střecha.
- **Jižní strana** – nejvíc slunce a větru.

![Dobře postavená hranice pod stříškou](/blog/hranice-dreva.svg "Hranice na podkladu, se stříškou a otevřenými boky.")

## Kolik místa potřebujete

Na typickou sezónu rodinného domu (8–12 PRMS) počítejte s hranicí zhruba **4 m dlouhou a 1,5 m vysokou** ve dvou řadách.

## Dřevo v domě

Do domu si noste jen zásobu na pár dní. Pokojová teplota dřevo ještě dosuší, ale velká zásoba v obytných místnostech zvyšuje prašnost a riziko hmyzu.', '/blog/les.svg', 'Smrkový les v podvečerním světle', null, 'rady', array['skladování', 'dřevo', 'sušení']::text[],
  'Petr Kamnář', 'Topenář a kominík', 'published', '2026-09-30T07:00:00.000Z', 1, null, null, '2026-09-30T07:00:00.000Z', '2026-09-30T07:00:00.000Z')
on conflict (slug) do nothing;
insert into public.blog_posts (id, slug, title, excerpt, content, cover_url, cover_alt, cover_credit, category, tags, author_name, author_role, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at)
values ('b91501c2-825f-36f7-d6ac-ac0c7b3d3321', 'jak-spravne-zatapet-v-kamnech', 'Jak správně zatápět v kamnech – metoda shora', 'Zatápění shora snižuje kouř při rozhořívání a šetří palivo. Krok za krokem, s tipy od kominíka.', 'Rozpracovaný článek – koncept je vidět jen v editoru.

## Postup

1. Dospod dejte silnější polena.
2. Na ně tenčí polínka a navrch podpalovač s třískami.
3. Zapalte shora a nechte otevřený přívod vzduchu.', '/blog/kamna.svg', 'Litinová kamna s hořícím ohněm v útulném interiéru', null, 'rady', array['kamna', 'zátop', 'emise']::text[],
  'Petr Kamnář', 'Topenář a kominík', 'draft', null, 1, null, null, '2026-11-16T15:20:00.000Z', '2026-11-16T15:20:00.000Z')
on conflict (slug) do nothing;
