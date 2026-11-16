import type { FuelCategory, RegionCode, Seller } from "@/types";
import { IS_MOCK } from "./config";
import { apiFetch, mockResolve, qs } from "./client";
import { SELLERS } from "@/data/sellers";

export interface SellersQuery {
  region?: RegionCode;
  category?: FuelCategory;
}

/** GET /api/sellers?region=&category= */
export async function getSellers(query: SellersQuery = {}): Promise<Seller[]> {
  if (!IS_MOCK) return apiFetch<Seller[]>(`/api/sellers${qs({ ...query })}`);
  return mockResolve(
    SELLERS.filter(
      (s) =>
        (!query.region || s.address.region === query.region) &&
        (!query.category || s.categories.includes(query.category)),
    ),
  );
}

/** GET /api/sellers/{slug} – vrací `null`, pokud prodejce neexistuje (404). */
export async function getSeller(slug: string): Promise<Seller | null> {
  if (!IS_MOCK) {
    try {
      return await apiFetch<Seller>(`/api/sellers/${encodeURIComponent(slug)}`);
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  }
  return mockResolve(SELLERS.find((s) => s.slug === slug) ?? null);
}

/** Slugy mock prodejců – pro `generateStaticParams` u `/prodejci/[slug]`. */
export function getMockSellerSlugs(): string[] {
  return SELLERS.map((s) => s.slug);
}
