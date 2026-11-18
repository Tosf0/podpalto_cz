/**
 * Ukázková data pro nepřihlášené (RPC `api_public_overview` a `api_public_seller_sample`).
 * Tabulky jsou pro anonymní návštěvníky zavřené – dostanou jen souhrny a 5 prodejců denně.
 */
import type { PriceTrendPoint, RegionCode, RegionStats, Seller } from "@/types";
import { mockResolve } from "./client";
import { USES_DB, cached, db, unwrap } from "./db";
import { PRICE_TRENDS, REGION_STATS } from "./mock/market";
import { SELLERS } from "@/data/sellers";

export interface PublicOverview {
  /** Měsíční průměry ČR, posledních 6 měsíců (nejstarší první). */
  trends: PriceTrendPoint[];
  regions: RegionStats[];
  /** Počet prodejců v naší databázi podle kraje. */
  listedSellers: Partial<Record<RegionCode, number>>;
  totalSellers: number;
}

export interface SellerSample {
  /** 5 ukázkových prodejců (mění se jednou denně). */
  sellers: Seller[];
  /** Kolik prodejců odemkne registrace. */
  total: number;
}

export async function getPublicOverview(): Promise<PublicOverview> {
  if (USES_DB) return cached("public:overview", async () => unwrap<PublicOverview>(await db().rpc("api_public_overview")));
  const listedSellers: Partial<Record<RegionCode, number>> = {};
  for (const s of SELLERS) listedSellers[s.address.region] = (listedSellers[s.address.region] ?? 0) + 1;
  return mockResolve({ trends: PRICE_TRENDS.slice(-6), regions: REGION_STATS, listedSellers, totalSellers: SELLERS.length });
}

export async function getSellerSample(): Promise<SellerSample> {
  if (USES_DB) return cached("public:sample", async () => unwrap<SellerSample>(await db().rpc("api_public_seller_sample", { p_limit: 5 })));
  const day = Math.floor(Date.now() / 86_400_000);
  const sellers = [...SELLERS].sort((a, b) => ((a.id.charCodeAt(2) * day) % 97) - ((b.id.charCodeAt(2) * day) % 97)).slice(0, 5);
  return mockResolve({ sellers: sellers.map(({ intel: _intel, ...s }) => (void _intel, s)), total: SELLERS.length });
}
