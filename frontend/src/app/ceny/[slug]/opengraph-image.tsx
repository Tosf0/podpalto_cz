import { REGIONS } from "@/lib/constants";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";
import { allPriceSlugs, commodity, czkPerUnit, fuelBySlug, getMarketSnapshot, monthLabel, regionBySlug } from "@/lib/seo-data";

export const alt = "Ceny tuhých paliv – podpalto.cz";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  return allPriceSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getMarketSnapshot();
  const month = monthLabel(s.trends.at(-1)?.month);

  const code = regionBySlug(slug);
  if (code) {
    const r = s.regions.find((x) => x.region === code);
    return ogImage({
      eyebrow: `Ceny paliv · ${month}`,
      title: REGIONS[code].name,
      subtitle: r
        ? `Tvrdé dřevo ${czkPerUnit(r.avgPrices.hardWoodPrms, "PRMS")} · pelety ${czkPerUnit(r.avgPrices.pelletsT, "t")} · uhlí ${czkPerUnit(r.avgPrices.coalT, "t")}`
        : undefined,
    });
  }

  const fuel = fuelBySlug(slug);
  const c = fuel ? commodity(fuel.keys[0]) : undefined;
  const v = c ? s.trends.at(-1)?.[c.key] : undefined;
  return ogImage({
    eyebrow: `Ceny v ČR · ${month}`,
    title: fuel?.title ?? "Ceny tuhých paliv",
    subtitle: c && v != null ? `Průměr ČR ${czkPerUnit(v, c.unit)} vč. DPH · srovnání 14 krajů` : undefined,
  });
}
