"use client";

import "react-leaflet-cluster/dist/assets/MarkerCluster.css";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useTheme } from "next-themes";
import { CZ_BOUNDS, CZ_CENTER } from "@/lib/constants";
import type { SellerMatch } from "@/lib/filters";
import type { PriceMode } from "@/types";
import { cn } from "@/lib/utils";
import { clusterFromLabel, clusterIcon, pinLabel, pinMeta, pinMetaFor, pricePinIcon, userLocationIcon } from "./pins";
import { RegionLayer } from "./region-layer";
import type { SellerMapProps } from "./types";

/**
 * Mapové dlaždice: výchozí OpenStreetMap (bez API klíče, české popisky), zklidněné CSS filtrem
 * do teplého papírového vzhledu (`.podpalto-tiles` v globals.css; v dark mode invertované).
 * Pro produkci s vyšším provozem nastavte vlastního poskytovatele přes NEXT_PUBLIC_MAP_TILE_URL
 * (např. MapTiler, Stadia, Thunderforest – dle jejich podmínek) a NEXT_PUBLIC_MAP_TILE_ATTRIBUTION.
 */
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** Minimální typy pro leaflet.markercluster (balíček @types/leaflet.markercluster není nainstalován). */
interface ClusterGroupLike {
  hasLayer(layer: L.Layer): boolean;
  zoomToShowLayer(layer: L.Layer, callback: () => void): void;
  refreshClusters(): void;
}
interface ClusterLike {
  getChildCount(): number;
  getAllChildMarkers(): L.Marker[];
}

/** Filtr používá silniční vzdálenost (= vzdušná × 1,25), kruh na mapě je proto odpovídajícím vzdušným poloměrem. */
const ROAD_FACTOR = 1.25;
const DEFAULT_PADDING = { top: 88, bottom: 120, left: 72, right: 72 };

/* ------------------------------------------------------------------ */
/* Marker prodejce                                                     */
/* ------------------------------------------------------------------ */

interface SellerMarkerProps {
  match: SellerMatch;
  mode: PriceMode;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  register: (id: string, marker: L.Marker | null) => void;
}

const SellerMarker = memo(function SellerMarker({ match, mode, active, onHover, onSelect, register }: SellerMarkerProps) {
  const id = match.seller.id;
  const { lat, lng } = match.seller.location;
  const icon = pricePinIcon(pinLabel(match, mode), match.tier, match.product.category);

  const handlers = useMemo(
    () => ({
      click: () => onSelect(id),
      mouseover: () => onHover(id),
      mouseout: () => onHover(null),
    }),
    [id, onHover, onSelect],
  );
  const markerRef = useRef<L.Marker | null>(null);
  const setRef = useCallback(
    (m: L.Marker | null) => {
      markerRef.current = m;
      register(id, m);
    },
    [id, register],
  );

  // zvýraznění bez výměny ikony (jen CSS třída na prvku markeru)
  useEffect(() => {
    markerRef.current?.getElement()?.classList.toggle("is-active", active);
  }, [active, icon]);

  // cenová metadata pro ikonu clusteru („od 1 280 Kč/PRMS“)
  useEffect(() => {
    if (markerRef.current) pinMeta.set(markerRef.current, pinMetaFor(match, mode));
  }, [match, mode]);

  return (
    <Marker
      ref={setRef}
      position={[lat, lng]}
      icon={icon}
      zIndexOffset={active ? 1000 : 0}
      eventHandlers={handlers}
      keyboard
      title={match.seller.name}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Efekty nad instancí mapy                                            */
/* ------------------------------------------------------------------ */

type Padding = { top: number; bottom: number; left: number; right: number };

function MapEffects({
  fitBounds,
  fitKey,
  padding,
  focus,
  selectedId,
  markers,
  clusterRef,
  onMapReady,
}: {
  fitBounds: L.LatLngBounds;
  fitKey: string;
  padding: Padding;
  focus: SellerMapProps["focus"];
  selectedId: string | null;
  markers: React.RefObject<Map<string, L.Marker>>;
  clusterRef: React.RefObject<ClusterGroupLike | null>;
  onMapReady?: (map: L.Map) => void;
}) {
  const map = useMap();
  const boundsRef = useRef(fitBounds);
  const padRef = useRef(padding);
  const fitted = useRef(false);

  useEffect(() => {
    boundsRef.current = fitBounds;
    padRef.current = padding;
  });

  useEffect(() => {
    onMapReady?.(map);
  }, [map, onMapReady]);

  const fit = useCallback(
    (animate: boolean) => {
      const p = padRef.current;
      map.fitBounds(boundsRef.current, {
        paddingTopLeft: [p.left, p.top],
        paddingBottomRight: [p.right, p.bottom],
        maxZoom: 12,
        animate,
        duration: 0.6,
      });
    },
    [map],
  );

  // správné rozměry při změně velikosti (otevření/zavření pravého panelu, resize okna)
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      if (!fitted.current && map.getSize().x > 0) {
        fitted.current = true;
        fit(false);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map, fit]);

  // výřez: okruh kolem adresy / celá ČR
  useEffect(() => {
    if (!fitted.current) return;
    const t = setTimeout(() => fit(true), 250);
    return () => clearTimeout(t);
  }, [fitKey, fit]);

  // přelet na vybranou adresu
  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.9 });
  }, [map, focus]);

  // vybraný prodejce → zviditelnit jeho špendlík (rozbalit cluster) a vycentrovat
  useEffect(() => {
    if (!selectedId) return;
    const t = setTimeout(() => {
      const marker = markers.current.get(selectedId);
      if (!marker) return;
      const cluster = clusterRef.current;
      const center = () => map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 11), { duration: 0.7 });
      if (cluster?.hasLayer(marker)) cluster.zoomToShowLayer(marker, center);
      else center();
    }, 120); // počkat, až se mapa přizpůsobí šířce panelu
    return () => clearTimeout(t);
  }, [map, selectedId, markers, clusterRef]);

  return null;
}

/* ------------------------------------------------------------------ */
/* Hlavní komponenta                                                   */
/* ------------------------------------------------------------------ */

/**
 * Obal, který zaručí čistou instanci Leafletu po každém skrytí/zobrazení.
 *
 * Next.js 16 (Cache Components) drží opuštěné stránky skryté v React `<Activity>` a při návratu
 * znovu spouští efekty; totéž dělá StrictMode a Fast Refresh. `MapContainer` z react-leaflet ale
 * v úklidu efektu mapu zničí (`map.remove()`) a při novém zobrazení ji už nevytvoří – vrstvy pak
 * zapisují do mrtvé mapy („Map container is being reused…“, „reading '_targets'“, „appendChild“).
 * Proto při každém úklidu zvedneme „generaci“ → při dalším zobrazení se mapa vytvoří znovu
 * na novém DOM prvku (výřez se obnoví přes `fitBounds`/`focus`).
 */
export default function SellerMap(props: SellerMapProps) {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => () => setGeneration((g) => g + 1), []);
  return <SellerMapInner key={generation} {...props} />;
}

function SellerMapInner({
  matches,
  location,
  showLocation,
  radiusKm,
  radiusActive,
  priceMode,
  hoveredId,
  selectedId,
  focus,
  onHover,
  onSelect,
  regionStats,
  regionMetric,
  showRegions,
  fitPadding = DEFAULT_PADDING,
  onMapReady,
  className,
}: SellerMapProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const markers = useRef(new Map<string, L.Marker>());
  const clusterRef = useRef<ClusterGroupLike | null>(null);

  const register = useCallback((id: string, m: L.Marker | null) => {
    if (m) markers.current.set(id, m);
    else markers.current.delete(id);
  }, []);

  // cílový výřez: okruh kolem adresy, jinak celá ČR
  const fitBounds = useMemo(
    () =>
      radiusActive
        ? L.latLng(location.lat, location.lng).toBounds((2 * radiusKm * 1000) / ROAD_FACTOR)
        : L.latLngBounds(CZ_BOUNDS),
    [radiusActive, radiusKm, location.lat, location.lng],
  );
  const fitKey = fitBounds.toBBoxString();

  // přepočítat ikony clusterů po změně výsledků nebo režimu ceny (Kč/jednotka ↔ Kč/kWh)
  useEffect(() => {
    const t = setTimeout(() => clusterRef.current?.refreshClusters(), 0);
    return () => clearTimeout(t);
  }, [matches, priceMode]);

  return (
    <div className={cn("relative isolate size-full overflow-hidden bg-muted", className)}>
      <MapContainer
        center={[CZ_CENTER.lat, CZ_CENTER.lng]}
        zoom={7}
        zoomSnap={0.25}
        zoomDelta={0.5}
        minZoom={6}
        maxZoom={17}
        zoomControl={false}
        scrollWheelZoom
        className="size-full"
        style={{ background: "transparent" }}
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} className="podpalto-tiles" maxZoom={19} />
        <MapEffects
          fitBounds={fitBounds}
          fitKey={fitKey}
          padding={fitPadding}
          focus={focus}
          selectedId={selectedId}
          markers={markers}
          clusterRef={clusterRef}
          onMapReady={onMapReady}
        />

        {showRegions && regionStats.length > 0 && <RegionLayer stats={regionStats} metric={regionMetric} dark={dark} />}

        {radiusActive && (
          <Circle
            center={[location.lat, location.lng]}
            radius={(radiusKm * 1000) / ROAD_FACTOR}
            interactive={false}
            pathOptions={{
              color: "#6f8f69",
              weight: 2,
              dashArray: "6 8",
              fillColor: "#6f8f69",
              fillOpacity: 0.08,
            }}
          />
        )}

        {showLocation && (
          <Marker
            position={[location.lat, location.lng]}
            icon={userLocationIcon()}
            interactive={false}
            keyboard={false}
            zIndexOffset={-500}
          />
        )}

        <MarkerClusterGroup
          ref={clusterRef}
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          // cenovky jsou ~120 px široké → menší poloměr by nechal špendlíky překrývat
          maxClusterRadius={(zoom: number) => (zoom >= 14 ? 60 : 140)}
          iconCreateFunction={(c: ClusterLike) =>
            clusterIcon(c.getChildCount(), clusterFromLabel(c.getAllChildMarkers().map((m) => pinMeta.get(m))))
          }
        >
          {matches.map((m) => (
            <SellerMarker
              key={m.seller.id}
              match={m}
              mode={priceMode}
              active={hoveredId === m.seller.id || selectedId === m.seller.id}
              onHover={onHover}
              onSelect={onSelect}
              register={register}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
