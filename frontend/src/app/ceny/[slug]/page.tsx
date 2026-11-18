import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FuelPrices, RegionPrices } from "@/components/seo/price-pages";
import { REGIONS } from "@/lib/constants";
import {
  REGION_LOCATIVE,
  allPriceSlugs,
  commodity,
  czkPerUnit,
  fuelBySlug,
  getMarketSnapshot,
  monthLabel,
  regionBySlug,
} from "@/lib/seo-data";

export async function generateStaticParams() {
  return allPriceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/ceny/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getMarketSnapshot();
  const month = monthLabel(s.trends.at(-1)?.month);

  const code = regionBySlug(slug);
  if (code) {
    const r = s.regions.find((x) => x.region === code);
    const name = REGIONS[code].name;
    const title = `Ceny palivového dřeva, pelet a uhlí – ${name} (${month})`;
    const description = r
      ? `Kolik stojí palivové dřevo, pelety, brikety a uhlí ${REGION_LOCATIVE[code]}: tvrdé dřevo ${czkPerUnit(r.avgPrices.hardWoodPrms, "PRMS")}, pelety ${czkPerUnit(r.avgPrices.pelletsT, "t")}. Srovnání s průměrem ČR a cena za kWh.`
      : `Ceny tuhých paliv ${REGION_LOCATIVE[code]} a srovnání s průměrem ČR.`;
    return { title, description, alternates: { canonical: `/ceny/${slug}` }, openGraph: { url: `/ceny/${slug}`, title, description } };
  }

  const fuel = fuelBySlug(slug);
  if (fuel) {
    const c = commodity(fuel.keys[0]);
    const v = s.trends.at(-1)?.[c.key];
    const title = `${fuel.title} v ČR (${month}) – srovnání krajů`;
    const description = `${fuel.title} vč. DPH${v != null ? `: průměrně ${czkPerUnit(v, c.unit)}` : ""}. Ceny ${fuel.genitive} ve 14 krajích, vývoj za 6 měsíců a cena za kWh tepla.`;
    return { title, description, alternates: { canonical: `/ceny/${slug}` }, openGraph: { url: `/ceny/${slug}`, title, description } };
  }

  return { title: "Stránka nenalezena", robots: { index: false } };
}

/** Slugy jsou známé předem (generateStaticParams) → `params` lze číst přímo a neznámý slug vrátí skutečnou 404. */
export default async function CenySlugPage({ params }: PageProps<"/ceny/[slug]">) {
  const { slug } = await params;
  const code = regionBySlug(slug);
  const fuel = code ? undefined : fuelBySlug(slug);
  if (!code && !fuel) notFound();
  const s = await getMarketSnapshot();
  return code ? <RegionPrices s={s} code={code} /> : <FuelPrices s={s} fuel={fuel!} />;
}
