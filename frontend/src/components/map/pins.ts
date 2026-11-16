import L from "leaflet";
import type { FuelCategory, PriceMode } from "@/types";
import { FUEL_META } from "@/lib/constants";
import { formatKwhPrice, formatNumber, NBSP } from "@/lib/format";
import { PRICE_TIER_META, pricePerKwh, type PriceTier } from "@/lib/pricing";
import type { SellerMatch } from "@/lib/filters";

/** Text na špendlíku: „1 490 Kč/PRMS“ nebo „1,32 Kč/kWh“. */
export function pinLabel(match: SellerMatch, mode: PriceMode): string {
  if (mode === "kwh") return formatKwhPrice(pricePerKwh(match.product));
  return `${formatNumber(match.product.price)}${NBSP}Kč/${match.product.unit}`;
}

const iconCache = new Map<string, L.DivIcon>();

/**
 * Cenový špendlík (pill). Ikony se cachují podle štítku + hladiny + paliva.
 * Zvýraznění (hover / výběr) řeší jen CSS třída `is-active` na prvku markeru –
 * ikona se při najetí nemění, takže klik nikdy nepadne na právě vyměněný DOM prvek.
 */
export function pricePinIcon(label: string, tier: PriceTier, fuel: FuelCategory): L.DivIcon {
  const key = `${label}|${tier}|${fuel}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const color = PRICE_TIER_META[tier].color;
  const fuelColor = FUEL_META[fuel].color;
  const width = Math.round(label.length * 7 + 36);
  const height = 38;

  const icon = L.divIcon({
    className: "price-pin",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    // klidná světlá pilulka s okrajem v barvě cenové hladiny; aktivní se vyplní (globals.css)
    html:
      `<div style="width:${width}px;height:${height}px;--pin:${color};--fuel:${fuelColor}" class="flex flex-col items-center">` +
      `<span class="pin-body num inline-flex h-[28px] items-center gap-1.5 whitespace-nowrap rounded-full border-2 bg-card px-2 text-[12px] font-bold leading-none text-foreground shadow-float">` +
      `<i class="pin-dot inline-block size-2.5 rounded-full"></i>${label}</span>` +
      `<span class="pin-tail -mt-px size-0 border-x-[6px] border-t-[8px] border-x-transparent"></span>` +
      `</div>`,
  });
  iconCache.set(key, icon);
  return icon;
}

/** Cenová metadata markeru – čte je ikona clusteru („3 · od 1 280 Kč/PRMS“). */
export interface PinMeta {
  unit: string;
  value: number;
  label: string;
  kwhValue: number;
  kwhLabel: string;
}

export const pinMeta = new WeakMap<L.Marker, PinMeta>();

export function pinMetaFor(match: SellerMatch, mode: PriceMode): PinMeta {
  const kwhValue = pricePerKwh(match.product);
  const kwhLabel = formatKwhPrice(kwhValue);
  if (mode === "kwh") return { unit: "kWh", value: kwhValue, label: kwhLabel, kwhValue, kwhLabel };
  return { unit: match.product.unit, value: match.product.price, label: pinLabel(match, mode), kwhValue, kwhLabel };
}

/**
 * Nejnižší cena v clusteru: při shodné jednotce „od 1 280 Kč/PRMS“,
 * při mixu jednotek (PRMS × t) srovnatelně „od 1,05 Kč/kWh“.
 */
export function clusterFromLabel(metas: (PinMeta | undefined)[]): string | undefined {
  const known = metas.filter((m): m is PinMeta => !!m);
  if (known.length === 0 || known.length !== metas.length) return undefined;
  const sameUnit = new Set(known.map((m) => m.unit)).size === 1;
  const best = known.reduce((a, b) =>
    (sameUnit ? a.value <= b.value : a.kwhValue <= b.kwhValue) ? a : b,
  );
  return sameUnit ? best.label : best.kwhLabel;
}

const clusterCache = new Map<string, L.DivIcon>();

/** Ikona clusteru ve stylu značky: oranžový kruh s počtem + volitelně „od {nejnižší cena}“. */
export function clusterIcon(count: number, fromLabel?: string): L.DivIcon {
  const key = `${count}|${fromLabel ?? ""}`;
  const cached = clusterCache.get(key);
  if (cached) return cached;
  const size = count < 5 ? 34 : count < 15 ? 38 : 42;

  if (!fromLabel) {
    const icon = L.divIcon({
      className: "",
      iconSize: [size, size],
      html:
        `<div style="width:${size}px;height:${size}px" class="num flex items-center justify-center rounded-full border-[3px] border-white bg-primary text-sm font-bold text-primary-foreground shadow-lg ring-4 ring-primary/25 dark:border-zinc-900">${count}</div>`,
    });
    clusterCache.set(key, icon);
    return icon;
  }

  // „1 190 Kč/PRMS“ → dva řádky „od 1 190“ / „Kč/PRMS“, ať je cluster co nejužší
  const cut = fromLabel.lastIndexOf(`${NBSP}Kč`);
  const value = `od${NBSP}${cut > 0 ? fromLabel.slice(0, cut) : fromLabel}`;
  const unit = cut > 0 ? fromLabel.slice(cut + 1) : "";
  const width = Math.round(Math.max(value.length, unit.length * 0.85) * 7 + size + 16);
  const icon = L.divIcon({
    className: "",
    iconSize: [width, size],
    iconAnchor: [width / 2, size / 2],
    html:
      `<div style="height:${size}px" class="flex w-max items-center gap-1.5 rounded-full border-2 border-white bg-card pr-2.5 shadow-lg ring-4 ring-primary/20 dark:border-zinc-900">` +
      `<span style="width:${size - 4}px;height:${size - 4}px" class="num flex shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">${count}</span>` +
      `<span class="flex flex-col leading-tight whitespace-nowrap">` +
      `<span class="num text-[12px] font-bold text-foreground">${value}</span>` +
      (unit ? `<span class="num text-[10px] text-muted-foreground">${unit}</span>` : "") +
      `</span></div>`,
  });
  clusterCache.set(key, icon);
  return icon;
}

let userIcon: L.DivIcon | undefined;

/** Pulzující tečka s polohou uživatele. */
export function userLocationIcon(): L.DivIcon {
  userIcon ??= L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html:
      `<span class="relative flex size-[22px] items-center justify-center">` +
      `<span class="absolute inline-flex size-full animate-ping rounded-full bg-pine/50"></span>` +
      `<span class="relative inline-flex size-3.5 rounded-full border-2 border-white bg-pine shadow-md"></span>` +
      `</span>`,
  });
  return userIcon;
}
