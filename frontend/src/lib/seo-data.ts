/**
 * Data pro veřejné SEO stránky `/ceny` (rozcestník, kraje, paliva) a llms.txt.
 * Čte se NA SERVERU s veřejným klíčem: RPC `api_public_overview` (anon smí) a tabulka
 * `heating_census`. Výsledek je v cache (`market`, hodiny) – stránky jsou statické.
 */
import { cacheLife, cacheTag } from "next/cache";
import type { CommodityKey, PriceTrendPoint, RegionCode, RegionStats } from "@/types";
import { REGIONS, REGION_CODES, WOOD_KWH_PER_PLM, WOOD_SOLID_FACTOR, KWH_PER_KG, BOILER_EFFICIENCY } from "@/lib/constants";
import { SUPABASE_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { slugify } from "@/lib/blog/utils";
import { PRICE_TRENDS, REGION_STATS } from "@/data/market";
import { SELLERS } from "@/data/sellers";

export interface CensusRow {
  region: string;
  census_date: string;
  households_total: number;
  coal_coke_briquettes: number;
  wood_and_wood_briquettes: number;
  wood_pellets: number;
}

export interface MarketSnapshot {
  trends: PriceTrendPoint[];
  regions: RegionStats[];
  listedSellers: Partial<Record<RegionCode, number>>;
  totalSellers: number;
  census: CensusRow[];
}

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/** Souhrn trhu pro veřejné stránky (offline = ukázková data ze `src/data/`). */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  "use cache";
  cacheTag("market");
  cacheLife("hours");
  if (!SUPABASE_ENABLED) {
    const listedSellers: Partial<Record<RegionCode, number>> = {};
    for (const s of SELLERS) listedSellers[s.address.region] = (listedSellers[s.address.region] ?? 0) + 1;
    return { trends: PRICE_TRENDS.slice(-6), regions: REGION_STATS, listedSellers, totalSellers: SELLERS.length, census: [] };
  }
  const [overview, census] = await Promise.all([
    rest<Omit<MarketSnapshot, "census">>("rpc/api_public_overview", { method: "POST", body: "{}" }),
    rest<CensusRow[]>("heating_census?select=region,census_date,households_total,coal_coke_briquettes,wood_and_wood_briquettes,wood_pellets"),
  ]);
  // kraj bez jediné ceny nemá index (DB vrací výchozích 100) → NaN, formátovače ukážou „–“
  const known = overview.regions.map((r) =>
    Object.values(r.avgPrices ?? {}).some((v) => v != null) ? r : { ...r, priceIndex: NaN, changePct: NaN },
  );
  // kraje bez statistik (zatím žádná cena) doplníme prázdné, aby měly svou stránku a odkaz
  const regions: RegionStats[] = REGION_CODES.map(
    (code) =>
      known.find((r) => r.region === code) ?? {
        region: code,
        name: REGIONS[code].name,
        avgPrices: {} as RegionStats["avgPrices"],
        sellerCount: overview.listedSellers[code] ?? 0,
        priceIndex: NaN,
        changePct: NaN,
      },
  );
  return { ...overview, regions, census };
}

/** Řazení krajů podle indexu, kraje bez dat na konec. */
export function byPriceIndex(a: RegionStats, b: RegionStats): number {
  const av = Number.isFinite(a.priceIndex) ? a.priceIndex : Infinity;
  const bv = Number.isFinite(b.priceIndex) ? b.priceIndex : Infinity;
  return av === bv ? 0 : av - bv;
}

/** Má kraj aspoň jednu průměrnou cenu? */
export function hasRegionData(r: RegionStats | undefined): r is RegionStats {
  return !!r && Number.isFinite(r.priceIndex);
}

/* ------------------------------------------------------------------ */
/* Kraje a paliva – slugy, popisky, energie                            */
/* ------------------------------------------------------------------ */

export const REGION_SLUGS: Record<RegionCode, string> = Object.fromEntries(
  REGION_CODES.map((c) => [c, slugify(REGIONS[c].name)]),
) as Record<RegionCode, string>;

export function regionBySlug(slug: string): RegionCode | undefined {
  return REGION_CODES.find((c) => REGION_SLUGS[c] === slug);
}

/** 6. pád („v …“) pro věty typu „ve Středočeském kraji“. */
export const REGION_LOCATIVE: Record<RegionCode, string> = {
  PHA: "v Praze",
  STC: "ve Středočeském kraji",
  JHC: "v Jihočeském kraji",
  PLK: "v Plzeňském kraji",
  KVK: "v Karlovarském kraji",
  ULK: "v Ústeckém kraji",
  LBK: "v Libereckém kraji",
  HKK: "v Královéhradeckém kraji",
  PAK: "v Pardubickém kraji",
  VYS: "na Vysočině",
  JHM: "v Jihomoravském kraji",
  OLK: "v Olomouckém kraji",
  ZLK: "ve Zlínském kraji",
  MSK: "v Moravskoslezském kraji",
};

export interface CommodityInfo {
  key: CommodityKey;
  /** Název do tabulek. */
  label: string;
  /** Jednotka ceny. */
  unit: string;
  /** Energie v 1 jednotce (kWh) a účinnost spotřebiče – pro cenu tepla. */
  kwhPerUnit: number;
  efficiency: number;
}

export const COMMODITIES: CommodityInfo[] = [
  {
    key: "hardWoodPrms",
    label: "Tvrdé štípané dřevo (buk, dub)",
    unit: "PRMS",
    kwhPerUnit: WOOD_SOLID_FACTOR.PRMS * WOOD_KWH_PER_PLM.hard,
    efficiency: BOILER_EFFICIENCY.wood,
  },
  {
    key: "softWoodPrms",
    label: "Měkké štípané dřevo (smrk, borovice)",
    unit: "PRMS",
    kwhPerUnit: WOOD_SOLID_FACTOR.PRMS * WOOD_KWH_PER_PLM.soft,
    efficiency: BOILER_EFFICIENCY.wood,
  },
  { key: "pelletsT", label: "Dřevěné pelety", unit: "t", kwhPerUnit: KWH_PER_KG.pellets * 1000, efficiency: BOILER_EFFICIENCY.pellets },
  { key: "briquettesT", label: "Dřevěné brikety", unit: "t", kwhPerUnit: KWH_PER_KG.briquettesWood * 1000, efficiency: BOILER_EFFICIENCY.briquettes },
  { key: "coalT", label: "Hnědé uhlí (ořech, kostka)", unit: "t", kwhPerUnit: KWH_PER_KG.coalBrown * 1000, efficiency: BOILER_EFFICIENCY.coal },
];

export function commodity(key: CommodityKey): CommodityInfo {
  return COMMODITIES.find((c) => c.key === key)!;
}

/** Stránky paliv: slug → komodity, nadpis a 2. pád do vět. */
export interface FuelPage {
  slug: string;
  title: string;
  /** „palivového dřeva“, „pelet“… */
  genitive: string;
  /** „palivové dřevo“, „pelety“… (4. pád do otázek) */
  accusative: string;
  keys: CommodityKey[];
  intro: string;
}

export const FUEL_PAGES: FuelPage[] = [
  {
    slug: "palivove-drevo",
    title: "Cena palivového dřeva",
    genitive: "palivového dřeva",
    accusative: "palivové dřevo",
    keys: ["hardWoodPrms", "softWoodPrms"],
    intro:
      "Palivové dřevo se prodává nejčastěji štípané a volně sypané (PRMS), rovnané (PRM) nebo jako metrovky. Tvrdé dřevo (buk, dub, habr) má na stejný objem víc energie než měkké (smrk, borovice), proto je dražší.",
  },
  {
    slug: "pelety",
    title: "Cena pelet",
    genitive: "pelet",
    accusative: "pelety",
    keys: ["pelletsT"],
    intro:
      "Dřevěné pelety se prodávají po tunách volně ložené, na paletách po zhruba 1 t nebo v pytlích po 15 kg. Průměr počítáme ze všech nabídek dřevěných pelet přepočtených na tunu – včetně balení po paletách a pytlích, proto bývá vyšší než cena volně ložených pelet.",
  },
  {
    slug: "brikety",
    title: "Cena dřevěných briket",
    genitive: "dřevěných briket",
    accusative: "dřevěné brikety",
    keys: ["briquettesT"],
    intro:
      "Dřevěné brikety (RUF, PINI KAY, válcové) jsou slisované piliny s nízkou vlhkostí. Hoří déle než kusové dřevo a zaberou méně místa při skladování.",
  },
  {
    slug: "uhli",
    title: "Cena hnědého uhlí",
    genitive: "hnědého uhlí",
    accusative: "hnědé uhlí",
    keys: ["coalT"],
    intro:
      "Hnědé uhlí se prodává po tunách v různé zrnitosti (ořech 1, ořech 2, kostka). Průměr počítáme z hnědého uhlí všech běžných zrnitostí (ořech 1, ořech 2, kostka) volně i pytlovaného, přepočteného na tunu.",
  },
];

export function fuelBySlug(slug: string): FuelPage | undefined {
  return FUEL_PAGES.find((f) => f.slug === slug);
}

/** Všechny slugy pod /ceny (pro generateStaticParams a sitemapu). */
export function allPriceSlugs(): string[] {
  return [...FUEL_PAGES.map((f) => f.slug), ...REGION_CODES.map((c) => REGION_SLUGS[c])];
}

/* ------------------------------------------------------------------ */
/* Formátování na serveru (vždy čeština a Kč – SEO stránky jsou česky) */
/* ------------------------------------------------------------------ */

const nf0 = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Chybějící hodnota (kraj bez nabídky daného paliva) → „–“. */
const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);
export const czk = (v: number | null | undefined) => (ok(v) ? `${nf0.format(Math.round(v))} Kč` : "–");
export const czkPerUnit = (v: number | null | undefined, unit: string) => (ok(v) ? `${czk(v)}/${unit}` : "–");
export const kwhPrice = (v: number | null | undefined) => (ok(v) ? `${nf2.format(v)} Kč/kWh` : "–");
export const pct = (v: number, sign = true): string =>
  !Number.isFinite(v) ? "–" : `${sign && v > 0 ? "+" : v < 0 ? "−" : ""}${nf1.format(Math.abs(v))} %`;
export const int = (v: number | null | undefined) => (ok(v) ? nf0.format(v) : "–");

/** „2026-11“ → „listopad 2026“. */
export function monthLabel(ym: string | undefined): string {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
}

/** Cena tepla: Kč za kWh dodaného tepla (po účinnosti spotřebiče). */
export function heatPrice(price: number | null | undefined, c: CommodityInfo): number {
  if (price == null) return NaN;
  return price / c.kwhPerUnit / c.efficiency;
}
