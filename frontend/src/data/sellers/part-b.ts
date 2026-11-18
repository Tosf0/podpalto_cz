import type {
  BriquetteType,
  CoalType,
  DeliveryTerms,
  FuelCategory,
  FuelProduct,
  LogLengthCm,
  Moisture,
  PelletCertification,
  PriceUnit,
  RegionCode,
  Seller,
  SellerIntel,
  SellerSize,
  SellerTag,
  StockLevel,
  WoodForm,
  WoodGroup,
  WoodSpecies,
} from "@/types";
import { daysAgo, priceHistory } from "@/data/helpers";

/* ------------------------------------------------------------------ */
/* Pomocné továrny produktů a prodejců                                 */
/* ------------------------------------------------------------------ */

function prod(
  id: string,
  sellerId: string,
  category: FuelCategory,
  price: number,
  unit: PriceUnit,
  stock: StockLevel,
  days: number,
  fields: Partial<FuelProduct> & { name: string },
): FuelProduct {
  const round = unit === "pytel" ? 1 : 10;
  return {
    ...fields,
    id,
    sellerId,
    category,
    price,
    unit,
    stock,
    priceHistory: priceHistory(id, price, category, round),
    updatedAt: daysAgo(days),
  };
}

interface WoodIn {
  sid: string;
  n: number;
  name: string;
  species: WoodSpecies[];
  group: WoodGroup;
  form: WoodForm;
  moisture: Moisture;
  pct: number;
  log: LogLengthCm;
  unit: "PRMS" | "PRM" | "paleta";
  price: number;
  days: number;
  stock?: StockLevel;
  prm?: number;
  minOrder?: number;
}

function wood(o: WoodIn): FuelProduct {
  return prod(`${o.sid}-p${o.n}`, o.sid, "wood", o.price, o.unit, o.stock ?? "in_stock", o.days, {
    name: o.name,
    woodSpecies: o.species,
    woodGroup: o.group,
    woodForm: o.form,
    moisture: o.moisture,
    moisturePercent: o.pct,
    logLengthCm: o.log,
    packagePrm: o.prm,
    minOrder: o.minOrder,
  });
}

interface PelletIn {
  sid: string;
  n: number;
  name: string;
  cert: PelletCertification;
  dia: number;
  unit: "t" | "paleta" | "pytel";
  price: number;
  days: number;
  kg?: number;
  stock?: StockLevel;
  minOrder?: number;
}

function pellet(o: PelletIn): FuelProduct {
  return prod(`${o.sid}-p${o.n}`, o.sid, "pellets", o.price, o.unit, o.stock ?? "in_stock", o.days, {
    name: o.name,
    certification: o.cert,
    diameterMm: o.dia,
    packageKg: o.kg,
    minOrder: o.minOrder,
  });
}

interface BriquetteIn {
  sid: string;
  n: number;
  name: string;
  type: BriquetteType;
  unit: "t" | "paleta";
  price: number;
  days: number;
  kg?: number;
  stock?: StockLevel;
  minOrder?: number;
}

function briquette(o: BriquetteIn): FuelProduct {
  return prod(`${o.sid}-p${o.n}`, o.sid, "briquettes", o.price, o.unit, o.stock ?? "in_stock", o.days, {
    name: o.name,
    briquetteType: o.type,
    packageKg: o.kg,
    minOrder: o.minOrder,
  });
}

interface CoalIn {
  sid: string;
  n: number;
  name: string;
  type: CoalType;
  price: number;
  days: number;
  stock?: StockLevel;
  minOrder?: number;
}

function coal(o: CoalIn): FuelProduct {
  return prod(`${o.sid}-p${o.n}`, o.sid, "coal", o.price, "t", o.stock ?? "in_stock", o.days, {
    name: o.name,
    coalType: o.type,
    minOrder: o.minOrder,
  });
}

/** Štítky odvozené z dat (aby byly konzistentní), navíc volitelné `extra`. */
function deriveTags(products: FuelProduct[], delivery: DeliveryTerms, extra: SellerTag[] = []): SellerTag[] {
  const tags = new Set<SellerTag>(extra);
  if (products.some((p) => p.stock === "in_stock")) tags.add("skladem");
  if (delivery.hydraulicArm) tags.add("hydraulicka-ruka");
  if (products.some((p) => p.certification === "ENplus A1")) tags.add("enplus-a1");
  if (products.some((p) => p.category === "wood" && p.moisture === "dry" && (p.moisturePercent ?? 99) <= 18)) {
    tags.add("suche-18");
  }
  if (delivery.ownDelivery) tags.add("vlastni-doprava");
  if (delivery.pickupAvailable) tags.add("osobni-odber");
  if ((delivery.freeRadiusKm ?? 0) > 0) tags.add("doprava-zdarma");
  return [...tags];
}

interface SellerSpec {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  ico: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  region: RegionCode;
  lat: number;
  lng: number;
  size: SellerSize;
  foundedYear: number;
  rating: number;
  reviewCount: number;
  description: string;
  scrapedDays: number;
  products: FuelProduct[];
  delivery: DeliveryTerms;
  extraTags?: SellerTag[];
  intel?: SellerIntel;
}

function seller(s: SellerSpec): Seller {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    legalName: s.legalName,
    ico: s.ico,
    website: `https://www.${s.slug}.cz`,
    phone: s.phone,
    email: `info@${s.slug}.cz`,
    description: s.description,
    address: { street: s.street, city: s.city, zip: s.zip, region: s.region },
    location: { lat: s.lat, lng: s.lng },
    size: s.size,
    foundedYear: s.foundedYear,
    rating: s.rating,
    reviewCount: s.reviewCount,
    categories: [...new Set(s.products.map((p) => p.category))],
    tags: deriveTags(s.products, s.delivery, s.extraTags),
    products: s.products,
    delivery: s.delivery,
    intel: s.intel,
    lastScrapedAt: daysAgo(s.scrapedDays),
  };
}

/* ------------------------------------------------------------------ */
/* Prodejci s14–s26                                                    */
/* ------------------------------------------------------------------ */

const s14: Seller = seller({
  id: "s14",
  slug: "hradecke-pelety",
  name: "Hradecké pelety",
  legalName: "Hradecké pelety s.r.o.",
  ico: "27561843",
  phone: "+420 603 118 264",
  street: "Pražská 412",
  city: "Hradec Králové",
  zip: "500 02",
  region: "HKK",
  lat: 50.2148,
  lng: 15.8207,
  size: "medium",
  foundedYear: 2011,
  rating: 4.7,
  reviewCount: 214,
  description:
    "Regionální prodejce pelet ENplus A1 a A2 pro Hradecko a Pardubicko s rozvozem paletových objednávek. Doplňkově nabízí buková štípaná dřeva ze skladu u Hradce Králové.",
  scrapedDays: 3,
  products: [
    pellet({ sid: "s14", n: 1, name: "Pelety ENplus A1 6 mm – paleta 975 kg", cert: "ENplus A1", dia: 6, unit: "paleta", price: 6890, days: 2, kg: 975, minOrder: 1 }),
    pellet({ sid: "s14", n: 2, name: "Pelety ENplus A1 6 mm – pytel 15 kg", cert: "ENplus A1", dia: 6, unit: "pytel", price: 118, days: 2, kg: 15 }),
    pellet({ sid: "s14", n: 3, name: "Pelety ENplus A1 6 mm – volně ložené, 1 t", cert: "ENplus A1", dia: 6, unit: "t", price: 6950, days: 5, stock: "low", minOrder: 1 }),
    pellet({ sid: "s14", n: 4, name: "Pelety ENplus A2 8 mm – paleta 975 kg", cert: "ENplus A2", dia: 8, unit: "paleta", price: 6420, days: 6, kg: 975 }),
    wood({ sid: "s14", n: 5, name: "Bukové štípané dřevo 33 cm, suché (sypané)", species: ["buk"], group: "hard", form: "sypane", moisture: "dry", pct: 16, log: 33, unit: "PRMS", price: 1790, days: 3 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 390,
    pricePerKm: 24,
    freeRadiusKm: 15,
    freeOverQuantity: 3,
    maxRadiusKm: 60,
    notes: "Doprava zdarma do 15 km od skladu a u paletových objednávek nad 3 palety. Paletu skládá řidič z vozíku, hydraulická ruka není k dispozici.",
  },
  intel: {
    reportId: "20261021-110247_https-www-hradecke-pelety-cz",
    analyzedAt: "2026-10-21T11:02:47Z",
    priceIndexVsCz: -5.8,
    positioning:
      "Cenově agresivní regionální dodavatel pelet ENplus A1 a A2, který konkuruje hlavně cenou a rychlým rozvozem paletových objednávek do Hradce Králové a Pardubicka.",
    toneOfVoice:
      "Věcný a přímý tón bez marketingových frází. Stavějí na číslech, úsporách a jasných podmínkách, oslovují zákazníka formálně.",
    usp: [
      "Nejnižší cena paletových pelet ENplus A1 v kraji",
      "Rozvoz paletových objednávek obvykle do 48 hodin",
      "Pelety A2 jako levnější varianta pro běžný provoz kotle",
    ],
    swot: {
      strengths: [
        "Index ceny −5,8 % vůči průměru ČR, výrazně nejlevnější pelety v regionu",
        "Široký výběr pelet v pytlech, paletách i volně ložených",
        "Vlastní vozový park a sklad přímo v Hradci Králové",
      ],
      weaknesses: [
        "Úzká nabídka dřeva, prodávají pouze buk sypaný",
        "Nižší počet recenzí oproti větším dodavatelům",
      ],
      opportunities: [
        "Expanze do Pardubicka a Náchodska, kde chybí levné pelety",
        "Přechod zákazníků ze sypaného dřeva na pelety díky nižší ceně",
      ],
      threats: [
        "Cenová válka s velkoobchodem v Pardubicích",
        "Pokles cen pelet při vyšší sezónní nabídce by snížil jejich marži",
      ],
    },
  },
});

const s15: Seller = seller({
  id: "s15",
  slug: "palivo-pardubice",
  name: "Palivo Pardubice",
  legalName: "Palivo Pardubice s.r.o.",
  ico: "26093418",
  phone: "+420 604 552 917",
  street: "Teplého 1123",
  city: "Pardubice",
  zip: "530 02",
  region: "PAK",
  lat: 50.0292,
  lng: 15.7866,
  size: "medium",
  foundedYear: 2004,
  rating: 4.4,
  reviewCount: 187,
  description:
    "Pardubický prodejce tvrdého i měkkého palivového dřeva s rozšířenou nabídkou březového dřeva a hnědého uhlí pro domácnosti i menší firmy.",
  scrapedDays: 6,
  products: [
    wood({ sid: "s15", n: 1, name: "Bukové štípané dřevo 33 cm, suché (sypané)", species: ["buk"], group: "hard", form: "sypane", moisture: "dry", pct: 17, log: 33, unit: "PRMS", price: 1980, days: 1, minOrder: 2 }),
    wood({ sid: "s15", n: 2, name: "Dubové rovnané dřevo 33 cm, suché (PRM)", species: ["dub"], group: "hard", form: "rovnane", moisture: "dry", pct: 15, log: 33, unit: "PRM", price: 2910, days: 4 }),
    wood({ sid: "s15", n: 3, name: "Březové štípané dřevo 25 cm, suché (sypané)", species: ["briza"], group: "birch", form: "sypane", moisture: "dry", pct: 14, log: 25, unit: "PRMS", price: 1890, days: 8, stock: "low" }),
    wood({ sid: "s15", n: 4, name: "Smrkové štípané dřevo 33 cm, suché (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "dry", pct: 14, log: 33, unit: "PRMS", price: 1390, days: 2 }),
    coal({ sid: "s15", n: 5, name: "Hnědé uhlí ořech 2 – volně ložené, 1 t", type: "hnědé ořech 2", price: 4980, days: 6, minOrder: 1 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: true,
    pickupAvailable: true,
    baseFee: 490,
    pricePerKm: 28,
    freeRadiusKm: 10,
    freeOverQuantity: 6,
    hydraulicArmFee: 450,
    maxRadiusKm: 80,
    notes: "Vlastní vozy s hydraulickou rukou dovezou dřevo do 80 km. Doprava v okruhu 10 km zdarma, nad 6 PRMS bez paušálu.",
  },
});

const s16: Seller = seller({
  id: "s16",
  slug: "orlicke-drevo",
  name: "Orlické dřevo",
  legalName: "Orlické dřevo s.r.o.",
  ico: "25841072",
  phone: "+420 728 340 615",
  street: "Průmyslová 287",
  city: "Ústí nad Orlicí",
  zip: "562 01",
  region: "PAK",
  lat: 49.9781,
  lng: 16.3868,
  size: "small",
  foundedYear: 2012,
  rating: 4.1,
  reviewCount: 58,
  description:
    "Rodinná pila a prodejce dřeva z Orlických hor. Specializuje se na měkké dřevo a metrovky a dováží na objednávku v okruhu 50 km.",
  scrapedDays: 9,
  products: [
    wood({ sid: "s16", n: 1, name: "Smrkové štípané dřevo 33 cm, čerstvé (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "fresh", pct: 44, log: 33, unit: "PRMS", price: 990, days: 3 }),
    wood({ sid: "s16", n: 2, name: "Borovicové štípané dřevo 33 cm, suché (sypané)", species: ["borovice"], group: "soft", form: "sypane", moisture: "dry", pct: 18, log: 33, unit: "PRMS", price: 1340, days: 5 }),
    wood({ sid: "s16", n: 3, name: "Bukové metrovky 100 cm, čerstvé", species: ["buk"], group: "hard", form: "metrovky", moisture: "fresh", pct: 42, log: 100, unit: "PRM", price: 1640, days: 6 }),
    wood({ sid: "s16", n: 4, name: "Bukové rovnané dřevo 33 cm, suché (PRM)", species: ["buk"], group: "hard", form: "rovnane", moisture: "dry", pct: 16, log: 33, unit: "PRM", price: 2850, days: 2, stock: "low" }),
    wood({ sid: "s16", n: 5, name: "Smrkové dřevo na paletě 33 cm, suché", species: ["smrk"], group: "soft", form: "paleta", moisture: "dry", pct: 17, log: 33, unit: "paleta", price: 4290, days: 7, prm: 1.8 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 620,
    pricePerKm: 32,
    freeRadiusKm: 0,
    freeOverQuantity: 6,
    maxRadiusKm: 50,
    notes: "Dovoz vlastním vozidlem do 50 km, dřevo se skládá na zem u zákazníka. Objednávka nad 6 PRMS jede bez paušálu.",
  },
});

const s17: Seller = seller({
  id: "s17",
  slug: "drevo-vysocina",
  name: "Dřevo Vysočina",
  legalName: "Dřevo Vysočina s.r.o.",
  ico: "28317609",
  phone: "+420 606 219 873",
  street: "Jamská 45",
  city: "Jihlava",
  zip: "586 01",
  region: "VYS",
  lat: 49.4012,
  lng: 15.5978,
  size: "medium",
  foundedYear: 2009,
  rating: 4.6,
  reviewCount: 312,
  description:
    "Jihlavský dodavatel palivového dřeva s nejnižšími cenami tvrdého dřeva na Vysočině. Nabízí sypané i rovnané dřevo a složení hydraulickou rukou.",
  scrapedDays: 2,
  products: [
    wood({ sid: "s17", n: 1, name: "Bukové štípané dřevo 33 cm, suché (sypané)", species: ["buk"], group: "hard", form: "sypane", moisture: "dry", pct: 16, log: 33, unit: "PRMS", price: 1690, days: 2 }),
    wood({ sid: "s17", n: 2, name: "Dubové štípané dřevo 33 cm, suché (sypané)", species: ["dub"], group: "hard", form: "sypane", moisture: "dry", pct: 15, log: 33, unit: "PRMS", price: 1830, days: 5 }),
    wood({ sid: "s17", n: 3, name: "Mix tvrdých listnatých, čerstvé štípané (sypané)", species: ["mix-tvrde"], group: "hard", form: "sypane", moisture: "fresh", pct: 45, log: 33, unit: "PRMS", price: 1290, days: 9 }),
    wood({ sid: "s17", n: 4, name: "Smrkové štípané dřevo 40 cm, suché (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "dry", pct: 16, log: 40, unit: "PRMS", price: 1180, days: 4 }),
    wood({ sid: "s17", n: 5, name: "Bukové rovnané dřevo 33 cm, suché (PRM)", species: ["buk"], group: "hard", form: "rovnane", moisture: "dry", pct: 18, log: 33, unit: "PRM", price: 2690, days: 3, stock: "low", minOrder: 2 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: true,
    pickupAvailable: true,
    baseFee: 320,
    pricePerKm: 22,
    freeRadiusKm: 25,
    freeOverQuantity: 6,
    hydraulicArmFee: 380,
    maxRadiusKm: 90,
    notes: "Doprava zdarma do 25 km od Jihlavy. Hydraulická ruka dovezeme dřevo i na místa bez příjezdu nákladního vozu.",
  },
  extraTags: ["platba-kartou"],
  intel: {
    positioning:
      "Nejlevnější zdroj tvrdého dřeva na Vysočině, který cílí na zákazníky citlivé na cenu v okruhu 90 km od Jihlavy.",
    toneOfVoice: "Srozumitelný a přátelský tón, zdůrazňuje férovost a krátké vyřízení objednávky.",
    usp: [
      "Ceny tvrdého dřeva na spodní hranici pásma ČR",
      "Složení hydraulickou rukou bez příplatku nad běžný rámec",
    ],
    swot: {
      strengths: ["Silná cenová pozice v tvrdém dřevě", "Hodnocení 4,6 z více než 300 recenzí"],
      weaknesses: ["Slabší nabídka pelet a briket"],
      opportunities: ["Rozšíření rovnaného dřeva na Vysočinu i do Brna"],
      threats: ["Nedostatek suchého dřeva v jarní sezóně"],
    },
    priceIndexVsCz: -3.1,
    analyzedAt: "2026-10-29T10:12:00Z",
  },
});

const s18: Seller = seller({
  id: "s18",
  slug: "zdarske-pelety",
  name: "Žďárské pelety",
  legalName: "Žďárské pelety a.s.",
  ico: "27904156",
  phone: "+420 732 905 148",
  street: "Vídeňská 1184",
  city: "Žďár nad Sázavou",
  zip: "591 01",
  region: "VYS",
  lat: 49.5580,
  lng: 15.9448,
  size: "small",
  foundedYear: 2016,
  rating: 4.3,
  reviewCount: 96,
  description:
    "Specialista na pelety ENplus A1 a dřevěné brikety pro zákazníky, kteří topí automatickým kotlem nebo kamny na pelety. Dodává převážně paletově.",
  scrapedDays: 4,
  products: [
    pellet({ sid: "s18", n: 1, name: "Pelety ENplus A1 6 mm – volně ložené, 1 t", cert: "ENplus A1", dia: 6, unit: "t", price: 7150, days: 4, minOrder: 1 }),
    pellet({ sid: "s18", n: 2, name: "Pelety ENplus A1 6 mm – pytel 15 kg", cert: "ENplus A1", dia: 6, unit: "pytel", price: 124, days: 3, kg: 15 }),
    pellet({ sid: "s18", n: 3, name: "Pelety ENplus A1 6 mm – paleta 975 kg", cert: "ENplus A1", dia: 6, unit: "paleta", price: 7090, days: 4, kg: 975 }),
    briquette({ sid: "s18", n: 4, name: "Dřevěné brikety RUF – paleta 960 kg", type: "RUF", unit: "paleta", price: 7390, days: 6, kg: 960 }),
    briquette({ sid: "s18", n: 5, name: "Dřevěné brikety PINI KAY – volně ložené, 1 t", type: "PINI KAY", unit: "t", price: 9350, days: 7, stock: "preorder", minOrder: 2 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 480,
    pricePerKm: 26,
    freeRadiusKm: 12,
    freeOverQuantity: 3,
    maxRadiusKm: 70,
    notes: "Pelety a brikety rozvážíme na paletách, nad 3 palety bez poplatku v okruhu 12 km. Vykládka paletovým vozíkem bez hydraulické ruky.",
  },
});

const s19: Seller = seller({
  id: "s19",
  slug: "brnenske-palivo",
  name: "Brněnské palivo",
  legalName: "Brněnské palivo a.s.",
  ico: "26471285",
  phone: "+420 777 014 226",
  street: "Křenová 61",
  city: "Brno",
  zip: "602 00",
  region: "JHM",
  lat: 49.2019,
  lng: 16.6121,
  size: "large",
  foundedYear: 2001,
  rating: 4.8,
  reviewCount: 412,
  description:
    "Největší brněnský dodavatel palivového dřeva, pelet a služeb. Nabízí nejširší výběr dřevin a forem v Jihomoravském kraji s vlastní flotilou a expresním rozvozem.",
  scrapedDays: 1,
  products: [
    wood({ sid: "s19", n: 1, name: "Bukové štípané dřevo 33 cm, suché (sypané)", species: ["buk"], group: "hard", form: "sypane", moisture: "dry", pct: 17, log: 33, unit: "PRMS", price: 2180, days: 1 }),
    wood({ sid: "s19", n: 2, name: "Dubové štípané dřevo 33 cm, suché (sypané)", species: ["dub"], group: "hard", form: "sypane", moisture: "dry", pct: 15, log: 33, unit: "PRMS", price: 2290, days: 2 }),
    wood({ sid: "s19", n: 3, name: "Březové štípané dřevo 25 cm, suché (sypané)", species: ["briza"], group: "birch", form: "sypane", moisture: "dry", pct: 16, log: 25, unit: "PRMS", price: 1960, days: 4 }),
    wood({ sid: "s19", n: 4, name: "Bukové rovnané dřevo 33 cm, suché (PRM)", species: ["buk"], group: "hard", form: "rovnane", moisture: "dry", pct: 15, log: 33, unit: "PRM", price: 3290, days: 3, minOrder: 2 }),
    wood({ sid: "s19", n: 5, name: "Bukové dřevo na paletě 33 cm, suché", species: ["buk"], group: "hard", form: "paleta", moisture: "dry", pct: 16, log: 33, unit: "paleta", price: 4750, days: 2, prm: 1.8 }),
    pellet({ sid: "s19", n: 6, name: "Pelety ENplus A1 6 mm – paleta 975 kg", cert: "ENplus A1", dia: 6, unit: "paleta", price: 8050, days: 5, kg: 975 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: true,
    pickupAvailable: true,
    baseFee: 690,
    pricePerKm: 38,
    freeRadiusKm: 8,
    freeOverQuantity: 6,
    hydraulicArmFee: 550,
    maxRadiusKm: 100,
    notes: "Vlastní flotila s hydraulickou rukou, dojezd do 100 km. Doprava v okruhu 8 km od Brna zdarma, expresní rozvoz do 48 hodin v rámci kraje.",
  },
  extraTags: ["platba-kartou", "expres-48h"],
  intel: {
    reportId: "20261112-160933_https-www-brnenske-palivo-cz",
    analyzedAt: "2026-11-12T16:09:33Z",
    priceIndexVsCz: 1.9,
    positioning:
      "Prémiová brněnská značka s širokým portfoliem dřeva, pelet a služeb. Ceny jsou mírně nad průměrem ČR, zákazník platí za jistotu dodávky, servis a rychlost.",
    toneOfVoice:
      "Profesionální a klidný tón s důrazem na spolehlivost, certifikace a osobní přístup. Oslovují formálně a používají odborné termíny.",
    usp: [
      "Nejširší výběr dřevin a forem v Jihomoravském kraji",
      "Expresní rozvoz do 48 hodin vlastní flotilou s hydraulickou rukou",
      "Dřevo s vlhkostí pod 18 % dostupné po celý rok",
    ],
    swot: {
      strengths: [
        "Největší sklad a flotila v regionu, hodnocení 4,8",
        "Široký sortiment včetně pelet ENplus A1 a rovnaného dřeva",
      ],
      weaknesses: [
        "Ceny o 1,9 % nad průměrem ČR, citlivý zákazník může odejít k levnějšímu konkurentovi",
        "Vyšší paušál za dopravu u menších objednávek",
      ],
      opportunities: [
        "Cílit na firemní odběratele s pravidelnými dodávkami pelet",
        "Rozšířit expresní službu i do Vysočiny a Znojemska",
      ],
      threats: [
        "Levnější prodejci ze Znojma a Vysočiny v okrajových částech kraje",
        "Vyšší mzdové náklady na rozvoz mohou tlačit ceny nahoru",
      ],
    },
  },
});

const s20: Seller = seller({
  id: "s20",
  slug: "znojemske-drevo",
  name: "Znojemské dřevo",
  legalName: "Znojemské dřevo s.r.o.",
  ico: "25613947",
  phone: "+420 739 468 052",
  street: "Dyjská 14",
  city: "Znojmo",
  zip: "669 02",
  region: "JHM",
  lat: 48.8612,
  lng: 16.0430,
  size: "small",
  foundedYear: 1998,
  rating: 4.2,
  reviewCount: 73,
  description:
    "Dřevo z jižní Moravy, především dub a habr. Zákazníci si objednávky vyzvedávají na skladu ve Znojmě.",
  scrapedDays: 12,
  products: [
    wood({ sid: "s20", n: 1, name: "Dubové štípané dřevo 33 cm, suché (sypané)", species: ["dub"], group: "hard", form: "sypane", moisture: "dry", pct: 16, log: 33, unit: "PRMS", price: 1980, days: 3 }),
    wood({ sid: "s20", n: 2, name: "Habrové štípané dřevo 33 cm, suché (sypané)", species: ["habr"], group: "hard", form: "sypane", moisture: "dry", pct: 17, log: 33, unit: "PRMS", price: 1870, days: 6 }),
    wood({ sid: "s20", n: 3, name: "Dubové rovnané dřevo 33 cm, suché (PRM)", species: ["dub"], group: "hard", form: "rovnane", moisture: "dry", pct: 17, log: 33, unit: "PRM", price: 3050, days: 4 }),
    wood({ sid: "s20", n: 4, name: "Mix tvrdých štípaných dřev, polosuché (sypané)", species: ["mix-tvrde"], group: "hard", form: "sypane", moisture: "semi", pct: 27, log: 33, unit: "PRMS", price: 1520, days: 8 }),
    wood({ sid: "s20", n: 5, name: "Dubové metrovky 100 cm, čerstvé", species: ["dub"], group: "hard", form: "metrovky", moisture: "fresh", pct: 46, log: 100, unit: "PRM", price: 1720, days: 9 }),
  ],
  delivery: {
    ownDelivery: false,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 0,
    pricePerKm: 0,
    freeRadiusKm: 0,
    freeOverQuantity: null,
    maxRadiusKm: 0,
    notes: "Pouze osobní odběr na skladu ve Znojmě, Dyjská 14. Dopravu zajišťuje zákazník vlastním vozem nebo přepravcem.",
  },
});

const s21: Seller = seller({
  id: "s21",
  slug: "hanacke-palivo",
  name: "Hanácké palivo",
  legalName: "Hanácké palivo s.r.o.",
  ico: "28105734",
  phone: "+420 601 735 089",
  street: "Tovární 22",
  city: "Olomouc",
  zip: "779 00",
  region: "OLK",
  lat: 49.5876,
  lng: 17.2573,
  size: "medium",
  foundedYear: 2007,
  rating: 4.5,
  reviewCount: 264,
  description:
    "Olomoucký dodavatel tvrdého dřeva, pelet a briket, který v nabídce drží i hnědé uhlí. Ceny patří k nižšímu pásmu v regionu.",
  scrapedDays: 5,
  products: [
    wood({ sid: "s21", n: 1, name: "Habrové štípané dřevo 33 cm, suché (sypané)", species: ["habr"], group: "hard", form: "sypane", moisture: "dry", pct: 17, log: 33, unit: "PRMS", price: 1720, days: 4 }),
    wood({ sid: "s21", n: 2, name: "Mix měkkých štípaných dřev, suché (sypané)", species: ["mix-mekke"], group: "soft", form: "sypane", moisture: "dry", pct: 15, log: 33, unit: "PRMS", price: 1210, days: 3 }),
    pellet({ sid: "s21", n: 3, name: "Pelety ENplus A2 6 mm – paleta 975 kg", cert: "ENplus A2", dia: 6, unit: "paleta", price: 6540, days: 4, kg: 975 }),
    coal({ sid: "s21", n: 4, name: "Hnědé uhlí kostka – volně ložené, 1 t", type: "hnědé kostka", price: 4790, days: 5 }),
    briquette({ sid: "s21", n: 5, name: "Dřevěné brikety válcové – volně ložené, 1 t", type: "válcové", unit: "t", price: 7640, days: 7, stock: "low", minOrder: 1 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 360,
    pricePerKm: 24,
    freeRadiusKm: 20,
    freeOverQuantity: 6,
    maxRadiusKm: 60,
    notes: "Rozvoz po Olomouckém kraji vlastními vozy, do 20 km zdarma. Nad 6 PRMS nebo 6 t se paušál za dopravu neúčtuje.",
  },
  intel: {
    positioning:
      "Olomoucký hráč s nižšími cenami tvrdého dřeva a pelet, který oslovuje rodiny z okolních obcí.",
    toneOfVoice: "Přátelský a regionální, s důrazem na domácí původ dřeva a osobní jednání.",
    usp: [
      "Ceny tvrdého dřeva ve spodní části pásma pro Olomoucký kraj",
      "Kombinace dřeva, pelet a briket z jednoho místa",
    ],
    swot: {
      strengths: ["Pevná pozice v Olomouci a okolí", "Ceny pelet ENplus A2 pod průměrem"],
      weaknesses: ["Úzký sortiment briket a uhlí"],
      opportunities: ["Online objednávky pro zákazníky z Prostějova a Přerova"],
      threats: ["Konkurence velkých dodavatelů v Olomouci"],
    },
    priceIndexVsCz: -2.4,
    analyzedAt: "2026-11-04T14:30:00Z",
  },
});

const s22: Seller = seller({
  id: "s22",
  slug: "jesenicke-drevo",
  name: "Jesenické dřevo",
  legalName: "Jesenické dřevo s.r.o.",
  ico: "27738209",
  phone: "+420 720 384 561",
  street: "Dukelská 9",
  city: "Šumperk",
  zip: "787 01",
  region: "OLK",
  lat: 49.9598,
  lng: 16.9764,
  size: "small",
  foundedYear: 1994,
  rating: 4.0,
  reviewCount: 39,
  description:
    "Šumperský prodejce měkkého dřeva z Jeseníků, který nabízí smrk, borovici a březové dřevo. Vybavení s hydraulickou rukou usnadňuje dodávky do horských obcí.",
  scrapedDays: 8,
  products: [
    wood({ sid: "s22", n: 1, name: "Smrkové štípané dřevo 33 cm, suché (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "dry", pct: 17, log: 33, unit: "PRMS", price: 1290, days: 2 }),
    wood({ sid: "s22", n: 2, name: "Smrkové štípané dřevo 33 cm, čerstvé (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "fresh", pct: 42, log: 33, unit: "PRMS", price: 960, days: 5 }),
    wood({ sid: "s22", n: 3, name: "Borovicové štípané dřevo 33 cm, suché (sypané)", species: ["borovice"], group: "soft", form: "sypane", moisture: "dry", pct: 18, log: 33, unit: "PRMS", price: 1250, days: 6 }),
    wood({ sid: "s22", n: 4, name: "Smrkové dřevo na paletě 33 cm, suché", species: ["smrk"], group: "soft", form: "paleta", moisture: "dry", pct: 18, log: 33, unit: "paleta", price: 3980, days: 4, prm: 1.8 }),
    wood({ sid: "s22", n: 5, name: "Březové štípané dřevo 25 cm, suché (sypané)", species: ["briza"], group: "birch", form: "sypane", moisture: "dry", pct: 15, log: 25, unit: "PRMS", price: 1760, days: 3, stock: "low" }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: true,
    pickupAvailable: true,
    baseFee: 420,
    pricePerKm: 30,
    freeRadiusKm: 10,
    freeOverQuantity: 6,
    hydraulicArmFee: 340,
    maxRadiusKm: 80,
    notes: "Hydraulická ruka pro místa hůř přístupná v Jeseníkách. Doprava do 10 km od Šumperka zdarma.",
  },
});

const s23: Seller = seller({
  id: "s23",
  slug: "valasske-drevo",
  name: "Valašské dřevo",
  legalName: "Valašské dřevo s.r.o.",
  ico: "26082456",
  phone: "+420 775 620 304",
  street: "Rožnovská 77",
  city: "Vsetín",
  zip: "755 01",
  region: "ZLK",
  lat: 49.3441,
  lng: 17.9891,
  size: "small",
  foundedYear: 2014,
  rating: 4.8,
  reviewCount: 128,
  description:
    "Vsetínská rodinná firma s vlastní pilou. Nabízí bukové a smíšené tvrdé dřevo za příznivé ceny a čerstvé smrkové dřevo pro přípravu na další sezónu.",
  scrapedDays: 7,
  products: [
    wood({ sid: "s23", n: 1, name: "Bukové štípané dřevo 33 cm, suché (sypané)", species: ["buk"], group: "hard", form: "sypane", moisture: "dry", pct: 18, log: 33, unit: "PRMS", price: 1710, days: 1 }),
    wood({ sid: "s23", n: 2, name: "Mix tvrdých štípaných dřev 33 cm, suché (sypané)", species: ["mix-tvrde"], group: "hard", form: "sypane", moisture: "dry", pct: 16, log: 33, unit: "PRMS", price: 1650, days: 3 }),
    wood({ sid: "s23", n: 3, name: "Smrkové štípané dřevo 33 cm, čerstvé (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "fresh", pct: 41, log: 33, unit: "PRMS", price: 870, days: 6 }),
    wood({ sid: "s23", n: 4, name: "Bukové metrovky 100 cm, čerstvé", species: ["buk"], group: "hard", form: "metrovky", moisture: "fresh", pct: 39, log: 100, unit: "PRM", price: 1520, days: 8 }),
    wood({ sid: "s23", n: 5, name: "Bukové rovnané dřevo 33 cm, suché (PRM)", species: ["buk"], group: "hard", form: "rovnane", moisture: "dry", pct: 17, log: 33, unit: "PRM", price: 2620, days: 5 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 260,
    pricePerKm: 22,
    freeRadiusKm: 25,
    freeOverQuantity: 6,
    maxRadiusKm: 50,
    notes: "Dovoz dřeva do 50 km po Valašsku, do 25 km zdarma. Složení dřeva zajišťuje řidič na místě bez hydraulické ruky.",
  },
  extraTags: ["fsc-pefc"],
  intel: {
    positioning:
      "Lokální rodinná firma z Valašska, která stojí na poctivém tvrdém dřevu a osobní péči o zákazníka v okolních obcích.",
    toneOfVoice: "Osobní a laskavý tón, zdůrazňuje rodinnou tradici a původ dřeva z regionu.",
    usp: [
      "Vlastní pila a dřevo z lokálních zdrojů s certifikací FSC/PEFC",
      "Doprava do 25 km zdarma",
    ],
    swot: {
      strengths: ["Vysoké hodnocení 4,8 od zákazníků", "Konkurenceschopné ceny buku"],
      weaknesses: ["Nedostatečné kapacity při špičce sezóny"],
      opportunities: ["Rozšíření čerstvého dřeva pro přípravu na sezónu 2027"],
      threats: ["Kolísání dostupnosti surového dřeva z lesů"],
    },
    priceIndexVsCz: 0.6,
    analyzedAt: "2026-11-07T09:45:00Z",
  },
});

const s24: Seller = seller({
  id: "s24",
  slug: "zlinske-pelety-a-brikety",
  name: "Zlínské pelety a brikety",
  legalName: "Zlínské pelety a brikety s.r.o.",
  ico: "28461730",
  phone: "+420 605 931 477",
  street: "Vavrečkova 5241",
  city: "Zlín",
  zip: "760 01",
  region: "ZLK",
  lat: 49.2213,
  lng: 17.6758,
  size: "medium",
  foundedYear: 2016,
  rating: 4.5,
  reviewCount: 201,
  description:
    "Zlínský specialista na pelety a dřevěné brikety. Zboží je připraveno na skladě, zákazníci si ho vyzvedávají osobně.",
  scrapedDays: 10,
  products: [
    pellet({ sid: "s24", n: 1, name: "Pelety ENplus A1 6 mm – volně ložené, 1 t", cert: "ENplus A1", dia: 6, unit: "t", price: 7390, days: 3, minOrder: 1 }),
    pellet({ sid: "s24", n: 2, name: "Pelety ENplus A1 6 mm – pytel 15 kg", cert: "ENplus A1", dia: 6, unit: "pytel", price: 126, days: 5, kg: 15 }),
    pellet({ sid: "s24", n: 3, name: "Pelety ENplus A1 6 mm – paleta 975 kg", cert: "ENplus A1", dia: 6, unit: "paleta", price: 7190, days: 3, kg: 975 }),
    pellet({ sid: "s24", n: 4, name: "Pelety ENplus A2 8 mm – volně ložené, 1 t", cert: "ENplus A2", dia: 8, unit: "t", price: 6870, days: 6, stock: "low" }),
    briquette({ sid: "s24", n: 5, name: "Dřevěné brikety PINI KAY – paleta 960 kg", type: "PINI KAY", unit: "paleta", price: 8880, days: 4, kg: 960, stock: "preorder" }),
    briquette({ sid: "s24", n: 6, name: "Dřevěné brikety válcové – volně ložené, 1 t", type: "válcové", unit: "t", price: 7690, days: 7 }),
  ],
  delivery: {
    ownDelivery: false,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 0,
    pricePerKm: 0,
    freeRadiusKm: 0,
    freeOverQuantity: null,
    maxRadiusKm: 0,
    notes: "Pouze osobní odběr ve skladu ve Zlíně. Objednávky lze vyzvednout po předchozí domluvě telefonicky nebo e-mailem.",
  },
  extraTags: ["platba-kartou"],
});

const s25: Seller = seller({
  id: "s25",
  slug: "ostravske-uhli-a-drevo",
  name: "Ostravské uhlí a dřevo",
  legalName: "Ostravské uhlí a dřevo a.s.",
  ico: "25960314",
  phone: "+420 778 412 069",
  street: "Hlubinská 45",
  city: "Ostrava",
  zip: "702 00",
  region: "MSK",
  lat: 49.8267,
  lng: 18.2561,
  size: "large",
  foundedYear: 1999,
  rating: 4.6,
  reviewCount: 466,
  description:
    "Ostravský velkoobchod s hnědým i černým uhlím, koksem a brikety. Doplňkově nabízí buková štípaná dřeva a je nejlevnějším zdrojem uhlí v Moravskoslezském kraji.",
  scrapedDays: 3,
  products: [
    coal({ sid: "s25", n: 1, name: "Hnědé uhlí ořech 2 – volně ložené, 1 t", type: "hnědé ořech 2", price: 4340, days: 1, minOrder: 1 }),
    coal({ sid: "s25", n: 2, name: "Hnědé uhlí kostka – volně ložené, 1 t", type: "hnědé kostka", price: 4640, days: 2 }),
    coal({ sid: "s25", n: 3, name: "Černé uhlí ořech – volně ložené, 1 t", type: "černé ořech", price: 9280, days: 3 }),
    coal({ sid: "s25", n: 4, name: "Koks – volně ložené, 1 t", type: "koks", price: 12690, days: 4, stock: "low" }),
    briquette({ sid: "s25", n: 5, name: "Hnědouhelné brikety – volně ložené, 1 t", type: "hnědouhelné", unit: "t", price: 5790, days: 5 }),
    wood({ sid: "s25", n: 6, name: "Bukové štípané dřevo 33 cm, suché (sypané)", species: ["buk"], group: "hard", form: "sypane", moisture: "dry", pct: 17, log: 33, unit: "PRMS", price: 1740, days: 2 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: false,
    pickupAvailable: true,
    baseFee: 450,
    pricePerKm: 34,
    freeRadiusKm: 15,
    freeOverQuantity: 5,
    maxRadiusKm: 70,
    notes: "Uhlí a brikety vozíme nákladními vozy s překlápěním do 70 km. Doprava do 15 km od Ostravy zdarma u objednávek nad 5 t.",
  },
  extraTags: ["platba-kartou"],
  intel: {
    reportId: "20261008-084520_https-www-ostravske-uhli-a-drevo-cz",
    analyzedAt: "2026-10-08T08:45:20Z",
    priceIndexVsCz: -7.4,
    positioning:
      "Levný dodavatel uhlí v Moravskoslezském kraji, který přitahuje zákazníky citlivé na cenu. Dřevo a brikety nabízí jako doplněk k uhlí.",
    toneOfVoice:
      "Neformální a přátelský tón s regionálním nádechem. Zdůrazňují úsporu a jednoduchost objednávky.",
    usp: [
      "Nejnižší cena hnědého uhlí ořech 2 v ČR",
      "Uhlí, dřevo i brikety z jednoho místa",
      "Osobní odběr ve skladu v Ostravě",
    ],
    swot: {
      strengths: [
        "Index ceny −7,4 % vůči průměru ČR, nejsilnější cenová pozice v uhlí",
        "Velký sklad a vlastní flotila nákladních vozů",
      ],
      weaknesses: [
        "Dřevo tvoří jen malou část tržeb a sortiment je úzký",
        "Image levného uhlí, které některé zákazníky odrazuje od ekologičtějších paliv",
      ],
      opportunities: [
        "Rozvoz briket a dřeva do Beskyd a na Těšínsko",
        "Nabídka topné sezóny s předplatnými dodávkami uhlí",
      ],
      threats: [
        "Regulace prodeje uhlí a přísnější emisní pravidla pro domácí topeniště",
        "Přechod domácností na plyn a tepelná čerpadla snižuje poptávku",
      ],
    },
  },
});

const s26: Seller = seller({
  id: "s26",
  slug: "beskydske-drevo",
  name: "Beskydské dřevo",
  legalName: "Beskydské dřevo s.r.o.",
  ico: "27319586",
  phone: "+420 737 186 025",
  street: "Těšínská 1020",
  city: "Frýdek-Místek",
  zip: "738 01",
  region: "MSK",
  lat: 49.6781,
  lng: 18.3572,
  size: "small",
  foundedYear: 2003,
  rating: 4.1,
  reviewCount: 27,
  description:
    "Dřevo z Beskyd, především smrk, modřín a březové dřevo. Dodává do Frýdku-Místku a okolních obcí vlastní technikou.",
  scrapedDays: 15,
  products: [
    wood({ sid: "s26", n: 1, name: "Smrkové štípané dřevo 33 cm, suché (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "dry", pct: 18, log: 33, unit: "PRMS", price: 1240, days: 4 }),
    wood({ sid: "s26", n: 2, name: "Smrkové štípané dřevo 33 cm, čerstvé (sypané)", species: ["smrk"], group: "soft", form: "sypane", moisture: "fresh", pct: 40, log: 33, unit: "PRMS", price: 930, days: 7 }),
    wood({ sid: "s26", n: 3, name: "Modřínové štípané dřevo 33 cm, suché (sypané)", species: ["modrin"], group: "soft", form: "sypane", moisture: "dry", pct: 14, log: 33, unit: "PRMS", price: 1430, days: 3 }),
    wood({ sid: "s26", n: 4, name: "Smrkové dřevo na paletě 33 cm, suché", species: ["smrk"], group: "soft", form: "paleta", moisture: "dry", pct: 17, log: 33, unit: "paleta", price: 4390, days: 5, prm: 1.8 }),
    wood({ sid: "s26", n: 5, name: "Bukové metrovky 100 cm, čerstvé", species: ["buk"], group: "hard", form: "metrovky", moisture: "fresh", pct: 44, log: 100, unit: "PRM", price: 1690, days: 9 }),
    wood({ sid: "s26", n: 6, name: "Březové štípané dřevo 25 cm, suché (sypané)", species: ["briza"], group: "birch", form: "sypane", moisture: "dry", pct: 15, log: 25, unit: "PRMS", price: 1990, days: 6 }),
  ],
  delivery: {
    ownDelivery: true,
    hydraulicArm: true,
    pickupAvailable: true,
    baseFee: 690,
    pricePerKm: 42,
    freeRadiusKm: 0,
    freeOverQuantity: 6,
    hydraulicArmFee: 580,
    maxRadiusKm: 60,
    notes: "Dovoz do 60 km v Beskydech. Dřevo složí hydraulická ruka u zákazníka. Při objednávce nad 6 PRMS účtujeme pouze příplatek za ruku.",
  },
});

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export const SELLERS_B: Seller[] = [s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25, s26];
