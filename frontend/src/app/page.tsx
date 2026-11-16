import type { Metadata } from "next";
import { HomeView } from "@/components/home/home-view";

export const metadata: Metadata = {
  title: "Interaktivní mapa cen paliv",
  description:
    "Porovnejte ceny palivového dřeva, pelet, briket a uhlí od prodejců ve vašem okolí – vč. dopravy a přepočtu na Kč/kWh.",
};

export default function HomePage() {
  return <HomeView />;
}
