import type { EnergyCostItem, MarketPulseItem, PriceTrendPoint, RegionStats } from "@/types";
import { mockResolve } from "./client";
import { USES_DB, cached, db, isSignedIn, unwrap } from "./db";
import { getPublicOverview } from "./public";
import { ENERGY_COSTS, MARKET_PULSE, PRICE_TRENDS, REGION_STATS, buildEnergyCosts, buildMarketPulse } from "./mock/market";

/**
 * Měsíční průměry ČR z databáze (nejstarší první). Přihlášený dostane plnou řadu
 * (RPC `api_price_trends`), nepřihlášený posledních 6 měsíců z ukázkového souhrnu.
 */
async function dbTrends(months: number): Promise<PriceTrendPoint[]> {
  if (!(await isSignedIn())) return (await getPublicOverview()).trends.slice(-months);
  return cached(`market:trends:${months}`, async () =>
    unwrap<PriceTrendPoint[]>(await db().rpc("api_price_trends", { p_months: months })),
  );
}

/** KPI lišta (průměry ČR + změna m/m). */
export async function getMarketPulse(): Promise<MarketPulseItem[]> {
  if (USES_DB) return buildMarketPulse(await dbTrends(12));
  return mockResolve(MARKET_PULSE);
}

/** Statistiky 14 krajů (poslední měsíc). Jsou i v ukázkovém souhrnu pro nepřihlášené. */
export async function getRegionStats(): Promise<RegionStats[]> {
  if (USES_DB) {
    if (!(await isSignedIn())) return (await getPublicOverview()).regions;
    return cached("market:regions", async () => unwrap<RegionStats[]>(await db().rpc("api_region_stats")));
  }
  return mockResolve(REGION_STATS);
}

/** Měsíční průměry ČR (nejstarší první). */
export async function getPriceTrends(months = 12): Promise<PriceTrendPoint[]> {
  if (USES_DB) return dbTrends(months);
  return mockResolve(PRICE_TRENDS.slice(-months));
}

/** Kč/kWh podle paliva (z aktuálních průměrů ČR). */
export async function getEnergyCosts(): Promise<EnergyCostItem[]> {
  if (USES_DB) return buildEnergyCosts(await dbTrends(12));
  return mockResolve(ENERGY_COSTS);
}
