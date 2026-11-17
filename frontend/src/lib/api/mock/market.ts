/**
 * Mock statistiky trhu odvozené z dat v `src/data/market.ts`.
 * Reálný backend vrací stejné struktury z endpointů `/api/market/*`.
 */
import type { CommodityKey, EnergyCostItem, MarketPulseItem, PriceTrendPoint } from "@/types";
import { PRICE_TRENDS, REGION_STATS } from "@/data/market";
import { BOILER_EFFICIENCY, COMMODITY_META, KWH_PER_KG } from "@/lib/constants";
import { woodKwhPerUnit } from "@/lib/pricing";

export { PRICE_TRENDS, REGION_STATS };

const PULSE_KEYS: CommodityKey[] = ["hardWoodPrms", "softWoodPrms", "pelletsT", "briquettesT"];

/** KPI lišta (průměry ČR + změna m/m) z měsíčních průměrů – sdílí mock i Supabase. */
export function buildMarketPulse(trends: PriceTrendPoint[]): MarketPulseItem[] {
  const last = trends[trends.length - 1];
  const prev = trends[trends.length - 2] ?? last;
  if (!last) return [];
  return PULSE_KEYS.map((key) => ({
    key,
    label: COMMODITY_META[key].label,
    unit: COMMODITY_META[key].unit,
    value: last[key],
    changePct: prev[key] ? ((last[key] - prev[key]) / prev[key]) * 100 : 0,
    spark: trends.slice(-6).map((p) => p[key]),
  }));
}

export const MARKET_PULSE: MarketPulseItem[] = buildMarketPulse(PRICE_TRENDS);

function item(
  id: string,
  label: string,
  category: EnergyCostItem["category"],
  price: number,
  kwhPerUnit: number,
): EnergyCostItem {
  const kcPerKwh = price / kwhPerUnit;
  const efficiency = BOILER_EFFICIENCY[category];
  return { id, label, category, kcPerKwh, kcPerKwhHeat: kcPerKwh / efficiency, efficiency };
}

/** Kč/kWh pro typická paliva podle aktuálních průměrů ČR. */
export function buildEnergyCosts(trends: PriceTrendPoint[]): EnergyCostItem[] {
  const last = trends[trends.length - 1];
  if (!last) return [];
  return [
  item("buk-suchy", "Buk štípaný suchý", "wood", last.hardWoodPrms, woodKwhPerUnit("PRMS", "hard", "dry")),
  item("buk-syrovy", "Buk štípaný syrový", "wood", last.hardWoodPrms * 0.8, woodKwhPerUnit("PRMS", "hard", "fresh")),
  item("smrk-suchy", "Smrk štípaný suchý", "wood", last.softWoodPrms, woodKwhPerUnit("PRMS", "soft", "dry")),
  item("pelety-a1", "Pelety ENplus A1", "pellets", last.pelletsT, KWH_PER_KG.pellets * 1000),
  item("brikety-ruf", "Dřevěné brikety RUF", "briquettes", last.briquettesT, KWH_PER_KG.briquettesWood * 1000),
  item("uhli-hnede", "Hnědé uhlí ořech 2", "coal", last.coalT, KWH_PER_KG.coalBrown * 1000),
  ].sort((a, b) => a.kcPerKwhHeat - b.kcPerKwhHeat);
}

export const ENERGY_COSTS: EnergyCostItem[] = buildEnergyCosts(PRICE_TRENDS);
