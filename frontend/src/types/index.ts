/**
 * Datový kontrakt frontendu podpalto.cz.
 *
 * Tyto typy popisují JSON, který frontend očekává od REST API (FastAPI + CrewAI na Railway).
 * Kontrakt je popsán také v README.md → „REST API kontrakt“.
 * Konvence: data o trhu jsou v camelCase, CrewAI objekty (report, běh analýzy) v snake_case,
 * protože kopírují Pydantic modely z `app/src/podpalto_app/flows/competitor_analysis.py`.
 */

/* ------------------------------------------------------------------ */
/* Základní číselníky                                                  */
/* ------------------------------------------------------------------ */

/** Kódy 14 krajů ČR (zkratky dle ČSÚ/NUTS 3). */
export type RegionCode =
  | "PHA" // Hlavní město Praha
  | "STC" // Středočeský
  | "JHC" // Jihočeský
  | "PLK" // Plzeňský
  | "KVK" // Karlovarský
  | "ULK" // Ústecký
  | "LBK" // Liberecký
  | "HKK" // Královéhradecký
  | "PAK" // Pardubický
  | "VYS" // Vysočina
  | "JHM" // Jihomoravský
  | "OLK" // Olomoucký
  | "ZLK" // Zlínský
  | "MSK"; // Moravskoslezský

export type FuelCategory = "wood" | "pellets" | "briquettes" | "coal";

/** Druh dřeviny. */
export type WoodSpecies =
  | "buk"
  | "dub"
  | "habr"
  | "jasan"
  | "briza"
  | "smrk"
  | "borovice"
  | "modrin"
  | "mix-tvrde"
  | "mix-mekke";

/** Skupina dřevin – určuje výhřevnost na objem. */
export type WoodGroup = "hard" | "soft" | "birch";

/** Zpracování dřeva. */
export type WoodForm =
  | "sypane" // štípané sypané – prodej v PRMS
  | "rovnane" // štípané rovnané – prodej v PRM
  | "metrovky" // metrové kulatiny / polena 1 m
  | "paleta"; // rovnané na paletě / v klecích

/** Vlhkost dřeva. dry < 20 %, semi 20–35 %, fresh > 35 %. */
export type Moisture = "dry" | "semi" | "fresh";

export type LogLengthCm = 25 | 33 | 40 | 50 | 100;

/**
 * Měrná jednotka ceny.
 * PRMS = prostorový metr sypaný, PRM = prostorový metr rovnaný, PLM = plnometr (m³ dřevní hmoty),
 * t = tuna, paleta = paleta/klec (hmotnost viz `FuelProduct.packageKg`), pytel = pytel (viz `packageKg`).
 */
export type PriceUnit = "PRMS" | "PRM" | "PLM" | "t" | "paleta" | "pytel";

export type StockLevel = "in_stock" | "low" | "out_of_stock" | "preorder";

export type PelletCertification = "ENplus A1" | "ENplus A2" | "DINplus" | "bez certifikace";

export type BriquetteType = "RUF" | "PINI KAY" | "válcové" | "hnědouhelné";

export type CoalType =
  | "hnědé ořech 1"
  | "hnědé ořech 2"
  | "hnědé kostka"
  | "černé ořech"
  | "černé kostka"
  | "koks";

/** Štítky prodejce zobrazované na kartách. */
export type SellerTag =
  | "skladem"
  | "hydraulicka-ruka"
  | "enplus-a1"
  | "suche-18"
  | "vlastni-doprava"
  | "osobni-odber"
  | "platba-kartou"
  | "doprava-zdarma"
  | "fsc-pefc"
  | "expres-48h";

/* ------------------------------------------------------------------ */
/* Trh – prodejci a produkty                                           */
/* ------------------------------------------------------------------ */

export interface PricePoint {
  /** Měsíc ve formátu YYYY-MM. */
  date: string;
  /** Cena v Kč vč. DPH za `FuelProduct.unit`. */
  price: number;
}

export interface FuelProduct {
  id: string;
  sellerId: string;
  name: string;
  category: FuelCategory;

  /* --- palivové dřevo --- */
  woodSpecies?: WoodSpecies[];
  woodGroup?: WoodGroup;
  woodForm?: WoodForm;
  moisture?: Moisture;
  /** Deklarovaná vlhkost v %. */
  moisturePercent?: number;
  logLengthCm?: LogLengthCm;

  /* --- pelety / brikety / uhlí --- */
  certification?: PelletCertification;
  briquetteType?: BriquetteType;
  coalType?: CoalType;
  /** Průměr pelet v mm (6 / 8). */
  diameterMm?: number;
  /** Výhřevnost deklarovaná prodejcem v MJ/kg (volitelné – jinak se použije tabulková). */
  declaredMjPerKg?: number;

  /** Cena v Kč vč. DPH za jednu `unit`. */
  price: number;
  unit: PriceUnit;
  /** Hmotnost jedné jednotky v kg – povinné pro `paleta` a `pytel` u pelet/briket/uhlí. */
  packageKg?: number;
  /** Objem jedné palety/klece v PRM – povinné pro dřevo prodávané po `paleta`. */
  packagePrm?: number;
  minOrder?: number;

  stock: StockLevel;
  /** Posledních 12 měsíců (nejstarší první). */
  priceHistory: PricePoint[];
  /** ISO datum poslední aktualizace ceny. */
  updatedAt: string;
}

export interface DeliveryTerms {
  ownDelivery: boolean;
  hydraulicArm: boolean;
  pickupAvailable: boolean;
  /** Paušál za dopravu v Kč (účtuje se mimo `freeRadiusKm`). */
  baseFee: number;
  /** Cena za km vzdálenosti (jedna cesta) v Kč – účtuje se nad `freeRadiusKm`. */
  pricePerKm: number;
  /** Do této vzdálenosti je doprava zdarma (0 = nikdy). */
  freeRadiusKm: number;
  /** Doprava zdarma při objednávce alespoň tohoto množství (v jednotce produktu). */
  freeOverQuantity?: number | null;
  /** Příplatek za složení hydraulickou rukou v Kč. */
  hydraulicArmFee?: number;
  /** Maximální dojezd vlastní dopravy v km. */
  maxRadiusKm: number;
  notes?: string;
}

export interface Address {
  street: string;
  city: string;
  zip: string;
  region: RegionCode;
  district?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type SellerSize = "small" | "medium" | "large";

export interface Swot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/** Shrnutí Competitive Intelligence pro prodejce (odvozené z posledního CrewAI reportu). */
export interface SellerIntel {
  /** ID posledního reportu v archivu (`CrewAnalysisReport.id`). */
  reportId?: string;
  positioning: string;
  toneOfVoice: string;
  usp: string[];
  swot: Swot;
  /** Odchylka cen prodejce od průměru ČR v % (záporná = levnější). */
  priceIndexVsCz: number;
  threatLevel: "low" | "medium" | "high";
  analyzedAt: string;
}

export interface Seller {
  id: string;
  slug: string;
  name: string;
  legalName?: string;
  ico?: string;
  website: string;
  phone?: string;
  email?: string;
  description: string;
  /** URL fotografie provozovny / skladu (volitelné; jinak se zobrazí ilustrace). */
  photoUrl?: string;
  address: Address;
  location: GeoPoint;
  size: SellerSize;
  foundedYear?: number;
  rating: number;
  reviewCount: number;
  categories: FuelCategory[];
  tags: SellerTag[];
  products: FuelProduct[];
  delivery: DeliveryTerms;
  intel?: SellerIntel;
  /** ISO datum, kdy CrewAI naposledy prošel web prodejce. */
  lastScrapedAt: string;
}

/* ------------------------------------------------------------------ */
/* Statistiky trhu                                                     */
/* ------------------------------------------------------------------ */

/** Průměrné ceny klíčových komodit (Kč vč. DPH). */
export interface CommodityPrices {
  /** Tvrdé štípané dřevo, Kč/PRMS. */
  hardWoodPrms: number;
  /** Měkké štípané dřevo, Kč/PRMS. */
  softWoodPrms: number;
  /** Pelety ENplus A1, Kč/t. */
  pelletsT: number;
  /** Dřevěné brikety, Kč/t. */
  briquettesT: number;
  /** Hnědé uhlí ořech 2, Kč/t. */
  coalT: number;
}

export type CommodityKey = keyof CommodityPrices;

export interface RegionStats {
  region: RegionCode;
  name: string;
  avgPrices: CommodityPrices;
  sellerCount: number;
  /** Cenový index kraje, 100 = průměr ČR. */
  priceIndex: number;
  /** Meziměsíční změna indexu v %. */
  changePct: number;
}

export interface MarketPulseItem {
  key: CommodityKey;
  label: string;
  /** Jednotka zobrazení, např. "Kč/PRMS". */
  unit: string;
  value: number;
  /** Změna oproti minulému měsíci v %. */
  changePct: number;
  /** Posledních 6 měsíců pro sparkline. */
  spark: number[];
}

/** Bod časové řady průměrných cen v ČR. */
export interface PriceTrendPoint extends CommodityPrices {
  /** YYYY-MM */
  month: string;
}

/** Náklad na 1 kWh tepla pro srovnání paliv. */
export interface EnergyCostItem {
  id: string;
  label: string;
  category: FuelCategory;
  /** Kč za kWh energie v palivu. */
  kcPerKwh: number;
  /** Kč za kWh dodaného tepla po zohlednění účinnosti kotle. */
  kcPerKwhHeat: number;
  /** Typická účinnost spalování (0–1). */
  efficiency: number;
}

/* ------------------------------------------------------------------ */
/* CrewAI – Competitive Intelligence                                   */
/* ------------------------------------------------------------------ */

/** 1:1 kopie `CompetitorAnalysisState` (Pydantic) z CrewAI flow. */
export interface CompetitorAnalysisState {
  competitor_url: string;
  /** Markdown report (výstup `analysis_task`). */
  report: string;
  /** Cesta k uloženému souboru v `outputs/`. */
  report_path: string;
}

/** Report z archivu `outputs/` obohacený o metadata API. */
export interface CrewAnalysisReport extends CompetitorAnalysisState {
  /** Název souboru bez přípony, např. `20261110-142233_https-www-drevo-praha-cz`. */
  id: string;
  competitor_name: string;
  competitor_domain: string;
  /** ISO datum vytvoření. */
  created_at: string;
  status: "completed" | "failed";
  /** LLM použitý agenty (env MODEL), např. `anthropic/claude-opus-5-5`. */
  model: string;
  duration_s: number;
  /** Volitelná vazba na prodejce v katalogu. */
  seller_id?: string;
  region?: RegionCode;
  categories?: FuelCategory[];
  /** Volitelně strukturovaná SWOT; jinak ji frontend parsuje z Markdownu. */
  swot?: Swot;
}

/** Stručná položka seznamu reportů (bez těla `report`). */
export type CrewAnalysisReportSummary = Omit<CrewAnalysisReport, "report"> & {
  /** Prvních ~240 znaků sekce Summary. */
  excerpt: string;
};

/** Kroky CrewAI flow `CompetitorAnalysisFlow` (+ agenti `ResearchCrew`). */
export type CrewStepId =
  | "validate_input"
  | "run_research.web_researcher"
  | "run_research.market_analyst"
  | "save_report";

export type CrewStepStatus = "pending" | "running" | "done" | "error";

export interface CrewStep {
  id: CrewStepId;
  /** Název metody flow: validate_input | run_research | save_report. */
  method: "validate_input" | "run_research" | "save_report";
  label: string;
  /** Klíč agenta z agents.yaml (web_researcher | market_analyst). */
  agent?: "web_researcher" | "market_analyst";
  /** Role agenta z agents.yaml. */
  agent_role?: string;
  status: CrewStepStatus;
  started_at?: string;
  finished_at?: string;
}

export interface CrewLogEntry {
  ts: string;
  step: CrewStepId;
  agent?: "web_researcher" | "market_analyst";
  level: "info" | "tool" | "thought" | "success" | "error";
  message: string;
}

export type AnalysisRunStatus = "queued" | "running" | "completed" | "failed";

/** Stav běhu analýzy – vrací `GET /api/analyze/{run_id}`. */
export interface AnalysisRun {
  run_id: string;
  competitor_url: string;
  status: AnalysisRunStatus;
  /** 0–100 */
  progress: number;
  steps: CrewStep[];
  logs: CrewLogEntry[];
  started_at: string;
  finished_at?: string;
  /** Vyplněno po `save_report`. */
  report_id?: string;
  error?: string;
}

export interface StartAnalysisRequest {
  competitor_url: string;
}

export interface StartAnalysisResponse {
  run_id: string;
  status: AnalysisRunStatus;
}

/* ------------------------------------------------------------------ */
/* UI preference                                                       */
/* ------------------------------------------------------------------ */

/** Režim zobrazení ceny: za jednotku (PRMS/t) nebo přepočet na Kč/kWh. */
export type PriceMode = "unit" | "kwh";

export interface UserLocation extends GeoPoint {
  label: string;
  zip?: string;
  region?: RegionCode;
}

/* ------------------------------------------------------------------ */
/* Blog                                                                */
/* ------------------------------------------------------------------ */

/** Rubrika článku (popisky jsou v překladech `blog.categories.*`). */
export type BlogCategory = "rady" | "trh" | "pruvodce";

export type BlogPostStatus = "draft" | "published";

/** Obrázek článku – URL může mířit do /public nebo do Supabase Storage (bucket `blog-images`). */
export interface BlogImage {
  url: string;
  alt: string;
  /** Autor / zdroj fotky, zobrazí se pod obrázkem. */
  credit?: string;
}

export interface BlogAuthor {
  name: string;
  role?: string;
  avatar_url?: string;
}

/**
 * Článek blogu. Tvar odpovídá tabulce `blog_posts` v Supabase
 * (viz `supabase/migrations/*_blog.sql` a mapování v `src/lib/blog/supabase.ts`).
 */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  /** Perex – krátké shrnutí pod nadpisem a v kartách (zároveň výchozí meta description). */
  excerpt: string;
  /** Tělo článku v Markdownu (GFM: nadpisy, seznamy, tabulky, obrázky `![alt](url "popisek")`). */
  content: string;
  cover: BlogImage | null;
  category: BlogCategory;
  tags: string[];
  author: BlogAuthor;
  status: BlogPostStatus;
  /** ISO datum publikace (null = koncept). */
  published_at: string | null;
  updated_at: string;
  reading_minutes: number;
  /** Volitelné přepsání titulku a popisu pro vyhledávače. */
  seo_title?: string | null;
  seo_description?: string | null;
}

/** Článek bez těla – pro výpisy. */
export type BlogPostSummary = Omit<BlogPost, "content">;
