"use client";

import { BarChart3, Leaf, Lightbulb } from "lucide-react";
import { BriquettesIcon, PelletsIcon, WoodIcon } from "@/components/common/fuel-icon";
import type { MarketPulseItem, PriceTrendPoint, RegionStats } from "@/types";
import { EmptyState, MockModeBadge, PageHeader, PriceDelta, Sparkline } from "@/components/common";
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

const PULSE_LABELS: Record<string, string> = {
  hardWoodPrms: "Tvrdé dřevo",
  softWoodPrms: "Měkké dřevo",
  pelletsT: "Pelety",
  briquettesT: "Brikety",
};

/** KPI dlaždice: krátký popisek, hodnota, změna a sparkline; všechny dlaždice mají stejné rozložení. */
function PulseTile({ item }: { item: MarketPulseItem }) {
  return (
    <div className="@container flex h-full min-w-0 flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4">
          {PULSE_ICONS[item.key]}
        </span>
        <span className="whitespace-nowrap">{PULSE_LABELS[item.key] ?? item.label}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="num text-2xl font-semibold tracking-tight whitespace-nowrap text-foreground">
            {formatNumber(item.value)}
          </p>
          <p className="text-xs whitespace-nowrap text-muted-foreground">{item.unit}</p>
          <PriceDelta value={item.changePct} className="text-xs" />
        </div>
        {item.spark && item.spark.length > 1 && (
          <Sparkline data={item.spark} color={COMMODITY_META[item.key].color} className="hidden shrink-0 @[12rem]:block" />
        )}
      </div>
    </div>
  );
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
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Analytika trhu"
        title="Trh a ceny v ČR"
        icon={<BarChart3 />}
        description="Vývoj cen, kraje a cena za kWh."
        actions={<MockModeBadge />}
      />

      {failed && (
        <EmptyState
          title="Data trhu se nepodařilo načíst"
          description="Zkuste stránku obnovit, případně to zkuste za chvíli."
        />
      )}

      <section aria-label="Aktuální průměrné ceny" className="space-y-4">
        <p className="text-sm text-muted-foreground">Průměrné ceny v ČR a změna oproti minulému měsíci</p>
        <div className="grid auto-rows-fr gap-4 grid-cols-2 lg:grid-cols-4">
          {pulse.data
            ? pulse.data.map((p) => <PulseTile key={p.key} item={p} />)
            : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        {insight && (
          <p className="flex items-start gap-3 rounded-2xl border border-border bg-accent p-4 text-sm text-accent-foreground">
            <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{insight}</span>
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
