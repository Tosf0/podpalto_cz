"use client";

import { useEffect, useMemo, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import L, { type PathOptions } from "leaflet";
import { GeoJSON, Marker, Polygon, Polyline, SVGOverlay, useMap, useMapEvents } from "react-leaflet";
import type { CommodityKey, RegionCode, RegionStats } from "@/types";
import { COMMODITY_META, REGIONS, REGION_CODES } from "@/lib/constants";
import { formatNumber, NBSP } from "@/lib/format";
import { decodeRing } from "@/lib/geo-decode";
import { makeFrame, renderHeatImage, ringsToPath } from "./heat-image";
import { priceScale } from "./price-scale";

export { priceScale };

/** Hodnota kraje pro barvu: cena zvolené komodity, jinak cenový index. */
function valueOf(s: RegionStats, metric: CommodityKey | null): number {
  return metric ? s.avgPrices[metric] : s.priceIndex;
}

/** Normalizace s minimálním rozpětím (malé rozdíly nemají vypadat dramaticky). */
function normalizer(values: number[], metric: CommodityKey | null): (v: number) => number {
  let min = Math.min(...values);
  let max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const minSpread = metric ? mean * 0.08 : 8;
  if (max - min < minSpread) {
    const padding = (minSpread - (max - min)) / 2;
    min -= padding;
    max += padding;
  }
  return (v) => (v - min) / (max - min);
}

function labelText(s: RegionStats, metric: CommodityKey | null): string {
  if (!metric) return `index ${formatNumber(s.priceIndex)}`;
  return `${formatNumber(s.avgPrices[metric])}${NBSP}${COMMODITY_META[metric].unit}`;
}

/* ------------------------------------------------------------------ */
/* Volitelný choropleth z vlastního GeoJSONu (NEXT_PUBLIC_REGIONS_GEOJSON_URL) */
/* ------------------------------------------------------------------ */

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*kraj\s*/g, " ")
    .trim();

function regionOfFeature(f: Feature<Geometry>): RegionCode | undefined {
  const props = (f.properties ?? {}) as Record<string, unknown>;
  for (const key of ["kod", "code", "KOD", "CODE", "region"]) {
    const v = props[key];
    if (typeof v === "string" && v.toUpperCase() in REGIONS) return v.toUpperCase() as RegionCode;
  }
  for (const key of ["nazev", "name", "NAZEV", "NAME", "NAZ_CZNUTS3"]) {
    const v = props[key];
    if (typeof v !== "string") continue;
    const n = norm(v);
    const hit = REGION_CODES.find((c) => norm(REGIONS[c].name) === n || norm(REGIONS[c].short) === n);
    if (hit) return hit;
  }
  return undefined;
}

const REGIONS_GEOJSON_URL = process.env.NEXT_PUBLIC_REGIONS_GEOJSON_URL ?? "";

/**
 * Teplotní mapa krajů.
 * - Výchozí: heat mapa vyplňující celé území ČR podle přesných hranic krajů z OpenStreetMap
 *   (stejná data jako podklad), s plynulými přechody mezi kraji, čárkovanými hranicemi krajů,
 *   obrysem státu a nenápadnými popisky.
 * - Pokud je nastavené `NEXT_PUBLIC_REGIONS_GEOJSON_URL`, vykreslí se choropleth z vlastního GeoJSONu.
 */
export function RegionLayer({ stats, metric, dark }: { stats: RegionStats[]; metric: CommodityKey | null; dark: boolean }) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!REGIONS_GEOJSON_URL) return;
    const ctrl = new AbortController();
    fetch(REGIONS_GEOJSON_URL, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: FeatureCollection | null) => {
        if (json?.type === "FeatureCollection" && json.features.filter((f) => regionOfFeature(f)).length >= 10) setGeo(json);
      })
      .catch(() => {
        /* GeoJSON není k dispozici → heat mapa */
      });
    return () => ctrl.abort();
  }, []);

  if (geo) {
    const n = normalizer(stats.map((s) => valueOf(s, metric)), metric);
    const byRegion = new Map(stats.map((s) => [s.region, s]));
    return (
      <GeoJSON
        key={`${metric ?? "idx"}-${dark ? "d" : "l"}-${stats.length}`}
        data={geo}
        style={(feature): PathOptions => {
          const code = feature ? regionOfFeature(feature) : undefined;
          const s = code ? byRegion.get(code) : undefined;
          return {
            color: dark ? "#2b302a" : "#ffffff",
            weight: 1.5,
            fillColor: s ? priceScale(n(valueOf(s, metric))) : "#a8a39a",
            fillOpacity: 0.55,
          };
        }}
        onEachFeature={(feature, layer) => {
          const code = regionOfFeature(feature);
          const s = code ? byRegion.get(code) : undefined;
          if (s) layer.bindTooltip(`${REGIONS[s.region].short} · ${labelText(s, metric)}`, { sticky: true });
        }}
      />
    );
  }

  return <HeatLayer stats={stats} metric={metric} dark={dark} />;
}

/* ------------------------------------------------------------------ */
/* Heat mapa ČR                                                        */
/* ------------------------------------------------------------------ */

type GeoData = {
  shapes: { code: RegionCode; polygons: [number, number][][][]; label: [number, number] }[];
  /** Hranice mezi kraji [lng, lat]. */
  borders: [number, number][][];
  /** Státní hranice [lng, lat]. */
  outline: [number, number][][];
};

/** Hranice se načítají (a dekódují) až při zapnutí vrstvy, ne s úvodní stránkou. */
function useGeoData(): GeoData | null {
  const [data, setData] = useState<GeoData | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([import("@/data/geo/cz-regions"), import("@/data/geo/czechia")]).then(([r, c]) => {
      if (cancelled) return;
      setData({
        shapes: r.REGION_SHAPES.map((s) => ({
          code: s.code,
          polygons: s.polygons.map((poly) => poly.map(decodeRing)),
          label: s.label,
        })),
        borders: r.REGION_BORDERS.map(decodeRing),
        outline: c.CZECHIA_OUTLINE.map(decodeRing),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return data;
}

/** Popisky krajů ukazujeme jen při přehledovém zoomu – při přiblížení mají přednost prodejny. */
const LABEL_MAX_ZOOM = 9.5;

function labelIcon(name: string, value: string): L.DivIcon {
  return L.divIcon({
    className: "region-label",
    iconSize: [0, 0],
    html:
      `<span class="region-label__pill">` +
      `<span class="region-label__name">${name}</span>` +
      `<span class="region-label__value num">${value}</span>` +
      `</span>`,
  });
}

const toLatLng = (ring: [number, number][]) => ring.map(([lng, lat]) => [lat, lng] as [number, number]);

function HeatLayer({ stats, metric, dark }: { stats: RegionStats[]; metric: CommodityKey | null; dark: boolean }) {
  const geo = useGeoData();
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const frame = useMemo(() => (geo ? makeFrame(geo.outline) : null), [geo]);
  const clipPath = useMemo(() => (geo && frame ? ringsToPath(geo.outline, frame) : ""), [geo, frame]);
  const heatUrl = useMemo(() => {
    if (!geo || !frame || stats.length === 0) return null;
    const byRegion = new Map(stats.map((s) => [s.region, s]));
    const n = normalizer(stats.map((s) => valueOf(s, metric)), metric);
    return renderHeatImage(
      geo.shapes.flatMap((shape) => {
        const s = byRegion.get(shape.code);
        return s ? [{ polygons: shape.polygons, t: n(valueOf(s, metric)) }] : [];
      }),
      frame,
    );
  }, [geo, frame, stats, metric]);

  const outline = useMemo(() => (geo ? geo.outline.map(toLatLng) : []), [geo]);
  const borders = useMemo(() => (geo ? geo.borders.map(toLatLng) : []), [geo]);

  if (!geo || !frame || !heatUrl) return null;
  const line = dark ? "#e6e0d4" : "#2f4535";
  const byRegion = new Map(stats.map((s) => [s.region, s]));

  return (
    <>
      {/* výplň oříznutá vektorovou maskou přesně podle státní hranice (ostrá při každém zoomu) */}
      <SVGOverlay
        bounds={frame.bounds}
        attributes={{ viewBox: `0 0 ${frame.width} ${frame.height}`, preserveAspectRatio: "none" }}
        interactive={false}
      >
        <defs>
          <clipPath id="cz-heat-clip">
            <path d={clipPath} />
          </clipPath>
        </defs>
        <image
          href={heatUrl}
          x={0}
          y={0}
          width={frame.width}
          height={frame.height}
          preserveAspectRatio="none"
          clipPath="url(#cz-heat-clip)"
          opacity={dark ? 0.5 : 0.62}
        />
      </SVGOverlay>
      {/* hranice krajů – čárkovaně, každá sdílená hrana jen jednou */}
      <Polyline
        positions={borders}
        interactive={false}
        pathOptions={{ color: line, weight: 1.3, opacity: 0.65, dashArray: "5 6", lineCap: "round" }}
      />
      {/* státní hranice */}
      <Polygon positions={outline} interactive={false} pathOptions={{ color: line, weight: 1.8, opacity: 0.8, fill: false }} />
      {zoom <= LABEL_MAX_ZOOM &&
        geo.shapes.map((shape) => {
          const s = byRegion.get(shape.code);
          if (!s) return null;
          return (
            <Marker
              key={`${shape.code}-${metric ?? "idx"}`}
              position={[shape.label[1], shape.label[0]]}
              icon={labelIcon(REGIONS[shape.code].short, labelText(s, metric))}
              interactive={false}
              keyboard={false}
              zIndexOffset={-1000}
            />
          );
        })}
    </>
  );
}
