import type { BlogAuthor, BlogPost } from "@/types";
import { estimateReadingMinutes } from "@/lib/blog/utils";

/**
 * Ukázkové (dummy) články blogu. Po napojení Supabase je nahradí tabulka `blog_posts`.
 * Obsah je v Markdownu – obrázky z /public/blog, ve skutečnosti z bucketu `blog-images`.
 */

const REDAKCE: BlogAuthor = { name: "Redakce podpalto.cz", role: "Tým podpalto.cz" };
// v offline režimu také jen redakce – smyšlení „odborníci“ by škodili důvěryhodnosti (E-E-A-T)
const JANA: BlogAuthor = REDAKCE;
const PETR: BlogAuthor = REDAKCE;

type Draft = Omit<BlogPost, "reading_minutes">;

const POSTS: Draft[] = [
  {
    id: "post-suche-drevo",
    slug: "jak-poznat-suche-drevo",
    title: "Jak poznat suché dřevo: 5 testů, které zvládnete přímo na dvoře",
    excerpt:
      "Vlhké dřevo hřeje o třetinu méně, zanáší komín a kouří. Ukážeme, jak suché dřevo poznat bez laboratoře – a kdy se vyplatí sáhnout po vlhkoměru.",
    cover: { url: "/blog/vlhkost.svg", alt: "Rozštípnuté poleno, kapky vody a vlhkoměr ukazující 18 %" },
    category: "rady",
    tags: ["dřevo", "vlhkost", "topení"],
    author: JANA,
    status: "published",
    published_at: "2026-11-12T08:00:00.000Z",
    updated_at: "2026-11-14T10:30:00.000Z",
    content: `Suché palivové dřevo má **vlhkost pod 20 %**. Čerstvě pokácený strom jí má i přes 50 % – a ta voda se musí v kamnech nejdřív odpařit, než začne dřevo pořádně hřát. Výsledek? Méně tepla, víc kouře a dehtu v komíně.

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

Suché dřevo ušetří peníze i komín. Na [mapě cen](/) si můžete vyfiltrovat prodejce se štítkem **Suché < 18 %**.`,
  },
  {
    id: "post-jednotky",
    slug: "prms-prm-plnometr-pruvodce-jednotkami",
    title: "PRMS, PRM, nebo plnometr? Průvodce jednotkami palivového dřeva",
    excerpt:
      "Prodejci uvádějí ceny v různých jednotkách a srovnávat je není snadné. Vysvětlíme rozdíl mezi sypaným a rovnaným metrem a plnometrem.",
    cover: { url: "/blog/hranice-dreva.svg", alt: "Hranice palivového dřeva pod dřevěnou stříškou" },
    category: "pruvodce",
    tags: ["jednotky", "PRMS", "nákup"],
    author: REDAKCE,
    status: "published",
    published_at: "2026-11-05T07:30:00.000Z",
    updated_at: "2026-11-05T07:30:00.000Z",
    content: `Jeden prodejce nabízí dřevo za 1 450 Kč, druhý za 2 100 Kč – a přesto může být dražší ten první. Rozhoduje **jednotka**, ve které je cena uvedena.

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

Převod mezi jednotkami vám spočítá [kalkulačka](/kalkulacka).`,
  },
  {
    id: "post-pelety-vs-drevo",
    slug: "pelety-nebo-drevo-cena-za-kwh-2026",
    title: "Pelety, nebo dřevo? Kolik vás v roce 2026 stojí 1 kWh tepla",
    excerpt:
      "Porovnali jsme průměrné ceny paliv z naší databáze a přepočítali je na cenu za kilowatthodinu dodaného tepla včetně účinnosti kotle.",
    cover: { url: "/blog/pelety.svg", alt: "Pytle pelet ENplus A1 a hromádka dřevěných pelet" },
    category: "trh",
    tags: ["pelety", "ceny", "kWh"],
    author: REDAKCE,
    status: "published",
    published_at: "2026-10-28T09:00:00.000Z",
    updated_at: "2026-11-02T12:00:00.000Z",
    content: `Cena za tunu nebo metr toho moc neřekne – každé palivo má jinou výhřevnost a každý kotel jinou účinnost. Proto srovnáváme **cenu za 1 kWh dodaného tepla**.

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

Aktuální ceny podle krajů najdete v sekci [Trh a trendy](/trendy).`,
  },
  {
    id: "post-kdy-nakoupit",
    slug: "kdy-nakoupit-drevo-na-zimu",
    title: "Kdy nakoupit dřevo na zimu, abyste ušetřili",
    excerpt:
      "Ceny palivového dřeva během roku kolísají až o 15 %. Podívejte se, kdy je nejlepší čas na nákup a proč se vyplatí plánovat dopředu.",
    cover: { url: "/blog/zima.svg", alt: "Zasněžená chalupa s kouřícím komínem uprostřed lesa" },
    category: "trh",
    tags: ["sezóna", "nákup", "ceny"],
    author: JANA,
    status: "published",
    published_at: "2026-10-15T06:00:00.000Z",
    updated_at: "2026-10-15T06:00:00.000Z",
    content: `Když v listopadu udeří první mráz, telefony prodejců dřeva nezastaví. A s poptávkou rostou i ceny a čekací lhůty.

## Sezónnost cen

Z dat, která sbíráme, je vidět jasný vzorec:

1. **Duben až červen** – nejnižší ceny, prodejci vyprazdňují sklady a mají čas na rozvoz.
2. **Červenec až září** – ceny pozvolna rostou.
3. **Říjen až leden** – vrchol sezóny, nejvyšší ceny a nejdelší dodací lhůty.

> Nákupem na jaře ušetříte typicky **8–15 %** a navíc dřevo stihne přes léto doschnout.

## Plánujte dopředu

Nejlepší strategie je kupovat dřevo **o rok dopředu**: letos na jaře dřevo na zimu příští. Pod střechou s dobrým prouděním vzduchu doschne a vy budete topit opravdu suchým palivem.

## Kolik dřeva potřebujete

Spotřebu na celou sezónu – podle velikosti domu, izolace a druhu paliva – vám odhadne [sezónní kalkulačka](/kalkulacka).`,
  },
  {
    id: "post-skladovani",
    slug: "jak-spravne-skladovat-palivove-drevo",
    title: "Jak správně skladovat palivové dřevo",
    excerpt:
      "Dobře postavená hranice je základ. Poradíme, kam ji umístit, jak ji skládat a proč nepatří pod igelit.",
    cover: { url: "/blog/les.svg", alt: "Smrkový les v podvečerním světle" },
    category: "rady",
    tags: ["skladování", "dřevo", "sušení"],
    author: PETR,
    status: "published",
    published_at: "2026-09-30T07:00:00.000Z",
    updated_at: "2026-09-30T07:00:00.000Z",
    content: `Dřevo schne nejlépe **na slunci a ve větru**, chráněné jen shora. Uzavřená kůlna nebo igelitová plachta až k zemi naopak sušení brzdí.

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

Do domu si noste jen zásobu na pár dní. Pokojová teplota dřevo ještě dosuší, ale velká zásoba v obytných místnostech zvyšuje prašnost a riziko hmyzu.`,
  },
  {
    id: "post-zatapeni",
    slug: "jak-spravne-zatapet-v-kamnech",
    title: "Jak správně zatápět v kamnech – metoda shora",
    excerpt:
      "Zatápění shora snižuje kouř při rozhořívání a šetří palivo. Krok za krokem, s tipy od kominíka.",
    cover: { url: "/blog/kamna.svg", alt: "Litinová kamna s hořícím ohněm v útulném interiéru" },
    category: "rady",
    tags: ["kamna", "zátop", "emise"],
    author: PETR,
    status: "draft",
    published_at: null,
    updated_at: "2026-11-16T15:20:00.000Z",
    content: `Rozpracovaný článek – koncept je vidět jen v editoru.

## Postup

1. Dospod dejte silnější polena.
2. Na ně tenčí polínka a navrch podpalovač s třískami.
3. Zapalte shora a nechte otevřený přívod vzduchu.`,
  },
];

export const BLOG_POSTS: BlogPost[] = POSTS.map((p) => ({ ...p, reading_minutes: estimateReadingMinutes(p.content) }));
