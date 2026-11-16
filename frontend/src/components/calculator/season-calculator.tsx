"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MapPin, Trophy, Truck, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatCzk, formatKm, formatNumber, plural } from "@/lib/format";
import { locationFromZip, usePreferences } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";
import type { FuelCategory, FuelProduct, Seller, WoodGroup } from "@/types";
import { NumberField, parseNum } from "./fields";

type FuelKey = "wood-hard" | "wood-soft" | "pellets" | "briquettes" | "coal";

const FUELS: Record<
  FuelKey,
  { label: string; category: FuelCategory; group?: WoodGroup; unit: "PRMS" | "t"; defaultQty: string }
> = {
  "wood-hard": { label: "Tvrdé dřevo", category: "wood", group: "hard", unit: "PRMS", defaultQty: "10" },
  "wood-soft": { label: "Měkké dřevo", category: "wood", group: "soft", unit: "PRMS", defaultQty: "10" },
  pellets: { label: "Pelety", category: "pellets", unit: "t", defaultQty: "4" },
  briquettes: { label: "Brikety", category: "briquettes", unit: "t", defaultQty: "4" },
  coal: { label: "Uhlí", category: "coal", unit: "t", defaultQty: "4" },
};

const DEMAND_PRESETS = [
  { label: "Novostavba", kwh: 8000 },
  { label: "Starší dům", kwh: 18000 },
  { label: "Nezateplený dům", kwh: 28000 },
];

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
  return p.unit === "paleta" ? "pal." : p.unit === "pytel" ? "pytlů" : p.unit;
}

export function SeasonCalculator() {
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
      toast.success("Poloha uložena", { description: "Použije se i na mapě a v dalších nástrojích." });
    } else {
      toast.error("PSČ se nepodařilo rozpoznat");
    }
  }

  const rows = result?.rows ?? [];
  const winner = rows[0];
  const visible = showAll ? rows : rows.slice(0, 10);

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border border-border shadow-soft ring-0">
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="season-zip">PSČ doručení</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="season-zip"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="např. 110 00"
                  value={zipValue}
                  onChange={(e) => setZipInput(e.target.value)}
                  aria-invalid={zipInvalid}
                  className="num h-10 pl-8 text-base"
                />
              </div>
              <p className={cn("text-xs", zipInvalid ? "text-clay-strong" : "text-muted-foreground")}>
                {zipInvalid ? "PSČ nerozpoznáno" : loc ? `Počítáno pro: ${loc.label}` : "Zadejte PSČ"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="season-fuel">Palivo</Label>
              <Select value={fuel} onValueChange={(v) => changeFuel(v as FuelKey)}>
                <SelectTrigger id="season-fuel" className="h-10 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(Object.keys(FUELS) as FuelKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FUELS[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <NumberField
              id="season-qty"
              label="Množství"
              value={qty}
              onChange={setQty}
              suffix={f.unit}
              step={f.unit === "PRMS" ? "0.5" : "0.1"}
            />

            <div className="flex flex-col justify-end gap-2">
              <Label htmlFor="season-arm" className="flex h-10 items-center justify-between gap-3 rounded-xl border border-border px-3">
                <span className="text-sm">Složení hydraulickou rukou</span>
                <Switch id="season-arm" checked={arm} onCheckedChange={setArm} />
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveLocation} disabled={!loc || zipInput === null}>
              <MapPin /> Uložit jako moji polohu
            </Button>
          </div>

          <div className="rounded-xl bg-secondary p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
              <Wand2 className="size-4 text-wood-strong" aria-hidden="true" /> Odhad spotřeby
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-1.5">
                {DEMAND_PRESETS.map((p) => (
                  <Button
                    key={p.kwh}
                    size="sm"
                    variant={parseNum(demand) === p.kwh ? "default" : "outline"}
                    onClick={() => setDemand(String(p.kwh))}
                  >
                    {p.label} · {formatNumber(p.kwh)}
                  </Button>
                ))}
              </div>
              <NumberField
                id="season-demand"
                label="Potřeba tepla (kWh/rok)"
                value={demand}
                onChange={setDemand}
                className="w-44"
              />
              <div className="pb-1 text-sm">
                Doporučeno:{" "}
                <strong className="num text-base">
                  {formatNumber(suggested, 1)} {f.unit}
                </strong>{" "}
                <span className="text-xs text-muted-foreground">
                  (účinnost {Math.round(BOILER_EFFICIENCY[f.category] * 100)} %)
                </span>
              </div>
              <Button size="sm" disabled={!suggested} onClick={() => setQty(String(suggested))}>
                Použít
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <Skeleton className="h-64 w-full rounded-2xl" />}
      {error && (
        <EmptyState title="Nepodařilo se načíst prodejce" description="Zkuste to prosím za chvíli znovu." />
      )}

      {!loading && !error && result && rows.length === 0 && (
        <EmptyState
          icon={<Truck />}
          title="Nenašli jsme žádnou nabídku"
          description="Pro zvolené palivo a polohu není skladem žádný prodejce s dojezdem nebo osobním odběrem."
        />
      )}
      {!loading && !error && !result && (
        <EmptyState title="Zadejte PSČ a množství" description="Pak spočítáme celkovou cenu u jednotlivých prodejců." />
      )}

      {winner && (
        <>
          <Card className="rounded-2xl border border-moss/30 bg-moss-soft shadow-soft ring-0">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-moss text-primary-foreground">
                  <Trophy className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-moss-strong uppercase">Nejvýhodnější nabídka</p>
                  <p className="text-lg font-semibold">
                    <Link href={`/prodejci/${winner.seller.slug}`} className="hover:underline">
                      {winner.seller.name}
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {winner.offer.product.name} · {formatNumber(winner.offer.quantity, 1)} {unitLabel(winner.offer.product)}
                  </p>
                  {winner.saving !== undefined && winner.saving > 0 && (
                    <p className="mt-1 text-sm font-semibold text-moss-strong">
                      Ušetříte až <span className="num">{formatCzk(winner.saving)}</span> oproti průměru kraje
                    </p>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="num text-4xl font-semibold tracking-tight text-moss-strong">{formatCzk(winner.offer.total)}</p>
                <p className="num text-sm text-muted-foreground">
                  {formatNumber(winner.offer.totalPerKwh, 2)} Kč/kWh vč. dopravy
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Desktop – tabulka */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Prodejce a produkt</TableHead>
                  <TableHead className="text-right">Vzdálenost</TableHead>
                  <TableHead className="text-right">Zboží</TableHead>
                  <TableHead className="text-right">Doprava</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
                  <TableHead className="text-right">Kč/kWh</TableHead>
                  <TableHead className="text-right">Vs. průměr kraje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, i) => (
                  <TableRow key={r.seller.id} className={cn(i === 0 && "bg-moss-soft/60")}>
                    <TableCell className="num font-semibold">{i + 1}</TableCell>
                    <TableCell className="whitespace-normal">
                      <Link href={`/prodejci/${r.seller.slug}`} className="font-medium hover:text-primary hover:underline">
                        {r.seller.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.offer.product.name} · <span className="num">{formatNumber(r.offer.quantity, 1)}</span>{" "}
                        {unitLabel(r.offer.product)}
                        {r.offer.product.moisture && r.offer.product.category === "wood"
                          ? ` · ${MOISTURE[r.offer.product.moisture].label.toLowerCase()}`
                          : ""}
                      </p>
                    </TableCell>
                    <TableCell className="num text-right">{formatKm(r.offer.delivery.distanceKm)}</TableCell>
                    <TableCell className="num text-right">{formatCzk(r.offer.goods)}</TableCell>
                    <TableCell className="num text-right">
                      <DeliveryCell row={r} />
                    </TableCell>
                    <TableCell className={cn("num text-right text-base font-semibold", i === 0 && "text-moss-strong")}>
                      {formatCzk(r.offer.total)}
                    </TableCell>
                    <TableCell className="num text-right">{formatNumber(r.offer.totalPerKwh, 2)}</TableCell>
                    <TableCell className="text-right">
                      <SavingCell saving={r.saving} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobil – karty */}
          <ul className="space-y-3 md:hidden">
            {visible.map((r, i) => (
              <li key={r.seller.id}>
                <Card size="sm" className={cn("rounded-2xl border border-border shadow-soft ring-0", i === 0 && "border-moss")}>
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">#{i + 1}</p>
                        <Link href={`/prodejci/${r.seller.slug}`} className="font-medium hover:underline">
                          {r.seller.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {r.offer.product.name} · {formatNumber(r.offer.quantity, 1)} {unitLabel(r.offer.product)} ·{" "}
                          {formatKm(r.offer.delivery.distanceKm)}
                        </p>
                      </div>
                      <p className={cn("num shrink-0 text-xl font-semibold", i === 0 && "text-moss-strong")}>
                        {formatCzk(r.offer.total)}
                      </p>
                    </div>
                    <dl className="num grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="font-sans text-muted-foreground">Zboží</dt>
                        <dd>{formatCzk(r.offer.goods)}</dd>
                      </div>
                      <div>
                        <dt className="font-sans text-muted-foreground">Doprava</dt>
                        <dd>
                          <DeliveryCell row={r} />
                        </dd>
                      </div>
                      <div>
                        <dt className="font-sans text-muted-foreground">Kč/kWh</dt>
                        <dd>{formatNumber(r.offer.totalPerKwh, 2)}</dd>
                      </div>
                    </dl>
                    <SavingCell saving={r.saving} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {rows.length > 10 && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setShowAll((s) => !s)}>
                {showAll ? "Zobrazit méně" : `Zobrazit všech ${rows.length} ${plural(rows.length, "prodejce", "prodejce", "prodejců")}`}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Průměr kraje{result?.regionName ? ` (${result.regionName})` : ""} = průměrná cena paliva v kraji ×{" "}
            {formatNumber(baseQty, 1)} {f.unit} + průměrná doprava ve výsledcích ({formatCzk(result?.avgDelivery ?? 0)}).
            Množství je u každého prodejce zaokrouhleno nahoru na prodejní jednotku. Syrové dřevo je vynecháno.
            {arm && rows.some((r) => r.armMissing) && " Někteří prodejci hydraulickou ruku nenabízejí."}
          </p>
        </>
      )}
    </div>
  );
}

function DeliveryCell({ row }: { row: Row }) {
  const d = row.offer.delivery;
  if (d.outOfRange)
    return (
      <Badge variant="outline" className="rounded-lg font-sans whitespace-normal">
        mimo dojezd – osobní odběr
      </Badge>
    );
  if (d.free) return <span className="text-moss-strong">zdarma</span>;
  return <span>{formatCzk(d.fee)}</span>;
}

function SavingCell({ saving }: { saving?: number }) {
  if (saving === undefined) return <span className="text-xs text-muted-foreground">–</span>;
  const good = saving >= 0;
  return (
    <span className={cn("num text-sm font-medium", good ? "text-moss-strong" : "text-clay-strong")}>
      {good ? "−" : "+"}
      {formatCzk(Math.abs(saving))}
      <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">{good ? "levněji" : "dráž"}</span>
    </span>
  );
}
