"use client";

import { usePreferences } from "@/components/providers/preferences-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PriceMode } from "@/types";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Segmentový přepínač režimu zobrazení ceny (za jednotku / na kWh). */
export function PriceModeToggle({ className }: { className?: string }) {
  const { priceMode, setPriceMode } = usePreferences();
  const { t } = useI18n();
  const currency = currencySymbol();
  const OPTIONS: { value: PriceMode; label: string; tooltip: string }[] = [
    { value: "unit", label: t("layout.priceToggle.unit", { currency }), tooltip: t("layout.priceToggle.unitTip") },
    { value: "kwh", label: t("layout.priceToggle.kwh", { currency }), tooltip: t("layout.priceToggle.kwhTip") },
  ];

  return (
    <ToggleGroup
      type="single"
      value={priceMode}
      spacing={0}
      aria-label={t("layout.priceToggle.aria")}
      onValueChange={(v) => {
        if (v === "unit" || v === "kwh") setPriceMode(v);
      }}
      className={cn("rounded-lg bg-muted p-0.5", className)}
    >
      {OPTIONS.map((opt) => (
        <Tooltip key={opt.value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={opt.value}
              aria-label={`${opt.label} – ${opt.tooltip}`}
              className="h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              {opt.label}
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">{opt.tooltip}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
