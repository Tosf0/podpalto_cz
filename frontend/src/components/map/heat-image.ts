/**
 * Cenová heat mapa ČR.
 *
 * 1. Každý kraj se vyplní svou normalizovanou hodnotou podle hranic z OpenStreetMap
 *    (stejná data jako podkladová mapa) → uvnitř kraje platí jeho hodnota.
 * 2. Pole hodnot se rozmaže (3× box blur ≈ Gauss, `blurKm`) s premultiplikovanou alfou,
 *    takže přechody mezi kraji jsou plynulé a u státní hranice se nemíchají s prázdnem.
 * 3. Obarví se paletou. Výplň záměrně přesahuje kousek za hranici – ořízne ji až vektorová
 *    maska (SVG clipPath) přesně podle státní hranice, takže okraj sedí při každém přiblížení.
 * Pixelová mřížka i SVG viewBox jsou lineární ve Web Mercatoru (projekce mapy).
 */
import { priceScaleRgb } from "./price-scale";

export interface HeatRegion {
  /** Polygony kraje [polygon][prstenec][[lng, lat]]. */
  polygons: [number, number][][][];
  /** Normalizovaná hodnota 0 (levné) … 1 (drahé). */
  t: number;
}

/** Souřadnicový rámec obrázku / SVG (viewBox 0 0 width height). */
export interface HeatFrame {
  west: number;
  east: number;
  south: number;
  north: number;
  width: number;
  height: number;
  /** [[south, west], [north, east]] pro Leaflet overlay. */
  bounds: [[number, number], [number, number]];
}

const DEG = Math.PI / 180;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2));

export function makeFrame(outline: [number, number][][], width = 1400): HeatFrame {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const ring of outline)
    for (const [lng, lat] of ring) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  const pad = 0.05;
  west -= pad;
  east += pad;
  south -= pad;
  north += pad;
  const height = Math.round((width * (mercY(north) - mercY(south))) / ((east - west) * DEG));
  return { west, east, south, north, width, height, bounds: [[south, west], [north, east]] };
}

function projector(f: HeatFrame) {
  const yN = mercY(f.north);
  const yS = mercY(f.south);
  return (lng: number, lat: number): [number, number] => [
    ((lng - f.west) / (f.east - f.west)) * f.width,
    ((yN - mercY(lat)) / (yN - yS)) * f.height,
  ];
}

/** SVG path `d` z prstenců (pro clipPath) ve stejném rámci jako obrázek. */
export function ringsToPath(rings: [number, number][][], frame: HeatFrame): string {
  const toPx = projector(frame);
  return rings
    .map(
      (ring) =>
        ring
          .map(([lng, lat], i) => {
            const [x, y] = toPx(lng, lat);
            return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join("") + "Z",
    )
    .join("");
}

function boxBlur1D(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const norm = 1 / (2 * r + 1);
  for (let l = 0; l < lines; l++) {
    const idx = (i: number) => (horizontal ? l * w + i : i * w + l);
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += src[idx(Math.min(len - 1, Math.max(0, i)))];
    for (let i = 0; i < len; i++) {
      dst[idx(i)] = acc * norm;
      acc += src[idx(Math.min(len - 1, i + r + 1))] - src[idx(Math.max(0, i - r))];
    }
  }
}

function gaussianish(data: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(data.length);
  for (let pass = 0; pass < 3; pass++) {
    boxBlur1D(data, tmp, w, h, r, true);
    boxBlur1D(tmp, data, w, h, r, false);
  }
}

/** Vykreslí heat mapu (bez ořezu) a vrátí data URL obrázku pro `frame`. */
export function renderHeatImage(regions: HeatRegion[], frame: HeatFrame, { blurKm = 12 }: { blurKm?: number } = {}): string | null {
  if (typeof document === "undefined" || regions.length === 0) return null;
  const { width, height } = frame;
  const toPx = projector(frame);

  // 1) kraje vyplněné hodnotou (šedá = t), díry (Praha ve Středočeském) přes even-odd
  const base = document.createElement("canvas");
  base.width = width;
  base.height = height;
  const bctx = base.getContext("2d", { willReadFrequently: true });
  if (!bctx) return null;
  for (const r of regions) {
    const g = Math.round(Math.min(1, Math.max(0, r.t)) * 255);
    bctx.fillStyle = `rgb(${g} ${g} ${g})`;
    bctx.beginPath();
    for (const poly of r.polygons)
      for (const ring of poly) {
        ring.forEach(([lng, lat], i) => {
          const [x, y] = toPx(lng, lat);
          if (i === 0) bctx.moveTo(x, y);
          else bctx.lineTo(x, y);
        });
        bctx.closePath();
      }
    bctx.fill("evenodd");
  }
  const src = bctx.getImageData(0, 0, width, height).data;

  // 2) premultiplikované pole hodnot + alfa → rozmazání
  const n = width * height;
  const val = new Float32Array(n);
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = src[i * 4 + 3] / 255;
    alpha[i] = a;
    val[i] = (src[i * 4] / 255) * a;
  }
  const pxPerKm = width / ((frame.east - frame.west) * 111.32 * Math.cos(49.8 * DEG));
  const r = Math.max(1, Math.round((blurKm * pxPerKm) / 2));
  gaussianish(val, width, height, r);
  gaussianish(alpha, width, height, r);

  // 3) obarvení – plně kryjící všude, kam rozmazání dosáhlo (ořez udělá SVG maska)
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(width, height);
  for (let i = 0; i < n; i++) {
    if (alpha[i] < 0.002) continue;
    const [cr, cg, cb] = priceScaleRgb(val[i] / alpha[i]);
    img.data[i * 4] = cr;
    img.data[i * 4 + 1] = cg;
    img.data[i * 4 + 2] = cb;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out.toDataURL("image/png");
}
