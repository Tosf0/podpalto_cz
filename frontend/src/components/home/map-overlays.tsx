"use client";

import type L from "leaflet";
import { Layers, LocateFixed, Minus, Plus } from "lucide-react";
import { FuelIcon, PriceDelta } from "@/components/common";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { priceScale } from "@/components/map";
import { getMarketPulse } from "@/lib/api";
import { COMMODITY_META } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { PRICE_TIER_META, type PriceTier } from "@/lib/pricing";
import { useApi } from "@/hooks/use-api";
import type { CommodityKey, FuelCategory, PriceMode } from "@/types";
import { cn } from "@/lib/utils";

/** Společný vzhled plovoucích widgetů nad mapou. */
export const floatCard = "pointer-events-auto rounded-2xl border border-border bg-card/95 shadow-float backdrop-blur";

/** Šířka bočních skupin v horní liště – vlevo i vpravo stejná (symetrie). */
export const TOP_SIDE_WIDTH = "w-[188px]";

/** Malá kulatá ikonová pilulka uvnitř horní lišty. */
function PillIconButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "flex h-9 flex-1 items-center justify-center rounded-full transition-colors [&_svg]:size-[18px]",
        pressed ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/75 hover:bg-card hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Mini-pilulka: přepínač zobrazení ceny (Kč/jednotka ↔ Kč/kWh). */
export function PriceModePill({ className }: { className?: string }) {
  const { priceMode, setPriceMode } = usePreferences();
  const options: { value: PriceMode; label: string }[] = [
    { value: "unit", label: "Kč/jedn." },
    { value: "kwh", label: "Kč/kWh" },
  ];
  return (
    <div role="radiogroup" aria-label="Zobrazení ceny" className={cn("grid h-11 shrink-0 grid-cols-2 gap-1 rounded-full bg-muted p-1", TOP_SIDE_WIDTH, className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={priceMode === o.value}
          onClick={() => setPriceMode(o.value)}
          className={cn(
            "rounded-full text-xs font-semibold transition-colors",
            priceMode === o.value ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-card hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Mini-pilulka: vrstva krajů, moje poloha, zoom. */
export function MapControlsPill({
  map,
  showRegions,
  onToggleRegions,
  onLocate,
  className,
}: {
  map: L.Map | null;
  showRegions: boolean;
  onToggleRegions: () => void;
  onLocate: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex h-11 shrink-0 items-center gap-0.5 rounded-full bg-muted p-1", TOP_SIDE_WIDTH, className)}>
      <PillIconButton label="Cenová teplotní mapa krajů" onClick={onToggleRegions} pressed={showRegions}>
        <Layers aria-hidden />
      </PillIconButton>
      <PillIconButton label="Moje poloha" onClick={onLocate}>
        <LocateFixed aria-hidden />
      </PillIconButton>
      <PillIconButton label="Oddálit" onClick={() => map?.zoomOut()}>
        <Minus aria-hidden />
      </PillIconButton>
      <PillIconButton label="Přiblížit" onClick={() => map?.zoomIn()}>
        <Plus aria-hidden />
      </PillIconButton>
    </div>
  );
}

/** Velká pilulka nad mapou, do které se skládají mini-pilulky (ceny · hledání · ovládání). */
export function MapTopBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex h-14 w-full items-center gap-1.5 rounded-full border border-border bg-card/95 p-1.5 shadow-float backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Legenda teplotní mapy krajů (pod levou skupinou). */
export function RegionLegend({ metricLabel, className }: { metricLabel?: string; className?: string }) {
  return (
    <div className={cn(floatCard, "p-3 text-[11px]", TOP_SIDE_WIDTH, className)}>
      <p className="mb-2 font-semibold text-foreground">Cenový index krajů</p>
      {metricLabel && <p className="-mt-1.5 mb-2 text-muted-foreground">{metricLabel}</p>}
      <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${priceScale(0)}, ${priceScale(0.5)}, ${priceScale(1)})` }} />
      <div className="mt-1.5 flex justify-between text-muted-foreground">
        <span>levněji</span>
        <span>dráž</span>
      </div>
    </div>
  );
}

const PULSE: CommodityKey[] = ["hardWoodPrms", "softWoodPrms", "pelletsT", "briquettesT"];
const PULSE_FUEL: Record<CommodityKey, FuelCategory> = {
  hardWoodPrms: "wood",
  softWoodPrms: "wood",
  pelletsT: "pellets",
  briquettesT: "briquettes",
  coalT: "coal",
};
const TIER_ORDER: PriceTier[] = ["below", "average", "above"];

/** Spodní pás: průměrné ceny v ČR (4 stejné dlaždice) + legenda barev cenovek. */
export function MarketStrip({ className }: { className?: string }) {
  const { data, loading } = useApi(() => getMarketPulse(), []);
  const items = PULSE.map((k) => data?.find((i) => i.key === k));

  return (
    <section aria-label="Průměrné ceny v ČR" className={cn("border-t border-border bg-card px-4 py-3", className)}>
      <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4 @3xl:gap-3">
        {items.map((item, i) =>
          loading || !item ? (
            <Skeleton key={i} className="h-[52px] rounded-xl @3xl:h-[58px]" />
          ) : (
            <div key={item.key} className="flex h-[52px] min-w-0 flex-col justify-center rounded-xl bg-muted/60 px-3 @3xl:h-[58px]">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground [&_svg]:size-3.5">
                <FuelIcon category={PULSE_FUEL[item.key]} className="shrink-0 text-wood" />
                <span className="truncate">{COMMODITY_META[item.key].label}</span>
              </span>
              <span className="flex items-baseline justify-between gap-2 whitespace-nowrap">
                <span className="flex items-baseline gap-1">
                  <span className="num text-sm font-bold text-foreground">{formatNumber(item.value)}</span>
                  <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                </span>
                <PriceDelta value={item.changePct} className="text-[11px]" />
              </span>
            </div>
          ),
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
        <span className="hidden font-medium text-foreground/80 @3xl:inline">Průměr ČR · změna za měsíc</span>
        <span aria-hidden className="hidden h-3 w-px bg-border @3xl:inline-block" />
        {TIER_ORDER.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full border-2 bg-card" style={{ borderColor: PRICE_TIER_META[t].color }} />
            {PRICE_TIER_META[t].label}
          </span>
        ))}
      </div>
    </section>
  );
}
