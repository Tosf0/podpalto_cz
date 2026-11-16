"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WOOD_KWH_PER_PLM, KWH_PER_KG, WOOD_SOLID_FACTOR } from "@/lib/constants";
import { woodKwhPerUnit } from "@/lib/pricing";
import { formatCzk, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NumberField, parseNum } from "./fields";

export function RawWoodExplainer() {
  const [fresh, setFresh] = useState("1250");
  const [dry, setDry] = useState("2900");
  const [briq, setBriq] = useState("8300");

  const items = [
    {
      key: "fresh",
      label: "Syrové sypané dřevo",
      sub: "čerstvé, Kč/PRMS",
      price: parseNum(fresh),
      kwh: woodKwhPerUnit("PRMS", "hard", "fresh"),
    },
    {
      key: "dry",
      label: "Suché rovnané dřevo",
      sub: "pod 20 % vlhkosti, Kč/PRM",
      price: parseNum(dry),
      kwh: woodKwhPerUnit("PRM", "hard", "dry"),
    },
    {
      key: "briq",
      label: "Dřevěné brikety",
      sub: "Kč/t",
      price: parseNum(briq),
      kwh: 1000 * KWH_PER_KG.briquettesWood,
    },
  ].map((i) => ({ ...i, perKwh: i.price > 0 ? i.price / i.kwh : 0 }));

  const valid = items.filter((i) => i.perKwh > 0);
  const best = valid.length ? valid.reduce((a, b) => (b.perKwh < a.perKwh ? b : a)) : undefined;
  const max = Math.max(...items.map((i) => i.perKwh), 0.0001);

  const freshItem = items[0];
  const dryItem = items[1];
  let verdict = "Zadejte ceny všech tří paliv.";
  if (best) {
    if (freshItem.perKwh > 0 && dryItem.perKwh > 0 && freshItem.perKwh >= dryItem.perKwh) {
      const diff = Math.round((freshItem.perKwh / dryItem.perKwh - 1) * 100);
      verdict = `Levné syrové dřevo vychází na ${formatNumber(freshItem.perKwh, 2)} Kč/kWh, tedy ${
        diff > 0 ? `o ${diff} % dráž` : "stejně"
      } než suché rovnané. Nejlevnější za kWh je: ${best.label.toLowerCase()}.`;
    } else {
      verdict = `Nejlevnější za kWh je ${best.label.toLowerCase()} – ${formatNumber(best.perKwh, 2)} Kč/kWh.`;
    }
  }

  return (
    <Card className="rounded-2xl border border-border shadow-soft ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-heading">
          <Lightbulb className="size-5 text-moss-strong" aria-hidden="true" />
          Proč levné syrové dřevo není levné
        </CardTitle>
        <CardDescription>
          Čerstvé dřevo obsahuje hodně vody a sypaný metr jen {Math.round(WOOD_SOLID_FACTOR.PRMS * 100)} % dřeva.
          Část energie se navíc spotřebuje na odpaření vody. Porovnejte sami (výpočet pro tvrdé dřevo,{" "}
          {formatNumber(WOOD_KWH_PER_PLM.hard)} kWh/PLM).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField id="raw-fresh" label="Syrové sypané (Kč/PRMS)" value={fresh} onChange={setFresh} suffix="Kč" />
          <NumberField id="raw-dry" label="Suché rovnané (Kč/PRM)" value={dry} onChange={setDry} suffix="Kč" />
          <NumberField id="raw-briq" label="Brikety (Kč/t)" value={briq} onChange={setBriq} suffix="Kč" />
        </div>

        <ul className="space-y-3">
          {items.map((i) => {
            const isBest = best?.key === i.key;
            return (
              <li key={i.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={cn("font-medium", isBest && "text-moss-strong")}>
                    {i.label} <span className="text-xs font-normal text-muted-foreground">· {i.sub}</span>
                  </span>
                  <span className={cn("num shrink-0 text-lg font-semibold", isBest && "text-moss-strong")}>
                    {i.perKwh > 0 ? `${formatNumber(i.perKwh, 2)} Kč/kWh` : "–"}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-md bg-secondary">
                  <div
                    className={cn("h-full rounded-md transition-all", isBest ? "bg-moss" : "bg-wood/60")}
                    style={{ width: `${(i.perKwh / max) * 100}%` }}
                  />
                </div>
                <p className="num text-xs text-muted-foreground">
                  {i.price > 0 ? formatCzk(i.price) : "–"} za {formatNumber(i.kwh)} kWh
                </p>
              </li>
            );
          })}
        </ul>

        <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">{verdict}</p>
      </CardContent>
    </Card>
  );
}
