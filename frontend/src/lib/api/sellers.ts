import type { FuelCategory, RegionCode, Seller } from "@/types";
import { IS_MOCK } from "./config";
import { apiFetch, mockResolve, qs } from "./client";
import { USES_DB, cached, db, unwrap } from "./db";
import { SELLERS } from "@/data/sellers";

export interface SellersQuery {
  region?: RegionCode;
  category?: FuelCategory;
}

/** Prodejci s produkty, cenami a historií cen (Supabase RPC `api_sellers`). */
export async function getSellers(query: SellersQuery = {}): Promise<Seller[]> {
  if (USES_DB) {
    return cached(`sellers:${query.region ?? ""}:${query.category ?? ""}`, async () =>
      unwrap<Seller[]>(await db().rpc("api_sellers", { p_region: query.region ?? null, p_category: query.category ?? null })),
    );
  }
  if (!IS_MOCK) return apiFetch<Seller[]>(`/api/sellers${qs({ ...query })}`);
  return mockResolve(
    SELLERS.filter(
      (s) =>
        (!query.region || s.address.region === query.region) &&
        (!query.category || s.categories.includes(query.category)),
    ),
  );
}

/** Jeden prodejce podle slugu – `null`, pokud neexistuje. */
export async function getSeller(slug: string): Promise<Seller | null> {
  if (USES_DB) {
    return cached(`sellers:slug:${slug}`, async () => {
      const list = unwrap<Seller[]>(await db().rpc("api_sellers", { p_slug: slug }));
      return list[0] ?? null;
    });
  }
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

/** Slugy ukázkových prodejců – pro `generateStaticParams` u `/prodejci/[slug]` (shodné se seedem databáze). */
export function getMockSellerSlugs(): string[] {
  return SELLERS.map((s) => s.slug);
}
