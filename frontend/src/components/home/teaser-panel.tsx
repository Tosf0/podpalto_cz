"use client";

import { useMemo } from "react";
import { MapPinned } from "lucide-react";
import type { CommodityKey, FuelCategory } from "@/types";
import { FuelIcon, PriceDelta } from "@/components/common";
import { RegisterCta, TeaserBadge } from "@/components/account/register-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { COMMODITY_META, REGIONS } from "@/lib/constants";
import { formatMoneyNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { PublicOverview } from "@/lib/api";
import { cn } from "@/lib/utils";

export const TEASER_METRICS: { key: CommodityKey; fuel: FuelCategory }[] = [
  { key: "hardWoodPrms", fuel: "wood" },
  { key: "softWoodPrms", fuel: "wood" },
  { key: "pelletsT", fuel: "pellets" },
  { key: "briquettesT", fuel: "briquettes" },
];

/**
 * Pravý panel mapy pro nepřihlášené: volba paliva, žebříček krajů podle průměrné ceny
 * (vs. průměr ČR, počet prodejců v databázi) a výzva k registraci.
 */
export function TeaserMapPanel({
  overview,
  metric,
  onMetric,
}: {
  overview: PublicOverview | undefined;
  metric: CommodityKey;
  onMetric: (m: CommodityKey) => void;
}) {
  const { t } = useI18n();

  const czAvg = overview?.trends.at(-1)?.[metric];
  const ranking = useMemo(
    () =>
      [...(overview?.regions ?? [])]
        .filter((r) => r.avgPrices[metric] != null)
        .sort((a, b) => a.avgPrices[metric] - b.avgPrices[metric]),
    [overview, metric],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <header className="shrink-0 space-y-2 border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <MapPinned aria-hidden className="size-5 text-primary" />
            {t("account.teaser.mapTitle")}
          </h2>
          <TeaserBadge />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("account.teaser.mapText")}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t("account.teaser.mapFuel")}</p>
          <div role="radiogroup" aria-label={t("account.teaser.mapFuel")} className="grid grid-cols-2 gap-1.5">
            {TEASER_METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={metric === m.key}
                onClick={() => onMetric(m.key)}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs font-medium transition-colors [&_svg]:size-4",
                  metric === m.key
                    ? "border-moss bg-moss-soft text-moss-strong"
                    : "border-border bg-card text-foreground hover:border-moss/50 hover:bg-muted",
                )}
              >
                <FuelIcon category={m.fuel} className="shrink-0" />
                <span className="truncate">{COMMODITY_META[m.key].label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="flex items-baseline justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("account.teaser.mapRanking")}
            <span className="normal-case">{COMMODITY_META[metric].unit}</span>
          </p>
          {!overview ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <ol className="space-y-1.5">
              {ranking.map((r, i) => {
                const price = r.avgPrices[metric];
                const delta = czAvg ? ((price - czAvg) / czAvg) * 100 : 0;
                const listed = overview.listedSellers[r.region] ?? 0;
                return (
                  <li key={r.region} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                    <span className="num w-5 text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{REGIONS[r.region].short}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {t("account.teaser.mapListed", { count: listed })}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-sm font-semibold">{formatMoneyNumber(price)}</span>
                      <PriceDelta value={delta} className="text-[11px]" />
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="text-[11px] text-muted-foreground">{t("account.teaser.mapVsCz")}</p>
        </section>
      </div>

      <div className="shrink-0 border-t border-border p-4">
        <RegisterCta
          tone="dark"
          className="flex-col items-stretch p-4 sm:flex-col sm:items-stretch [&_.font-heading]:text-base"
          title={t("account.teaser.mapCtaTitle")}
          text={t("account.teaser.mapCtaText", { count: overview?.totalSellers ?? 0 })}
        />
      </div>
    </div>
  );
}
