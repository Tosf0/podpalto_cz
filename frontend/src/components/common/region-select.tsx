"use client";

import type { RegionCode } from "@/types";
import { REGION_CODES, REGIONS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Výběr kraje ČR (volitelně s volbou „Všechny kraje“). */
export function RegionSelect({
  value,
  onChange,
  includeAll = true,
  className,
}: {
  value: RegionCode | "all";
  onChange: (v: RegionCode | "all") => void;
  includeAll?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RegionCode | "all")}>
      <SelectTrigger aria-label={t("map.ui.region")} className={cn("min-w-44 bg-card", className)}>
        <SelectValue placeholder={t("map.ui.region")} />
      </SelectTrigger>
      <SelectContent className="z-[1200]">
        {includeAll && <SelectItem value="all">{t("map.ui.allRegions")}</SelectItem>}
        {REGION_CODES.map((code) => (
          <SelectItem key={code} value={code}>
            {REGIONS[code].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
