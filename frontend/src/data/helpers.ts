/**
 * Pomocníci pro generování mock dat (deterministicky – stejný výstup na serveru i v klientu).
 */
import type { PricePoint } from "@/types";

/** Posledních 12 měsíců končících aktuálním měsícem dat (listopad 2026). */
export const HISTORY_MONTHS = [
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
] as const;

/**
 * Sezónní koeficienty ceny pro HISTORY_MONTHS (topná sezóna dražší, jaro/léto levnější).
 * Dřevo a pelety mají výraznější sezónnost než uhlí.
 */
const SEASONALITY: Record<"wood" | "pellets" | "briquettes" | "coal", number[]> = {
  //       pro   led   úno   bře   dub   kvě   čvn   čvc   srp   zář   říj   lis
  wood: [1.02, 1.03, 1.01, 0.97, 0.93, 0.92, 0.92, 0.93, 0.95, 0.98, 1.0, 1.0],
  pellets: [1.04, 1.05, 1.02, 0.96, 0.91, 0.9, 0.9, 0.92, 0.95, 0.98, 1.0, 1.0],
  briquettes: [1.03, 1.04, 1.01, 0.97, 0.93, 0.92, 0.92, 0.93, 0.96, 0.98, 1.0, 1.0],
  coal: [1.01, 1.02, 1.01, 0.99, 0.97, 0.97, 0.97, 0.98, 0.98, 0.99, 1.0, 1.0],
};

/** Jednoduchý deterministický PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash řetězce na seed. */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Vygeneruje 12měsíční historii ceny končící `currentPrice` (listopad 2026).
 * @param productId ID produktu – seed pro šum (±1,5 %)
 * @param round zaokrouhlení (např. 10 Kč u PRMS, 50 Kč u tun, 1 Kč u pytlů)
 */
export function priceHistory(
  productId: string,
  currentPrice: number,
  category: "wood" | "pellets" | "briquettes" | "coal",
  round = 10,
): PricePoint[] {
  const rand = rng(seedOf(productId));
  const season = SEASONALITY[category];
  return HISTORY_MONTHS.map((date, i) => {
    const isLast = i === HISTORY_MONTHS.length - 1;
    const noise = isLast ? 1 : 1 + (rand() - 0.5) * 0.03;
    const raw = (currentPrice * season[i] * noise) / season[season.length - 1];
    return { date, price: isLast ? currentPrice : Math.round(raw / round) * round };
  });
}

/** ISO datum N dní před 16. 11. 2026 (referenční „dnes“ mock dat). */
export function daysAgo(n: number): string {
  const ref = Date.UTC(2026, 10, 16, 9, 0, 0);
  return new Date(ref - n * 86400_000).toISOString();
}
