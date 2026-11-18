import type { Metadata } from "next";
import { TrendsView } from "@/components/trends/trends-view";

export const metadata: Metadata = {
  title: "Vývoj cen palivového dřeva, pelet a uhlí",
  description:
    "Jak se mění ceny palivového dřeva, pelet, briket a uhlí v ČR: měsíční průměry, srovnání krajů, cena za kWh a sezónnost.",
  alternates: { canonical: "/trendy" },
  openGraph: { url: "/trendy", title: "Vývoj cen tuhých paliv v ČR" },
};

export default function TrendyPage() {
  return <TrendsView />;
}
