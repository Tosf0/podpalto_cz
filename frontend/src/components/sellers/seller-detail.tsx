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
  Lock,
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
import { FUEL_META, REGIONS, WOOD_FORMS, WOOD_SPECIES } from "@/lib/constants";
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
  moneyUnit,
  toDisplayCurrency,
  fromDisplayCurrency,
} from "@/lib/format";
import { t } from "@/lib/i18n/translate";
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
import { useAuth } from "@/components/providers/auth-provider";
import { invalidateApiCache } from "@/lib/api";
import { SellerReviews } from "./seller-reviews";
import { SellerClaimBox } from "./seller-claim";
import { SellerOffers } from "./seller-offers";
import { SwotMatrix } from "@/components/ci/swot-matrix";
import { EmptyState, FuelBadge, PriceDelta, SellerTags, StarRating, StockBadge } from "@/components/common";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LocationNote } from "./location-note";
import { distanceLabel, sizeLabel } from "./seller-utils";

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
  if (p.moisturePercent !== undefined) out.push(t("sellers.detail.params.moisture", { value: formatNumber(p.moisturePercent) }));
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

function Hero({ seller, onChanged }: { seller: Seller; onChanged: () => void }) {
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
            {inCompare ? t("common.actions.inCompare") : t("common.actions.compare")}
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <MapPin />
            {t("sellers.detail.onMap")}
          </Link>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm text-muted-foreground sm:text-base">{seller.description}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label={t("sellers.detail.facts.address")}>
          {a.street}
          <br />
          {a.zip} {a.city}
          <LocationNote seller={seller} className="mt-1.5" />
        </Fact>
        <Fact label={t("sellers.detail.facts.region")}>{REGIONS[a.region].name}</Fact>
        {seller.ico && (
          <Fact label={t("sellers.detail.facts.ico")}>
            <span className="num">{seller.ico}</span>
          </Fact>
        )}
        <Fact label={t("sellers.detail.facts.size")}>{sizeLabel(seller.size)}</Fact>
        {seller.foundedYear && (
          <Fact label={t("sellers.detail.facts.founded")}>
            <span className="num">{seller.foundedYear}</span>
          </Fact>
        )}
        <Fact label={t("sellers.detail.facts.web")}>
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
          <Fact label={t("sellers.detail.facts.phone")}>
            <a href={`tel:${seller.phone.replace(/\s/g, "")}`} className="num inline-flex items-center gap-1 hover:text-primary">
              <Phone className="size-3.5" />
              {seller.phone}
            </a>
          </Fact>
        )}
        {seller.email && (
          <Fact label={t("sellers.detail.facts.email")}>
            <a href={`mailto:${seller.email}`} className="inline-flex items-center gap-1 break-all hover:text-primary">
              <Mail className="size-3.5 shrink-0" />
              {seller.email}
            </a>
          </Fact>
        )}
      </dl>

      {seller.tags.length > 0 && <SellerTags tags={seller.tags} className="mt-5" />}
      <SellerClaimBox seller={seller} onChanged={onChanged} />
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
  const data = product.priceHistory.map((h) => ({ month: h.date, price: toDisplayCurrency(h.price) }));
  const baseUnit = baseUnitLabel(product.category);
  const key = commodityKey(product);
  const czAvgCzk = product.unit === baseUnit && trends?.length ? trends[trends.length - 1][key] : undefined;
  const czAvg = czAvgCzk ? toDisplayCurrency(czAvgCzk) : undefined;
  const values = data.map((d) => d.price).concat(czAvg ? [czAvg] : []);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, max * 0.02);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-medium">{product.name}</h3>
          <p className="text-xs text-muted-foreground">{t("sellers.detail.chart.last12", { unit: moneyUnit(product.unit) })}</p>
        </div>
        {czAvg && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed border-muted-foreground" />
            {t("sellers.detail.chart.avgCz")} <span className="num">{formatCzk(czAvgCzk!)}</span>
          </span>
        )}
      </div>
      <div className="h-64 w-full" role="img" aria-label={t("sellers.detail.chart.aria", { name: product.name })}>
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
              tickFormatter={(v: number) => formatNumber(v, v < 100 ? 1 : 0)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              labelFormatter={(l) => formatMonth(String(l))}
              formatter={(v) => [formatCzkPerUnit(fromDisplayCurrency(Number(v)), product.unit), t("sellers.detail.chart.price")]}
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
      <Section title={t("sellers.detail.priceList.title")} icon={<Store />}>
        {seller.offers?.length ? <SellerOffers seller={seller} /> : <EmptyState title={t("sellers.detail.priceList.empty")} />}
      </Section>
    );
  }

  return (
    <Section
      title={t("sellers.detail.priceList.title")}
      description={t("sellers.detail.priceList.description")}
      icon={<Store />}
    >
      {/* Telefon: karty místo tabulky (5 sloupců se do 390 px nevejde – název by se lámal po slovech) */}
      <ul className="space-y-2 sm:hidden">
        {seller.products.map((p) => {
          const active = p.id === selected.id;
          const change = yearChange(p);
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  active ? "border-primary/40 bg-accent" : "border-border bg-card hover:bg-muted/50",
                )}
              >
                <span className="block font-medium break-words">{p.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <FuelBadge category={p.category} size="sm" showIcon={false} />
                  {productParams(p).join(" · ")}
                </span>
                <span className="mt-2.5 flex items-end justify-between gap-3">
                  <span className="num min-w-0">
                    <span className="block font-semibold">{formatCzkPerUnit(p.price, p.unit)}</span>
                    {p.unit !== baseUnitLabel(p.category) && (
                      <span className="block text-xs text-muted-foreground">
                        {formatCzkPerUnit(pricePerBaseUnit(p), baseUnitLabel(p.category))}
                      </span>
                    )}
                  </span>
                  <span className="num shrink-0 text-right text-sm text-muted-foreground">{formatKwhPrice(pricePerKwh(p))}</span>
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <StockBadge stock={p.stock} />
                  <span>{formatRelative(p.updatedAt)}</span>
                  {change !== null && <PriceDelta value={change} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>{t("sellers.detail.priceList.product")}</TableHead>
              <TableHead className="text-right">{t("sellers.detail.priceList.price")}</TableHead>
              <TableHead className="text-right">{moneyUnit("kWh")}</TableHead>
              <TableHead>{t("sellers.detail.priceList.stock")}</TableHead>
              <TableHead className="text-right">{t("sellers.detail.priceList.months12")}</TableHead>
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
                  <TableCell className="whitespace-normal">
                    <div className="font-medium">{p.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <FuelBadge category={p.category} size="sm" showIcon={false} />
                      {productParams(p).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell className="num text-right whitespace-nowrap">
                    <div className="font-semibold">{formatCzkPerUnit(p.price, p.unit)}</div>
                    {p.unit !== baseUnitLabel(p.category) && (
                      <div className="text-xs text-muted-foreground">
                        {formatCzkPerUnit(pricePerBaseUnit(p), baseUnitLabel(p.category))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="num text-right whitespace-nowrap">{formatKwhPrice(pricePerKwh(p))}</TableCell>
                  <TableCell>
                    <StockBadge stock={p.stock} />
                    <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground">
                      {formatRelative(p.updatedAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {change === null ? "–" : <PriceDelta value={change} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {seller.offers?.length ? (
        <div className="mt-6">
          <SellerOffers seller={seller} />
        </div>
      ) : null}
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
    woodMain && { label: t("sellers.detail.deliverySection.exampleWood"), qty: unitsForBaseQuantity(woodMain, 5) },
    pallet && { label: t("sellers.detail.deliverySection.examplePallet"), qty: 1 },
  ].filter(Boolean) as { label: string; qty: number }[];

  const estimate = estimateDelivery(seller, location, 1);

  return (
    <Section title={t("sellers.detail.deliverySection.title")} icon={<Truck />}>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Fact label={t("sellers.detail.deliverySection.method")}>
            {d.ownDelivery == null
              ? t("sellers.delivery.unspecified")
              : d.ownDelivery
                ? t("sellers.detail.deliverySection.own")
                : t("sellers.detail.deliverySection.pickupOnlyMethod")}
          </Fact>
          <Fact label={t("sellers.detail.deliverySection.pickup")}>
            {d.pickupAvailable == null
              ? t("sellers.delivery.unspecified")
              : d.pickupAvailable
                ? t("sellers.detail.deliverySection.possible")
                : t("sellers.detail.deliverySection.notOffered")}
          </Fact>
          {d.ownDelivery && (
            <>
              <Fact label={t("sellers.detail.deliverySection.baseFee")}>
                <span className="num">{d.baseFee != null ? formatCzk(d.baseFee) : "–"}</span>
              </Fact>
              <Fact label={t("sellers.detail.deliverySection.perKm")}>
                <span className="num">{d.pricePerKm != null ? `${formatCzk(d.pricePerKm)}/km` : "–"}</span>
              </Fact>
              <Fact label={t("sellers.detail.deliverySection.freeUpTo")}>
                <span className="num">{(d.freeRadiusKm ?? 0) > 0 ? formatKm(d.freeRadiusKm ?? 0) : "–"}</span>
              </Fact>
              <Fact label={t("sellers.detail.deliverySection.freeOverQty")}>
                <span className="num">{d.freeOverQuantity != null ? formatNumber(d.freeOverQuantity) : "–"}</span>
              </Fact>
              <Fact label={t("sellers.detail.deliverySection.maxRange")}>
                <span className="num">{d.maxRadiusKm != null ? formatKm(d.maxRadiusKm) : "–"}</span>
              </Fact>
            </>
          )}
          <Fact label={t("sellers.detail.deliverySection.arm")}>
            {d.hydraulicArm ? (
              <span>
                {t("sellers.detail.deliverySection.yes")}
                {d.hydraulicArmFee ? <>{t("sellers.detail.deliverySection.surcharge")} <span className="num">{formatCzk(d.hydraulicArmFee)}</span></> : ""}
              </span>
            ) : (
              t("sellers.detail.deliverySection.no")
            )}
          </Fact>
          {d.notes && (
            <div className="col-span-2 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{d.notes}</div>
          )}
        </dl>

        <div className="h-full space-y-3 rounded-xl bg-secondary p-4">
          <p className="text-xs font-medium tracking-wider text-wood-strong uppercase">{t("sellers.detail.deliverySection.estimateFor", { location: location.label })}</p>
          <p className="text-sm">
            {t("sellers.detail.deliverySection.distance")} <span className="num font-semibold">{distanceLabel(seller, estimate.distanceKm)}</span>
          </p>
          {estimate.outOfRange ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <X className="mt-0.5 size-4 shrink-0 text-clay" />
              {t("sellers.detail.deliverySection.outOfRange")}
            </p>
          ) : (
            <ul className="divide-y divide-border/70 text-sm">
              {examples.map((ex) => {
                const est = estimateDelivery(seller, location, ex.qty, false);
                return (
                  <li key={ex.label} className="flex items-center justify-between gap-3 py-2">
                    <span>{t("sellers.detail.deliverySection.shipping", { label: ex.label })}</span>
                    <span className="num font-semibold">{est.free ? t("sellers.detail.deliverySection.free") : formatCzk(est.fee)}</span>
                  </li>
                );
              })}
              {examples.length === 0 && (
                <li className="flex items-center justify-between gap-3 py-2">
                  <span>{t("sellers.detail.deliverySection.shipOneUnit")}</span>
                  <span className="num font-semibold">{estimate.free ? t("sellers.detail.deliverySection.free") : formatCzk(estimate.fee)}</span>
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
    { key: "hardWoodPrms", label: t("sellers.detail.intel.hardWood"), unit: "PRMS" },
    { key: "pelletsT", label: t("sellers.detail.intel.pellets"), unit: "t" },
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
              {r.label} <span className="font-normal text-muted-foreground">{t("sellers.detail.intel.cheapest", { unit: moneyUnit(r.unit) })}</span>
            </h4>
            <CompareBar label={seller.name} value={r.seller!} max={max} tone="seller" />
            {regionAvg !== undefined && (
              <CompareBar label={t("sellers.detail.intel.avgRegion", { region: REGIONS[seller.address.region].short })} value={regionAvg} max={max} tone="region" />
            )}
            {czAvg !== undefined && <CompareBar label={t("sellers.detail.intel.avgCz")} value={czAvg} max={max} tone="cz" />}
          </div>
        );
      })}
    </div>
  );
}

function IntelSection({ seller }: { seller: Seller }) {
  const intel = seller.intel;
  const auth = useAuth();
  // CI shrnutí vrací databáze jen tarifu Pro (RLS) – ostatním nabídneme přechod
  if (!intel && auth.enabled && !auth.isPro) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-moss/40 bg-accent p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-accent-foreground">
            <Lock className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{t("account.upsell.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("account.upsell.text")}</p>
          </div>
        </div>
        <Link href="/plany?feature=ci" className={cn(buttonVariants({ size: "lg" }), "shrink-0")}>
          <Sparkles />
          {t("account.upsell.cta")}
        </Link>
      </section>
    );
  }
  if (!intel) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-moss/40 bg-accent p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-accent-foreground">
            <Brain className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{t("sellers.detail.intel.noneTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("sellers.detail.intel.noneText")}
            </p>
          </div>
        </div>
        <Link
          href={`/ci-studio?url=${encodeURIComponent(seller.website)}`}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
        >
          <Sparkles />
          {t("sellers.detail.intel.run")}
        </Link>
      </section>
    );
  }

  return (
    <Section
      title="Competitive Intelligence"
      description={t("sellers.detail.intel.analyzed", { date: formatDate(intel.analyzedAt) })}
      icon={<Brain />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-secondary p-4 md:col-span-2">
            <p className="text-xs font-medium text-muted-foreground">{t("sellers.detail.intel.positioning")}</p>
            <p className="mt-1 text-sm">{intel.positioning}</p>
            <p className="mt-3 text-xs font-medium text-muted-foreground">{t("sellers.detail.intel.tone")}</p>
            <p className="mt-1 text-sm">{intel.toneOfVoice}</p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-xs font-medium text-muted-foreground">{t("sellers.detail.intel.priceIndex")}</p>
            <p className="mt-1">
              <PriceDelta value={intel.priceIndexVsCz} />
            </p>
          </div>
        </div>

        {intel.usp.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">{t("sellers.detail.intel.usp")}</h3>
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
          <h3 className="mb-2 text-sm font-medium">{t("sellers.detail.intel.swot")}</h3>
          <SwotMatrix swot={intel.swot} />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">{t("sellers.detail.intel.priceCompare")}</h3>
          <PriceComparison seller={seller} />
          <p className="mt-3 text-xs text-muted-foreground">
            {t("sellers.detail.intel.priceIndexNote", { value: formatPct(intel.priceIndexVsCz) })}
          </p>
        </div>

        {intel.reportId && (
          <Link
            href={`/ci-studio?report=${encodeURIComponent(intel.reportId)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <ExternalLink />
            {t("sellers.detail.intel.fullReport")}
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
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label={t("sellers.detail.breadcrumbAria")} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <ol className="flex items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/prodejci" className="hover:text-foreground">
              {t("sellers.detail.sellers")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-foreground" aria-current="page">
            {seller?.name ?? "…"}
          </li>
        </ol>
        <Link href="/prodejci" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {t("sellers.detail.catalog")}
        </Link>
      </nav>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <EmptyState
          title={t("sellers.detail.loadError")}
          description={error.message}
          action={<Button onClick={reload}>{t("common.actions.retry")}</Button>}
        />
      ) : !seller ? (
        <EmptyState
          icon={<Calendar />}
          title={t("sellers.detail.notFoundTitle")}
          description={t("sellers.detail.notFoundDescription")}
          action={
            <Link href="/prodejci" className={buttonVariants()}>
              {t("sellers.detail.backToCatalog")}
            </Link>
          }
        />
      ) : (
        <>
          <Hero
            seller={seller}
            onChanged={() => {
              invalidateApiCache("sellers:");
              reload();
            }}
          />
          <PriceList seller={seller} />
          <DeliverySection seller={seller} />
          <SellerReviews
            seller={seller}
            onChanged={() => {
              invalidateApiCache("sellers:");
              reload();
            }}
          />
          <IntelSection seller={seller} />
        </>
      )}
    </div>
  );
}
