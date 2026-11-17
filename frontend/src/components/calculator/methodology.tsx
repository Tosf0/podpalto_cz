"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  BOILER_EFFICIENCY,
  FUEL_META,
  KWH_PER_KG,
  MOISTURE,
  MOISTURE_ENERGY_FACTOR,
  WOOD_GROUPS,
  WOOD_KWH_PER_PLM,
  WOOD_SOLID_FACTOR,
} from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { FuelCategory, Moisture, WoodGroup } from "@/types";

function Table2({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left text-xs text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "px-3 py-2" : "num px-3 py-2 text-foreground"}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-1 py-3 text-left text-sm font-medium outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex-1">{title}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-2 px-1 pb-4 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Methodology() {
  const { t } = useI18n();
  const kwhRows: [string, number][] = [
    [t("calculator.method.heating.pellets"), KWH_PER_KG.pellets],
    [t("calculator.method.heating.briquettesWood"), KWH_PER_KG.briquettesWood],
    [t("calculator.method.heating.briquettesCoal"), KWH_PER_KG.briquettesCoal],
    [t("calculator.method.heating.coalBrown"), KWH_PER_KG.coalBrown],
    [t("calculator.method.heating.coalBlack"), KWH_PER_KG.coalBlack],
    [t("calculator.method.heating.coke"), KWH_PER_KG.coke],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card px-5 shadow-soft">
      <Item title={t("calculator.method.volume.title")}>
        <p>{t("calculator.method.volume.intro")}</p>
        <Table2
          head={[t("calculator.method.volume.h1"), t("calculator.method.volume.h2"), t("calculator.method.volume.h3")]}
          rows={[
            [t("calculator.method.volume.plm"), "100 %", formatNumber(WOOD_SOLID_FACTOR.PLM, 2)],
            [t("calculator.method.volume.prm"), `${Math.round(WOOD_SOLID_FACTOR.PRM * 100)} %`, formatNumber(WOOD_SOLID_FACTOR.PRM, 2)],
            [t("calculator.method.volume.prms"), `${Math.round(WOOD_SOLID_FACTOR.PRMS * 100)} %`, formatNumber(WOOD_SOLID_FACTOR.PRMS, 2)],
          ]}
        />
      </Item>

      <Item title={t("calculator.method.energy.title")}>
        <Table2
          head={[t("calculator.method.energy.group"), t("calculator.method.energy.perPlm")]}
          rows={(Object.keys(WOOD_KWH_PER_PLM) as WoodGroup[]).map((g) => [
            `${WOOD_GROUPS[g].label} (${WOOD_GROUPS[g].hint})`,
            formatNumber(WOOD_KWH_PER_PLM[g]),
          ])}
        />
        <Table2
          head={[t("calculator.method.energy.moisture"), t("calculator.method.energy.factor")]}
          rows={(Object.keys(MOISTURE_ENERGY_FACTOR) as Moisture[]).map((m) => [
            `${MOISTURE[m].label} – ${MOISTURE[m].hint}`,
            formatNumber(MOISTURE_ENERGY_FACTOR[m], 2),
          ])}
        />
      </Item>

      <Item title={t("calculator.method.heating.title")}>
        <p>{t("calculator.method.heating.intro")}</p>
        <Table2
          head={[t("calculator.method.heating.fuel"), "kWh/kg"]}
          rows={kwhRows.map(([n, v]) => [n, formatNumber(v, 1)])}
        />
      </Item>

      <Item title={t("calculator.method.efficiency.title")}>
        <Table2
          head={[t("calculator.method.efficiency.fuel"), t("calculator.method.efficiency.efficiency")]}
          rows={(Object.keys(BOILER_EFFICIENCY) as FuelCategory[]).map((c) => [
            FUEL_META[c].label,
            `${Math.round(BOILER_EFFICIENCY[c] * 100)} %`,
          ])}
        />
        <p>{t("calculator.method.efficiency.body")}</p>
      </Item>

      <Item title={t("calculator.method.delivery.title")}>
        <p>{t("calculator.method.delivery.p1")}</p>
        <p>{t("calculator.method.delivery.p2")}</p>
        <p>{t("calculator.method.delivery.p3")}</p>
      </Item>

      <Item title={t("calculator.method.disclaimer.title")}>
        <p>{t("calculator.method.disclaimer.body")}</p>
      </Item>
    </div>
  );
}
