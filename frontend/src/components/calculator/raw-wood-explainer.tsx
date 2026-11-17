"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { WOOD_KWH_PER_PLM, KWH_PER_KG, WOOD_SOLID_FACTOR } from "@/lib/constants";
import { woodKwhPerUnit } from "@/lib/pricing";
import { formatKwhPrice, formatNumber, fromDisplayCurrency, moneyUnit, toDisplayCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { NumberField, Panel, PanelTitle, parseNum } from "./fields";

export function RawWoodExplainer() {
  const { t } = useI18n();
  // Vstupy jsou v zobrazované měně, výpočet běží v Kč.
  const initial = (czk: number) => String(Math.round(toDisplayCurrency(czk) * 100) / 100);
  const [fresh, setFresh] = useState(() => initial(1250));
  const [dry, setDry] = useState(() => initial(2900));
  const [briq, setBriq] = useState(() => initial(8300));

  const items = [
    { key: "fresh" as const, label: t("calculator.rawWood.fresh.label"), inline: t("calculator.rawWood.fresh.inline"), unit: moneyUnit("PRMS"), value: fresh, set: setFresh, kwh: woodKwhPerUnit("PRMS", "hard", "fresh") },
    { key: "dry" as const, label: t("calculator.rawWood.dry.label"), inline: t("calculator.rawWood.dry.inline"), unit: moneyUnit("PRM"), value: dry, set: setDry, kwh: woodKwhPerUnit("PRM", "hard", "dry") },
    { key: "briq" as const, label: t("calculator.rawWood.briq.label"), inline: t("calculator.rawWood.briq.inline"), unit: moneyUnit("t"), value: briq, set: setBriq, kwh: 1000 * KWH_PER_KG.briquettesWood },
  ].map((i) => {
    const price = fromDisplayCurrency(parseNum(i.value));
    return { ...i, price, perKwh: price > 0 ? price / i.kwh : 0 };
  });

  const valid = items.filter((i) => i.perKwh > 0);
  const best = valid.length ? valid.reduce((a, b) => (b.perKwh < a.perKwh ? b : a)) : undefined;
  const max = Math.max(...items.map((i) => i.perKwh), 0.0001);

  const [freshItem, dryItem] = items;
  let verdict = t("calculator.rawWood.enterAll");
  if (best) {
    if (freshItem.perKwh > 0 && dryItem.perKwh > 0 && freshItem.perKwh >= dryItem.perKwh) {
      const diff = Math.round((freshItem.perKwh / dryItem.perKwh - 1) * 100);
      verdict = t("calculator.rawWood.freshPricier", { diff, best: best.inline });
    } else {
      verdict = t("calculator.rawWood.cheapest", { best: best.inline, price: formatKwhPrice(best.perKwh) });
    }
  }

  return (
    <Panel className="space-y-4">
      <PanelTitle
        tip={
          <p>
            {t("calculator.rawWood.tip", {
              percent: Math.round(WOOD_SOLID_FACTOR.PRMS * 100),
              kwh: formatNumber(WOOD_KWH_PER_PLM.hard),
            })}
          </p>
        }
      >
        {t("calculator.rawWood.title")}
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
                    ariaLabel={t("calculator.rawWood.priceAria", { label: i.label })}
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
                    {i.perKwh > 0 ? formatKwhPrice(i.perKwh) : "–"}
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
