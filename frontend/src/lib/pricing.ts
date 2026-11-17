/**
 * Cenový a energetický engine: přepočet jednotek, Kč/kWh, odhad dopravy a celkové ceny.
 * Čistě funkční – použitelné v klientu i na serveru.
 */
import type {
  FuelCategory,
  FuelProduct,
  GeoPoint,
  Moisture,
  RegionStats,
  Seller,
  WoodGroup,
} from "@/types";
import { t } from "@/lib/i18n/translate";
import {
  BOILER_EFFICIENCY,
  KWH_PER_KG,
  MOISTURE_ENERGY_FACTOR,
  PRICE_TIER_THRESHOLD,
  WOOD_KWH_PER_PLM,
  WOOD_SOLID_FACTOR,
  WOOD_SPECIES,
} from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Geo                                                                 */
/* ------------------------------------------------------------------ */

/** Vzdušná vzdálenost v km (haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Odhad silniční vzdálenosti (vzdušná × 1,25). */
export function roadDistanceKm(a: GeoPoint, b: GeoPoint): number {
  return haversineKm(a, b) * 1.25;
}

/* ------------------------------------------------------------------ */
/* Dřevo – převody objemu                                              */
/* ------------------------------------------------------------------ */

export type WoodVolumeUnit = "PRMS" | "PRM" | "PLM";

/** Převod mezi PRMS / PRM / PLM přes plný objem dřevní hmoty. */
export function convertWoodVolume(value: number, from: WoodVolumeUnit, to: WoodVolumeUnit): number {
  return (value * WOOD_SOLID_FACTOR[from]) / WOOD_SOLID_FACTOR[to];
}

/** Energie (kWh) v 1 jednotce dřeva podle skupiny dřevin a vlhkosti. */
export function woodKwhPerUnit(unit: WoodVolumeUnit, group: WoodGroup, moisture: Moisture): number {
  return WOOD_SOLID_FACTOR[unit] * WOOD_KWH_PER_PLM[group] * MOISTURE_ENERGY_FACTOR[moisture];
}

export function productWoodGroup(p: FuelProduct): WoodGroup {
  if (p.woodGroup) return p.woodGroup;
  const first = p.woodSpecies?.[0];
  return first ? WOOD_SPECIES[first].group : "hard";
}

/* ------------------------------------------------------------------ */
/* Energie a normalizovaná cena                                        */
/* ------------------------------------------------------------------ */

function kwhPerKg(p: FuelProduct): number {
  if (p.declaredMjPerKg) return p.declaredMjPerKg / 3.6;
  switch (p.category) {
    case "pellets":
      return KWH_PER_KG.pellets;
    case "briquettes":
      return p.briquetteType === "hnědouhelné" ? KWH_PER_KG.briquettesCoal : KWH_PER_KG.briquettesWood;
    case "coal":
      if (p.coalType === "koks") return KWH_PER_KG.coke;
      return p.coalType?.startsWith("černé") ? KWH_PER_KG.coalBlack : KWH_PER_KG.coalBrown;
    default:
      return 4.0;
  }
}

/** Množství produktu v základní jednotce (PRMS u dřeva, t u ostatních) na 1 prodejní jednotku. */
export function baseUnitsPerUnit(p: FuelProduct): number {
  if (p.category === "wood") {
    switch (p.unit) {
      case "PRMS":
        return 1;
      case "PRM":
        return convertWoodVolume(1, "PRM", "PRMS");
      case "PLM":
        return convertWoodVolume(1, "PLM", "PRMS");
      case "paleta":
        return convertWoodVolume(p.packagePrm ?? 1.5, "PRM", "PRMS");
      default:
        return 1;
    }
  }
  if (p.unit === "t") return 1;
  return (p.packageKg ?? 1000) / 1000;
}

/** Energie v 1 prodejní jednotce produktu (kWh). */
export function energyKwhPerUnit(p: FuelProduct): number {
  if (p.category === "wood") {
    const prms = baseUnitsPerUnit(p);
    return prms * woodKwhPerUnit("PRMS", productWoodGroup(p), p.moisture ?? "dry");
  }
  return baseUnitsPerUnit(p) * 1000 * kwhPerKg(p);
}

/** Cena za základní jednotku (Kč/PRMS u dřeva, Kč/t u ostatních). */
export function pricePerBaseUnit(p: FuelProduct): number {
  return p.price / baseUnitsPerUnit(p);
}

/** Základní jednotka kategorie. */
export function baseUnitLabel(category: FuelCategory): "PRMS" | "t" {
  return category === "wood" ? "PRMS" : "t";
}

/** Kč za 1 kWh energie v palivu. */
export function pricePerKwh(p: FuelProduct): number {
  return p.price / energyKwhPerUnit(p);
}

/** Kč za 1 kWh dodaného tepla (po účinnosti kotle). */
export function pricePerKwhHeat(p: FuelProduct): number {
  return pricePerKwh(p) / BOILER_EFFICIENCY[p.category];
}

/* ------------------------------------------------------------------ */
/* Doprava a celková cena                                              */
/* ------------------------------------------------------------------ */

export interface DeliveryEstimate {
  /** Cena dopravy v Kč (0 = zdarma). */
  fee: number;
  free: boolean;
  /** Mimo dojezd prodejce – nutný osobní odběr. */
  outOfRange: boolean;
  distanceKm: number;
}

/**
 * Odhad ceny dopravy.
 * @param quantity množství v prodejní jednotce produktu (pro `freeOverQuantity`)
 * @param withHydraulicArm připočíst složení hydraulickou rukou
 */
export function estimateDelivery(
  seller: Seller,
  from: GeoPoint,
  quantity = 1,
  withHydraulicArm = false,
): DeliveryEstimate {
  const d = seller.delivery;
  const distanceKm = roadDistanceKm(seller.location, from);
  if (!d.ownDelivery || distanceKm > d.maxRadiusKm) {
    return { fee: 0, free: false, outOfRange: true, distanceKm };
  }
  const armFee = withHydraulicArm && d.hydraulicArm ? (d.hydraulicArmFee ?? 0) : 0;
  const freeByQty = d.freeOverQuantity != null && quantity >= d.freeOverQuantity;
  if (distanceKm <= d.freeRadiusKm || freeByQty) {
    return { fee: armFee, free: armFee === 0, outOfRange: false, distanceKm };
  }
  const billableKm = Math.max(0, distanceKm - d.freeRadiusKm);
  const fee = Math.round(d.baseFee + billableKm * d.pricePerKm + armFee);
  return { fee, free: false, outOfRange: false, distanceKm };
}

export interface OfferTotal {
  product: FuelProduct;
  quantity: number;
  goods: number;
  delivery: DeliveryEstimate;
  total: number;
  /** Celkem / základní jednotka vč. dopravy. */
  totalPerBaseUnit: number;
  /** Celkem / kWh vč. dopravy. */
  totalPerKwh: number;
}

/** Celková cena objednávky `quantity` (v prodejní jednotce) vč. dopravy. */
export function offerTotal(
  seller: Seller,
  product: FuelProduct,
  quantity: number,
  from: GeoPoint,
  withHydraulicArm = false,
): OfferTotal {
  const goods = product.price * quantity;
  const delivery = estimateDelivery(seller, from, quantity, withHydraulicArm);
  const total = goods + delivery.fee;
  return {
    product,
    quantity,
    goods,
    delivery,
    total,
    totalPerBaseUnit: total / (quantity * baseUnitsPerUnit(product)),
    totalPerKwh: total / (quantity * energyKwhPerUnit(product)),
  };
}

/** Kolik prodejních jednotek produktu odpovídá požadovanému množství v základní jednotce. */
export function unitsForBaseQuantity(p: FuelProduct, baseQuantity: number): number {
  return baseQuantity / baseUnitsPerUnit(p);
}

/* ------------------------------------------------------------------ */
/* Cenové hladiny                                                      */
/* ------------------------------------------------------------------ */

export type PriceTier = "below" | "average" | "above";

/** Průměrná cena kraje v základní jednotce pro daný produkt. */
export function regionalAverageFor(p: FuelProduct, stats: RegionStats | undefined): number | undefined {
  if (!stats) return undefined;
  switch (p.category) {
    case "wood":
      return productWoodGroup(p) === "soft" ? stats.avgPrices.softWoodPrms : stats.avgPrices.hardWoodPrms;
    case "pellets":
      return stats.avgPrices.pelletsT;
    case "briquettes":
      return stats.avgPrices.briquettesT;
    case "coal":
      return stats.avgPrices.coalT;
  }
}

/** Cenová hladina produktu vůči průměru kraje (zelená / oranžová / červená). */
export function priceTier(p: FuelProduct, stats: RegionStats | undefined): PriceTier {
  const avg = regionalAverageFor(p, stats);
  if (!avg) return "average";
  const ratio = pricePerBaseUnit(p) / avg - 1;
  if (ratio < -PRICE_TIER_THRESHOLD) return "below";
  if (ratio > PRICE_TIER_THRESHOLD) return "above";
  return "average";
}

export const PRICE_TIER_META: Record<PriceTier, { label: string; color: string; className: string }> = {
  below: {
    get label() {
      return t("common.priceTiers.below");
    },
    color: "#5e7d5b",
    className: "bg-moss text-white",
  },
  average: {
    get label() {
      return t("common.priceTiers.average");
    },
    color: "#a07a50",
    className: "bg-wood text-white",
  },
  above: {
    get label() {
      return t("common.priceTiers.above");
    },
    color: "#a85a47",
    className: "bg-clay text-white",
  },
};

/* ------------------------------------------------------------------ */
/* Pomocné výběry                                                      */
/* ------------------------------------------------------------------ */

/**
 * „Hlavní“ produkt prodejce pro danou kategorii – nejlevnější za základní jednotku
 * mezi produkty skladem (fallback: nejlevnější celkově).
 */
export function mainProduct(seller: Seller, category?: FuelCategory): FuelProduct | undefined {
  const pool = seller.products.filter((p) => !category || p.category === category);
  if (pool.length === 0) return undefined;
  const available = pool.filter((p) => p.stock !== "out_of_stock");
  const list = available.length ? available : pool;
  return [...list].sort((a, b) => pricePerBaseUnit(a) - pricePerBaseUnit(b))[0];
}
