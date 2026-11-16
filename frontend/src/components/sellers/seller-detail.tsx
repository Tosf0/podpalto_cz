"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Check,
  ExternalLink,
  GitCompareArrows,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Store,
  Truck,
  X,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CommodityKey, FuelProduct, PriceTrendPoint, RegionStats, Seller } from "@/types";
import { COMMODITY_META, FUEL_META, REGIONS, WOOD_FORMS, WOOD_SPECIES } from "@/lib/constants";
import {
  formatCzk,
  formatCzkPerUnit,
  formatDate,
  formatKm,
  formatKwhPrice,
  formatMonth,
  formatNumber,
  formatPct,
  formatRelative,
} from "@/lib/format";
import {
  baseUnitLabel,
  estimateDelivery,
  pricePerBaseUnit,
  pricePerKwh,
  productWoodGroup,
  unitsForBaseQuantity,
} from "@/lib/pricing";
import { getSeller } from "@/lib/api/sellers";
import { getPriceTrends, getRegionStats } from "@/lib/api/market";
import { useApi } from "@/hooks/use-api";
import { usePreferences } from "@/components/providers/preferences-provider";
import { SwotMatrix } from "@/components/ci/swot-matrix";
import { EmptyState, FuelBadge, PriceDelta, SellerTags, StarRating, StockBadge } from "@/components/common";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SIZE_LABEL, THREAT_META } from "./seller-utils";

/* ------------------------------------------------------------------ */
/* Pomocné funkce                                                      */
/* ------------------------------------------------------------------ */

function commodityKey(p: FuelProduct): CommodityKey {
  switch (p.category) {
    case "wood":
      return productWoodGroup(p) === "soft" ? "softWoodPrms" : "hardWoodPrms";
    case "pellets":
      return "pelletsT";
    case "briquettes":
      return "briquettesT";
    case "coal":
      return "coalT";
  }
}

function productParams(p: FuelProduct): string[] {
  const out: string[] = [];
  if (p.woodSpecies?.length) out.push(p.woodSpecies.map((s) => WOOD_SPECIES[s].label).join(", "));
  if (p.woodForm) out.push(WOOD_FORMS[p.woodForm].label);
  if (p.moisturePercent !== undefined) out.push(`vlhkost ${formatNumber(p.moisturePercent)} %`);
  if (p.logLengthCm) out.push(`${p.logLengthCm} cm`);
  if (p.certification) out.push(p.certification);
  if (p.diameterMm) out.push(`Ø ${p.diameterMm} mm`);
  if (p.briquetteType) out.push(p.briquetteType);
  if (p.coalType) out.push(p.coalType);
  if (p.packageKg && (p.unit === "paleta" || p.unit === "pytel")) out.push(`${formatNumber(p.packageKg)} kg`);
  return out;
}

function yearChange(p: FuelProduct): number | null {
  const h = p.priceHistory;
  if (h.length < 2 || h[0].price === 0) return null;
  return ((h[h.length - 1].price - h[0].price) / h[0].price) * 100;
}

function cheapestBase(seller: Seller, key: CommodityKey): number | undefined {
  const pool = seller.products.filter((p) => commodityKey(p) === key && p.stock !== "out_of_stock");
  if (!pool.length) return undefined;
  return Math.min(...pool.map(pricePerBaseUnit));
}

/* ------------------------------------------------------------------ */
/* Sekce                                                               */
/* ------------------------------------------------------------------ */

function Section({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4 flex items-start gap-3">
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-4.5">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero({ seller }: { seller: Seller }) {
  const { compareIds, toggleCompare } = usePreferences();
  const inCompare = compareIds.includes(seller.id);
  const a = seller.address;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {seller.categories.map((c) => (
              <FuelBadge key={c} category={c} />
            ))}
          </div>
          <h1 className="text-2xl font-semibold text-balance sm:text-3xl">{seller.name}</h1>
          {seller.legalName && <p className="text-sm text-muted-foreground">{seller.legalName}</p>}
          <StarRating rating={seller.rating} reviewCount={seller.reviewCount} size="md" />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant={inCompare ? "secondary" : "default"} onClick={() => toggleCompare(seller.id)}>
            {inCompare ? <Check /> : <GitCompareArrows />}
            {inCompare ? "V porovnání" : "Porovnat"}
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <MapPin />
            Zobrazit na mapě
          </Link>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm text-muted-foreground sm:text-base">{seller.description}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label="Adresa">
          {a.street}
          <br />
          {a.zip} {a.city}
        </Fact>
        <Fact label="Kraj">{REGIONS[a.region].name}</Fact>
        {seller.ico && (
          <Fact label="IČO">
            <span className="num">{seller.ico}</span>
          </Fact>
        )}
        <Fact label="Velikost">{SIZE_LABEL[seller.size]} prodejce</Fact>
        {seller.foundedYear && (
          <Fact label="Založeno">
            <span className="num">{seller.foundedYear}</span>
          </Fact>
        )}
        <Fact label="Web">
          <a
            href={seller.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 break-all text-primary hover:underline"
          >
            <Globe className="size-3.5 shrink-0" />
            {seller.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </Fact>
        {seller.phone && (
          <Fact label="Telefon">
            <a href={`tel:${seller.phone.replace(/\s/g, "")}`} className="num inline-flex items-center gap-1 hover:text-primary">
              <Phone className="size-3.5" />
              {seller.phone}
            </a>
          </Fact>
        )}
        {seller.email && (
          <Fact label="E-mail">
            <a href={`mailto:${seller.email}`} className="inline-flex items-center gap-1 break-all hover:text-primary">
              <Mail className="size-3.5 shrink-0" />
              {seller.email}
            </a>
          </Fact>
        )}
      </dl>

      {seller.tags.length > 0 && <SellerTags tags={seller.tags} className="mt-5" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ceník + graf                                                        */
/* ------------------------------------------------------------------ */

function PriceHistoryChart({
  product,
  trends,
}: {
  product: FuelProduct;
  trends: PriceTrendPoint[] | undefined;
}) {
  const color = FUEL_META[product.category].color;
  const data = product.priceHistory.map((h) => ({ month: h.date, price: h.price }));
  const baseUnit = baseUnitLabel(product.category);
  const key = commodityKey(product);
  const czAvg = product.unit === baseUnit && trends?.length ? trends[trends.length - 1][key] : undefined;
  const values = data.map((d) => d.price).concat(czAvg ? [czAvg] : []);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, max * 0.02);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-xs text-muted-foreground">Vývoj ceny za posledních 12 měsíců, Kč/{product.unit}</p>
        </div>
        {czAvg && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed border-muted-foreground" />
            Průměr ČR ({COMMODITY_META[key].label}): <span className="num">{formatCzk(czAvg)}</span>
          </span>
        )}
      </div>
      <div className="h-64 w-full" role="img" aria-label={`Graf vývoje ceny produktu ${product.name}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
              tickFormatter={(v: number) => formatNumber(v)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              labelFormatter={(l) => formatMonth(String(l))}
              formatter={(v) => [formatCzkPerUnit(Number(v), product.unit), "Cena"]}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            {czAvg && (
              <ReferenceLine y={czAvg} stroke="var(--muted-foreground)" strokeDasharray="5 4" ifOverflow="extendDomain" />
            )}
            <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PriceList({ seller }: { seller: Seller }) {
  const [selectedId, setSelectedId] = useState<string>();
  const { data: trends } = useApi(() => getPriceTrends(12), []);
  const selected = seller.products.find((p) => p.id === selectedId) ?? seller.products[0];

  if (seller.products.length === 0) {
    return (
      <Section title="Kompletní ceník" icon={<Store />}>
        <EmptyState title="Prodejce zatím nemá žádné sledované produkty" />
      </Section>
    );
  }

  return (
    <Section
      title="Kompletní ceník"
      description="Kliknutím na řádek zobrazíte vývoj ceny produktu."
      icon={<Store />}
    >
      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Produkt</TableHead>
              <TableHead>Parametry</TableHead>
              <TableHead className="text-right">Cena</TableHead>
              <TableHead className="text-right">Kč/kWh</TableHead>
              <TableHead className="text-right">Za základní j.</TableHead>
              <TableHead>Sklad</TableHead>
              <TableHead className="text-right">12 měs.</TableHead>
              <TableHead>Aktualizace</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seller.products.map((p) => {
              const active = p.id === selected.id;
              const change = yearChange(p);
              return (
                <TableRow
                  key={p.id}
                  tabIndex={0}
                  aria-selected={active}
                  data-state={active ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(p.id);
                    }
                  }}
                >
                  <TableCell className="min-w-48 whitespace-normal">
                    <div className="font-medium">{p.name}</div>
                    <div className="mt-0.5">
                      <FuelBadge category={p.category} size="sm" showIcon={false} />
                    </div>
                  </TableCell>
                  <TableCell className="min-w-56 whitespace-normal text-xs text-muted-foreground">
                    {productParams(p).join(" · ") || "–"}
                  </TableCell>
                  <TableCell className="num whitespace-nowrap text-right font-semibold">
                    {formatCzkPerUnit(p.price, p.unit)}
                  </TableCell>
                  <TableCell className="num whitespace-nowrap text-right">{formatKwhPrice(pricePerKwh(p))}</TableCell>
                  <TableCell className="num whitespace-nowrap text-right text-muted-foreground">
                    {formatCzkPerUnit(pricePerBaseUnit(p), baseUnitLabel(p.category))}
                  </TableCell>
                  <TableCell>
                    <StockBadge stock={p.stock} />
                  </TableCell>
                  <TableCell className="text-right">
                    {change === null ? "–" : <PriceDelta value={change} />}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatRelative(p.updatedAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="mt-6">
        <PriceHistoryChart product={selected} trends={trends} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Doprava                                                             */
/* ------------------------------------------------------------------ */

function DeliverySection({ seller }: { seller: Seller }) {
  const { location } = usePreferences();
  const d = seller.delivery;

  const woodMain = seller.products.find((p) => p.category === "wood" && p.unit === "PRMS") ??
    seller.products.find((p) => p.category === "wood");
  const pallet = seller.products.find((p) => p.unit === "paleta");

  const examples = [
    woodMain && { label: "5 PRMS dřeva", qty: unitsForBaseQuantity(woodMain, 5) },
    pallet && { label: "1 paleta", qty: 1 },
  ].filter(Boolean) as { label: string; qty: number }[];

  const estimate = estimateDelivery(seller, location, 1);

  return (
    <Section title="Doprava" description="Podmínky dopravy a odhad pro vaši lokalitu." icon={<Truck />}>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Fact label="Způsob">{d.ownDelivery ? "Vlastní doprava" : "Pouze osobní odběr"}</Fact>
          <Fact label="Osobní odběr">{d.pickupAvailable ? "Možný" : "Nenabízí se"}</Fact>
          {d.ownDelivery && (
            <>
              <Fact label="Paušál">
                <span className="num">{formatCzk(d.baseFee)}</span>
              </Fact>
              <Fact label="Cena za km">
                <span className="num">{formatCzk(d.pricePerKm)}/km</span>
              </Fact>
              <Fact label="Zdarma do">
                <span className="num">{d.freeRadiusKm > 0 ? formatKm(d.freeRadiusKm) : "–"}</span>
              </Fact>
              <Fact label="Zdarma od množství">
                <span className="num">{d.freeOverQuantity != null ? formatNumber(d.freeOverQuantity) : "–"}</span>
              </Fact>
              <Fact label="Max. dojezd">
                <span className="num">{formatKm(d.maxRadiusKm)}</span>
              </Fact>
            </>
          )}
          <Fact label="Hydraulická ruka">
            {d.hydraulicArm ? (
              <span>
                Ano{d.hydraulicArmFee ? <>, příplatek <span className="num">{formatCzk(d.hydraulicArmFee)}</span></> : ""}
              </span>
            ) : (
              "Ne"
            )}
          </Fact>
          {d.notes && (
            <div className="col-span-2 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{d.notes}</div>
          )}
        </dl>

        <div className="h-full space-y-3 rounded-xl bg-secondary p-4">
          <p className="text-xs font-medium tracking-wider text-wood-strong uppercase">Odhad pro: {location.label}</p>
          <p className="text-sm">
            Vzdálenost po silnici cca <span className="num font-semibold">{formatKm(estimate.distanceKm)}</span>
          </p>
          {estimate.outOfRange ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <X className="mt-0.5 size-4 shrink-0 text-clay" />
              Mimo dojezd vlastní dopravy – zbývá osobní odběr.
            </p>
          ) : (
            <ul className="divide-y divide-border/70 text-sm">
              {examples.map((ex) => {
                const est = estimateDelivery(seller, location, ex.qty, false);
                return (
                  <li key={ex.label} className="flex items-center justify-between gap-3 py-2">
                    <span>Dovoz: {ex.label}</span>
                    <span className="num font-semibold">{est.free ? "zdarma" : formatCzk(est.fee)}</span>
                  </li>
                );
              })}
              {examples.length === 0 && (
                <li className="flex items-center justify-between gap-3 py-2">
                  <span>Dovoz 1 jednotky</span>
                  <span className="num font-semibold">{estimate.free ? "zdarma" : formatCzk(estimate.fee)}</span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Competitive Intelligence                                            */
/* ------------------------------------------------------------------ */

function CompareBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "seller" | "region" | "cz";
}) {
  const color = tone === "seller" ? "bg-primary" : tone === "region" ? "bg-moss/70" : "bg-coal/40";
  return (
    <div className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3 text-sm">
      <span className={cn("truncate", tone === "seller" && "font-medium")}>{label}</span>
      <div className="h-2.5 overflow-hidden rounded-md bg-muted">
        <div className={cn("h-full rounded-md", color)} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
      </div>
      <span className="num text-right font-medium">{formatCzk(value)}</span>
    </div>
  );
}

function PriceComparison({ seller }: { seller: Seller }) {
  const { data: regions } = useApi(() => getRegionStats(), []);
  const { data: trends } = useApi(() => getPriceTrends(12), []);
  const regionStats: RegionStats | undefined = regions?.find((r) => r.region === seller.address.region);
  const cz = trends?.length ? trends[trends.length - 1] : undefined;

  const rows = ([
    { key: "hardWoodPrms", label: "Tvrdé dřevo", unit: "PRMS" },
    { key: "pelletsT", label: "Pelety", unit: "t" },
  ] as const)
    .map((r) => ({ ...r, seller: cheapestBase(seller, r.key) }))
    .filter((r) => r.seller !== undefined);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-5">
      {rows.map((r) => {
        const regionAvg = regionStats?.avgPrices[r.key];
        const czAvg = cz?.[r.key];
        const max = Math.max(r.seller!, regionAvg ?? 0, czAvg ?? 0);
        return (
          <div key={r.key} className="space-y-2">
            <h4 className="text-sm font-medium">
              {r.label} <span className="font-normal text-muted-foreground">(nejlevnější, Kč/{r.unit})</span>
            </h4>
            <CompareBar label={seller.name} value={r.seller!} max={max} tone="seller" />
            {regionAvg !== undefined && (
              <CompareBar label={`Ø ${REGIONS[seller.address.region].short}`} value={regionAvg} max={max} tone="region" />
            )}
            {czAvg !== undefined && <CompareBar label="Ø ČR" value={czAvg} max={max} tone="cz" />}
          </div>
        );
      })}
    </div>
  );
}

function IntelSection({ seller }: { seller: Seller }) {
  const intel = seller.intel;
  if (!intel) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-moss/40 bg-accent p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-accent-foreground">
            <Brain className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Zatím bez konkurenční analýzy</h2>
            <p className="text-sm text-muted-foreground">
              Nechte CrewAI agenty projít web prodejce a připravit SWOT, positioning a cenové srovnání.
            </p>
          </div>
        </div>
        <Link
          href={`/ci-studio?url=${encodeURIComponent(seller.website)}`}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
        >
          <Sparkles />
          Spustit AI analýzu konkurenta
        </Link>
      </section>
    );
  }

  const threat = THREAT_META[intel.threatLevel];
  return (
    <Section
      title="Competitive Intelligence"
      description={`Z dat CrewAI · analyzováno ${formatDate(intel.analyzedAt)}`}
      icon={<Brain />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-secondary p-4 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">Positioning</p>
            <p className="mt-1 text-sm">{intel.positioning}</p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Tón komunikace</p>
            <p className="mt-1 text-sm">{intel.toneOfVoice}</p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-xs font-medium text-muted-foreground">Úroveň hrozby</p>
            <span
              className={cn(
                "mt-1.5 inline-flex items-center rounded-lg border px-2.5 py-0.5 text-sm font-medium",
                threat.className,
              )}
            >
              {threat.label}
            </span>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Cenový index vs. ČR</p>
            <p className="mt-1">
              <PriceDelta value={intel.priceIndexVsCz} />
            </p>
          </div>
        </div>

        {intel.usp.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Unikátní prodejní argumenty (USP)</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {intel.usp.map((u) => (
                <li key={u} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-moss-strong" />
                  {u}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium">SWOT analýza</h3>
          <SwotMatrix swot={intel.swot} />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">Cenové srovnání</h3>
          <PriceComparison seller={seller} />
          <p className="mt-3 text-xs text-muted-foreground">
            Cenový index prodejce vůči průměru ČR: <span className="num">{formatPct(intel.priceIndexVsCz)}</span>{" "}
            (záporná hodnota = levnější než průměr).
          </p>
        </div>

        {intel.reportId && (
          <Link
            href={`/ci-studio?report=${encodeURIComponent(intel.reportId)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <ExternalLink />
            Otevřít celý report v CI Studiu
          </Link>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Hlavní komponenta                                                   */
/* ------------------------------------------------------------------ */

export function SellerDetail({ slug }: { slug: string }) {
  const { data: seller, loading, error, reload } = useApi(() => getSeller(slug), [slug]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Drobečková navigace" className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/prodejci" className="hover:text-foreground">
              Prodejci
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-foreground" aria-current="page">
            {seller?.name ?? "…"}
          </li>
        </ol>
        <Link href="/prodejci" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Zpět na katalog
        </Link>
      </nav>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <EmptyState
          title="Profil se nepodařilo načíst"
          description={error.message}
          action={<Button onClick={reload}>Zkusit znovu</Button>}
        />
      ) : !seller ? (
        <EmptyState
          icon={<Calendar />}
          title="Prodejce nenalezen"
          description="Tento prodejce v katalogu neexistuje nebo byl odstraněn."
          action={
            <Link href="/prodejci" className={buttonVariants()}>
              Zpět na katalog prodejců
            </Link>
          }
        />
      ) : (
        <>
          <Hero seller={seller} />
          <PriceList seller={seller} />
          <DeliverySection seller={seller} />
          <IntelSection seller={seller} />
        </>
      )}
    </div>
  );
}
