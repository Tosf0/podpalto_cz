/**
 * Obecné fotky podle paliva (volné licence Unsplash / Pexels / Pixabay) – výchozí obrázek prodejce,
 * když nemá vlastní fotku nebo když admin přepne na produkční režim „jen obecné fotky“
 * (`app_settings.seller_photos = "generic"`). Soubory: `public/sellers/generic/`, autoři v CREDITS.md.
 */
import type { FuelCategory } from "@/types";

export const GENERIC_SELLER_PHOTOS: Record<FuelCategory, string[]> = {
  wood: [1, 2, 3, 4, 5].map((n) => `/sellers/generic/wood-${n}.jpg`),
  pellets: [1, 2, 3].map((n) => `/sellers/generic/pellets-${n}.jpg`),
  briquettes: [1, 2].map((n) => `/sellers/generic/briquettes-${n}.jpg`),
  coal: [1, 2, 3].map((n) => `/sellers/generic/coal-${n}.jpg`),
};

/** Deterministický výběr fotky podle ID prodejce (každý prodejce má pořád stejnou). */
export function genericSellerPhoto(category: FuelCategory, seed: number): string | undefined {
  const list = GENERIC_SELLER_PHOTOS[category];
  return list.length ? list[seed % list.length] : undefined;
}
