"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EnergyCostItem } from "@/types";
import { Button } from "@/components/ui/button";
import { FUEL_META } from "@/lib/constants";
import { formatKwhPrice, formatNumber } from "@/lib/format";
import {
  AXIS_LINE,
  AXIS_TICK,
  ChartTooltipFrame,
  ChartTooltipRow,
  GRID_STROKE,
  Section,
  Segmented,
} from "./chart-parts";

type Mode = "fuel" | "heat";

interface Datum extends EnergyCostItem {
  value: number;
}

/** Popisek osy Y: název paliva a (v režimu tepla) účinnost kotle. */
function FuelTick({
  x,
  y,
  payload,
  data,
  mode,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  data: Datum[];
  mode: Mode;
}) {
  const item = data.find((d) => d.label === payload?.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={mode === "heat" ? -3 : 0} dy={mode === "heat" ? 0 : 4} textAnchor="end" fontSize={12} fill="var(--foreground)">
        {payload?.value}
      </text>
      {mode === "heat" && item && (
        <text x={-8} y={11} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
          {`účinnost ${Math.round(item.efficiency * 100)} %`}
        </text>
      )}
    </g>
  );
}

export function EnergyCostChart({ items }: { items: EnergyCostItem[] }) {
  const [mode, setMode] = useState<Mode>("heat");

  const data = useMemo<Datum[]>(
    () =>
      items
        .map((i) => ({ ...i, value: mode === "fuel" ? i.kcPerKwh : i.kcPerKwhHeat }))
        .sort((a, b) => a.value - b.value),
    [items, mode],
  );

  const cheapest = data[0];
  const max = data[data.length - 1];
  const savingPct = Math.round((1 - cheapest.value / max.value) * 100);

  return (
    <Section
      id="kwh"
      title="Srovnání ceny za 1 kWh tepla"
      description="Paliva přepočtená na společnou jednotku"
      info={
        <>
          „Energie v palivu“ vychází z výhřevnosti a vlhkosti paliva. „Dodané teplo“ navíc počítá s účinností spalování
          (dřevo 78 %, pelety 90 %, brikety 80 %, uhlí 72 %) – to skutečně zaplatíte za teplo v domě.
        </>
      }
      actions={
        <Segmented<Mode>
          label="Způsob výpočtu"
          value={mode}
          onChange={setMode}
          options={[
            { value: "heat", label: "Dodané teplo" },
            { value: "fuel", label: "Energie v palivu" },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-moss/30 bg-moss-soft p-3 text-sm">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-moss-strong">
            <Trophy aria-hidden="true" className="size-4" />
          </span>
          <p className="text-foreground">
            <strong className="font-semibold">{cheapest.label}</strong> je nejlevnější:{" "}
            <span className="num font-medium">{formatKwhPrice(cheapest.value)}</span>
            {savingPct > 0 && (
              <>
                , o <span className="num font-medium">{savingPct} %</span> méně než {max.label.toLowerCase()}.
              </>
            )}
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/kalkulacka#sezona">
            <Calculator aria-hidden="true" />
            Spočítat pro můj dům
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="h-80 w-full" role="img" aria-label="Sloupcový graf ceny za kilowatthodinu podle paliva">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 64, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, "auto"]}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              tickFormatter={(v: number) => formatNumber(v, 1)}
              unit=" Kč"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={152}
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={(p) => <FuelTick {...p} data={data} mode={mode} />}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              content={(p) => {
                if (!p.active || !p.payload?.length) return null;
                const d = p.payload[0].payload as Datum;
                return (
                  <ChartTooltipFrame title={d.label}>
                    <ChartTooltipRow color={FUEL_META[d.category].color} label="Energie v palivu" value={formatKwhPrice(d.kcPerKwh)} />
                    <ChartTooltipRow label="Dodané teplo" value={formatKwhPrice(d.kcPerKwhHeat)} />
                    <ChartTooltipRow label="Účinnost kotle" value={`${Math.round(d.efficiency * 100)} %`} />
                  </ChartTooltipFrame>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false} barSize={22}>
              {data.map((d) => (
                <Cell key={d.id} fill={FUEL_META[d.category].color} fillOpacity={d.id === cheapest.id ? 1 : 0.8} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: unknown) => formatNumber(Number(v), 2)}
                fill="var(--foreground)"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(FUEL_META) as (keyof typeof FUEL_META)[]).map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: FUEL_META[c].color }} />
            {FUEL_META[c].label}
          </span>
        ))}
      </div>
    </Section>
  );
}
