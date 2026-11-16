"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { WOOD_KWH_PER_PLM, KWH_PER_KG, WOOD_SOLID_FACTOR } from "@/lib/constants";
import { woodKwhPerUnit } from "@/lib/pricing";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NumberField, Panel, PanelTitle, parseNum } from "./fields";

export function RawWoodExplainer() {
  const [fresh, setFresh] = useState("1250");
  const [dry, setDry] = useState("2900");
  const [briq, setBriq] = useState("8300");

  const items = [
    { key: "fresh", label: "Syrové sypané", unit: "Kč/PRMS", value: fresh, set: setFresh, kwh: woodKwhPerUnit("PRMS", "hard", "fresh") },
    { key: "dry", label: "Suché rovnané", unit: "Kč/PRM", value: dry, set: setDry, kwh: woodKwhPerUnit("PRM", "hard", "dry") },
    { key: "briq", label: "Brikety", unit: "Kč/t", value: briq, set: setBriq, kwh: 1000 * KWH_PER_KG.briquettesWood },
  ].map((i) => {
    const price = parseNum(i.value);
    return { ...i, price, perKwh: price > 0 ? price / i.kwh : 0 };
  });

  const valid = items.filter((i) => i.perKwh > 0);
  const best = valid.length ? valid.reduce((a, b) => (b.perKwh < a.perKwh ? b : a)) : undefined;
  const max = Math.max(...items.map((i) => i.perKwh), 0.0001);

  const [freshItem, dryItem] = items;
  let verdict = "Zadejte ceny všech tří paliv.";
  if (best) {
    if (freshItem.perKwh > 0 && dryItem.perKwh > 0 && freshItem.perKwh >= dryItem.perKwh) {
      const diff = Math.round((freshItem.perKwh / dryItem.perKwh - 1) * 100);
      verdict = `Syrové dřevo vychází o ${diff} % dráž než suché. Nejlevnější za kWh: ${best.label.toLowerCase()}.`;
    } else {
      verdict = `Nejlevnější za kWh: ${best.label.toLowerCase()} (${formatNumber(best.perKwh, 2)} Kč/kWh).`;
    }
  }

  return (
    <Panel className="space-y-4">
      <PanelTitle
        tip={
          <p>
            Čerstvé dřevo obsahuje hodně vody, sypaný metr jen {Math.round(WOOD_SOLID_FACTOR.PRMS * 100)} % dřeva a část
            energie se spotřebuje na odpaření vody. Výpočet pro tvrdé dřevo ({formatNumber(WOOD_KWH_PER_PLM.hard)} kWh/PLM).
          </p>
        }
      >
        Proč levné syrové dřevo není levné
      </PanelTitle>

      <ul className="space-y-4">
        {items.map((i) => {
          const isBest = best?.key === i.key;
          return (
            <li key={i.key} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <span className={cn("text-sm font-medium", isBest && "text-moss-strong")}>{i.label}</span>
                <div className="flex items-center gap-3">
                  <NumberField
                    id={`raw-${i.key}`}
                    ariaLabel={`Cena: ${i.label}`}
                    value={i.value}
                    onChange={i.set}
                    suffix={i.unit}
                    className="w-40"
                    inputClassName="h-8 pr-16 text-sm"
                  />
                  <span
                    className={cn(
                      "num w-28 text-right text-base font-semibold whitespace-nowrap",
                      isBest && "text-moss-strong",
                    )}
                  >
                    {i.perKwh > 0 ? `${formatNumber(i.perKwh, 2)} Kč/kWh` : "–"}
                  </span>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-md bg-secondary">
                <div
                  className={cn("h-full rounded-md transition-all", isBest ? "bg-moss" : "bg-wood/60")}
                  style={{ width: `${(i.perKwh / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium">
        <Lightbulb className="size-4 shrink-0 text-moss-strong" aria-hidden="true" />
        {verdict}
      </p>
    </Panel>
  );
}
