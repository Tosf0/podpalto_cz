import type { CommodityPrices, PriceTrendPoint, RegionCode, RegionStats } from "@/types";
import { HISTORY_MONTHS } from "@/data/helpers";
import { REGIONS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Průměrné ceny ČR – 12 měsíců (prosinec 2025 – listopad 2026)        */
/* Pořadí hodnot odpovídá HISTORY_MONTHS.                              */
/* ------------------------------------------------------------------ */

const HARD_WOOD_PRMS = [1930, 1950, 1910, 1840, 1770, 1745, 1740, 1760, 1800, 1850, 1853, 1890];
const SOFT_WOOD_PRMS = [1385, 1398, 1372, 1322, 1268, 1252, 1250, 1262, 1290, 1331, 1333, 1360];
const PELLETS_T = [7950, 8030, 7800, 7340, 6960, 6890, 6890, 7040, 7270, 7490, 7500, 7650];
const BRIQUETTES_T = [8600, 8680, 8430, 8100, 7760, 7680, 7680, 7760, 8010, 8170, 8180, 8350];
const COAL_T = [5000, 5050, 5000, 4900, 4800, 4800, 4800, 4850, 4850, 4900, 4925, 4950];

export const PRICE_TRENDS: PriceTrendPoint[] = HISTORY_MONTHS.map((month, i) => ({
  month,
  hardWoodPrms: HARD_WOOD_PRMS[i],
  softWoodPrms: SOFT_WOOD_PRMS[i],
  pelletsT: PELLETS_T[i],
  briquettesT: BRIQUETTES_T[i],
  coalT: COAL_T[i],
}));

/* ------------------------------------------------------------------ */
/* Statistiky krajů (všech 14)                                         */
/* ------------------------------------------------------------------ */

interface RegionRow {
  region: RegionCode;
  avgPrices: CommodityPrices;
  sellerCount: number;
  priceIndex: number;
  changePct: number;
}

const REGION_ROWS: RegionRow[] = [
  {
    region: "PHA",
    avgPrices: { hardWoodPrms: 2120, softWoodPrms: 1520, pelletsT: 8550, briquettesT: 9350, coalT: 5550 },
    sellerCount: 74,
    priceIndex: 112,
    changePct: 2.4,
  },
  {
    region: "STC",
    avgPrices: { hardWoodPrms: 2000, softWoodPrms: 1440, pelletsT: 8100, briquettesT: 8850, coalT: 5250 },
    sellerCount: 95,
    priceIndex: 106,
    changePct: 1.8,
  },
  {
    region: "JHC",
    avgPrices: { hardWoodPrms: 1780, softWoodPrms: 1280, pelletsT: 7200, briquettesT: 7850, coalT: 4650 },
    sellerCount: 41,
    priceIndex: 94,
    changePct: 0.9,
  },
  {
    region: "PLK",
    avgPrices: { hardWoodPrms: 1910, softWoodPrms: 1370, pelletsT: 7750, briquettesT: 8450, coalT: 5000 },
    sellerCount: 52,
    priceIndex: 101,
    changePct: 1.5,
  },
  {
    region: "KVK",
    avgPrices: { hardWoodPrms: 1950, softWoodPrms: 1400, pelletsT: 7900, briquettesT: 8600, coalT: 5100 },
    sellerCount: 22,
    priceIndex: 103,
    changePct: 2.1,
  },
  {
    region: "ULK",
    avgPrices: { hardWoodPrms: 1830, softWoodPrms: 1320, pelletsT: 7400, briquettesT: 8100, coalT: 4700 },
    sellerCount: 36,
    priceIndex: 97,
    changePct: -0.6,
  },
  {
    region: "LBK",
    avgPrices: { hardWoodPrms: 1890, softWoodPrms: 1360, pelletsT: 7650, briquettesT: 8350, coalT: 4950 },
    sellerCount: 33,
    priceIndex: 100,
    changePct: 1.0,
  },
  {
    region: "HKK",
    avgPrices: { hardWoodPrms: 1870, softWoodPrms: 1350, pelletsT: 7550, briquettesT: 8250, coalT: 4900 },
    sellerCount: 38,
    priceIndex: 99,
    changePct: 0.7,
  },
  {
    region: "PAK",
    avgPrices: { hardWoodPrms: 1850, softWoodPrms: 1330, pelletsT: 7500, briquettesT: 8200, coalT: 4850 },
    sellerCount: 29,
    priceIndex: 98,
    changePct: -1.2,
  },
  {
    region: "VYS",
    avgPrices: { hardWoodPrms: 1740, softWoodPrms: 1250, pelletsT: 7050, briquettesT: 7700, coalT: 4550 },
    sellerCount: 27,
    priceIndex: 92,
    changePct: 3.1,
  },
  {
    region: "JHM",
    avgPrices: { hardWoodPrms: 1850, softWoodPrms: 1330, pelletsT: 7500, briquettesT: 8200, coalT: 4850 },
    sellerCount: 88,
    priceIndex: 98,
    changePct: 1.1,
  },
  {
    region: "OLK",
    avgPrices: { hardWoodPrms: 1760, softWoodPrms: 1260, pelletsT: 7100, briquettesT: 7750, coalT: 4600 },
    sellerCount: 31,
    priceIndex: 93,
    changePct: 2.6,
  },
  {
    region: "ZLK",
    avgPrices: { hardWoodPrms: 1780, softWoodPrms: 1280, pelletsT: 7200, briquettesT: 7850, coalT: 4650 },
    sellerCount: 26,
    priceIndex: 94,
    changePct: -1.9,
  },
  {
    region: "MSK",
    avgPrices: { hardWoodPrms: 1800, softWoodPrms: 1290, pelletsT: 7250, briquettesT: 7950, coalT: 4550 },
    sellerCount: 57,
    priceIndex: 95,
    changePct: -0.8,
  },
];

export const REGION_STATS: RegionStats[] = REGION_ROWS.map((row) => ({
  region: row.region,
  name: REGIONS[row.region].name,
  avgPrices: row.avgPrices,
  sellerCount: row.sellerCount,
  priceIndex: row.priceIndex,
  changePct: row.changePct,
}));
