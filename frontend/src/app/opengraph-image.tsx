import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "podpalto.cz – srovnání cen palivového dřeva, pelet a uhlí v ČR";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    eyebrow: "Mapa cen tuhých paliv",
    title: "Palivové dřevo, pelety a uhlí za férovou cenu",
    subtitle: "Ceny prodejců v celé ČR včetně dopravy a přepočtu na Kč/kWh.",
  });
}
