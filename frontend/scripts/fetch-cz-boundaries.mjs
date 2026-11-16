/**
 * Stáhne hranice 14 krajů ČR z OpenStreetMap (Overpass API) a vygeneruje
 * src/data/geo/cz-regions.ts + src/data/geo/czechia.ts.
 *
 * Proč OSM: podkladová mapa je OpenStreetMap, takže hranice heat mapy a čárkované hranice krajů
 * leží přesně na liniích podkladu (OSM hranice v ČR pocházejí z RÚIAN).
 *
 * Postup: Overpass → osmtogeojson → TopoJSON (sdílené hrany mezi kraji) → zjednodušení
 * (zachová topologii – bez mezer a překryvů) → polygony krajů, vnitřní hranice (každá jen jednou),
 * obrys státu (sjednocení krajů) a pozice popisků (polylabel – bod nejdál od hranic).
 *
 * Spuštění: `node scripts/fetch-cz-boundaries.mjs` (stažená data se cachují v .cache/).
 * Data © přispěvatelé OpenStreetMap, licence ODbL.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import osmtogeojson from "osmtogeojson";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";
import { feature, merge, mesh } from "topojson-client";
import polylabel from "polylabel";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cacheFile = resolve(root, ".cache/cz-kraje-osm.json");
/**
 * Podíl bodů zachovaných po zjednodušení:
 * - KEEP_LINES pro státní hranici a hranice krajů (čáry + ořez výplně → musí sedět na podklad),
 * - KEEP_FILL pro polygony krajů, ze kterých se počítá barva uvnitř (rozmazává se, stačí hrubší).
 */
const KEEP_LINES = Number(process.env.KEEP_LINES ?? 0.25);
const KEEP_FILL = Number(process.env.KEEP_FILL ?? 0.03);

const ISO_TO_REGION = {
  "CZ-10": "PHA",
  "CZ-20": "STC",
  "CZ-31": "JHC",
  "CZ-32": "PLK",
  "CZ-41": "KVK",
  "CZ-42": "ULK",
  "CZ-51": "LBK",
  "CZ-52": "HKK",
  "CZ-53": "PAK",
  "CZ-63": "VYS",
  "CZ-64": "JHM",
  "CZ-71": "OLK",
  "CZ-72": "ZLK",
  "CZ-80": "MSK",
};

/** Kraje jsou v OSM ČR na admin_level=4 (ISO3166-2 = CZ-10 … CZ-80). */
const QUERY = `[out:json][timeout:300];
(relation["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"~"^CZ-[0-9]{2}$"];);
out body;
>;
out skel qt;`;

async function loadOsm() {
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, "utf8"));
  console.log("Stahuji hranice krajů z Overpass API…");
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "podpalto-frontend-boundary-script/1.0" },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} ${res.statusText}`);
  const json = await res.json();
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(json));
  return json;
}

const round = (n) => Math.round(n * 1e5) / 1e5;

const osm = await loadOsm();
const gj = osmtogeojson(osm);
const regions = gj.features.filter(
  (f) => f.id?.startsWith("relation/") && ISO_TO_REGION[f.properties?.tags?.["ISO3166-2"] ?? f.properties?.["ISO3166-2"]],
);
const codeOf = (f) => ISO_TO_REGION[f.properties.tags?.["ISO3166-2"] ?? f.properties["ISO3166-2"]];
if (regions.length !== 14) throw new Error(`Očekáváno 14 krajů, nalezeno ${regions.length}`);

const fc = {
  type: "FeatureCollection",
  features: regions.map((f) => ({ type: "Feature", properties: { code: codeOf(f) }, geometry: f.geometry })),
};

const base = presimplify(topology({ kraje: fc }, 1e6));
const topoFill = simplify(structuredClone(base), quantile(base, KEEP_FILL));
const topoLines = simplify(structuredClone(base), quantile(base, KEEP_LINES));

/**
 * Kompaktní zápis prstence: celá čísla v 1e-5 stupně (~1 m), delta kódování
 * [x0, y0, dx1, dy1, …]. Dekóduje src/lib/geo-decode.ts.
 */
const encodeRing = (ring) => {
  const out = [];
  let px = 0;
  let py = 0;
  ring.forEach(([lng, lat], i) => {
    const x = Math.round(lng * 1e5);
    const y = Math.round(lat * 1e5);
    if (i === 0) out.push(x, y);
    else out.push(x - px, y - py);
    px = x;
    py = y;
  });
  return out;
};

const kraje = feature(topoFill, topoFill.objects.kraje).features.map((f) => {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const largest = polys.reduce((a, b) => (b[0].length > a[0].length ? b : a));
  const [lx, ly] = polylabel(largest, 0.0005);
  return {
    code: f.properties.code,
    polygons: polys.map((poly) => poly.map(encodeRing)),
    label: [round(lx), round(ly)],
  };
});
kraje.sort((a, b) => a.code.localeCompare(b.code));

const innerLines = mesh(topoLines, topoLines.objects.kraje, (a, b) => a !== b).coordinates;
const country = merge(topoLines, topoLines.objects.kraje.geometries);
const outlineRings = (country.type === "Polygon" ? [country.coordinates] : country.coordinates).map((poly) => poly[0]);

const header = `/**
 * Hranice krajů ČR – © přispěvatelé OpenStreetMap (ODbL), vygenerováno skriptem
 * scripts/fetch-cz-boundaries.mjs (zjednodušeno se zachováním topologie,
 * čáry KEEP_LINES=${KEEP_LINES}, výplň KEEP_FILL=${KEEP_FILL}). Needitovat ručně.
 * Prstence jsou zakódované (celá čísla 1e-5°, delta) – dekódování: src/lib/geo-decode.ts.
 */`;

mkdirSync(resolve(root, "src/data/geo"), { recursive: true });
writeFileSync(
  resolve(root, "src/data/geo/cz-regions.ts"),
  `${header}
import type { RegionCode } from "@/types";

export interface EncodedRegionShape {
  code: RegionCode;
  /** Polygony kraje: [polygon][prstenec] (zakódované) – první prstenec vnější, další díry. */
  polygons: number[][][];
  /** Pozice popisku uvnitř kraje (polylabel) [lng, lat]. */
  label: [number, number];
}

export const REGION_SHAPES: EncodedRegionShape[] = ${JSON.stringify(kraje)};

/** Hranice mezi kraji (zakódované) – každá sdílená hrana právě jednou. */
export const REGION_BORDERS: number[][] = ${JSON.stringify(innerLines.map(encodeRing))};
`,
);
writeFileSync(
  resolve(root, "src/data/geo/czechia.ts"),
  `${header.replace("Hranice krajů ČR", "Státní hranice ČR (sjednocení krajů)")}

/** Vnější prstence státní hranice (zakódované). */
export const CZECHIA_OUTLINE: number[][] = ${JSON.stringify(outlineRings.map(encodeRing))};
`,
);
const points = kraje.reduce((n, k) => n + k.polygons.flat().reduce((m, r) => m + r.length / 2, 0), 0);
const outline = outlineRings;
const inner = innerLines;
console.log(`OK: ${kraje.length} krajů, ${points} bodů v polygonech, ${inner.length} vnitřních hranic, obrys ${outline.map((r) => r.length).join("+")} bodů`);
