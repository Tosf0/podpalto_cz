/**
 * Veřejné SEO stránky s cenami (rozcestník /ceny, kraje a paliva). Serverové komponenty:
 * HTML obsahuje všechna čísla už při načtení (vyhledávače i AI roboti je přečtou bez JS).
 * Texty jsou česky – stránky cílí na české vyhledávání.
 */
import Link from "next/link";
import { ArrowRight, BarChart3, ChevronRight, Info, MapPinned } from "lucide-react";
import type { CommodityKey, RegionCode } from "@/types";
import { REGIONS, REGION_CODES } from "@/lib/constants";
import { breadcrumbJsonLd, faqJsonLd, jsonLd } from "@/lib/seo";
import {
  COMMODITIES,
  FUEL_PAGES,
  REGION_LOCATIVE,
  REGION_SLUGS,
  byPriceIndex,
  commodity,
  czk,
  czkPerUnit,
  hasRegionData,
  heatPrice,
  int,
  kwhPrice,
  monthLabel,
  pct,
  type FuelPage,
  type MarketSnapshot,
} from "@/lib/seo-data";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Výpočty                                                             */
/* ------------------------------------------------------------------ */

function latest(s: MarketSnapshot) {
  return s.trends.at(-1);
}

function czAvg(s: MarketSnapshot, key: CommodityKey): number | undefined {
  return latest(s)?.[key];
}

function regionAvg(s: MarketSnapshot, code: RegionCode, key: CommodityKey): number | undefined {
  return s.regions.find((r) => r.region === code)?.avgPrices[key];
}

function diffPct(value: number | undefined, base: number | undefined): number | undefined {
  if (value == null || !base) return undefined;
  return ((value - base) / base) * 100;
}

/** Změna průměru ČR za období trendů (nejstarší → nejnovější měsíc). */
function periodChange(s: MarketSnapshot, key: CommodityKey): number | undefined {
  const first = s.trends[0]?.[key];
  return diffPct(latest(s)?.[key], first);
}

function rankRegions(s: MarketSnapshot, key: CommodityKey) {
  return [...s.regions].filter((r) => r.avgPrices[key] != null).sort((a, b) => a.avgPrices[key] - b.avgPrices[key]);
}

/* ------------------------------------------------------------------ */
/* Stavební bloky                                                      */
/* ------------------------------------------------------------------ */

function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Drobečková navigace" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((it, i) => (
        <span key={it.name} className="inline-flex items-center gap-1.5">
          {i > 0 && <ChevronRight aria-hidden className="size-3.5 opacity-50" />}
          {it.path ? (
            <Link href={it.path} className="hover:text-foreground">
              {it.name}
            </Link>
          ) : (
            <span className="text-foreground">{it.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="font-heading text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Tabulka cen. Na telefonu se přes CSS skládá do karet (řádek = karta, hodnota s popiskem
 * z hlavičky) – stejné HTML pro vyhledávače, jen jiné zobrazení; jinak by se vešly 2 sloupce
 * a cena tepla by zůstala schovaná vpravo.
 */
function Table({ head, rows, caption }: { head: string[]; rows: React.ReactNode[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm sm:min-w-[34rem]">
        {caption && <caption className="px-4 pt-3 text-left text-xs text-muted-foreground">{caption}</caption>}
        <thead className="max-sm:sr-only">
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("px-4 py-3 font-medium", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0 max-sm:block max-sm:px-4 max-sm:py-3">
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 text-left font-medium max-sm:block max-sm:p-0 max-sm:pb-1.5">
                    {cell}
                  </th>
                ) : (
                  <td
                    key={j}
                    data-label={head[j]}
                    className="num px-4 py-3 text-right whitespace-nowrap max-sm:flex max-sm:items-baseline max-sm:justify-between max-sm:gap-3 max-sm:px-0 max-sm:py-0.5 max-sm:before:font-sans max-sm:before:text-xs max-sm:before:whitespace-normal max-sm:before:text-muted-foreground max-sm:before:content-[attr(data-label)]"
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Delta({ value }: { value: number | undefined }) {
  if (value == null) return <>–</>;
  return <span className={cn(value > 0.05 ? "text-clay-strong" : value < -0.05 ? "text-moss-strong" : "text-muted-foreground")}>{pct(value)}</span>;
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Section title="Časté otázky">
      <div className="space-y-3">
        {items.map((it) => (
          <details key={it.q} className="group rounded-2xl border border-border bg-card p-4 open:shadow-soft">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              <span className="flex items-center justify-between gap-3">
                {it.q}
                <ChevronRight aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-90" />
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function MapCta({ text }: { text: string }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl bg-sidebar p-6 text-sidebar-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MapPinned aria-hidden className="mt-0.5 size-6 shrink-0" />
        <div>
          <p className="font-heading text-xl font-semibold">Konkrétní prodejci ve vašem okolí</p>
          <p className="text-sm text-sidebar-foreground/75">{text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-xl bg-sidebar-primary px-4 text-sm font-semibold text-sidebar-primary-foreground">
          Otevřít mapu cen <ArrowRight aria-hidden className="size-4" />
        </Link>
        <Link href="/prihlaseni?mode=signup&next=/" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-sidebar-foreground hover:bg-white/10">
          Účet zdarma
        </Link>
      </div>
    </section>
  );
}

function DataNote({ s }: { s: MarketSnapshot }) {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Průměrné ceny vč. DPH za {monthLabel(latest(s)?.month)} z ceníků prodejců, které sbírá podpalto.cz. Cena tepla
        zohledňuje výhřevnost paliva a typickou účinnost spotřebiče.{" "}
        <Link href="/metodika" className="underline">
          Jak počítáme
        </Link>
        .
      </span>
    </p>
  );
}

function RegionLinks({ s, current }: { s: MarketSnapshot; current?: RegionCode }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {[...s.regions]
        .sort(byPriceIndex)
        .map((r) => (
          <li key={r.region}>
            <Link
              href={`/ceny/${REGION_SLUGS[r.region]}`}
              aria-current={r.region === current ? "page" : undefined}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors",
                r.region === current ? "border-primary bg-accent font-semibold" : "border-border bg-card hover:bg-muted",
              )}
            >
              {REGIONS[r.region].name}
              <span className="num text-xs text-muted-foreground">index {int(r.priceIndex)}</span>
            </Link>
          </li>
        ))}
    </ul>
  );
}

function FuelLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      {FUEL_PAGES.map((f) => (
        <Link key={f.slug} href={`/ceny/${f.slug}`} className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm hover:bg-muted">
          {f.title}
        </Link>
      ))}
    </div>
  );
}

function TrendTable({ s, keys }: { s: MarketSnapshot; keys: CommodityKey[] }) {
  return (
    <Table
      head={["Měsíc", ...keys.map((k) => `${commodity(k).label.split(" (")[0]} (Kč/${commodity(k).unit})`)]}
      rows={s.trends.map((p) => [monthLabel(p.month), ...keys.map((k) => int(p[k]))])}
      caption="Průměr ČR vč. DPH"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Rozcestník /ceny                                                    */
/* ------------------------------------------------------------------ */

export function hubFaq(s: MarketSnapshot): { q: string; a: string }[] {
  const month = monthLabel(latest(s)?.month);
  const ranked = s.regions.filter(hasRegionData).sort(byPriceIndex);
  const cheapest = ranked[0];
  const priciest = ranked.at(-1);
  const heat = COMMODITIES.map((c) => ({ c, v: czAvg(s, c.key) })).filter((x) => x.v != null);
  const cheapestHeat = heat.sort((a, b) => heatPrice(a.v!, a.c) - heatPrice(b.v!, b.c))[0];
  return [
    {
      q: "Kolik stojí palivové dřevo v ČR?",
      a: `Za ${month} stojí tvrdé štípané dřevo v průměru ${czkPerUnit(czAvg(s, "hardWoodPrms") ?? 0, "PRMS")} a měkké ${czkPerUnit(czAvg(s, "softWoodPrms") ?? 0, "PRMS")} vč. DPH.`,
    },
    {
      q: "Ve kterém kraji je topení nejlevnější?",
      a: cheapest && priciest
        ? `Nejnižší cenový index tuhých paliv má ${REGIONS[cheapest.region].name} (${int(cheapest.priceIndex)}, průměr ČR = 100), nejvyšší ${REGIONS[priciest.region].name} (${int(priciest.priceIndex)}).`
        : "Srovnání krajů najdete v tabulce výše.",
    },
    {
      q: "Které tuhé palivo je nejlevnější na kWh tepla?",
      a: cheapestHeat
        ? `Podle průměrných cen za ${month} vychází nejlevněji ${cheapestHeat.c.label.toLowerCase()} – asi ${kwhPrice(heatPrice(cheapestHeat.v!, cheapestHeat.c))} dodaného tepla. Pořadí se liší podle kotle a vlhkosti dřeva.`
        : "Záleží na palivu a spotřebiči.",
    },
  ];
}

export function PriceHub({ s }: { s: MarketSnapshot }) {
  const month = monthLabel(latest(s)?.month);
  const faq = hubFaq(s);
  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Průměrné ceny tuhých paliv v ČR podle krajů",
    description: "Měsíční průměrné ceny palivového dřeva, pelet, dřevěných briket a hnědého uhlí vč. DPH v ČR a ve 14 krajích, sestavené z ceníků prodejců.",
    url: "https://podpalto.cz/ceny",
    inLanguage: "cs-CZ",
    isAccessibleForFree: true,
    spatialCoverage: { "@type": "Place", name: "Česká republika" },
    temporalCoverage: s.trends.length ? `${s.trends[0].month}/${s.trends.at(-1)!.month}` : undefined,
    variableMeasured: COMMODITIES.map((c) => `${c.label} (Kč/${c.unit})`),
    creator: { "@id": "https://podpalto.cz/#organization" },
  };

  return (
    <article className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([breadcrumbJsonLd([{ name: "Ceny paliv", path: "/ceny" }]), faqJsonLd(faq), dataset]),
        }}
      />
      <header className="space-y-4">
        <Breadcrumbs items={[{ name: "podpalto.cz", path: "/" }, { name: "Ceny paliv" }]} />
        <h1 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">Ceny tuhých paliv v ČR podle krajů ({month})</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Aktuální průměrné ceny palivového dřeva, pelet, briket a hnědého uhlí v celé republice a ve 14 krajích, včetně přepočtu
          na cenu za kWh tepla. V naší databázi je {int(s.totalSellers)} prodejců.
        </p>
        <FuelLinks />
      </header>

      <Section title={`Průměrné ceny v ČR – ${month}`}>
        <Table
          head={["Palivo", "Průměrná cena", "Za 6 měsíců", "Cena tepla"]}
          rows={COMMODITIES.map((c) => {
            const v = czAvg(s, c.key);
            return [c.label, v != null ? czkPerUnit(v, c.unit) : "–", <Delta key="d" value={periodChange(s, c.key)} />, v != null ? kwhPrice(heatPrice(v, c)) : "–"];
          })}
        />
        <DataNote s={s} />
      </Section>

      <Section title="Srovnání krajů">
        <p className="text-sm text-muted-foreground">
          Cenový index kraje: 100 = průměr ČR. Kraje jsou seřazené od nejlevnějšího. Klikněte na kraj pro podrobnosti.
        </p>
        <Table
          head={["Kraj", "Index", "Tvrdé dřevo", "Pelety", "Uhlí", "Prodejci"]}
          rows={[...s.regions]
            .sort(byPriceIndex)
            .map((r) => [
              <Link key="l" href={`/ceny/${REGION_SLUGS[r.region]}`} className="underline-offset-2 hover:underline">
                {REGIONS[r.region].name}
              </Link>,
              int(r.priceIndex),
              r.avgPrices.hardWoodPrms != null ? czk(r.avgPrices.hardWoodPrms) : "–",
              r.avgPrices.pelletsT != null ? czk(r.avgPrices.pelletsT) : "–",
              r.avgPrices.coalT != null ? czk(r.avgPrices.coalT) : "–",
              int(s.listedSellers[r.region] ?? 0),
            ])}
        />
      </Section>

      <Section title="Vývoj cen za posledních 6 měsíců">
        <TrendTable s={s} keys={COMMODITIES.map((c) => c.key)} />
      </Section>

      <Faq items={faq} />
      <MapCta text="Na mapě porovnáte ceny prodejců podle vzdálenosti a ceny dopravy až k vám." />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Kraj /ceny/[kraj]                                                   */
/* ------------------------------------------------------------------ */

function censusShares(s: MarketSnapshot, code: RegionCode) {
  const row = s.census.find((c) => c.region === code);
  if (!row || !row.households_total) return null;
  const share = (n: number) => (n / row.households_total) * 100;
  return {
    wood: share(row.wood_and_wood_briquettes),
    coal: share(row.coal_coke_briquettes),
    pellets: share(row.wood_pellets),
    woodCount: row.wood_and_wood_briquettes,
    total: row.households_total,
  };
}

export function regionFaq(s: MarketSnapshot, code: RegionCode): { q: string; a: string }[] {
  const loc = REGION_LOCATIVE[code];
  const month = monthLabel(latest(s)?.month);
  const r = s.regions.find((x) => x.region === code);
  const hard = regionAvg(s, code, "hardWoodPrms");
  const pellets = regionAvg(s, code, "pelletsT");
  const census = censusShares(s, code);
  const items = [
    {
      q: `Kolik stojí palivové dřevo ${loc}?`,
      a: hard != null
        ? `Za ${month} stojí tvrdé štípané dřevo ${loc} v průměru ${czkPerUnit(hard, "PRMS")} vč. DPH, tedy ${pct(diffPct(hard, czAvg(s, "hardWoodPrms")) ?? 0)} oproti průměru ČR.`
        : `Průměrnou cenu dřeva ${loc} zatím nemáme.`,
    },
    {
      q: `Kolik stojí pelety ${loc}?`,
      a: pellets != null
        ? `Dřevěné pelety stojí ${loc} v průměru ${czkPerUnit(pellets, "t")} vč. DPH (${pct(diffPct(pellets, czAvg(s, "pelletsT")) ?? 0)} vůči průměru ČR).`
        : `Průměrnou cenu pelet ${loc} zatím nemáme.`,
    },
    {
      q: `Je topení ${loc} dražší než jinde?`,
      a: hasRegionData(r)
        ? `Cenový index tuhých paliv ${loc} je ${int(r.priceIndex)} (100 = průměr ČR), za poslední měsíc ${pct(r.changePct)}.`
        : `Ceny tuhých paliv ${loc} zatím nemáme dost na srovnání s průměrem ČR.`,
    },
  ];
  if (census) {
    items.push({
      q: `Kolik domácností topí dřevem ${loc}?`,
      a: `Podle Sčítání 2021 topí dřevem nebo dřevěnými briketami ${pct(census.wood, false)} obydlených bytů ${loc} (${int(census.woodCount)} bytů), uhlím ${pct(census.coal, false)} a peletami ${pct(census.pellets, false)}.`,
    });
  }
  return items;
}

export function RegionPrices({ s, code }: { s: MarketSnapshot; code: RegionCode }) {
  const name = REGIONS[code].name;
  const loc = REGION_LOCATIVE[code];
  const month = monthLabel(latest(s)?.month);
  const r = s.regions.find((x) => x.region === code);
  const faq = regionFaq(s, code);
  const listed = s.listedSellers[code] ?? 0;
  const hard = regionAvg(s, code, "hardWoodPrms");

  return (
    <article className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            breadcrumbJsonLd([
              { name: "Ceny paliv", path: "/ceny" },
              { name, path: `/ceny/${REGION_SLUGS[code]}` },
            ]),
            faqJsonLd(faq),
          ]),
        }}
      />
      <header className="space-y-4">
        <Breadcrumbs items={[{ name: "podpalto.cz", path: "/" }, { name: "Ceny paliv", path: "/ceny" }, { name }]} />
        <h1 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
          Ceny palivového dřeva, pelet a uhlí – {name}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {hard != null && <>Tvrdé štípané dřevo stojí {loc} za {month} v průměru {czkPerUnit(hard, "PRMS")}. </>}
          {hasRegionData(r) ? <>Cenový index kraje je {int(r.priceIndex)} (100 = průměr ČR). </> : <>Průměrné ceny {loc} zatím nemáme – prodejci tu své ceny na webu většinou nezveřejňují. </>}
          V naší databázi je {loc} {int(listed)} {listed === 1 ? "prodejce" : listed >= 2 && listed <= 4 ? "prodejci" : "prodejců"}.
        </p>
      </header>

      <Section title={`Průměrné ceny ${loc} – ${month}`}>
        <Table
          head={["Palivo", "Kraj", "Průměr ČR", "Rozdíl", "Cena tepla"]}
          rows={COMMODITIES.map((c) => {
            const v = regionAvg(s, code, c.key);
            return [
              c.label,
              v != null ? czkPerUnit(v, c.unit) : "–",
              czAvg(s, c.key) != null ? czkPerUnit(czAvg(s, c.key)!, c.unit) : "–",
              <Delta key="d" value={diffPct(v, czAvg(s, c.key))} />,
              v != null ? kwhPrice(heatPrice(v, c)) : "–",
            ];
          })}
        />
        <DataNote s={s} />
      </Section>

      <Section title="Vývoj průměrných cen v ČR">
        <TrendTable s={s} keys={["hardWoodPrms", "softWoodPrms", "pelletsT"]} />
      </Section>

      <Faq items={faq} />
      <MapCta text={`Porovnejte ${int(listed)} prodejců ${loc} podle ceny včetně dopravy až k vám.`} />

      <Section title="Ceny v dalších krajích">
        <RegionLinks s={s} current={code} />
        <FuelLinks />
      </Section>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Palivo /ceny/[palivo]                                               */
/* ------------------------------------------------------------------ */

export function fuelFaq(s: MarketSnapshot, fuel: FuelPage): { q: string; a: string }[] {
  const key = fuel.keys[0];
  const c = commodity(key);
  const month = monthLabel(latest(s)?.month);
  const ranked = rankRegions(s, key);
  const low = ranked[0];
  const high = ranked.at(-1);
  const minMonth = [...s.trends].sort((a, b) => a[key] - b[key])[0];
  const v = czAvg(s, key);
  return [
    {
      q: `Kolik stojí ${c.label.toLowerCase()} v roce ${latest(s)?.month.slice(0, 4) ?? ""}?`,
      a: v != null ? `Za ${month} je průměrná cena ${czkPerUnit(v, c.unit)} vč. DPH, za posledních 6 měsíců ${pct(periodChange(s, key) ?? 0)}.` : "Průměrnou cenu zatím nemáme.",
    },
    {
      q: `Ve kterém kraji koupím ${fuel.accusative} nejlevněji?`,
      a: low && high
        ? `Nejnižší průměrnou cenu má ${REGIONS[low.region].name} (${czkPerUnit(low.avgPrices[key], c.unit)}), nejvyšší ${REGIONS[high.region].name} (${czkPerUnit(high.avgPrices[key], c.unit)}).`
        : "Srovnání krajů najdete v tabulce výše.",
    },
    {
      q: `Kdy se vyplatí nakoupit ${fuel.accusative}?`,
      a: minMonth
        ? `Za posledních 6 měsíců byl průměr nejnižší za ${monthLabel(minMonth.month)} (${czkPerUnit(minMonth[key], c.unit)}). Obecně bývají tuhá paliva levnější na jaře a v létě, mimo topnou sezónu.`
        : "Obecně bývají tuhá paliva levnější na jaře a v létě, mimo topnou sezónu.",
    },
    {
      q: `Kolik stojí kWh tepla z ${fuel.genitive}?`,
      a: v != null
        ? `Při průměrné ceně ${czkPerUnit(v, c.unit)} a typické účinnosti spotřebiče ${Math.round(c.efficiency * 100)} % vychází teplo zhruba na ${kwhPrice(heatPrice(v, c))}.`
        : "Cenu tepla zatím nemáme.",
    },
  ];
}

export function FuelPrices({ s, fuel }: { s: MarketSnapshot; fuel: FuelPage }) {
  const month = monthLabel(latest(s)?.month);
  const main = fuel.keys[0];
  const c = commodity(main);
  const faq = fuelFaq(s, fuel);
  const v = czAvg(s, main);

  return (
    <article className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            breadcrumbJsonLd([
              { name: "Ceny paliv", path: "/ceny" },
              { name: fuel.title, path: `/ceny/${fuel.slug}` },
            ]),
            faqJsonLd(faq),
          ]),
        }}
      />
      <header className="space-y-4">
        <Breadcrumbs items={[{ name: "podpalto.cz", path: "/" }, { name: "Ceny paliv", path: "/ceny" }, { name: fuel.title }]} />
        <h1 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
          {fuel.title} v ČR – {month}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {v != null && (
            <>
              Průměrná cena: <strong className="text-foreground">{czkPerUnit(v, c.unit)}</strong> vč. DPH ({pct(periodChange(s, main) ?? 0)} za 6 měsíců).{" "}
            </>
          )}
          {fuel.intro}
        </p>
        <FuelLinks />
      </header>

      <Section title={`Ceny ${fuel.genitive} podle krajů`}>
        <Table
          head={["Kraj", ...fuel.keys.map((k) => `${commodity(k).label.split(" (")[0]}`), "Vůči ČR", "Cena tepla"]}
          rows={rankRegions(s, main).map((r) => [
            <Link key="l" href={`/ceny/${REGION_SLUGS[r.region]}`} className="underline-offset-2 hover:underline">
              {REGIONS[r.region].name}
            </Link>,
            ...fuel.keys.map((k) => (r.avgPrices[k] != null ? czkPerUnit(r.avgPrices[k], commodity(k).unit) : "–")),
            <Delta key="d" value={diffPct(r.avgPrices[main], czAvg(s, main))} />,
            kwhPrice(heatPrice(r.avgPrices[main], c)),
          ])}
          caption={`Seřazeno od nejlevnějšího kraje, ${month}`}
        />
        <DataNote s={s} />
      </Section>

      <Section title="Vývoj průměrné ceny v ČR">
        <TrendTable s={s} keys={fuel.keys} />
      </Section>

      <Faq items={faq} />
      <MapCta text={`Najděte nejlevnější nabídky ${fuel.genitive} ve svém okolí včetně dopravy.`} />

      <Section title="Další přehledy">
        <FuelLinks />
        <p className="flex items-center gap-2 text-sm">
          <BarChart3 aria-hidden className="size-4 text-primary" />
          <Link href="/trendy" className="underline">
            Vývoj cen a sezónnost
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/ceny" className="underline">
            Všechny kraje
          </Link>
        </p>
      </Section>
    </article>
  );
}

/** Všechny kódy krajů (pro export). */
export const ALL_REGIONS = REGION_CODES;
