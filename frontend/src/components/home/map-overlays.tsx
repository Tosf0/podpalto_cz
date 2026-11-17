"use client";

import { useEffect, useRef } from "react";
import type L from "leaflet";
import { ChevronDown, ChevronUp, Layers, LocateFixed, Minus, Plus } from "lucide-react";
import { FuelIcon, PriceDelta } from "@/components/common";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { priceScale } from "@/components/map";
import { getMarketPulse } from "@/lib/api";
import { COMMODITY_META } from "@/lib/constants";
import { currencySymbol, formatMoneyNumber, moneyUnit } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PRICE_TIER_META, type PriceTier } from "@/lib/pricing";
import { useApi } from "@/hooks/use-api";
import type { CommodityKey, FuelCategory, PriceMode } from "@/types";
import { cn } from "@/lib/utils";

/** Společný vzhled plovoucích widgetů nad mapou. */
export const floatCard = "pointer-events-auto rounded-2xl border border-border bg-card/95 shadow-float backdrop-blur";

/**
 * „Zamlžené sklo“ pro lišty nad mapou: poloprůhledné pozadí s rozmazáním a zvýšenou sytostí,
 * takže mapa je pod lištou tušit, ale text zůstává čitelný.
 */
export const glassBar = "bg-card/60 backdrop-blur-xl backdrop-saturate-150 dark:bg-card/55";

/** Šířka bočních skupin v horní liště – vlevo i vpravo stejná (symetrie). */
export const TOP_SIDE_WIDTH = "w-[156px] @3xl:w-[188px]";

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
        pressed ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/75 hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Mini-pilulka: přepínač zobrazení ceny (Kč/jednotka ↔ Kč/kWh). */
export function PriceModePill({ className }: { className?: string }) {
  const { priceMode, setPriceMode } = usePreferences();
  const { t } = useI18n();
  const options: { value: PriceMode; label: string }[] = [
    { value: "unit", label: t("home.overlays.perUnit", { currency: currencySymbol() }) },
    { value: "kwh", label: moneyUnit("kWh") },
  ];
  return (
    <div role="radiogroup" aria-label={t("home.overlays.priceMode")} className={cn("grid h-11 shrink-0 grid-cols-2 gap-1 rounded-full bg-card p-1 shadow-soft", TOP_SIDE_WIDTH, className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={priceMode === o.value}
          onClick={() => setPriceMode(o.value)}
          className={cn(
            "rounded-full text-xs font-semibold transition-colors",
            priceMode === o.value ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
  const { t } = useI18n();
  return (
    <div className={cn("flex h-11 shrink-0 items-center gap-0.5 rounded-full bg-card p-1 shadow-soft", TOP_SIDE_WIDTH, className)}>
      <PillIconButton label={t("home.overlays.regionsMap")} onClick={onToggleRegions} pressed={showRegions}>
        <Layers aria-hidden />
      </PillIconButton>
      <PillIconButton label={t("home.overlays.myLocation")} onClick={onLocate}>
        <LocateFixed aria-hidden />
      </PillIconButton>
      <PillIconButton label={t("home.overlays.zoomOut")} onClick={() => map?.zoomOut()}>
        <Minus aria-hidden />
      </PillIconButton>
      <PillIconButton label={t("home.overlays.zoomIn")} onClick={() => map?.zoomIn()}>
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
        "pointer-events-auto flex h-14 w-full items-center gap-1.5 rounded-full border border-white/50 p-1.5 shadow-float dark:border-white/10",
        glassBar,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Legenda teplotní mapy krajů (pod levou skupinou). */
export function RegionLegend({ metricLabel, className }: { metricLabel?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn(floatCard, "p-3 text-[11px]", TOP_SIDE_WIDTH, className)}>
      <p className="mb-2 font-semibold text-foreground">{t("home.overlays.legendTitle")}</p>
      {metricLabel && <p className="-mt-1.5 mb-2 text-muted-foreground">{metricLabel}</p>}
      <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${priceScale(0)}, ${priceScale(0.5)}, ${priceScale(1)})` }} />
      <div className="mt-1.5 flex justify-between text-muted-foreground">
        <span>{t("home.overlays.cheaper")}</span>
        <span>{t("home.overlays.pricier")}</span>
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

/** Mini-widget vlevo dole: význam barev cenovek na mapě. */
export function PriceTierLegend({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn(floatCard, "p-3 text-[11px]", TOP_SIDE_WIDTH, className)}>
      <p className="font-semibold text-foreground">{t("home.overlays.tierTitle")}</p>
      <p className="mb-2 text-muted-foreground">{t("home.overlays.tierHint")}</p>
      <ul className="space-y-1.5">
        {TIER_ORDER.map((tier) => (
          <li key={tier} className="flex items-center gap-2 text-foreground/80">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full border-2 bg-card" style={{ borderColor: PRICE_TIER_META[tier].color }} />
            {PRICE_TIER_META[tier].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Spodní pás: průměrné ceny v ČR – 4 stejné dlaždice se stejným odsazením shora i zdola. */
export function MarketStrip({ className }: { className?: string }) {
  const { t } = useI18n();
  const { data, loading } = useApi(() => getMarketPulse(), []);
  const items = PULSE.map((k) => data?.find((i) => i.key === k));

  return (
    <section aria-label={t("home.overlays.marketAria")} className={cn("px-4 py-3", glassBar, className)}>
      <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4 @3xl:gap-3">
        {items.map((item, i) =>
          loading || !item ? (
            <Skeleton key={i} className="h-[52px] rounded-xl @3xl:h-[58px]" />
          ) : (
            <div key={item.key} className="flex h-[52px] min-w-0 flex-col justify-center rounded-xl bg-card px-3 shadow-soft @3xl:h-[58px]">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground [&_svg]:size-3.5">
                <FuelIcon category={PULSE_FUEL[item.key]} className="shrink-0 text-wood" />
                <span className="truncate">{COMMODITY_META[item.key].label}</span>
              </span>
              <span className="flex items-baseline justify-between gap-2 whitespace-nowrap">
                <span className="flex items-baseline gap-1">
                  <span className="num text-sm font-bold text-foreground">{formatMoneyNumber(item.value)}</span>
                  <span className="text-[10px] text-muted-foreground">{COMMODITY_META[item.key].unit}</span>
                </span>
                <PriceDelta value={item.changePct} className="text-[11px]" />
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/**
 * Spodní dok nad mapou (desktop): legenda cenovek vlevo, pod ní skleněný pás průměrných cen.
 * Výčnělek uprostřed pás sbalí – mapa pak sahá až dolů a legenda sjede s ním.
 * `onInsetChange` hlásí, kolik pixelů zespodu dok zakrývá (pro odsazení mapy a atribuce).
 */
export function MapBottomDock({
  open,
  onToggle,
  onInsetChange,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  onInsetChange?: (px: number) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const stripRef = useRef<HTMLDivElement>(null);
  const onInsetRef = useRef(onInsetChange);
  useEffect(() => {
    onInsetRef.current = onInsetChange;
  });

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const report = () => onInsetRef.current?.(open ? el.offsetHeight : 0);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const label = open ? t("home.overlays.collapseStrip") : t("home.overlays.expandStrip");

  return (
    <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex flex-col", className)}>
      <div className="px-4 pb-3">
        <PriceTierLegend />
      </div>
      <div className="relative">
        {/* Výčnělek – při rozbaleném pásu sedí na jeho horní hraně, při sbaleném na spodním okraji mapy */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="market-strip"
          aria-label={label}
          title={label}
          className={cn(
            "pointer-events-auto absolute bottom-full left-1/2 flex h-6 w-16 -translate-x-1/2 items-center justify-center rounded-t-2xl text-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            glassBar,
          )}
        >
          {open ? <ChevronDown aria-hidden className="size-4" /> : <ChevronUp aria-hidden className="size-4" />}
        </button>
        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="min-h-0 overflow-hidden">
            <div ref={stripRef} id="market-strip" inert={!open}>
              <MarketStrip className="pointer-events-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
