import type { EnergyCostItem, MarketPulseItem, PriceTrendPoint, RegionStats } from "@/types";
import { IS_MOCK } from "./config";
import { apiFetch, mockResolve, qs } from "./client";
import { ENERGY_COSTS, MARKET_PULSE, PRICE_TRENDS, REGION_STATS } from "./mock/market";

/** GET /api/market/pulse – KPI lišta (průměry ČR + změna m/m). */
export async function getMarketPulse(): Promise<MarketPulseItem[]> {
  if (!IS_MOCK) return apiFetch<MarketPulseItem[]>("/api/market/pulse");
  return mockResolve(MARKET_PULSE);
}

/** GET /api/market/regions – statistiky 14 krajů. */
export async function getRegionStats(): Promise<RegionStats[]> {
  if (!IS_MOCK) return apiFetch<RegionStats[]>("/api/market/regions");
  return mockResolve(REGION_STATS);
}

/** GET /api/market/trends?months=12 – měsíční průměry ČR (nejstarší první). */
export async function getPriceTrends(months = 12): Promise<PriceTrendPoint[]> {
  if (!IS_MOCK) return apiFetch<PriceTrendPoint[]>(`/api/market/trends${qs({ months })}`);
  return mockResolve(PRICE_TRENDS.slice(-months));
}

/** GET /api/market/energy-costs – Kč/kWh podle paliva. */
export async function getEnergyCosts(): Promise<EnergyCostItem[]> {
  if (!IS_MOCK) return apiFetch<EnergyCostItem[]>("/api/market/energy-costs");
  return mockResolve(ENERGY_COSTS);
}
