"use client";

import { useMemo, useState } from "react";
import { Archive, Clock, Cpu, MapPin, Search } from "lucide-react";
import type { CrewAnalysisReportSummary, FuelCategory, RegionCode } from "@/types";
import { FUEL_CATEGORIES, FUEL_META, REGIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState, FuelBadge, ListSkeleton, RegionSelect } from "@/components/common";
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
            placeholder="Hledat název, doménu, výtah…"
            aria-label="Hledat v reportech"
            className="h-9 rounded-xl bg-card pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <RegionSelect value={region} onChange={setRegion} className="w-full min-w-0" />
          <Select value={category} onValueChange={(v) => setCategory(v as FuelCategory | "all")}>
            <SelectTrigger aria-label="Kategorie paliva" className="w-full min-w-0 bg-card">
              <SelectValue placeholder="Palivo" />
            </SelectTrigger>
            <SelectContent className="z-[1200]">
              <SelectItem value="all">Všechna paliva</SelectItem>
              {FUEL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {FUEL_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as "desc" | "asc")}>
            <SelectTrigger aria-label="Řazení" className="col-span-2 w-full min-w-0 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1200]">
              <SelectItem value="desc">Nejnovější první</SelectItem>
              <SelectItem value="asc">Nejstarší první</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="num">{filtered.length}</span> z <span className="num">{reports?.length ?? 0}</span> reportů
      </p>

      {loading && !reports ? (
        <ListSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Archive />} title="Žádné reporty" description="Zkuste upravit hledání nebo filtry." />
      ) : (
        <ul className="space-y-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
          {filtered.map((r) => {
            const active = r.id === selectedId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full rounded-2xl border bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-soft",
                    active ? "border-primary bg-accent/50" : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.competitor_name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{r.competitor_domain}</p>
                    </div>
                    <span className="num shrink-0 text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{r.excerpt}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                    {r.region && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden /> {REGIONS[r.region].short}
                      </span>
                    )}
                    <span className="num inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden /> {Math.round(r.duration_s)} s
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Cpu className="size-3" aria-hidden /> {r.model.split("/").pop()}
                    </span>
                  </div>
                  {r.categories && r.categories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.categories.map((c) => (
                        <FuelBadge key={c} category={c} size="sm" />
                      ))}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
