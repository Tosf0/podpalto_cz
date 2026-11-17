"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { usePreferences } from "@/components/providers/preferences-provider";
import { SIDE_PANEL_WIDTH } from "@/components/layout/app-sidebar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SellerMap, type MapFocus } from "@/components/map";
import { getRegionStats, getSellers } from "@/lib/api";
import { COMMODITY_META } from "@/lib/constants";
import {
  DEFAULT_FILTERS,
  SUB_FILTER_KEYS,
  computeMatches,
  countActiveFilters,
  findBestValueId,
  resetFilters,
  type FilterState,
} from "@/lib/filters";
import type { PlaceSuggestion } from "@/lib/geocoding";
import { useApi } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";
import type { CommodityKey, FuelCategory } from "@/types";
import { cn } from "@/lib/utils";
import { AddressSearch } from "./address-search";
import { FiltersPanel } from "./filters-panel";
import { MapBottomDock, MapControlsPill, MapTopBar, PriceModePill, RegionLegend } from "./map-overlays";
import { SellerPanel } from "./seller-panel";
import { useMediaQuery } from "./use-media-query";

/** Detail prodejce zabírá 2/5 šířky obrazovky (dvojnásobek bočního panelu). */
const DETAIL_PANEL_WIDTH = "w-[clamp(440px,40vw,720px)]";

function regionMetricFor(f: FilterState): CommodityKey | null {
  switch (f.category) {
    case "wood":
      return f.woodGroup === "soft" ? "softWoodPrms" : "hardWoodPrms";
    case "pellets":
      return "pelletsT";
    case "briquettes":
      return "briquettesT";
    case "coal":
      return "coalT";
    default:
      return null;
  }
}

function zoomFor(place: PlaceSuggestion): number {
  if (place.kind === "address") return 15;
  if (place.kind === "street") return 14;
  return 11.5;
}

/**
 * Úvodní stránka: celoplošná interaktivní mapa s překryvnými widgety,
 * vpravo panel filtrů (1/5) nebo detail vybraného prodejce (2/5).
 */
export function HomeView() {
  const { priceMode, location, setLocation, mapShowRegions: showRegions, setMapShowRegions: setShowRegions, mapStripOpen, setMapStripOpen } =
    usePreferences();
  const { t } = useI18n();
  const sellersApi = useApi(() => getSellers(), []);
  const regionsApi = useApi(() => getRegionStats(), []);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [addressPicked, setAddressPicked] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  /** Kolik px zespodu zakrývá pás průměrných cen (0 = sbalený / mobil). */
  const [bottomInset, setBottomInset] = useState(0);
  const nonce = useRef(0);

  const deferredFilters = useDeferredValue(filters);
  const sellers = useMemo(() => sellersApi.data ?? [], [sellersApi.data]);
  const regionStats = useMemo(() => regionsApi.data ?? [], [regionsApi.data]);

  const matches = useMemo(
    () =>
      sellers.length
        ? computeMatches({ sellers, filters: deferredFilters, location, regionStats })
        : [],
    [sellers, deferredFilters, location, regionStats],
  );
  const bestId = useMemo(() => findBestValueId(matches, deferredFilters.category === "all"), [matches, deferredFilters.category]);
  const selected = matches.find((m) => m.seller.id === selectedId) ?? null;
  const activeCount = countActiveFilters(filters);
  const radiusActive = !deferredFilters.nationwide;
  const regionMetric = regionMetricFor(deferredFilters);

  const onChange = useCallback((patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch })), []);
  const onCategoryChange = useCallback((category: FuelCategory | "all") => {
    setFilters((f) => {
      const cleared = Object.fromEntries(SUB_FILTER_KEYS.map((k) => [k, null]));
      return { ...f, ...cleared, category };
    });
  }, []);
  const onReset = useCallback(() => setFilters((f) => resetFilters(f)), []);
  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setFiltersOpen(false);
  }, []);

  const onPickPlace = useCallback(
    (place: PlaceSuggestion) => {
      // „Masarykova“ + „659 37 Brno · okres…“ → „Masarykova, Brno“
      const city = place.detail.split(" · ")[0]?.replace(/^\d{3}\s?\d{2}\s*/, "").trim();
      const label = (place.kind === "address" || place.kind === "street") && city ? `${place.label}, ${city}` : place.label;
      setLocation({ label, lat: place.lat, lng: place.lng, zip: place.zip, region: place.region });
      setAddressPicked(true);
      setFocus({ lat: place.lat, lng: place.lng, zoom: zoomFor(place), nonce: ++nonce.current });
    },
    [setLocation],
  );

  const onLocate = useCallback(() => {
    if (!navigator.geolocation) {
      toast(t("home.view.geoUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ label: t("home.view.myLocation"), lat, lng });
        setAddressPicked(true);
        setFocus({ lat, lng, zoom: 12, nonce: ++nonce.current });
      },
      () => toast(t("home.view.geoFailed"), { description: t("home.view.geoFailedDesc") }),
      { timeout: 8000 },
    );
  }, [setLocation, t]);

  const filtersPanel = (
    <FiltersPanel
      filters={filters}
      onChange={onChange}
      onCategoryChange={onCategoryChange}
      onReset={onReset}
      activeCount={activeCount}
      matches={matches}
      loading={sellersApi.loading}
      mode={priceMode}
      locationLabel={location.label}
      hoveredId={hoveredId}
      onHover={setHoveredId}
      onSelect={onSelect}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 lg:h-dvh">
      {/* Sloupec mapy: mapa přes celou výšku, widgety a skleněné lišty plavou nad ní */}
      <div className="@container isolate flex min-w-0 flex-1 flex-col">
      <div
        className="podpalto-map-wrap relative min-h-0 flex-1"
        style={{ "--map-bottom-inset": `${isDesktop ? bottomInset : 0}px` } as React.CSSProperties}
      >
        <SellerMap
          matches={matches}
          location={location}
          showLocation={addressPicked}
          radiusKm={deferredFilters.radiusKm}
          radiusActive={radiusActive}
          priceMode={priceMode}
          hoveredId={hoveredId}
          selectedId={selectedId}
          focus={focus}
          onHover={setHoveredId}
          onSelect={onSelect}
          regionStats={regionStats}
          regionMetric={regionMetric}
          showRegions={showRegions}
          fitPadding={isDesktop ? { top: 96, bottom: bottomInset + 150, left: 48, right: 48 } : { top: 80, bottom: 96, left: 24, right: 24 }}
          onMapReady={setMap}
        />

        <div className="pointer-events-none absolute inset-0 z-[1000] flex flex-col justify-between p-3 lg:p-4">
          {/* Horní lišta: jedna velká pilulka [ceny · vyhledávání · ovládání], boční mini-pilulky stejně široké */}
          <div className="flex flex-col items-center gap-3">
            <MapTopBar>
              <PriceModePill className="hidden @lg:grid" />
              <AddressSearch
                sellers={sellers}
                currentLabel={addressPicked ? location.label : undefined}
                onPickPlace={onPickPlace}
                onPickSeller={onSelect}
                className="min-w-0 flex-1"
              />
              <MapControlsPill
                map={map}
                showRegions={showRegions}
                onToggleRegions={() => setShowRegions(!showRegions)}
                onLocate={onLocate}
                className="hidden @sm:flex"
              />
            </MapTopBar>
            {showRegions && (
              <RegionLegend
                metricLabel={regionMetric ? COMMODITY_META[regionMetric].label : undefined}
                className="self-start"
              />
            )}
          </div>

          {/* Mobil: tlačítko filtrů */}
          <div className="flex items-end justify-center">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="pointer-events-auto mx-auto flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-float lg:hidden"
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              {t("home.view.filtersAndResults")}
              <span className="num rounded-full bg-white/20 px-2 text-xs">{matches.length}</span>
            </button>
          </div>
        </div>

        {/* Desktop: legenda cenovek vlevo dole + sbalitelný pás průměrných cen přes celou šířku mapy */}
        {isDesktop && <MapBottomDock open={mapStripOpen} onToggle={() => setMapStripOpen(!mapStripOpen)} onInsetChange={setBottomInset} />}
      </div>
      </div>

      {/* Pravý panel: filtry (1/5) ↔ detail prodejce (2/5) */}
      {isDesktop && (
        <aside
          className={cn(
            "relative z-10 hidden h-full shrink-0 border-l border-border transition-[width] duration-300 ease-out lg:block",
            selected ? DETAIL_PANEL_WIDTH : SIDE_PANEL_WIDTH,
          )}
        >
          {selected ? (
            <SellerPanel key={selected.seller.id} match={selected} isBest={selected.seller.id === bestId} onClose={() => setSelectedId(null)} />
          ) : (
            filtersPanel
          )}
        </aside>
      )}

      {/* Mobil: filtry a detail jako spodní panely */}
      {!isDesktop && (
        <>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent side="bottom" className="h-[85dvh] rounded-t-3xl p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">{t("home.view.filtersAndResults")}</SheetTitle>
              <SheetDescription className="sr-only">{t("home.view.filtersDescription")}</SheetDescription>
              {filtersPanel}
            </SheetContent>
          </Sheet>
          <Sheet open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)}>
            <SheetContent side="bottom" className="h-[90dvh] overflow-hidden rounded-t-3xl p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">{selected?.seller.name ?? t("home.view.sellerFallback")}</SheetTitle>
              <SheetDescription className="sr-only">{t("home.view.sellerDetail")}</SheetDescription>
              {selected && <SellerPanel match={selected} isBest={selected.seller.id === bestId} onClose={() => setSelectedId(null)} />}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
