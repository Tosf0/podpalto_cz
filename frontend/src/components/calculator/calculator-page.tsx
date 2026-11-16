"use client";

import { useCallback, useSyncExternalStore } from "react";
import { BookOpen, Calculator, Flame, GitCompareArrows, Scale, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common";
import { cn } from "@/lib/utils";
import { WoodConverter } from "./wood-converter";
import { RawWoodExplainer } from "./raw-wood-explainer";
import { SeasonCalculator } from "./season-calculator";
import { SellerComparison } from "./seller-comparison";
import { Methodology } from "./methodology";

type TabId = "prevodnik" | "sezona" | "srovnani" | "metodika";

const TABS: { id: TabId; label: string; short: string; icon: LucideIcon }[] = [
  { id: "prevodnik", label: "Převodník", short: "Převodník", icon: Scale },
  { id: "sezona", label: "Sezónní nákup", short: "Sezóna", icon: Flame },
  { id: "srovnani", label: "Srovnání prodejců", short: "Srovnání", icon: GitCompareArrows },
  { id: "metodika", label: "Metodika", short: "Metodika", icon: BookOpen },
];

function readHash(): TabId {
  const h = window.location.hash.replace("#", "");
  return TABS.some((t) => t.id === h) ? (h as TabId) : "prevodnik";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function CalculatorPage() {
  // Aktivní záložka vychází z location.hash, takže odkazy #sezona apod. fungují.
  const tab = useSyncExternalStore(subscribe, readHash, () => "prevodnik" as TabId);

  const select = useCallback((id: TabId) => {
    window.history.replaceState(null, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="pt-6 lg:pt-8">
        <PageHeader
          title="Kalkulačka"
          description="Jednotky, sezónní nákup a srovnání prodejců."
          icon={<Calculator />}
        />
      </div>

      <div className="sticky top-14 z-30 -mx-4 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div
          role="tablist"
          aria-label="Nástroje kalkulačky"
          className="flex w-full gap-1 rounded-full bg-muted p-1 sm:inline-flex sm:w-auto"
        >
          {TABS.map(({ id, label, short, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={id}
                onClick={() => select(id)}
                className={cn(
                  "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-none sm:px-4",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                <Icon className="hidden size-4 sm:block" aria-hidden="true" />
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2">
        {tab === "prevodnik" && (
          <section id="prevodnik" role="tabpanel" aria-labelledby="tab-prevodnik" className="space-y-4">
            <WoodConverter />
            <RawWoodExplainer />
          </section>
        )}
        {tab === "sezona" && (
          <section id="sezona" role="tabpanel" aria-labelledby="tab-sezona">
            <SeasonCalculator />
          </section>
        )}
        {tab === "srovnani" && (
          <section id="srovnani" role="tabpanel" aria-labelledby="tab-srovnani">
            <SellerComparison />
          </section>
        )}
        {tab === "metodika" && (
          <section id="metodika" role="tabpanel" aria-labelledby="tab-metodika">
            <Methodology />
          </section>
        )}
      </div>
    </div>
  );
}
