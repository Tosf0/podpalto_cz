/**
 * Filtrovací a řadicí engine úvodní stránky (mapa cen + vyhledávač).
 * Čistě funkční – žádné závislosti na Reactu ani na Leafletu.
 */
import type {
  BriquetteType,
  CoalType,
  FuelCategory,
  FuelProduct,
  GeoPoint,
  LogLengthCm,
  Moisture,
  PelletCertification,
  PriceMode,
  RegionCode,
  RegionStats,
  Seller,
  WoodForm,
  WoodGroup,
} from "@/types";
import { RADIUS_DEFAULT_KM, REGIONS } from "@/lib/constants";
import { formatCzk } from "@/lib/format";
import {
  offerTotal,
  priceTier,
  pricePerBaseUnit,
  pricePerKwh,
  productWoodGroup,
  regionalAverageFor,
  roadDistanceKm,
  unitsForBaseQuantity,
  type DeliveryEstimate,
  type PriceTier,
} from "@/lib/pricing";

/* ------------------------------------------------------------------ */
/* Typy                                                                */
/* ------------------------------------------------------------------ */

export type SortKey = "total" | "unit" | "kwh" | "distance" | "rating";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "total", label: "Nejlevnější vč. dopravy" },
  { value: "unit", label: "Nejlevnější za jednotku" },
  { value: "kwh", label: "Nejlevnější za 1 kWh" },
  { value: "distance", label: "Nejblíže" },
  { value: "rating", label: "Nejlépe hodnocené" },
];

export interface FilterState {
  /** Hledání podle názvu prodejce, města nebo PSČ. */
  query: string;
  category: FuelCategory | "all";
  radiusKm: number;
  /** „Celá ČR“ – vypne omezení okruhem. */
  nationwide: boolean;
  sort: SortKey;
  // dřevo
  woodGroup: WoodGroup | null;
  woodForm: WoodForm | null;
  moisture: Moisture | null;
  logLengthCm: LogLengthCm | null;
  // pelety / brikety / uhlí
  certification: PelletCertification | null;
  briquetteType: BriquetteType | null;
  coalType: CoalType | null;
}

export const DEFAULT_FILTERS: FilterState = {
  query: "",
  category: "all",
  radiusKm: RADIUS_DEFAULT_KM,
  // mapa ve výchozím stavu ukazuje celou ČR; okruh se zapíná ručně („Jen v okolí“)
  nationwide: true,
  sort: "total",
  woodGroup: null,
  woodForm: null,
  moisture: null,
  logLengthCm: null,
  certification: null,
  briquetteType: null,
  coalType: null,
};

export const PELLET_CERTIFICATIONS: PelletCertification[] = ["ENplus A1", "ENplus A2"];
export const BRIQUETTE_TYPES: BriquetteType[] = ["RUF", "PINI KAY", "válcové", "hnědouhelné"];
export const COAL_TYPES: CoalType[] = [
  "hnědé ořech 1",
  "hnědé ořech 2",
  "hnědé kostka",
  "černé ořech",
  "černé kostka",
  "koks",
];

/** Klíče podrobných (produktových) filtrů – resetují se při změně kategorie. */
export const SUB_FILTER_KEYS = [
  "woodGroup",
  "woodForm",
  "moisture",
  "logLengthCm",
  "certification",
  "briquetteType",
  "coalType",
] as const satisfies readonly (keyof FilterState)[];

/** Počet aktivních filtrů (bez řazení). */
export function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.query.trim()) n++;
  if (f.category !== "all") n++;
  if (!f.nationwide) n++;
  for (const k of SUB_FILTER_KEYS) if (f[k] !== null) n++;
  return n;
}

/** Počet aktivních podrobných filtrů (pro odznak u „Další filtry“). */
export function countSubFilters(f: FilterState): number {
  return SUB_FILTER_KEYS.filter((k) => f[k] !== null).length;
}

/** Reset filtrů při zachování řazení. */
export function resetFilters(f: FilterState): FilterState {
  return { ...DEFAULT_FILTERS, sort: f.sort };
}

export interface ReferenceQuantity {
  /** Množství v základní jednotce (PRMS / t). */
  baseQty: number;
  /** Popisek pro UI, např. „5 PRMS“. */
  label: string;
}

/** Referenční množství pro porovnání celkových cen: 5 PRMS dřeva, 1 t ostatních paliv. */
export function referenceFor(category: FuelCategory): ReferenceQuantity {
  return category === "wood" ? { baseQty: 5, label: "5 PRMS" } : { baseQty: 1, label: "1 t" };
}

export interface SellerMatch {
  seller: Seller;
  /** Nejlepší vyhovující produkt prodejce. */
  product: FuelProduct;
  distanceKm: number;
  delivery: DeliveryEstimate;
  /** Cena produktu × referenční množství + doprava. */
  totalForReference: number;
  /** Celkem vč. dopravy za 1 kWh. */
  totalPerKwh: number;
  /** Kč/kWh bez dopravy. */
  pricePerKwh: number;
  tier: PriceTier;
  reference: ReferenceQuantity;
}

/* ------------------------------------------------------------------ */
/* Pomocné funkce                                                      */
/* ------------------------------------------------------------------ */

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Vlhkost produktu – z pole `moisture`, jinak odvozená z deklarovaných %. */
export function productMoisture(p: FuelProduct): Moisture | undefined {
  if (p.moisture) return p.moisture;
  if (p.moisturePercent === undefined) return undefined;
  if (p.moisturePercent < 20) return "dry";
  return p.moisturePercent <= 35 ? "semi" : "fresh";
}

/** Splňuje produkt kategorii a všechny podrobné filtry? */
export function productMatches(p: FuelProduct, f: FilterState): boolean {
  if (f.category !== "all" && p.category !== f.category) return false;
  if (f.category === "wood") {
    if (f.woodGroup && productWoodGroup(p) !== f.woodGroup) return false;
    if (f.woodForm && p.woodForm !== f.woodForm) return false;
    if (f.moisture && productMoisture(p) !== f.moisture) return false;
    if (f.logLengthCm && p.logLengthCm !== f.logLengthCm) return false;
  }
  if (f.category === "pellets" && f.certification && p.certification !== f.certification) return false;
  if (f.category === "briquettes" && f.briquetteType && p.briquetteType !== f.briquetteType) return false;
  if (f.category === "coal" && f.coalType && p.coalType !== f.coalType) return false;
  return true;
}

/** Textové hledání: název prodejce, město, ulice, okres, kraj nebo PSČ. */
export function sellerMatchesQuery(seller: Seller, query: string): boolean {
  const tokens = strip(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const a = seller.address;
  const haystack = strip(
    [
      seller.name,
      seller.legalName ?? "",
      a.city,
      a.street,
      a.district ?? "",
      REGIONS[a.region].name,
      a.zip,
      a.zip.replace(/\s/g, ""),
    ].join(" "),
  );
  return tokens.every((t) => haystack.includes(t));
}

/** Je zadaný text PSČ (3–5 číslic, mezera povolena)? */
export function looksLikeZip(query: string): boolean {
  return /^\d{3}\s?\d{0,2}$/.test(query.trim());
}

/** Který produkt je „nejlepší“? Dle Kč/kWh, nebo za základní jednotku (u „Vše“ relativně k průměru kraje). */
function productScore(
  p: FuelProduct,
  byKwh: boolean,
  mixed: boolean,
  stats: RegionStats | undefined,
): number {
  if (byKwh) return pricePerKwh(p);
  if (mixed) {
    const avg = regionalAverageFor(p, stats);
    return avg ? pricePerBaseUnit(p) / avg : pricePerKwh(p);
  }
  return pricePerBaseUnit(p);
}

/* ------------------------------------------------------------------ */
/* Hlavní engine                                                       */
/* ------------------------------------------------------------------ */

export interface ComputeArgs {
  sellers: Seller[];
  filters: FilterState;
  location: GeoPoint;
  regionStats: RegionStats[];
  priceMode: PriceMode;
}

export function computeMatches({ sellers, filters, location, regionStats, priceMode }: ComputeArgs): SellerMatch[] {
  const statsByRegion = new Map<RegionCode, RegionStats>(regionStats.map((r) => [r.region, r]));
  const hasQuery = filters.query.trim().length > 0;
  const mixed = filters.category === "all";
  const byKwh = filters.sort === "kwh" || priceMode === "kwh";
  const out: SellerMatch[] = [];

  for (const seller of sellers) {
    if (hasQuery && !sellerMatchesQuery(seller, filters.query)) continue;

    const distanceKm = roadDistanceKm(seller.location, location);
    // Při textovém hledání se okruh neuplatňuje – hledáte-li konkrétního prodejce, chcete ho najít.
    if (!hasQuery && !filters.nationwide && distanceKm > filters.radiusKm) continue;

    const candidates = seller.products.filter((p) => productMatches(p, filters));
    if (candidates.length === 0) continue;

    const stats = statsByRegion.get(seller.address.region);
    const inStock = candidates.filter((p) => p.stock !== "out_of_stock");
    const pool = inStock.length ? inStock : candidates;
    const product = pool.reduce((best, p) =>
      productScore(p, byKwh, mixed, stats) < productScore(best, byKwh, mixed, stats) ? p : best,
    );

    const reference = referenceFor(product.category);
    const offer = offerTotal(seller, product, unitsForBaseQuantity(product, reference.baseQty), location);

    out.push({
      seller,
      product,
      distanceKm,
      delivery: offer.delivery,
      totalForReference: offer.total,
      totalPerKwh: offer.totalPerKwh,
      pricePerKwh: pricePerKwh(product),
      tier: priceTier(product, stats),
      reference,
    });
  }

  const relUnit = (m: SellerMatch) =>
    productScore(m.product, false, mixed, statsByRegion.get(m.seller.address.region));
  const cmpTotal = (a: SellerMatch, b: SellerMatch) =>
    mixed ? a.totalPerKwh - b.totalPerKwh : a.totalForReference - b.totalForReference;

  out.sort((a, b) => {
    let d = 0;
    switch (filters.sort) {
      case "total":
        d = cmpTotal(a, b);
        break;
      case "unit":
        d = relUnit(a) - relUnit(b);
        break;
      case "kwh":
        d = a.pricePerKwh - b.pricePerKwh;
        break;
      case "distance":
        d = a.distanceKm - b.distanceKm;
        break;
      case "rating":
        d = b.seller.rating - a.seller.rating || b.seller.reviewCount - a.seller.reviewCount;
        break;
    }
    return d || cmpTotal(a, b);
  });

  return out;
}

/** ID prodejce s nejnižší celkovou cenou (vč. dopravy) – „Nejlepší cena v okolí“. Vyžaduje ≥ 2 výsledky. */
export function findBestValueId(matches: SellerMatch[], mixed: boolean): string | null {
  if (matches.length < 2) return null;
  let best = matches[0];
  for (const m of matches) {
    const better = mixed ? m.totalPerKwh < best.totalPerKwh : m.totalForReference < best.totalForReference;
    if (better) best = m;
  }
  return best.seller.id;
}

/** Textový popis dopravy pro kartu / popup. */
export function deliveryLabel(delivery: DeliveryEstimate, seller: Seller): string {
  if (delivery.outOfRange) {
    return seller.delivery.pickupAvailable ? "Jen osobní odběr" : "Mimo dojezd dopravy";
  }
  if (delivery.free) return "Doprava zdarma";
  return `Doprava ~ ${formatCzk(delivery.fee)}`;
}

/** Až `limit` hlavních produktů prodejce pro popup: nejdřív vybraný, pak nejlevnější z ostatních kategorií. */
export function popupProducts(seller: Seller, primary: FuelProduct, limit = 3): FuelProduct[] {
  const result: FuelProduct[] = [primary];
  const seen = new Set<string>([primary.id]);
  const byCategory = new Map<FuelCategory, FuelProduct>();
  for (const p of seller.products) {
    if (p.stock === "out_of_stock" || p.category === primary.category) continue;
    const cur = byCategory.get(p.category);
    if (!cur || pricePerBaseUnit(p) < pricePerBaseUnit(cur)) byCategory.set(p.category, p);
  }
  for (const p of byCategory.values()) {
    if (result.length >= limit) break;
    result.push(p);
    seen.add(p.id);
  }
  const rest = seller.products
    .filter((p) => !seen.has(p.id) && p.stock !== "out_of_stock")
    .sort((a, b) => pricePerBaseUnit(a) - pricePerBaseUnit(b));
  for (const p of rest) {
    if (result.length >= limit) break;
    result.push(p);
  }
  return result;
}
