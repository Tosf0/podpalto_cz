"use client";

import { Calculator, Flame, GitCompareArrows, BookOpen, Scale } from "lucide-react";
import { PageHeader } from "@/components/common";
import { SectionShell } from "./fields";
import { WoodConverter } from "./wood-converter";
import { RawWoodExplainer } from "./raw-wood-explainer";
import { SeasonCalculator } from "./season-calculator";
import { SellerComparison } from "./seller-comparison";
import { Methodology } from "./methodology";

const NAV = [
  { id: "prevodnik", label: "Převodník", icon: Scale },
  { id: "sezona", label: "Sezónní nákup", icon: Flame },
  { id: "srovnani", label: "Srovnání prodejců", icon: GitCompareArrows },
  { id: "metodika", label: "Metodika", icon: BookOpen },
];

export function CalculatorPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Nástroje"
        title="Chytrá kalkulačka vytápění"
        description="Přepočítejte jednotky dřeva, zjistěte skutečnou cenu za kWh a najděte nejvýhodnější nákup včetně dopravy."
        icon={<Calculator />}
      />

      <nav
        aria-label="Sekce stránky"
        className="sticky top-14 z-30 lg:top-0 -mx-4 mt-4 overflow-x-auto border-b border-border bg-background/90 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <ul className="flex min-w-max gap-1 py-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-14">
        <SectionShell
          id="prevodnik"
          eyebrow="1 · Převodník"
          title="Převodník jednotek dřeva a výhřevnosti"
          description="PRMS, PRM a PLM nejsou totéž. Zadejte objem, vyberte dřevinu a vlhkost a uvidíte, kolik energie ve dřevě skutečně je."
        >
          <WoodConverter />
          <RawWoodExplainer />
        </SectionShell>

        <SectionShell
          id="sezona"
          eyebrow="2 · Sezónní nákup"
          title="Kalkulačka sezónního nákupu vč. dopravy"
          description="Porovnáme prodejce podle konečné ceny: palivo plus doprava k vám domů. Seřazeno od nejlevnějšího."
        >
          <SeasonCalculator />
        </SectionShell>

        <SectionShell
          id="srovnani"
          eyebrow="3 · Srovnávač"
          title="Srovnání vybraných prodejců"
          description="Prodejce přidáte tlačítkem „Porovnat“ na mapě, nebo přímo zde. Porovnat lze až 4 prodejce."
        >
          <SellerComparison />
        </SectionShell>

        <SectionShell
          id="metodika"
          eyebrow="4 · Metodika"
          title="Jak počítáme"
          description="Všechny koeficienty vycházejí z jednoho místa v aplikaci, takže dokumentace odpovídá výpočtům."
        >
          <Methodology />
        </SectionShell>
      </div>
    </div>
  );
}
