import type { FuelProduct, Seller, SellerSize } from "@/types";
import { formatCzk, formatKm } from "@/lib/format";
import { t } from "@/lib/i18n/translate";
import { pricePerBaseUnit, productWoodGroup } from "@/lib/pricing";

export function sizeLabel(size: SellerSize): string {
  return t(`common.sizes.${size}`);
}

export const THREAT_META = {
  low: {
    get label() {
      return t("sellers.threat.low");
    },
    rank: 1,
    className: "border-moss/30 bg-moss-soft text-moss-strong",
  },
  medium: {
    get label() {
      return t("sellers.threat.medium");
    },
    rank: 2,
    className: "border-wood/30 bg-wood-soft text-wood-strong",
  },
  high: {
    get label() {
      return t("sellers.threat.high");
    },
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
    parts.push(
      d.freeRadiusKm > 0
        ? t("sellers.delivery.freeUpTo", { km: formatKm(d.freeRadiusKm) })
        : t("sellers.delivery.upTo", { km: formatKm(d.maxRadiusKm) }),
    );
  }
  if (d.hydraulicArm) parts.push(t("sellers.delivery.arm"));
  if (d.pickupAvailable) parts.push(t("sellers.delivery.pickup"));
  if (!d.ownDelivery && parts.length === 0) return t("sellers.delivery.unspecified");
  if (!d.ownDelivery) return parts.join(", ");
  return t("sellers.delivery.own", { parts: parts.join(", ") });
}

export function priceOrDash(value: number | undefined): string {
  return value === undefined ? "–" : formatCzk(value);
}

/** Krátký popisek dopravy pro tabulku a karty, např. „Vlastní · do 60 km“. */
export function deliveryShort(s: Seller): string {
  const d = s.delivery;
  if (d.ownDelivery) {
    return d.freeRadiusKm > 0
      ? t("sellers.delivery.shortFree", { km: formatKm(d.freeRadiusKm) })
      : t("sellers.delivery.shortOwn", { km: formatKm(d.maxRadiusKm) });
  }
  if (d.pickupAvailable) return t("sellers.delivery.shortPickup");
  return t("sellers.delivery.unspecified");
}
