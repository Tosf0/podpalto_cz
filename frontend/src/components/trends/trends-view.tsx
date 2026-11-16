"use client";

import { BarChart3, Leaf } from "lucide-react";
import { BriquettesIcon, PelletsIcon, WoodIcon } from "@/components/common/fuel-icon";
import type { MarketPulseItem, PriceTrendPoint, RegionStats } from "@/types";
import { EmptyState, KpiCard, MockModeBadge, PageHeader } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { getEnergyCosts, getMarketPulse, getPriceTrends, getRegionStats } from "@/lib/api";
import { COMMODITY_META, REGIONS } from "@/lib/constants";
import { formatCzk, formatMonthGenitive, formatNumber } from "@/lib/format";
import { EnergyCostChart } from "./energy-cost-chart";
import { PriceTrendChart } from "./price-trend-chart";
import { RegionComparison } from "./region-comparison";
import { Seasonality } from "./seasonality";

const PULSE_ICONS: Record<string, React.ReactNode> = {
  hardWoodPrms: <WoodIcon />,
  softWoodPrms: <Leaf />,
  pelletsT: <PelletsIcon />,
  briquettesT: <BriquettesIcon />,
};

/** Krátký český text odvozený z dat. */
function buildInsight(pulse: MarketPulseItem[], trends: PriceTrendPoint[], regions: RegionStats[]): string {
  const parts: string[] = [];
  const hard = pulse.find((p) => p.key === "hardWoodPrms");
  const latest = trends[trends.length - 1];

  if (hard) {
    const abs = Math.abs(hard.changePct);
    const pct = formatNumber(abs, 1);
    if (abs < 0.1) parts.push("Cena tvrdého dřeva se za měsíc téměř nezměnila.");
    else {
      const verb = hard.changePct > 0 ? "podražilo" : "zlevnilo";
      let tail = "";
      if (latest) {
        const prevSame = trends
          .slice(0, -1)
          .filter((t) => (hard.changePct > 0 ? t.hardWoodPrms >= latest.hardWoodPrms : t.hardWoodPrms <= latest.hardWoodPrms));
        if (prevSame.length === 0) {
          tail = hard.changePct > 0 ? `, nejvýše za posledních ${trends.length} měsíců` : `, nejníže za posledních ${trends.length} měsíců`;
        } else {
          const last = prevSame[prevSame.length - 1];
          tail = hard.changePct > 0 ? `, nejvýrazněji od ${formatMonthGenitive(last.month)}` : `, nejníže od ${formatMonthGenitive(last.month)}`;
        }
      }
      parts.push(`Tvrdé dřevo ${verb} za měsíc o ${pct} %${tail}.`);
    }
  }

  if (latest) {
    const m = Number(latest.month.split("-")[1]);
    parts.push(m >= 10 || m <= 3 ? "Topná sezóna je v plném proudu." : "Topná sezóna je pryč, ceny bývají nižší.");
  }

  if (regions.length) {
    const sorted = [...regions].sort((a, b) => a.avgPrices.hardWoodPrms - b.avgPrices.hardWoodPrms);
    const c = sorted[0];
    parts.push(`Nejlevnější tvrdé dřevo je v kraji ${REGIONS[c.region].short} (${formatCzk(c.avgPrices.hardWoodPrms)}/PRMS).`);
  }
  return parts.join(" ");
}

function SectionSkeleton({ height = "h-96" }: { height?: string }) {
  return <Skeleton className={`${height} w-full rounded-2xl`} />;
}

export function TrendsView() {
  const pulse = useApi(() => getMarketPulse(), []);
  const trends = useApi(() => getPriceTrends(12), []);
  const regions = useApi(() => getRegionStats(), []);
  const energy = useApi(() => getEnergyCosts(), []);

  const insight =
    pulse.data && trends.data && trends.data.length > 0 && regions.data
      ? buildInsight(pulse.data, trends.data, regions.data)
      : null;

  const failed = pulse.error ?? trends.error ?? regions.error ?? energy.error;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:space-y-8 lg:px-8">
      <PageHeader
        eyebrow="Analytika trhu"
        title="Trh a cenové indexy v ČR"
        icon={<BarChart3 />}
        description="Jak se vyvíjejí ceny dřeva, pelet, briket a uhlí, který kraj je nejlevnější a co vás vyjde nejlevněji na 1 kWh tepla."
        actions={<MockModeBadge />}
      />

      {failed && (
        <EmptyState
          title="Data trhu se nepodařilo načíst"
          description="Zkuste stránku obnovit, případně to zkuste za chvíli."
        />
      )}

      <section aria-label="Aktuální průměrné ceny" className="space-y-4">
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pulse.data
            ? pulse.data.map((p) => (
                <KpiCard
                  key={p.key}
                  label={`${p.label} (průměr ČR)`}
                  value={formatNumber(p.value)}
                  unit={p.unit}
                  changePct={p.changePct}
                  spark={p.spark}
                  sparkColor={COMMODITY_META[p.key].color}
                  icon={PULSE_ICONS[p.key]}
                />
              ))
            : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        {insight && (
          <p className="rounded-2xl border border-border bg-accent px-4 py-3 text-sm text-accent-foreground sm:text-base">
            {insight}
          </p>
        )}
      </section>

      {trends.data && trends.data.length > 0 ? <PriceTrendChart trends={trends.data} /> : !failed && <SectionSkeleton />}
      {regions.data && regions.data.length > 0 ? <RegionComparison regions={regions.data} /> : !failed && <SectionSkeleton height="h-[48rem]" />}
      {energy.data && energy.data.length > 0 ? <EnergyCostChart items={energy.data} /> : !failed && <SectionSkeleton />}
      {trends.data && trends.data.length > 0 && <Seasonality trends={trends.data} />}
    </div>
  );
}
