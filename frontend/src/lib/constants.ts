import type {
  FuelCategory,
  Moisture,
  RegionCode,
  SellerTag,
  UserLocation,
  WoodForm,
  WoodGroup,
  WoodSpecies,
  LogLengthCm,
  StockLevel,
  CommodityKey,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Paliva                                                              */
/* ------------------------------------------------------------------ */

export interface FuelMeta {
  id: FuelCategory;
  label: string;
  short: string;
  emoji: string;
  /** Základní jednotka pro srovnání cen. */
  baseUnit: "PRMS" | "t";
  /** Hex barva pro mapu a grafy (light). */
  color: string;
  /** Tailwind třídy pro badge/pill. */
  className: string;
  dotClassName: string;
}

export const FUEL_META: Record<FuelCategory, FuelMeta> = {
  wood: {
    id: "wood",
    label: "Palivové dřevo",
    short: "Dřevo",
    emoji: "🪵",
    baseUnit: "PRMS",
    color: "#b08b62", // dub (světlé dřevo)
    className:
      "bg-wood-soft text-wood-strong border-wood/30 dark:bg-wood/15 dark:text-wood-strong dark:border-wood/30",
    dotClassName: "bg-wood",
  },
  pellets: {
    id: "pellets",
    label: "Dřevěné pelety",
    short: "Pelety",
    emoji: "🌾",
    baseUnit: "t",
    color: "#7e9a78", // mech
    className:
      "bg-moss-soft text-moss-strong border-moss/30 dark:bg-moss/15 dark:text-moss-strong dark:border-moss/30",
    dotClassName: "bg-moss",
  },
  briquettes: {
    id: "briquettes",
    label: "Brikety",
    short: "Brikety",
    emoji: "🧱",
    baseUnit: "t",
    color: "#7a5a43", // ořech (tmavé dřevo)
    className: "bg-secondary text-wood-strong border-wood-strong/25 dark:bg-wood-strong/15",
    dotClassName: "bg-wood-strong",
  },
  coal: {
    id: "coal",
    label: "Uhlí",
    short: "Uhlí",
    emoji: "⚫",
    baseUnit: "t",
    color: "#4a4744", // uhel
    className:
      "bg-coal-soft text-coal-strong border-coal/30 dark:bg-coal/20 dark:text-coal-strong dark:border-coal/40",
    dotClassName: "bg-coal",
  },
};

export const FUEL_CATEGORIES: FuelCategory[] = ["wood", "pellets", "briquettes", "coal"];

/** Barvy komodit pro grafy (Recharts). */
export const COMMODITY_META: Record<CommodityKey, { label: string; unit: string; color: string }> = {
  hardWoodPrms: { label: "Tvrdé dřevo", unit: "Kč/PRMS", color: "#7a5a43" },
  softWoodPrms: { label: "Měkké dřevo", unit: "Kč/PRMS", color: "#c9a97e" },
  pelletsT: { label: "Pelety ENplus A1", unit: "Kč/t", color: "#6f8f69" },
  briquettesT: { label: "Dřevěné brikety", unit: "Kč/t", color: "#b5826a" },
  coalT: { label: "Hnědé uhlí", unit: "Kč/t", color: "#5e5b57" },
};

/* ------------------------------------------------------------------ */
/* Dřevo                                                               */
/* ------------------------------------------------------------------ */

export const WOOD_SPECIES: Record<WoodSpecies, { label: string; group: WoodGroup }> = {
  buk: { label: "Buk", group: "hard" },
  dub: { label: "Dub", group: "hard" },
  habr: { label: "Habr", group: "hard" },
  jasan: { label: "Jasan", group: "hard" },
  "mix-tvrde": { label: "Mix tvrdých", group: "hard" },
  briza: { label: "Bříza", group: "birch" },
  smrk: { label: "Smrk", group: "soft" },
  borovice: { label: "Borovice", group: "soft" },
  modrin: { label: "Modřín", group: "soft" },
  "mix-mekke": { label: "Mix měkkých", group: "soft" },
};

export const WOOD_GROUPS: Record<WoodGroup, { label: string; hint: string }> = {
  hard: { label: "Tvrdé", hint: "buk, dub, habr, jasan" },
  soft: { label: "Měkké", hint: "smrk, borovice, modřín" },
  birch: { label: "Bříza", hint: "krb, rychlý zátop" },
};

export const WOOD_FORMS: Record<WoodForm, { label: string; unit: string }> = {
  sypane: { label: "Sypané štípané", unit: "PRMS" },
  rovnane: { label: "Rovnané", unit: "PRM" },
  metrovky: { label: "Metrové kulatiny", unit: "PRM" },
  paleta: { label: "Palety / klece", unit: "paleta" },
};

export const MOISTURE: Record<Moisture, { label: string; hint: string }> = {
  dry: { label: "Suché", hint: "< 20 % – k okamžitému topení" },
  semi: { label: "Polosuché", hint: "20–35 % – dosušit do příští sezóny" },
  fresh: { label: "Čerstvé / syrové", hint: "> 35 % – sušit 1,5–2 roky" },
};

export const LOG_LENGTHS: LogLengthCm[] = [25, 33, 40, 50];

/* ------------------------------------------------------------------ */
/* Energetika – přepočty                                               */
/* ------------------------------------------------------------------ */

/**
 * Objem dřevní hmoty (PLM) v jedné prostorové jednotce.
 * 1 PRM rovnaný ≈ 0,70 PLM, 1 PRMS sypaný (štípaný 25–33 cm) ≈ 0,45 PLM.
 */
export const WOOD_SOLID_FACTOR = { PLM: 1, PRM: 0.7, PRMS: 0.45 } as const;

/** Energie v 1 PLM dřeva při vlhkosti ~20 % (kWh). */
export const WOOD_KWH_PER_PLM: Record<WoodGroup, number> = {
  hard: 2800,
  birch: 2500,
  soft: 2050,
};

/**
 * Koeficient využitelné energie podle vlhkosti (vztaženo k suchému dřevu, w ≈ 20 %).
 * Vlhké dřevo má nižší výhřevnost a část energie se spotřebuje na odpaření vody.
 */
export const MOISTURE_ENERGY_FACTOR: Record<Moisture, number> = {
  dry: 1,
  semi: 0.85,
  fresh: 0.65,
};

/** Výhřevnost v kWh/kg pro ne-dřevěná paliva. */
export const KWH_PER_KG = {
  pellets: 4.9,
  briquettesWood: 4.8,
  briquettesCoal: 5.6,
  coalBrown: 4.9,
  coalBlack: 7.8,
  coke: 7.9,
} as const;

/** Typická účinnost spalování ve spotřebiči. */
export const BOILER_EFFICIENCY: Record<FuelCategory, number> = {
  wood: 0.78,
  pellets: 0.9,
  briquettes: 0.8,
  coal: 0.72,
};

/* ------------------------------------------------------------------ */
/* Kraje ČR                                                            */
/* ------------------------------------------------------------------ */

export interface RegionMeta {
  code: RegionCode;
  name: string;
  short: string;
  capital: string;
  /** Přibližný geometrický střed kraje. */
  center: { lat: number; lng: number };
}

export const REGIONS: Record<RegionCode, RegionMeta> = {
  PHA: { code: "PHA", name: "Hlavní město Praha", short: "Praha", capital: "Praha", center: { lat: 50.0755, lng: 14.4378 } },
  STC: { code: "STC", name: "Středočeský kraj", short: "Středočeský", capital: "Praha", center: { lat: 49.9, lng: 14.6 } },
  JHC: { code: "JHC", name: "Jihočeský kraj", short: "Jihočeský", capital: "České Budějovice", center: { lat: 49.05, lng: 14.45 } },
  PLK: { code: "PLK", name: "Plzeňský kraj", short: "Plzeňský", capital: "Plzeň", center: { lat: 49.6, lng: 13.3 } },
  KVK: { code: "KVK", name: "Karlovarský kraj", short: "Karlovarský", capital: "Karlovy Vary", center: { lat: 50.17, lng: 12.75 } },
  ULK: { code: "ULK", name: "Ústecký kraj", short: "Ústecký", capital: "Ústí nad Labem", center: { lat: 50.5, lng: 13.75 } },
  LBK: { code: "LBK", name: "Liberecký kraj", short: "Liberecký", capital: "Liberec", center: { lat: 50.7, lng: 14.95 } },
  HKK: { code: "HKK", name: "Královéhradecký kraj", short: "Královéhradecký", capital: "Hradec Králové", center: { lat: 50.4, lng: 15.8 } },
  PAK: { code: "PAK", name: "Pardubický kraj", short: "Pardubický", capital: "Pardubice", center: { lat: 49.9, lng: 16.1 } },
  VYS: { code: "VYS", name: "Kraj Vysočina", short: "Vysočina", capital: "Jihlava", center: { lat: 49.45, lng: 15.65 } },
  JHM: { code: "JHM", name: "Jihomoravský kraj", short: "Jihomoravský", capital: "Brno", center: { lat: 49.0, lng: 16.6 } },
  OLK: { code: "OLK", name: "Olomoucký kraj", short: "Olomoucký", capital: "Olomouc", center: { lat: 49.75, lng: 17.15 } },
  ZLK: { code: "ZLK", name: "Zlínský kraj", short: "Zlínský", capital: "Zlín", center: { lat: 49.2, lng: 17.75 } },
  MSK: { code: "MSK", name: "Moravskoslezský kraj", short: "Moravskoslezský", capital: "Ostrava", center: { lat: 49.8, lng: 18.2 } },
};

export const REGION_CODES = Object.keys(REGIONS) as RegionCode[];

/** Střed ČR a výchozí zoom mapy. */
export const CZ_CENTER = { lat: 49.82, lng: 15.47 };
export const CZ_BOUNDS: [[number, number], [number, number]] = [
  [48.55, 12.09],
  [51.06, 18.86],
];

/* ------------------------------------------------------------------ */
/* Lokality a PSČ                                                      */
/* ------------------------------------------------------------------ */

export const LOCATION_PRESETS: UserLocation[] = [
  { label: "Praha a Střední Čechy", lat: 50.0755, lng: 14.4378, region: "PHA", zip: "110 00" },
  { label: "Brno a okolí", lat: 49.1951, lng: 16.6068, region: "JHM", zip: "602 00" },
  { label: "Ostrava a okolí", lat: 49.8209, lng: 18.2625, region: "MSK", zip: "702 00" },
  { label: "Plzeň a okolí", lat: 49.7384, lng: 13.3736, region: "PLK", zip: "301 00" },
  { label: "České Budějovice", lat: 48.9745, lng: 14.4743, region: "JHC", zip: "370 01" },
  { label: "Hradec Králové", lat: 50.2104, lng: 15.8252, region: "HKK", zip: "500 02" },
  { label: "Olomouc", lat: 49.5938, lng: 17.2509, region: "OLK", zip: "779 00" },
  { label: "Liberec", lat: 50.7663, lng: 15.0543, region: "LBK", zip: "460 01" },
  { label: "Jihlava", lat: 49.3961, lng: 15.5912, region: "VYS", zip: "586 01" },
  { label: "Zlín", lat: 49.2265, lng: 17.6707, region: "ZLK", zip: "760 01" },
];

export const DEFAULT_LOCATION: UserLocation = LOCATION_PRESETS[0];

/**
 * Hrubý převod PSČ → lokalita podle prvních dvou číslic (okresní pošty).
 * Pro produkci nahradit geokódováním (např. Mapy.cz / Nominatim) na backendu.
 */
export const ZIP_PREFIX_LOCATIONS: Record<string, { city: string; lat: number; lng: number; region: RegionCode }> = {
  "10": { city: "Praha", lat: 50.0755, lng: 14.4378, region: "PHA" },
  "11": { city: "Praha", lat: 50.0875, lng: 14.4213, region: "PHA" },
  "12": { city: "Praha", lat: 50.0755, lng: 14.4378, region: "PHA" },
  "13": { city: "Praha", lat: 50.085, lng: 14.47, region: "PHA" },
  "14": { city: "Praha", lat: 50.03, lng: 14.45, region: "PHA" },
  "15": { city: "Praha", lat: 50.04, lng: 14.38, region: "PHA" },
  "16": { city: "Praha", lat: 50.09, lng: 14.35, region: "PHA" },
  "17": { city: "Praha", lat: 50.11, lng: 14.42, region: "PHA" },
  "18": { city: "Praha", lat: 50.12, lng: 14.48, region: "PHA" },
  "19": { city: "Praha", lat: 50.11, lng: 14.56, region: "PHA" },
  "25": { city: "Říčany", lat: 49.9917, lng: 14.6544, region: "STC" },
  "26": { city: "Příbram", lat: 49.6899, lng: 14.0104, region: "STC" },
  "27": { city: "Kladno", lat: 50.1473, lng: 14.1029, region: "STC" },
  "28": { city: "Kolín", lat: 50.0281, lng: 15.2006, region: "STC" },
  "29": { city: "Mladá Boleslav", lat: 50.4114, lng: 14.9032, region: "STC" },
  "30": { city: "Plzeň", lat: 49.7384, lng: 13.3736, region: "PLK" },
  "31": { city: "Plzeň", lat: 49.75, lng: 13.38, region: "PLK" },
  "32": { city: "Plzeň-jih", lat: 49.62, lng: 13.35, region: "PLK" },
  "33": { city: "Rokycany", lat: 49.7427, lng: 13.5946, region: "PLK" },
  "34": { city: "Domažlice", lat: 49.4405, lng: 12.9298, region: "PLK" },
  "35": { city: "Cheb", lat: 50.0796, lng: 12.374, region: "KVK" },
  "36": { city: "Karlovy Vary", lat: 50.2319, lng: 12.8713, region: "KVK" },
  "37": { city: "České Budějovice", lat: 48.9745, lng: 14.4743, region: "JHC" },
  "38": { city: "Prachatice", lat: 49.0127, lng: 13.9975, region: "JHC" },
  "39": { city: "Tábor", lat: 49.4144, lng: 14.6578, region: "JHC" },
  "40": { city: "Ústí nad Labem", lat: 50.6607, lng: 14.0323, region: "ULK" },
  "41": { city: "Litoměřice", lat: 50.5335, lng: 14.1318, region: "ULK" },
  "43": { city: "Chomutov", lat: 50.4605, lng: 13.4178, region: "ULK" },
  "44": { city: "Louny", lat: 50.3569, lng: 13.7967, region: "ULK" },
  "46": { city: "Liberec", lat: 50.7663, lng: 15.0543, region: "LBK" },
  "47": { city: "Česká Lípa", lat: 50.6855, lng: 14.5376, region: "LBK" },
  "50": { city: "Hradec Králové", lat: 50.2104, lng: 15.8252, region: "HKK" },
  "51": { city: "Semily", lat: 50.6019, lng: 15.3355, region: "LBK" },
  "53": { city: "Pardubice", lat: 50.0343, lng: 15.7812, region: "PAK" },
  "54": { city: "Trutnov", lat: 50.561, lng: 15.9127, region: "HKK" },
  "55": { city: "Náchod", lat: 50.4167, lng: 16.1629, region: "HKK" },
  "56": { city: "Ústí nad Orlicí", lat: 49.9739, lng: 16.3936, region: "PAK" },
  "57": { city: "Svitavy", lat: 49.7559, lng: 16.4683, region: "PAK" },
  "58": { city: "Jihlava", lat: 49.3961, lng: 15.5912, region: "VYS" },
  "59": { city: "Žďár nad Sázavou", lat: 49.5626, lng: 15.9392, region: "VYS" },
  "60": { city: "Brno", lat: 49.1951, lng: 16.6068, region: "JHM" },
  "61": { city: "Brno", lat: 49.21, lng: 16.62, region: "JHM" },
  "62": { city: "Brno", lat: 49.2, lng: 16.55, region: "JHM" },
  "63": { city: "Brno", lat: 49.17, lng: 16.63, region: "JHM" },
  "64": { city: "Brno-venkov", lat: 49.25, lng: 16.45, region: "JHM" },
  "66": { city: "Brno-venkov", lat: 49.1, lng: 16.6, region: "JHM" },
  "67": { city: "Znojmo", lat: 48.8555, lng: 16.0488, region: "JHM" },
  "68": { city: "Vyškov", lat: 49.2775, lng: 16.999, region: "JHM" },
  "69": { city: "Břeclav", lat: 48.7589, lng: 16.882, region: "JHM" },
  "70": { city: "Ostrava", lat: 49.8209, lng: 18.2625, region: "MSK" },
  "71": { city: "Ostrava", lat: 49.83, lng: 18.29, region: "MSK" },
  "72": { city: "Ostrava", lat: 49.84, lng: 18.2, region: "MSK" },
  "73": { city: "Karviná", lat: 49.8541, lng: 18.5417, region: "MSK" },
  "74": { city: "Opava", lat: 49.9387, lng: 17.9026, region: "MSK" },
  "75": { city: "Vsetín", lat: 49.3387, lng: 17.9962, region: "ZLK" },
  "76": { city: "Zlín", lat: 49.2265, lng: 17.6707, region: "ZLK" },
  "77": { city: "Olomouc", lat: 49.5938, lng: 17.2509, region: "OLK" },
  "78": { city: "Šumperk", lat: 49.9653, lng: 16.9706, region: "OLK" },
  "79": { city: "Prostějov", lat: 49.4719, lng: 17.1118, region: "OLK" },
};

/* ------------------------------------------------------------------ */
/* Štítky a stavy                                                      */
/* ------------------------------------------------------------------ */

export const SELLER_TAGS: Record<SellerTag, { label: string; tone: "green" | "orange" | "neutral" }> = {
  skladem: { label: "Skladem", tone: "green" },
  "hydraulicka-ruka": { label: "Hydraulická ruka", tone: "neutral" },
  "enplus-a1": { label: "Certifikace ENplus A1", tone: "green" },
  "suche-18": { label: "Suché < 18 %", tone: "green" },
  "vlastni-doprava": { label: "Vlastní doprava", tone: "neutral" },
  "osobni-odber": { label: "Osobní odběr", tone: "neutral" },
  "platba-kartou": { label: "Platba kartou", tone: "neutral" },
  "doprava-zdarma": { label: "Doprava zdarma v okolí", tone: "orange" },
  "fsc-pefc": { label: "FSC / PEFC", tone: "green" },
  "expres-48h": { label: "Expres do 48 h", tone: "orange" },
};

export const STOCK_LEVELS: Record<StockLevel, { label: string; tone: "green" | "orange" | "red" | "neutral" }> = {
  in_stock: { label: "Skladem", tone: "green" },
  low: { label: "Poslední kusy", tone: "orange" },
  out_of_stock: { label: "Vyprodáno", tone: "red" },
  preorder: { label: "Na objednávku", tone: "neutral" },
};

/** Hranice pro barvení cen: ±5 % vůči průměru kraje. */
export const PRICE_TIER_THRESHOLD = 0.05;

export const RADIUS_MIN_KM = 10;
export const RADIUS_MAX_KM = 100;
export const RADIUS_DEFAULT_KM = 50;
