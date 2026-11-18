import type { Metadata } from "next";
import Link from "next/link";
import { BOILER_EFFICIENCY, KWH_PER_KG, MOISTURE_ENERGY_FACTOR, WOOD_KWH_PER_PLM, WOOD_SOLID_FACTOR } from "@/lib/constants";
import { breadcrumbJsonLd, faqJsonLd, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Metodika a zdroje dat",
  description:
    "Odkud podpalto.cz bere ceny palivového dřeva, pelet, briket a uhlí, jak je přepočítává na společné jednotky a Kč/kWh a jak odhaduje cenu dopravy.",
  alternates: { canonical: "/metodika" },
  openGraph: { url: "/metodika", title: "Metodika a zdroje dat podpalto.cz" },
};

const nf = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 });
const pct = (v: number) => `${Math.round(v * 100)} %`;

const FAQ = [
  {
    q: "Odkud podpalto.cz bere ceny paliv?",
    a: "Z veřejných ceníků, e-shopů a produktových feedů prodejců tuhých paliv v ČR. Ceny čtou automatizovaní agenti, kód je převádí na společné jednotky a podezřelé hodnoty před zveřejněním kontroluje člověk.",
  },
  {
    q: "Jsou ceny včetně DPH?",
    a: "Ano. Všechny ceny jsou včetně DPH. Pokud prodejce uvádí cenu bez DPH, dopočítáme ji a záznam označíme.",
  },
  {
    q: "Jak se počítá cena za kWh?",
    a: "Cenu paliva vydělíme energií, kterou palivo obsahuje (podle výhřevnosti a vlhkosti), a pro cenu tepla ještě typickou účinností spotřebiče (kamna, kotel).",
  },
  {
    q: "Jak přesný je odhad ceny dopravy?",
    a: "Je orientační. Vzdálenost počítáme vzdušnou čarou vynásobenou koeficientem 1,25 a použijeme podmínky dopravy, které prodejce uvádí. Přesnou cenu vždy potvrdí prodejce.",
  },
];

/** Metodika a zdroje dat – důvěryhodnost (E-E-A-T) a citovatelná fakta pro vyhledávače i AI. */
export default function MetodikaPage() {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd([breadcrumbJsonLd([{ name: "Metodika a zdroje dat", path: "/metodika" }]), faqJsonLd(FAQ)]) }}
      />
      <header className="space-y-3">
        <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">O projektu</p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Metodika a zdroje dat</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          podpalto.cz srovnává ceny palivového dřeva, pelet, briket a uhlí v České republice. Pomáhá domácnostem najít
          výhodné palivo v okolí – včetně ceny dopravy a přepočtu na cenu tepla. Tady popisujeme, odkud data jsou a jak s nimi
          počítáme.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-semibold">Odkud jsou ceny</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Ceníky prodejců:</strong> veřejné ceníky na webech, e-shopy, produktové feedy a PDF ceníky prodejců tuhých
            paliv. Sbíráme jen to, co prodejce zveřejňuje a co povoluje soubor robots.txt.
          </li>
          <li>
            <strong>Automatizovaný sběr s kontrolou:</strong> ceny čtou agenti, ale čísla nikdy nevymýšlí – každá cena musí
            odpovídat citaci ze stránky prodejce. Přepočty dělá kód, ne jazykový model.
          </li>
          <li>
            <strong>Ruční kontrola:</strong> ceny mimo běžné rozpětí trhu, skoky o víc než 30 % nebo prodejci bez ověřené
            polohy se nezveřejní, dokud je nezkontroluje člověk.
          </li>
          <li>
            <strong>Registry:</strong> IČO a sídlo prodejců ověřujeme v ARES, adresy v registru RÚIAN.
          </li>
          <li>
            <strong>Statistiky:</strong> podíl domácností podle způsobu vytápění je ze Sčítání lidu, domů a bytů 2021 (ČSÚ,
            otevřená data).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-semibold">Jednotky dřeva</h2>
        <p className="leading-relaxed">
          Palivové dřevo se prodává v různých objemových jednotkách. Pro srovnání je převádíme na plnometr (PLM), tedy krychli
          plného dřeva bez mezer:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>1 PRM (prostorový metr rovnaný) ≈ {nf.format(WOOD_SOLID_FACTOR.PRM)} PLM</li>
          <li>1 PRMS (prostorový metr sypaný, štípané 25–33 cm) ≈ {nf.format(WOOD_SOLID_FACTOR.PRMS)} PLM</li>
          <li>1 PRM ≈ {nf.format(WOOD_SOLID_FACTOR.PRM / WOOD_SOLID_FACTOR.PRMS)} PRMS</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-semibold">Výhřevnost a cena tepla</h2>
        <p className="leading-relaxed">
          Cena za kWh = cena paliva ÷ energie v palivu. Cena <em>tepla</em> navíc zohledňuje typickou účinnost spotřebiče.
          Používáme tyto hodnoty:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            1 PLM suchého dřeva (vlhkost do 20 %): tvrdé {nf.format(WOOD_KWH_PER_PLM.hard)} kWh, bříza {nf.format(WOOD_KWH_PER_PLM.birch)} kWh,
            měkké {nf.format(WOOD_KWH_PER_PLM.soft)} kWh
          </li>
          <li>
            Vlhčí dřevo: polosuché (20–35 %) {pct(MOISTURE_ENERGY_FACTOR.semi)}, čerstvé (nad 35 %) {pct(MOISTURE_ENERGY_FACTOR.fresh)} energie suchého
          </li>
          <li>
            Pelety {nf.format(KWH_PER_KG.pellets)} kWh/kg, dřevěné brikety {nf.format(KWH_PER_KG.briquettesWood)} kWh/kg, hnědé uhlí{" "}
            {nf.format(KWH_PER_KG.coalBrown)} kWh/kg, černé uhlí {nf.format(KWH_PER_KG.coalBlack)} kWh/kg, koks {nf.format(KWH_PER_KG.coke)} kWh/kg
          </li>
          <li>
            Účinnost spotřebiče: kusové dřevo {pct(BOILER_EFFICIENCY.wood)}, pelety {pct(BOILER_EFFICIENCY.pellets)}, brikety{" "}
            {pct(BOILER_EFFICIENCY.briquettes)}, uhlí {pct(BOILER_EFFICIENCY.coal)}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-semibold">Průměry, kraje a doprava</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Průměrné ceny</strong> počítáme každý měsíc z aktuálních cen schválených nabídek, bez akčních a
            množstevních cen. Používáme medián: nejdřív za každého prodejce, potom přes prodejce v kraji nebo v ČR – jeden
            prodejce s deseti druhy uhlí tak výsledek nepřeváží. Kraj, kde zatím nemáme žádnou cenu, průměr nemá. Cenový
            index kraje porovnává kraj s průměrem ČR (100 = průměr).
          </li>
          <li>
            <strong>Doprava:</strong> vzdálenost odhadujeme jako vzdušnou čáru × 1,25 a použijeme podmínky prodejce (paušál,
            cena za km, doprava zdarma do určité vzdálenosti nebo od určitého množství, dojezd). Výsledek je orientační.
          </li>
          <li>
            <strong>Neuvedené údaje:</strong> když prodejce něco neuvádí (sklad, doprava), ukazujeme „neuvedeno“ – nikdy si
            hodnotu nedomýšlíme.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl font-semibold">Časté otázky</h2>
        <dl className="space-y-4">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-1 leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-muted-foreground">
        Aktuální čísla najdete v přehledu <Link href="/ceny" className="underline">cen podle krajů</Link>, vývoj v sekci{" "}
        <Link href="/trendy" className="underline">Trh a trendy</Link> a rady k nákupu na <Link href="/blog" className="underline">blogu</Link>.
      </p>
    </article>
  );
}
