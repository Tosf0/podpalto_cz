"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PriceDelta } from "./price-delta";
import { Sparkline } from "./sparkline";

/** Kompaktní KPI karta: popisek, velká číselná hodnota, změna vs. minulý měsíc a sparkline. */
export function KpiCard({
  label,
  value,
  unit,
  changePct,
  changeGoodWhen = "down",
  spark,
  sparkColor,
  icon,
  hint,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  changePct?: number;
  changeGoodWhen?: "down" | "up";
  spark?: number[];
  sparkColor?: string;
  icon?: ReactNode;
  hint?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "@container flex min-w-0 h-full items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon && (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground [&_svg]:size-4">
              {icon}
            </span>
          )}
          <span className="truncate">{label}</span>
        </div>

        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="num text-2xl font-semibold tracking-tight text-foreground">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>

        {changePct !== undefined && (
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <PriceDelta value={changePct} goodWhen={changeGoodWhen} />
            <span>{t("common.vsLastMonth")}</span>
          </div>
        )}

        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>

      {spark && spark.length > 1 && (
        <Sparkline data={spark} color={sparkColor ?? "var(--moss)"} className="mt-1 hidden shrink-0 @[17rem]:block" />
      )}
    </div>
  );
}
