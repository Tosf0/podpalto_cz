/** Barevná škála cenového indexu krajů (bez závislosti na Leafletu – použitelná i při SSR). */

/** Mech → dub → hlína podle t ∈ [0, 1] (tlumené lesní tóny). */
const STOPS: [number, number, number][] = [
  [111, 143, 105], // mech #6f8f69
  [201, 169, 126], // dub #c9a97e
  [181, 101, 79], // hlína #b5654f
];

export function priceScale(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

/** Stejná škála jako `priceScale`, ale jako čísla [r, g, b] (pro pixelové vykreslení heat mapy). */
export function priceScaleRgb(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as [number, number, number];
}
