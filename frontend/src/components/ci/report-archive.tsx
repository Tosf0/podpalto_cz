"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Archive, Search } from "lucide-react";
import type { CrewAnalysisReportSummary, FuelCategory, RegionCode } from "@/types";
import { FUEL_CATEGORIES, FUEL_META } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/use-i18n";
import { EmptyState, ListSkeleton, RegionSelect } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReportArchive({
  reports,
  loading,
  selectedId,
  onSelect,
}: {
  reports: CrewAnalysisReportSummary[] | undefined;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionCode | "all">("all");
  const [category, setCategory] = useState<FuelCategory | "all">("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (reports ?? []).filter(
      (r) =>
        (region === "all" || r.region === region) &&
        (category === "all" || r.categories?.includes(category)) &&
        (!q ||
          r.competitor_name.toLowerCase().includes(q) ||
          r.competitor_domain.toLowerCase().includes(q) ||
          r.excerpt.toLowerCase().includes(q)),
    );
    return list.sort((a, b) => (sort === "desc" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)));
  }, [reports, query, region, category, sort]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ci.archive.searchPlaceholder")}
            aria-label={t("ci.archive.searchLabel")}
            className="h-9 rounded-xl bg-card pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <RegionSelect value={region} onChange={setRegion} className="w-full min-w-0" />
          <Select value={category} onValueChange={(v) => setCategory(v as FuelCategory | "all")}>
            <SelectTrigger aria-label={t("ci.archive.fuelLabel")} className="w-full min-w-0 bg-card">
              <SelectValue placeholder={t("ci.archive.fuelPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="z-[1200]">
              <SelectItem value="all">{t("ci.archive.allFuels")}</SelectItem>
              {FUEL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {FUEL_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="num">{t("ci.archive.count", { shown: filtered.length, count: reports?.length ?? 0 })}</span>
        <button
          type="button"
          onClick={() => setSort((v) => (v === "desc" ? "asc" : "desc"))}
          className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-medium hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowDownUp className="size-3.5" aria-hidden />
          {sort === "desc" ? t("ci.archive.newest") : t("ci.archive.oldest")}
        </button>
      </div>

      {loading && !reports ? (
        <ListSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Archive />} title={t("ci.archive.emptyTitle")} description={t("ci.archive.emptyHint")} />
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1 xl:max-h-[640px]">
          {filtered.map((r) => {
            const active = r.id === selectedId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    active ? "border-primary bg-accent/60" : "border-border",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 text-sm leading-snug font-semibold">{r.competitor_name}</p>
                    <span className="num shrink-0 text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">{r.competitor_domain}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
