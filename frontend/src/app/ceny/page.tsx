import { Suspense } from "react";
import type { Metadata } from "next";
import { ListSkeleton } from "@/components/common";
import { PriceHub } from "@/components/seo/price-pages";
import { czkPerUnit, getMarketSnapshot, monthLabel } from "@/lib/seo-data";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getMarketSnapshot();
  const last = s.trends.at(-1);
  const title = `Ceny palivového dřeva, pelet a uhlí podle krajů (${monthLabel(last?.month)})`;
  const description = last
    ? `Průměrné ceny tuhých paliv v ČR a 14 krajích: tvrdé dřevo ${czkPerUnit(last.hardWoodPrms, "PRMS")}, pelety ${czkPerUnit(last.pelletsT, "t")}, hnědé uhlí ${czkPerUnit(last.coalT, "t")}. Vývoj cen a cena za kWh tepla.`
    : "Průměrné ceny tuhých paliv v ČR a 14 krajích, vývoj cen a cena za kWh tepla.";
  return {
    title,
    description,
    alternates: { canonical: "/ceny" },
    openGraph: { url: "/ceny", title, description },
  };
}

async function Hub() {
  return <PriceHub s={await getMarketSnapshot()} />;
}

export default function CenyPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <ListSkeleton count={3} />
        </div>
      }
    >
      <Hub />
    </Suspense>
  );
}
