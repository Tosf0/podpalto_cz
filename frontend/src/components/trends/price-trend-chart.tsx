"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CommodityKey, PriceTrendPoint } from "@/types";
import { COMMODITY_META } from "@/lib/constants";
import { formatCzk, formatMonth, formatNumber } from "@/lib/format";
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
const WOOD: CommodityKey[] = ["hardWoodPrms", "softWoodPrms"];

type Mode = "index" | "abs";

/** Topná sezóna = říjen–březen. */
function inSeason(month: string): boolean {
  const m = Number(month.split("-")[1]);
  return m >= 10 || m <= 3;
}

/** Souvislé úseky měsíců se stejným příznakem sezóny. */
function runs(months: string[], season: boolean): [string, string][] {
  const out: [string, string][] = [];
  let start: string | null = null;
  let prev: string | null = null;
  for (const m of months) {
    if (inSeason(m) === season) {
      start ??= m;
      prev = m;
    } else if (start && prev) {
      out.push([start, prev]);
      start = null;
    }
  }
  if (start && prev) out.push([start, prev]);
  return out;
}

type Row = { month: string; raw: Record<string, number> } & Record<string, number | string | Record<string, number>>;

export function PriceTrendChart({ trends }: { trends: PriceTrendPoint[] }) {
  const [mode, setMode] = useState<Mode>("index");
  const [hidden, setHidden] = useState<Set<CommodityKey>>(new Set());

  const base = trends[0];
  const rows = useMemo<Row[]>(
    () =>
      trends.map((p) => {
        const raw: Record<string, number> = {};
        const row: Row = { month: p.month, raw };
        for (const k of KEYS) {
          raw[k] = p[k];
          row[k] = mode === "index" ? (p[k] / base[k]) * 100 : p[k];
        }
        return row;
      }),
    [trends, mode, base],
  );

  const months = useMemo(() => trends.map((t) => t.month), [trends]);
  const seasonRuns = useMemo(() => runs(months, true), [months]);
  const offRuns = useMemo(() => runs(months, false), [months]);
  const visible = KEYS.filter((k) => !hidden.has(k));
  const hasWood = visible.some((k) => WOOD.includes(k));
  const hasOther = visible.some((k) => !WOOD.includes(k));

  function toggle(k: CommodityKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else if (next.size < KEYS.length - 1) next.add(k);
      return next;
    });
  }

  const baseLabel = formatMonth(base.month);

  return (
    <Section
      id="vyvoj"
      title="Vývoj cen v čase"
      description={`Průměrné ceny v ČR za posledních ${trends.length} měsíců. V režimu indexu jsou všechna paliva přepočtena na společnou osu (${baseLabel} = 100).`}
      actions={
        <Segmented<Mode>
          label="Režim grafu"
          value={mode}
          onChange={setMode}
          options={[
            { value: "index", label: `Index (${baseLabel} = 100)` },
            { value: "abs", label: "Absolutní ceny" },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Zobrazené řady">
        {KEYS.map((k) => {
          const on = !hidden.has(k);
          const color = COMMODITY_META[k].color;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(k)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                on
                  ? "border-border bg-card text-foreground"
                  : "border-dashed border-border bg-transparent text-muted-foreground line-through",
              )}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: on ? color : "transparent", boxShadow: `inset 0 0 0 1.5px ${color}` }}
              />
              {COMMODITY_META[k].label}
            </button>
          );
        })}
      </div>

      <div className="h-80 w-full sm:h-96" role="img" aria-label="Čárový graf vývoje cen paliv v ČR">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />

            {seasonRuns.map(([a, b]) => (
              <ReferenceArea
                key={`s${a}`}
                yAxisId="left"
                x1={a}
                x2={b}
                fill="var(--wood)"
                fillOpacity={0.1}
                stroke="none"
                ifOverflow="visible"
                label={{ value: "Topná sezóna", position: "insideTop", fill: "var(--wood-strong)", fontSize: 12, fontWeight: 600 }}
              />
            ))}
            {offRuns
              .filter(([a, b]) => a !== b)
              .map(([a, b]) => (
                <ReferenceArea
                  key={`o${a}`}
                  yAxisId="left"
                  x1={a}
                  x2={b}
                  fill="var(--moss)"
                  fillOpacity={0.08}
                  stroke="none"
                  ifOverflow="visible"
                  label={{ value: "Letní propad cen", position: "insideTop", fill: "var(--moss-strong)", fontSize: 12 }}
                />
              ))}

            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              width={mode === "index" ? 44 : 56}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              domain={
                mode === "index"
                  ? [(min: number) => Math.floor(min - 2), (max: number) => Math.ceil(max + 2)]
                  : [
                      (min: number) => Math.floor((min * 0.96) / 50) * 50,
                      (max: number) => Math.ceil((max * 1.04) / 50) * 50,
                    ]
              }
              tickFormatter={(v: number) => formatNumber(v)}
              label={
                mode === "abs" && hasWood
                  ? { value: "Kč/PRMS", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 11, dx: 4 }
                  : undefined
              }
            />
            {mode === "abs" && (
              <YAxis
                yAxisId="right"
                orientation="right"
                width={64}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                hide={!hasOther}
                domain={[
                  (min: number) => Math.floor((min * 0.96) / 500) * 500,
                  (max: number) => Math.ceil((max * 1.04) / 500) * 500,
                ]}
                tickFormatter={(v: number) => formatNumber(v)}
                label={{ value: "Kč/t", angle: 90, position: "insideRight", fill: "var(--muted-foreground)", fontSize: 11, dx: -4 }}
              />
            )}

            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={(p) => {
                if (!p.active || !p.payload?.length) return null;
                const raw = (p.payload[0].payload as Row).raw;
                return (
                  <ChartTooltipFrame title={formatMonth(String(p.label))}>
                    {p.payload.map((e) => {
                      const k = e.dataKey as CommodityKey;
                      const meta = COMMODITY_META[k];
                      const abs = `${formatCzk(raw[k])}/${meta.unit.split("/")[1]}`;
                      return (
                        <ChartTooltipRow
                          key={k}
                          color={meta.color}
                          label={meta.label}
                          value={mode === "index" ? formatNumber(Number(e.value), 1) : abs}
                          hint={mode === "index" ? abs : undefined}
                        />
                      );
                    })}
                  </ChartTooltipFrame>
                );
              }}
            />

            {visible.map((k) => (
              <Line
                key={k}
                yAxisId={mode === "abs" && !WOOD.includes(k) ? "right" : "left"}
                type="monotone"
                dataKey={k}
                name={COMMODITY_META[k].label}
                stroke={COMMODITY_META[k].color}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Zvýrazněná oblast = topná sezóna (říjen–březen), kdy poptávka a ceny obvykle rostou. Řady lze skrýt kliknutím na štítek.
      </p>
    </Section>
  );
}
