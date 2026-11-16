"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
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

const KWH_ROWS: [string, number][] = [
  ["Pelety", KWH_PER_KG.pellets],
  ["Dřevěné brikety", KWH_PER_KG.briquettesWood],
  ["Hnědouhelné brikety", KWH_PER_KG.briquettesCoal],
  ["Hnědé uhlí", KWH_PER_KG.coalBrown],
  ["Černé uhlí", KWH_PER_KG.coalBlack],
  ["Koks", KWH_PER_KG.coke],
];

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
  return (
    <div className="rounded-2xl border border-border bg-card px-5 shadow-soft">
      <Item title="Převodní koeficienty objemu dřeva">
        <p>Všechny objemy převádíme přes plnometr (PLM, čistá dřevní hmota).</p>
        <Table2
          head={["Jednotka", "Podíl dřeva", "1 jednotka v PLM"]}
          rows={[
            ["PLM – plnometr", "100 %", formatNumber(WOOD_SOLID_FACTOR.PLM, 2)],
            ["PRM – prostorový metr rovnaný", `${Math.round(WOOD_SOLID_FACTOR.PRM * 100)} %`, formatNumber(WOOD_SOLID_FACTOR.PRM, 2)],
            ["PRMS – prostorový metr sypaný", `${Math.round(WOOD_SOLID_FACTOR.PRMS * 100)} %`, formatNumber(WOOD_SOLID_FACTOR.PRMS, 2)],
          ]}
        />
      </Item>

      <Item title="Energie ve dřevě a vliv vlhkosti">
        <Table2
          head={["Skupina dřeva", "kWh na 1 PLM (suché)"]}
          rows={(Object.keys(WOOD_KWH_PER_PLM) as WoodGroup[]).map((g) => [
            `${WOOD_GROUPS[g].label} (${WOOD_GROUPS[g].hint})`,
            formatNumber(WOOD_KWH_PER_PLM[g]),
          ])}
        />
        <Table2
          head={["Vlhkost", "Koeficient využitelné energie"]}
          rows={(Object.keys(MOISTURE_ENERGY_FACTOR) as Moisture[]).map((m) => [
            `${MOISTURE[m].label} – ${MOISTURE[m].hint}`,
            formatNumber(MOISTURE_ENERGY_FACTOR[m], 2),
          ])}
        />
      </Item>

      <Item title="Výhřevnost pelet, briket a uhlí">
        <p>Pokud prodejce uvádí vlastní výhřevnost v MJ/kg, použijeme ji (1 kWh = 3,6 MJ). Jinak tabulkové hodnoty:</p>
        <Table2 head={["Palivo", "kWh/kg"]} rows={KWH_ROWS.map(([n, v]) => [n, formatNumber(v, 1)])} />
      </Item>

      <Item title="Účinnost kotlů a odhad spotřeby">
        <Table2
          head={["Palivo", "Účinnost"]}
          rows={(Object.keys(BOILER_EFFICIENCY) as FuelCategory[]).map((c) => [
            FUEL_META[c].label,
            `${Math.round(BOILER_EFFICIENCY[c] * 100)} %`,
          ])}
        />
        <p>
          Doporučené množství = roční potřeba tepla ÷ účinnost ÷ energie v jedné základní jednotce (PRMS u dřeva, tuna
          u ostatních paliv).
        </p>
      </Item>

      <Item title="Doprava a srovnání s průměrem kraje">
        <p>
          Silniční vzdálenost odhadujeme jako vzdušnou čáru × 1,25. Doprava je zdarma do bezplatného rádia prodejce nebo
          při dosažení limitu množství; nad rádius se účtuje paušál + cena za kilometr nad rádius. Mimo maximální dojezd
          je možný pouze osobní odběr.
        </p>
        <p>
          Průměr kraje = průměrná cena paliva v kraji × množství + průměrná cena dopravy mezi nalezenými nabídkami.
          Úspora je rozdíl proti tomuto průměru.
        </p>
        <p>
          Množství se u každého prodejce zaokrouhluje nahoru na prodejní jednotku (palety, pytle po celých kusech, dřevo
          na 0,5, tuny na 0,1).
        </p>
      </Item>

      <Item title="Upozornění">
        <p>
          Ceny jsou orientační, uvedené včetně DPH a mohou se lišit od aktuálního ceníku prodejce. Skutečná výhřevnost
          závisí na konkrétní dodávce, uložení a spotřebiči. Před objednávkou si cenu a dopravu ověřte u prodejce.
        </p>
      </Item>
    </div>
  );
}
