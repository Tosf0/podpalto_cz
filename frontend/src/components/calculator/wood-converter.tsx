"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KWH_PER_KG, MOISTURE, WOOD_GROUPS, WOOD_SOLID_FACTOR } from "@/lib/constants";
import { convertWoodVolume, woodKwhPerUnit, type WoodVolumeUnit } from "@/lib/pricing";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Moisture, WoodGroup } from "@/types";
import { Collapsible, NumberField, Panel, Segmented, parseNum } from "./fields";

const UNITS: WoodVolumeUnit[] = ["PRMS", "PRM", "PLM"];

/** Název a popis jednotky (překládá se při renderu). */
function unitInfo(unit: WoodVolumeUnit) {
  return {
    name: t(`common.units.${unit}`),
    short: t(`calculator.converter.unitShort.${unit}`),
    desc: t(`calculator.converter.unitDesc.${unit}`),
  };
}

function moistureLabel(m: Moisture): string {
  return t(`calculator.converter.moistureShort.${m}`);
}

/** Znázornění zaplnění: nasypané / rovnané / plná hmota. */
function FillCard({ unit, active }: { unit: WoodVolumeUnit; active: boolean }) {
  const ratio = WOOD_SOLID_FACTOR[unit];
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors",
        active ? "border-primary bg-accent/50" : "border-border",
      )}
    >
      <svg
        viewBox="0 0 80 80"
        className="size-20"
        role="img"
        aria-label={t("calculator.converter.fillAria", { unit, percent: Math.round(ratio * 100) })}
      >
        <rect x="6" y="6" width="68" height="68" rx="4" className="fill-secondary stroke-border" strokeWidth="1.5" />
        {unit === "PLM" ? (
          <rect x="6" y="6" width="68" height="68" rx="4" className="fill-wood/80" />
        ) : (
          <>
            {Array.from({ length: unit === "PRM" ? 16 : 9 }).map((_, i) => {
              const cols = unit === "PRM" ? 4 : 3;
              const cell = 68 / cols;
              const row = Math.floor(i / cols);
              const col = i % cols;
              const jitter = unit === "PRMS" ? ((i * 7) % 5) - 2 : 0;
              return (
                <circle
                  key={i}
                  cx={6 + cell * col + cell / 2 + jitter}
                  cy={74 - cell * row - cell / 2 - (unit === "PRMS" ? (i % 3) * 2 : 0)}
                  r={cell / 2 - (unit === "PRMS" ? 3.5 : 1.5)}
                  className="fill-wood/80"
                />
              );
            })}
          </>
        )}
      </svg>
      <div>
        <p className="num text-xl font-semibold">{Math.round(ratio * 100)} %</p>
        <p className="text-sm font-medium">{unit}</p>
        <p className="mt-1 text-xs text-muted-foreground">{unitInfo(unit).desc}</p>
      </div>
    </div>
  );
}

function Equivalent({ label, kg }: { label: string; kg: number }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2">
      <p className="text-xs whitespace-nowrap text-muted-foreground">{label}</p>
      <p className="num text-sm font-semibold whitespace-nowrap">{formatNumber(kg)} kg</p>
    </div>
  );
}

export function WoodConverter() {
  const [amount, setAmount] = useState("10");
  const [unit, setUnit] = useState<WoodVolumeUnit>("PRMS");
  const [group, setGroup] = useState<WoodGroup>("hard");
  const [moisture, setMoisture] = useState<Moisture>("dry");

  const value = parseNum(amount);
  const kwh = value * woodKwhPerUnit(unit, group, moisture);

  return (
    <div className="space-y-4">
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Panel className="space-y-4">
          <NumberField id="conv-amount" label={t("calculator.converter.amount")} value={amount} onChange={setAmount} step="0.5" suffix={unit} />
          <Segmented
            label={t("calculator.converter.unit")}
            value={unit}
            onChange={setUnit}
            options={UNITS.map((u) => ({ value: u, label: u, title: unitInfo(u).name }))}
            tip={
              <>
                {UNITS.map((u) => (
                  <p key={u}>
                    <strong className="text-foreground">{u}</strong> – {unitInfo(u).name}. {unitInfo(u).desc}
                  </p>
                ))}
              </>
            }
          />
          <Segmented
            label={t("calculator.converter.wood")}
            value={group}
            onChange={setGroup}
            options={(Object.keys(WOOD_GROUPS) as WoodGroup[]).map((g) => ({
              value: g,
              label: WOOD_GROUPS[g].label,
              title: WOOD_GROUPS[g].hint,
            }))}
          />
          <Segmented
            label={t("calculator.converter.moisture")}
            value={moisture}
            onChange={setMoisture}
            options={(Object.keys(MOISTURE) as Moisture[]).map((m) => ({
              value: m,
              label: moistureLabel(m),
              title: MOISTURE[m].hint,
            }))}
            tip={
              <>
                {(Object.keys(MOISTURE) as Moisture[]).map((m) => (
                  <p key={m}>
                    <strong className="text-foreground">{moistureLabel(m)}</strong> – {MOISTURE[m].hint}
                  </p>
                ))}
              </>
            }
          />
        </Panel>

        <Panel className="flex flex-col justify-between gap-4 border-primary/30 bg-accent/40">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("calculator.converter.energyTitle")}</p>
            <p className="num text-5xl font-semibold tracking-tight text-primary">
              {formatNumber(kwh)} <span className="text-xl font-medium text-muted-foreground">kWh</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {UNITS.map((u) => (
              <Tooltip key={u}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "rounded-xl border bg-card px-3 py-2 text-left",
                      u === unit ? "border-primary" : "border-border",
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {u}
                    </p>
                    <p className="num text-lg font-semibold tracking-tight">
                      {formatNumber(convertWoodVolume(value, unit, u), 2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{unitInfo(u).short}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{unitInfo(u).name}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("calculator.converter.sameEnergy")}</p>
            <div className="grid grid-cols-3 gap-2">
              <Equivalent label={t("calculator.converter.pellets")} kg={kwh / KWH_PER_KG.pellets} />
              <Equivalent label={t("calculator.converter.briquettes")} kg={kwh / KWH_PER_KG.briquettesWood} />
              <Equivalent label={t("calculator.converter.brownCoal")} kg={kwh / KWH_PER_KG.coalBrown} />
            </div>
          </div>
        </Panel>
      </div>

      <Collapsible title={t("calculator.converter.visualTitle")} icon={<Eye className="size-4 text-moss-strong" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNITS.map((u) => (
            <FillCard key={u} unit={u} active={u === unit} />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("calculator.converter.visualNote", { percent: Math.round(WOOD_SOLID_FACTOR.PRMS * 100) })}
        </p>
      </Collapsible>
    </div>
  );
}
