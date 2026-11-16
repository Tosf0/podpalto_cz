"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KWH_PER_KG, MOISTURE, WOOD_GROUPS, WOOD_SOLID_FACTOR } from "@/lib/constants";
import { convertWoodVolume, woodKwhPerUnit, type WoodVolumeUnit } from "@/lib/pricing";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Moisture, WoodGroup } from "@/types";
import { NumberField, parseNum } from "./fields";

const UNITS: WoodVolumeUnit[] = ["PRMS", "PRM", "PLM"];

const UNIT_INFO: Record<WoodVolumeUnit, { name: string; desc: string }> = {
  PRMS: { name: "Prostorový metr sypaný", desc: "Štípané dříví nasypané na hromadu (např. z valníku)." },
  PRM: { name: "Prostorový metr rovnaný", desc: "Dříví úhledně srovnané do hranice 1 × 1 × 1 m." },
  PLM: { name: "Plnometr", desc: "1 m³ čisté dřevní hmoty bez mezer – odborná jednotka lesníků." },
};

function ToggleRow<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
        className="flex-wrap"
      >
        {options.map((o) => (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            aria-label={o.label}
            title={o.hint}
            className="rounded-xl data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** Znázornění zaplnění: nasypané / rovnané / plná hmota. */
function FillCard({ unit, active }: { unit: WoodVolumeUnit; active: boolean }) {
  const ratio = WOOD_SOLID_FACTOR[unit];
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center shadow-soft transition-colors",
        active ? "border-primary bg-accent/50" : "border-border",
      )}
    >
      <svg
        viewBox="0 0 80 80"
        className="size-20"
        role="img"
        aria-label={`${unit}: dřevo vyplňuje ${Math.round(ratio * 100)} % objemu`}
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
        <p className="mt-1 text-xs text-muted-foreground">{UNIT_INFO[unit].desc}</p>
      </div>
    </div>
  );
}

function Equivalent({ label, kg }: { label: string; kg: number }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <p className="num text-xl font-semibold">{formatNumber(kg)} kg</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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
      <div className="grid items-stretch gap-4 lg:grid-cols-5">
        <Card className="h-full rounded-2xl border border-border shadow-soft ring-0 lg:col-span-2">
          <CardContent className="space-y-4">
            <NumberField id="conv-amount" label="Množství dřeva" value={amount} onChange={setAmount} step="0.5" />
            <ToggleRow
              label="Jednotka"
              value={unit}
              onChange={setUnit}
              options={UNITS.map((u) => ({ value: u, label: u, hint: UNIT_INFO[u].name }))}
            />
            <ToggleRow
              label="Skupina dřeva"
              value={group}
              onChange={setGroup}
              options={(Object.keys(WOOD_GROUPS) as WoodGroup[]).map((g) => ({
                value: g,
                label: WOOD_GROUPS[g].label,
                hint: WOOD_GROUPS[g].hint,
              }))}
            />
            <ToggleRow
              label="Vlhkost"
              value={moisture}
              onChange={setMoisture}
              options={(Object.keys(MOISTURE) as Moisture[]).map((m) => ({
                value: m,
                label: MOISTURE[m].label,
                hint: MOISTURE[m].hint,
              }))}
            />
            <p className="text-xs text-muted-foreground">{MOISTURE[moisture].hint}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-3">
            {UNITS.map((u) => (
              <Card key={u} size="sm" className={cn("h-full rounded-2xl border border-border shadow-soft ring-0", u === unit && "border-primary bg-accent/50")}>
                <CardContent>
                  <p className="text-xs font-medium text-muted-foreground">{u}</p>
                  <p className="num text-2xl font-semibold tracking-tight">
                    {formatNumber(convertWoodVolume(value, unit, u), 2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{UNIT_INFO[u].name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="flex-1 rounded-2xl border border-border shadow-soft ring-0">
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Energie v zadaném množství</p>
                <p className="num text-4xl font-semibold tracking-tight text-primary">
                  {formatNumber(kwh)} <span className="text-lg font-medium text-muted-foreground">kWh</span>
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Stejnou energii obsahuje přibližně</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Equivalent label="Pelet" kg={kwh / KWH_PER_KG.pellets} />
                  <Equivalent label="Dřevěných briket" kg={kwh / KWH_PER_KG.briquettesWood} />
                  <Equivalent label="Hnědého uhlí" kg={kwh / KWH_PER_KG.coalBrown} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-heading text-base font-semibold">Jak vypadá 1 m³ prostoru podle jednotky</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNITS.map((u) => (
            <FillCard key={u} unit={u} active={u === unit} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Pozor: za 1 PRMS dostanete jen {Math.round(WOOD_SOLID_FACTOR.PRMS * 100)} % dřeva z 1 PLM – proto se ceny
          „za metr“ nedají porovnávat bez přepočtu.
        </p>
      </div>
    </div>
  );
}
