import type { Metadata } from "next";
import { HomeView } from "@/components/home/home-view";

export const metadata: Metadata = {
  title: { absolute: "Mapa cen palivového dřeva, pelet a uhlí v ČR | podpalto.cz" },
  description:
    "Porovnejte ceny palivového dřeva, pelet, briket a uhlí od prodejců ve vašem okolí – průměry po krajích, cena vč. dopravy a přepočet na Kč/kWh.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Mapa cen palivového dřeva, pelet a uhlí v ČR",
    description: "Průměrné ceny tuhých paliv po krajích a ceny prodejců ve vašem okolí vč. dopravy.",
  },
};

export default function HomePage() {
  return <HomeView />;
}
