import type { EnergyCostItem, MarketPulseItem, PriceTrendPoint, RegionStats } from "@/types";
import { IS_MOCK } from "./config";
import { apiFetch, mockResolve, qs } from "./client";
import { USES_DB, cached, db, unwrap } from "./db";
import { ENERGY_COSTS, MARKET_PULSE, PRICE_TRENDS, REGION_STATS, buildEnergyCosts, buildMarketPulse } from "./mock/market";

/** Měsíční průměry ČR z databáze (RPC `api_price_trends`, nejstarší první). */
function dbTrends(months: number): Promise<PriceTrendPoint[]> {
  return cached(`market:trends:${months}`, async () =>
    unwrap<PriceTrendPoint[]>(await db().rpc("api_price_trends", { p_months: months })),
  );
}

/** KPI lišta (průměry ČR + změna m/m). */
export async function getMarketPulse(): Promise<MarketPulseItem[]> {
  if (USES_DB) return buildMarketPulse(await dbTrends(12));
  if (!IS_MOCK) return apiFetch<MarketPulseItem[]>("/api/market/pulse");
  return mockResolve(MARKET_PULSE);
}

/** Statistiky 14 krajů (poslední měsíc). */
export async function getRegionStats(): Promise<RegionStats[]> {
  if (USES_DB) return cached("market:regions", async () => unwrap<RegionStats[]>(await db().rpc("api_region_stats")));
  if (!IS_MOCK) return apiFetch<RegionStats[]>("/api/market/regions");
  return mockResolve(REGION_STATS);
}

/** Měsíční průměry ČR (nejstarší první). */
export async function getPriceTrends(months = 12): Promise<PriceTrendPoint[]> {
  if (USES_DB) return dbTrends(months);
  if (!IS_MOCK) return apiFetch<PriceTrendPoint[]>(`/api/market/trends${qs({ months })}`);
  return mockResolve(PRICE_TRENDS.slice(-months));
}

/** Kč/kWh podle paliva (z aktuálních průměrů ČR). */
export async function getEnergyCosts(): Promise<EnergyCostItem[]> {
  if (USES_DB) return buildEnergyCosts(await dbTrends(12));
  if (!IS_MOCK) return apiFetch<EnergyCostItem[]>("/api/market/energy-costs");
  return mockResolve(ENERGY_COSTS);
}
