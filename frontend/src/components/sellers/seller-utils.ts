import type { FuelProduct, Seller, SellerSize } from "@/types";
import { formatCzk, formatKm, NBSP } from "@/lib/format";
import { pricePerBaseUnit, productWoodGroup } from "@/lib/pricing";

export const SIZE_LABEL: Record<SellerSize, string> = {
  small: "Malý",
  medium: "Střední",
  large: "Velký",
};

export const THREAT_META = {
  low: {
    label: "Nízká hrozba",
    rank: 1,
    className: "border-moss/30 bg-moss-soft text-moss-strong",
  },
  medium: {
    label: "Střední hrozba",
    rank: 2,
    className: "border-wood/30 bg-wood-soft text-wood-strong",
  },
  high: {
    label: "Vysoká hrozba",
    rank: 3,
    className: "border-clay/30 bg-clay-soft text-clay-strong",
  },
} as const;

function cheapest(products: FuelProduct[]): FuelProduct | undefined {
  const avail = products.filter((p) => p.stock !== "out_of_stock");
  const pool = avail.length ? avail : products;
  return [...pool].sort((a, b) => pricePerBaseUnit(a) - pricePerBaseUnit(b))[0];
}

/** Nejlevnější tvrdé štípané dřevo (Kč/PRMS). */
export function cheapestHardWood(s: Seller): number | undefined {
  const p = cheapest(s.products.filter((x) => x.category === "wood" && productWoodGroup(x) === "hard"));
  return p ? pricePerBaseUnit(p) : undefined;
}

/** Nejlevnější pelety (Kč/t). */
export function cheapestPellets(s: Seller): number | undefined {
  const p = cheapest(s.products.filter((x) => x.category === "pellets"));
  return p ? pricePerBaseUnit(p) : undefined;
}

export function deliverySummary(s: Seller): string {
  const d = s.delivery;
  const parts: string[] = [];
  if (d.ownDelivery) {
    parts.push(d.freeRadiusKm > 0 ? `zdarma do${NBSP}${formatKm(d.freeRadiusKm)}` : `do${NBSP}${formatKm(d.maxRadiusKm)}`);
  }
  if (d.hydraulicArm) parts.push("hydraul. ruka");
  if (d.pickupAvailable) parts.push("osobní odběr");
  if (!d.ownDelivery && parts.length === 0) return "Neuvedeno";
  if (!d.ownDelivery) return parts.join(", ");
  return `Vlastní doprava ${parts.join(", ")}`;
}

export function priceOrDash(value: number | undefined): string {
  return value === undefined ? "–" : formatCzk(value);
}
