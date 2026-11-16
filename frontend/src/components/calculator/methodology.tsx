"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="py-1.5 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "py-1.5 pr-4" : "num py-1.5 pr-4"}>
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

const KWH_ROWS: [string, number][] = [
  ["Pelety", KWH_PER_KG.pellets],
  ["Dřevěné brikety", KWH_PER_KG.briquettesWood],
  ["Hnědouhelné brikety", KWH_PER_KG.briquettesCoal],
  ["Hnědé uhlí", KWH_PER_KG.coalBrown],
  ["Černé uhlí", KWH_PER_KG.coalBlack],
  ["Koks", KWH_PER_KG.coke],
];

export function Methodology() {
  return (
    <Card className="rounded-2xl border border-border shadow-soft ring-0">
      <CardContent>
        <Accordion type="multiple" defaultValue={["units"]}>
          <AccordionItem value="units">
            <AccordionTrigger className="text-base">Převodní koeficienty objemu dřeva</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2 text-muted-foreground">
                Všechny objemy převádíme přes plnometr (PLM, čistá dřevní hmota).
              </p>
              <Table2
                head={["Jednotka", "Podíl dřeva", "1 jednotka v PLM"]}
                rows={[
                  ["PLM – plnometr", "100 %", formatNumber(WOOD_SOLID_FACTOR.PLM, 2)],
                  ["PRM – prostorový metr rovnaný", `${Math.round(WOOD_SOLID_FACTOR.PRM * 100)} %`, formatNumber(WOOD_SOLID_FACTOR.PRM, 2)],
                  ["PRMS – prostorový metr sypaný", `${Math.round(WOOD_SOLID_FACTOR.PRMS * 100)} %`, formatNumber(WOOD_SOLID_FACTOR.PRMS, 2)],
                ]}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="energy">
            <AccordionTrigger className="text-base">Energie ve dřevě a vliv vlhkosti</AccordionTrigger>
            <AccordionContent>
              <Table2
                head={["Skupina dřeva", "kWh na 1 PLM (suché)"]}
                rows={(Object.keys(WOOD_KWH_PER_PLM) as WoodGroup[]).map((g) => [
                  `${WOOD_GROUPS[g].label} (${WOOD_GROUPS[g].hint})`,
                  formatNumber(WOOD_KWH_PER_PLM[g]),
                ])}
              />
              <div className="mt-4" />
              <Table2
                head={["Vlhkost", "Koeficient využitelné energie"]}
                rows={(Object.keys(MOISTURE_ENERGY_FACTOR) as Moisture[]).map((m) => [
                  `${MOISTURE[m].label} – ${MOISTURE[m].hint}`,
                  formatNumber(MOISTURE_ENERGY_FACTOR[m], 2),
                ])}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="other">
            <AccordionTrigger className="text-base">Výhřevnost pelet, briket a uhlí</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2 text-muted-foreground">
                Pokud prodejce uvádí vlastní výhřevnost v MJ/kg, použijeme ji (1 kWh = 3,6 MJ). Jinak tabulkové hodnoty:
              </p>
              <Table2
                head={["Palivo", "kWh/kg"]}
                rows={KWH_ROWS.map(([n, v]) => [n, formatNumber(v, 1)])}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="eff">
            <AccordionTrigger className="text-base">Účinnost kotlů a odhad spotřeby</AccordionTrigger>
            <AccordionContent>
              <Table2
                head={["Palivo", "Účinnost"]}
                rows={(Object.keys(BOILER_EFFICIENCY) as FuelCategory[]).map((c) => [
                  FUEL_META[c].label,
                  `${Math.round(BOILER_EFFICIENCY[c] * 100)} %`,
                ])}
              />
              <p className="mt-3 text-muted-foreground">
                Doporučené množství = roční potřeba tepla ÷ účinnost ÷ energie v jedné základní jednotce (PRMS u dřeva,
                tuna u ostatních paliv).
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="delivery">
            <AccordionTrigger className="text-base">Odhad dopravy a srovnání s průměrem kraje</AccordionTrigger>
            <AccordionContent className="space-y-2">
              <p>
                Silniční vzdálenost odhadujeme jako vzdušnou čáru × 1,25. Doprava je zdarma do bezplatného rádia
                prodejce nebo při dosažení limitu množství; nad rádius se účtuje paušál + cena za kilometr nad rádius.
                Mimo maximální dojezd je možný pouze osobní odběr.
              </p>
              <p>
                Průměr kraje = průměrná cena paliva v kraji × množství + průměrná cena dopravy mezi nalezenými
                nabídkami. Úspora je rozdíl proti tomuto průměru.
              </p>
              <p>
                Množství se u každého prodejce zaokrouhluje nahoru na prodejní jednotku (palety, pytle po celých
                kusech, dřevo na 0,5, tuny na 0,1).
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="disclaimer">
            <AccordionTrigger className="text-base">Upozornění</AccordionTrigger>
            <AccordionContent>
              <p>
                Ceny jsou orientační, uvedené včetně DPH a mohou se lišit od aktuálního ceníku prodejce. Skutečná
                výhřevnost závisí na konkrétní dodávce, uložení a spotřebiči. Před objednávkou si cenu a dopravu
                ověřte u prodejce.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
