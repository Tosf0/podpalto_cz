"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MapPin, Trophy, Truck, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common";
import { useApi } from "@/hooks/use-api";
import { getRegionStats, getSellers } from "@/lib/api";
import { BOILER_EFFICIENCY, KWH_PER_KG, MOISTURE } from "@/lib/constants";
import {
  offerTotal,
  productWoodGroup,
  regionalAverageFor,
  unitsForBaseQuantity,
  woodKwhPerUnit,
  type OfferTotal,
} from "@/lib/pricing";
import { formatCzk, formatKwhNumber, formatKwhPrice, formatNumber, moneyUnit } from "@/lib/format";
import { t, useI18n } from "@/lib/i18n";
import { locationFromZip, usePreferences } from "@/components/providers/preferences-provider";
import { distanceLabel } from "@/components/sellers/seller-utils";
import { cn } from "@/lib/utils";
import type { FuelCategory, FuelProduct, Seller, WoodGroup } from "@/types";
import { Collapsible, InfoTip, NumberField, Panel, parseNum } from "./fields";

type FuelKey = "wood-hard" | "wood-soft" | "pellets" | "briquettes" | "coal";

const FUELS: Record<
  FuelKey,
  { category: FuelCategory; group?: WoodGroup; unit: "PRMS" | "t"; defaultQty: string }
> = {
  "wood-hard": { category: "wood", group: "hard", unit: "PRMS", defaultQty: "10" },
  "wood-soft": { category: "wood", group: "soft", unit: "PRMS", defaultQty: "10" },
  pellets: { category: "pellets", unit: "t", defaultQty: "4" },
  briquettes: { category: "briquettes", unit: "t", defaultQty: "4" },
  coal: { category: "coal", unit: "t", defaultQty: "4" },
};

const DEMAND_PRESETS = [
  { key: "new", kwh: 8000 },
  { key: "older", kwh: 18000 },
  { key: "uninsulated", kwh: 28000 },
] as const;

/** kWh energie v 1 základní jednotce (PRMS / t) pro odhad spotřeby. */
function energyPerBaseUnit(key: FuelKey): number {
  const f = FUELS[key];
  switch (f.category) {
    case "wood":
      return woodKwhPerUnit("PRMS", f.group ?? "hard", "dry");
    case "pellets":
      return 1000 * KWH_PER_KG.pellets;
    case "briquettes":
      return 1000 * KWH_PER_KG.briquettesWood;
    case "coal":
      return 1000 * KWH_PER_KG.coalBrown;
  }
}

/** Zaokrouhlení množství nahoru na rozumné kroky (palety/pytle po kusech). */
function roundUnits(p: FuelProduct, units: number): number {
  const clean = Math.round(units * 1e6) / 1e6;
  let r: number;
  if (p.unit === "paleta" || p.unit === "pytel") r = Math.ceil(clean);
  else if (p.category === "wood") r = Math.ceil(clean * 2) / 2;
  else r = Math.ceil(clean * 10) / 10;
  return Math.max(r, p.minOrder ?? 0);
}

interface Row {
  seller: Seller;
  offer: OfferTotal;
  avgTotal?: number;
  saving?: number;
  armMissing: boolean;
}

function unitLabel(p: FuelProduct): string {
  return p.unit === "paleta" ? t("calculator.season.unitPallet") : p.unit === "pytel" ? t("calculator.season.unitBag") : p.unit;
}

export function SeasonCalculator() {
  const { t } = useI18n();
  const { location, setLocationByZip } = usePreferences();
  const { data: sellers, loading, error } = useApi(() => getSellers(), []);
  const { data: regions } = useApi(() => getRegionStats(), []);

  const [zipInput, setZipInput] = useState<string | null>(null);
  const [fuel, setFuel] = useState<FuelKey>("wood-hard");
  const [qty, setQty] = useState("10");
  const [arm, setArm] = useState(false);
  const [demand, setDemand] = useState("18000");
  const [showAll, setShowAll] = useState(false);

  const zipValue = zipInput ?? location.zip ?? "";
  const loc = zipInput === null ? location : locationFromZip(zipInput);
  const zipInvalid = zipInput !== null && zipInput.trim() !== "" && !loc;

  const f = FUELS[fuel];
  const baseQty = parseNum(qty);

  const suggested = useMemo(() => {
    const d = parseNum(demand);
    if (!d) return 0;
    const raw = d / BOILER_EFFICIENCY[f.category] / energyPerBaseUnit(fuel);
    return f.unit === "PRMS" ? Math.ceil(raw * 2) / 2 : Math.ceil(raw * 10) / 10;
  }, [demand, f, fuel]);

  const result = useMemo(() => {
    if (!sellers || !loc || baseQty <= 0) return null;
    const regionStats = regions?.find((r) => r.region === loc.region);
    const rows: Row[] = [];
    for (const seller of sellers) {
      const candidates = seller.products.filter(
        (p) =>
          p.category === f.category &&
          p.stock !== "out_of_stock" &&
          (f.category !== "wood" || (p.moisture !== "fresh" && productWoodGroup(p) === f.group)),
      );
      let best: OfferTotal | undefined;
      for (const p of candidates) {
        const units = roundUnits(p, unitsForBaseQuantity(p, baseQty));
        const o = offerTotal(seller, p, units, loc, arm);
        if (o.delivery.outOfRange && !seller.delivery.pickupAvailable) continue;
        if (!best || o.total < best.total) best = o;
      }
      if (best) {
        rows.push({
          seller,
          offer: best,
          armMissing: arm && !seller.delivery.hydraulicArm,
        });
      }
    }
    rows.sort((a, b) => a.offer.total - b.offer.total);

    const delivered = rows.filter((r) => !r.offer.delivery.outOfRange);
    const avgDelivery = delivered.length
      ? delivered.reduce((s, r) => s + r.offer.delivery.fee, 0) / delivered.length
      : 0;

    for (const r of rows) {
      const avgPrice = regionalAverageFor(r.offer.product, regionStats);
      if (avgPrice) {
        r.avgTotal = avgPrice * baseQty + avgDelivery;
        r.saving = r.avgTotal - r.offer.total;
      }
    }
    return { rows, avgDelivery, regionName: regionStats?.name };
  }, [sellers, regions, loc, baseQty, f, arm]);

  function changeFuel(k: FuelKey) {
    setFuel(k);
    setQty(FUELS[k].defaultQty);
  }

  function saveLocation() {
    if (setLocationByZip(zipValue)) {
      setZipInput(null);
      toast.success(t("calculator.season.locationSaved"), { description: t("calculator.season.locationSavedDesc") });
    } else {
      toast.error(t("calculator.season.zipFailed"));
    }
  }

  const rows = result?.rows ?? [];
  const winner = rows[0];
  const visible = showAll ? rows : rows.slice(0, 10);

  return (
    <div className="space-y-4">
      <Panel className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="season-zip">{t("calculator.season.zip")}</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="season-zip"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder={t("calculator.season.zipPlaceholder")}
                value={zipValue}
                onChange={(e) => setZipInput(e.target.value)}
                aria-invalid={zipInvalid}
                className="num h-10 rounded-xl pl-9 text-base"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="season-fuel">{t("calculator.season.fuel")}</Label>
            <Select value={fuel} onValueChange={(v) => changeFuel(v as FuelKey)}>
              <SelectTrigger id="season-fuel" className="h-10 w-full rounded-xl text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {(Object.keys(FUELS) as FuelKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`calculator.season.fuels.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <NumberField
            id="season-qty"
            label={t("calculator.season.qty")}
            value={qty}
            onChange={setQty}
            suffix={f.unit}
            step={f.unit === "PRMS" ? "0.5" : "0.1"}
          />

          <div className="space-y-1.5">
            <Label htmlFor="season-arm">{t("calculator.season.arm")}</Label>
            <label
              htmlFor="season-arm"
              className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-input px-3"
            >
              <span className="text-sm">{arm ? t("calculator.season.armYes") : t("calculator.season.armNo")}</span>
              <Switch id="season-arm" checked={arm} onCheckedChange={setArm} />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className={cn("flex items-center gap-1.5 text-sm", zipInvalid ? "text-clay-strong" : "text-muted-foreground")}>
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {zipInvalid ? t("calculator.season.zipUnknown") : loc ? loc.label : t("calculator.season.zipEnter")}
          </p>
          <Button variant="outline" size="sm" onClick={saveLocation} disabled={!loc || zipInput === null}>
            {t("calculator.season.saveLocation")}
          </Button>
        </div>

        <Collapsible
          title={t("calculator.season.helper")}
          icon={<Wand2 className="size-4 text-wood-strong" aria-hidden="true" />}
        >
          <div className="grid items-end gap-4 lg:grid-cols-[auto_12rem_1fr]">
            <div className="space-y-1.5">
              <Label>{t("calculator.season.houseType")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {DEMAND_PRESETS.map((p) => (
                  <Button
                    key={p.kwh}
                    size="sm"
                    variant={parseNum(demand) === p.kwh ? "default" : "outline"}
                    onClick={() => setDemand(String(p.kwh))}
                  >
                    {t(`calculator.season.presets.${p.key}`)}
                  </Button>
                ))}
              </div>
            </div>
            <NumberField id="season-demand" label={t("calculator.season.demand")} value={demand} onChange={setDemand} suffix={t("calculator.season.demandSuffix")} />
            <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2 sm:justify-end">
              <p className="text-sm">
                {t("calculator.season.recommended")}{" "}
                <strong className="num text-base whitespace-nowrap">
                  {formatNumber(suggested, 1)} {f.unit}
                </strong>
              </p>
              <Button size="sm" disabled={!suggested} onClick={() => setQty(String(suggested))}>
                {t("calculator.season.use")}
              </Button>
            </div>
          </div>
        </Collapsible>
      </Panel>

      {loading && <Skeleton className="h-64 w-full rounded-2xl" />}
      {error && <EmptyState title={t("calculator.season.loadFailed")} description={t("calculator.season.loadFailedDesc")} />}
      {!loading && !error && result && rows.length === 0 && (
        <EmptyState icon={<Truck />} title={t("calculator.season.noOffers")} description={t("calculator.season.noOffersDesc")} />
      )}
      {!loading && !error && !result && (
        <EmptyState title={t("calculator.season.enterZip")} description={t("calculator.season.enterZipDesc")} />
      )}

      {winner && (
        <>
          <div className="flex flex-col gap-4 rounded-2xl border border-moss/30 bg-moss-soft p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-moss text-primary-foreground">
                <Trophy className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider text-moss-strong uppercase">{t("calculator.season.best")}</p>
                <Link href={`/prodejci/${winner.seller.slug}`} className="block text-lg leading-snug font-semibold hover:underline">
                  {winner.seller.name}
                </Link>
                {winner.saving !== undefined && winner.saving > 0 && (
                  <p className="text-sm font-medium text-moss-strong">
                    {t("calculator.season.save", { amount: formatCzk(winner.saving) })}
                  </p>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="num text-4xl font-semibold tracking-tight whitespace-nowrap text-moss-strong">
                {formatCzk(winner.offer.total)}
              </p>
              <p className="num text-sm whitespace-nowrap text-muted-foreground">
                {t("calculator.season.perKwhWithDelivery", { price: formatKwhPrice(winner.offer.totalPerKwh) })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 pt-2">
            <h3 className="font-heading text-base font-semibold">
              {t("calculator.season.offers", { count: rows.length })}
            </h3>
            <InfoTip label={t("calculator.season.howTitle")}>
              <p>
                {t("calculator.season.howBody")}
              </p>
              <p>
                {t("calculator.season.howAverage", {
                  region: result?.regionName ? ` (${result.regionName})` : "",
                  qty: formatNumber(baseQty, 1),
                  unit: f.unit,
                  delivery: formatCzk(result?.avgDelivery ?? 0),
                })}
              </p>
              {arm && rows.some((r) => r.armMissing) && <p>{t("calculator.season.howArm")}</p>}
            </InfoTip>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className={cn("hidden items-center border-b border-border bg-secondary/50 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid", ROW_GRID)}>
              <span>#</span>
              <span>{t("calculator.season.colSeller")}</span>
              <span className="text-right">{t("calculator.season.colDistance")}</span>
              <span className="text-right">{t("calculator.season.colDelivery")}</span>
              <span className="text-right">{t("calculator.season.colTotal")}</span>
              <span className="text-right">{moneyUnit("kWh")}</span>
              <span className="text-right">{t("calculator.season.colVsAvg")}</span>
            </div>
            <ol className="divide-y divide-border">
              {visible.map((r, i) => (
                <ResultRow key={r.seller.id} row={r} rank={i + 1} />
              ))}
            </ol>
          </div>

          {rows.length > 10 && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setShowAll((s) => !s)}>
                {showAll
                  ? t("calculator.season.showLess")
                  : t("calculator.season.showAll", { sellers: t("common.sellers", { count: rows.length }) })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ROW_GRID = "lg:grid-cols-[1.5rem_minmax(0,1fr)_4.5rem_5.5rem_6.5rem_4rem_6rem] lg:gap-3";

function productLine(r: Row): string {
  const p = r.offer.product;
  const moist = p.moisture && p.category === "wood" ? ` · ${MOISTURE[p.moisture].label.toLowerCase()}` : "";
  return `${p.name} · ${formatNumber(r.offer.quantity, 1)} ${unitLabel(p)}${moist}`;
}

function ResultRow({ row: r, rank }: { row: Row; rank: number }) {
  const first = rank === 1;
  return (
    <li className={cn(first && "bg-moss-soft/50")}>
      {/* Desktop */}
      <div className={cn("hidden items-center px-4 py-3 lg:grid", ROW_GRID)}>
        <span className={cn("num text-sm font-semibold", first ? "text-moss-strong" : "text-muted-foreground")}>{rank}</span>
        <div className="min-w-0">
          <Link
            href={`/prodejci/${r.seller.slug}`}
            title={r.seller.name}
            className="block leading-snug font-medium hover:text-primary hover:underline"
          >
            {r.seller.name}
          </Link>
          <p className="line-clamp-2 text-xs text-muted-foreground" title={productLine(r)}>
            {productLine(r)}
          </p>
        </div>
        <span className="num text-right text-sm whitespace-nowrap">{distanceLabel(r.seller, r.offer.delivery.distanceKm)}</span>
        <span className="text-right text-sm whitespace-nowrap">
          <DeliveryCell row={r} />
        </span>
        <span className={cn("num text-right text-base font-semibold whitespace-nowrap", first && "text-moss-strong")}>
          {formatCzk(r.offer.total)}
        </span>
        <span className="num text-right text-sm whitespace-nowrap">{formatKwhNumber(r.offer.totalPerKwh)}</span>
        <span className="text-right">
          <SavingChip saving={r.saving} />
        </span>
      </div>

      {/* Mobil / úzké okno – karta */}
      <div className="space-y-2 px-4 py-3 lg:hidden">
        <div className="flex items-start gap-3">
          <span className={cn("num w-5 pt-0.5 text-sm font-semibold", first ? "text-moss-strong" : "text-muted-foreground")}>
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/prodejci/${r.seller.slug}`} className="block leading-snug font-medium hover:underline">
              {r.seller.name}
            </Link>
            <p className="line-clamp-2 text-xs text-muted-foreground">{productLine(r)}</p>
          </div>
          <p className={cn("num shrink-0 text-lg font-semibold whitespace-nowrap", first && "text-moss-strong")}>
            {formatCzk(r.offer.total)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-8 text-xs text-muted-foreground">
          <span className="num whitespace-nowrap">{distanceLabel(r.seller, r.offer.delivery.distanceKm)}</span>
          <span className="whitespace-nowrap">
            {t("calculator.season.deliveryLabel")} <DeliveryCell row={r} />
          </span>
          <span className="num whitespace-nowrap">{formatKwhPrice(r.offer.totalPerKwh)}</span>
          <span className="ml-auto">
            <SavingChip saving={r.saving} />
          </span>
        </div>
      </div>
    </li>
  );
}

function DeliveryCell({ row }: { row: Row }) {
  const d = row.offer.delivery;
  if (d.unknown) return <span className="text-muted-foreground">{t("sellers.delivery.unspecified")}</span>;
  if (d.outOfRange) return <span className="text-muted-foreground">{t("calculator.season.pickup")}</span>;
  if (d.free) return <span className="font-medium text-moss-strong">{t("calculator.season.free")}</span>;
  return <span className="num">{formatCzk(d.fee)}</span>;
}

function SavingChip({ saving }: { saving?: number }) {
  if (saving === undefined) return <span className="text-xs text-muted-foreground">–</span>;
  const good = saving >= 0;
  return (
    <span
      className={cn(
        "num inline-block rounded-lg px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        good ? "bg-moss-soft text-moss-strong" : "bg-clay-soft text-clay-strong",
      )}
    >
      {good ? "−" : "+"}
      {formatCzk(Math.abs(saving))}
    </span>
  );
}
