"use client";

import type { RegionCode } from "@/types";
import { REGION_CODES, REGIONS } from "@/lib/constants";
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
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RegionCode | "all")}>
      <SelectTrigger aria-label="Kraj" className={cn("min-w-44 bg-card", className)}>
        <SelectValue placeholder="Kraj" />
      </SelectTrigger>
      <SelectContent className="z-[1200]">
        {includeAll && <SelectItem value="all">Všechny kraje</SelectItem>}
        {REGION_CODES.map((code) => (
          <SelectItem key={code} value={code}>
            {REGIONS[code].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
