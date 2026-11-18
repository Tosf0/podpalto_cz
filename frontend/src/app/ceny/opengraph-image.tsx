import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";
import { czkPerUnit, getMarketSnapshot, monthLabel } from "@/lib/seo-data";

export const alt = "Ceny palivového dřeva, pelet a uhlí podle krajů – podpalto.cz";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const s = await getMarketSnapshot();
  const last = s.trends.at(-1);
  return ogImage({
    eyebrow: `Ceny paliv v ČR · ${monthLabel(last?.month)}`,
    title: "Ceny palivového dřeva, pelet a uhlí podle krajů",
    subtitle: last
      ? `Tvrdé dřevo ${czkPerUnit(last.hardWoodPrms, "PRMS")} · pelety ${czkPerUnit(last.pelletsT, "t")} · uhlí ${czkPerUnit(last.coalT, "t")}`
      : undefined,
  });
}
