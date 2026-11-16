"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CommodityKey, RegionStats } from "@/types";
import { PriceDelta } from "@/components/common";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COMMODITY_META, REGIONS } from "@/lib/constants";
import { formatCzk, formatNumber, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AXIS_LINE,
  AXIS_TICK,
  ChartTooltipFrame,
  ChartTooltipRow,
  GRID_STROKE,
  Section,
  Segmented,
} from "./chart-parts";

const KEYS: CommodityKey[] = ["hardWoodPrms", "softWoodPrms", "pelletsT", "briquettesT", "coalT"];
const SHORT_LABEL: Record<CommodityKey, string> = {
  hardWoodPrms: "Tvrdé dřevo",
  softWoodPrms: "Měkké dřevo",
  pelletsT: "Pelety",
  briquettesT: "Brikety",
  coalT: "Uhlí",
};

const GREEN: [number, number, number] = [111, 143, 105]; // moss
const AMBER: [number, number, number] = [201, 169, 126]; // světlé dřevo
const RED: [number, number, number] = [181, 101, 79]; // clay

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

/** Mech (pod průměrem) → světlé dřevo (průměr) → hlína (nad průměrem); ±8 % = krajní barvy. */
function scaleColor(price: number, avg: number): string {
  const r = Math.max(-1, Math.min(1, (price / avg - 1) / 0.08));
  return r < 0 ? mix(GREEN, AMBER, r + 1) : mix(AMBER, RED, r);
}

type SortKey = CommodityKey | "name" | "priceIndex" | "changePct" | "sellerCount";

function SortHead({
  k,
  children,
  right = true,
  sortKey,
  sortDir,
  onSort,
}: {
  k: SortKey;
  children: React.ReactNode;
  right?: boolean;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(right && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md font-medium whitespace-nowrap hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
        <Icon aria-hidden="true" className="size-3 shrink-0" />
      </button>
    </TableHead>
  );
}

export function RegionComparison({ regions }: { regions: RegionStats[] }) {
  const [commodity, setCommodity] = useState<CommodityKey>("hardWoodPrms");
  const [sortKey, setSortKey] = useState<SortKey>("priceIndex");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const meta = COMMODITY_META[commodity];
  const unit = meta.unit.split("/")[1];

  const chartData = useMemo(
    () =>
      [...regions]
        .map((r) => ({
          code: r.region,
          name: REGIONS[r.region].short,
          fullName: r.name,
          price: r.avgPrices[commodity],
        }))
        .sort((a, b) => a.price - b.price),
    [regions, commodity],
  );

  const avg = useMemo(() => chartData.reduce((s, d) => s + d.price, 0) / chartData.length, [chartData]);
  const cheapest = chartData[0];
  const priciest = chartData[chartData.length - 1];
  const lo = Math.floor((cheapest.price * 0.9) / 50) * 50;
  const hi = Math.ceil((priciest.price * 1.03) / 50) * 50;

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...regions].sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name, "cs");
      if (sortKey === "priceIndex" || sortKey === "changePct" || sortKey === "sellerCount") {
        return dir * (a[sortKey] - b[sortKey]);
      }
      return dir * (a.avgPrices[sortKey] - b.avgPrices[sortKey]);
    });
  }, [regions, sortKey, sortDir]);

  function sortBy(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  const sh = { sortKey, sortDir, onSort: sortBy };

  return (
    <Section
      id="kraje"
      title="Srovnání 14 krajů ČR"
      description="Průměrné ceny podle sídla prodejců. Barva sloupce ukazuje odchylku od průměru krajů – mechová levněji, hlinitá dráž."
      actions={
        <Segmented<CommodityKey>
          label="Komodita"
          value={commodity}
          onChange={setCommodity}
          options={KEYS.map((k) => ({ value: k, label: SHORT_LABEL[k] }))}
          className="max-w-full overflow-x-auto [scrollbar-width:none]"
        />
      }
    >
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
        <div className="flex h-full items-center gap-3 rounded-xl border border-moss/30 bg-moss-soft p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-moss-strong">
            <TrendingDown aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="text-xs font-semibold tracking-wide text-moss-strong uppercase">Nejlevnější</p>
            <p className="truncate font-medium text-foreground">{cheapest.fullName}</p>
            <p className="num text-muted-foreground">
              {formatCzk(cheapest.price)}/{unit} · {formatPct((cheapest.price / avg - 1) * 100)} vs. průměr
            </p>
          </div>
        </div>
        <div className="flex h-full items-center gap-3 rounded-xl border border-clay/30 bg-clay-soft p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-clay-strong">
            <TrendingUp aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="text-xs font-semibold tracking-wide text-clay-strong uppercase">Nejdražší</p>
            <p className="truncate font-medium text-foreground">{priciest.fullName}</p>
            <p className="num text-muted-foreground">
              {formatCzk(priciest.price)}/{unit} · {formatPct((priciest.price / avg - 1) * 100)} vs. průměr
            </p>
          </div>
        </div>
      </div>

      <div
        className="h-[28rem] w-full"
        role="img"
        aria-label={`Sloupcový graf průměrné ceny (${meta.label}) podle krajů, seřazeno od nejlevnějšího`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[lo, hi]}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => formatNumber(v)}
              allowDataOverflow
            />
            <YAxis
              type="category"
              dataKey="name"
              width={104}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              content={(p) => {
                if (!p.active || !p.payload?.length) return null;
                const d = p.payload[0].payload as (typeof chartData)[number];
                return (
                  <ChartTooltipFrame title={d.fullName}>
                    <ChartTooltipRow color={scaleColor(d.price, avg)} label={meta.label} value={`${formatCzk(d.price)}/${unit}`} />
                    <ChartTooltipRow label="Oproti průměru" value={formatPct((d.price / avg - 1) * 100)} />
                  </ChartTooltipFrame>
                );
              }}
            />
            <ReferenceLine
              x={avg}
              stroke="var(--foreground)"
              strokeDasharray="4 3"
              strokeOpacity={0.6}
              label={{
                value: `Průměr ${formatCzk(avg)}`,
                position: "top",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
            <Bar dataKey="price" radius={[0, 6, 6, 0]} isAnimationActive={false} barSize={18}>
              {chartData.map((d) => (
                <Cell key={d.code} fill={scaleColor(d.price, avg)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Osa nezačíná v nule, aby byly rozdíly mezi kraji čitelné. Ceny jsou v Kč vč. DPH za {unit}.
      </p>

      <div className="overflow-hidden overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead k="name" right={false} {...sh}>Kraj</SortHead>
              {KEYS.map((k) => (
                <SortHead key={k} k={k} {...sh}>
                  {SHORT_LABEL[k]}
                </SortHead>
              ))}
              <SortHead k="priceIndex" {...sh}>Index</SortHead>
              <SortHead k="changePct" {...sh}>Změna m/m</SortHead>
              <SortHead k="sellerCount" {...sh}>Prodejci</SortHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.region}>
                <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                {KEYS.map((k) => (
                  <TableCell key={k} className={cn("num text-right", k === commodity && "bg-accent/60 font-medium")}>
                    {formatNumber(r.avgPrices[k])}
                  </TableCell>
                ))}
                <TableCell
                  className={cn(
                    "num text-right font-medium",
                    r.priceIndex < 98 && "text-moss-strong",
                    r.priceIndex > 102 && "text-clay-strong",
                  )}
                >
                  {formatNumber(r.priceIndex, 1)}
                </TableCell>
                <TableCell className="text-right">
                  <PriceDelta value={r.changePct} />
                </TableCell>
                <TableCell className="num text-right">{r.sellerCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Ceny dřeva v Kč/PRMS, ostatní paliva v Kč/t. Index: 100 = průměr ČR.
      </p>
    </Section>
  );
}
