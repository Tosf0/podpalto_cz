"use client";

import { Fragment } from "react";
import Link from "next/link";
import { GitCompareArrows, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, SellerTags, StarRating } from "@/components/common";
import { useApi } from "@/hooks/use-api";
import { getSellers } from "@/lib/api";
import { FUEL_META, FUEL_CATEGORIES } from "@/lib/constants";
import { baseUnitLabel, mainProduct, pricePerBaseUnit, pricePerKwh, roadDistanceKm } from "@/lib/pricing";
import { currencySymbol, formatCzk, formatCzkPerUnit, formatKm, formatKwhPrice, formatNumber, toDisplayCurrency } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/components/providers/preferences-provider";
import { cn } from "@/lib/utils";
import type { Seller } from "@/types";

const MAX_COMPARE = 4;

export function SellerComparison() {
  const { t } = useI18n();
  const { compareIds, toggleCompare, clearCompare, location } = usePreferences();
  const { data: sellers, loading } = useApi(() => getSellers(), []);

  if (loading || !sellers) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const selected = compareIds
    .map((id) => sellers.find((s) => s.id === id))
    .filter((s): s is Seller => Boolean(s));
  const available = sellers.filter((s) => !compareIds.includes(s.id));

  const picker = (
    <Select value="" onValueChange={(id) => id && toggleCompare(id)} disabled={selected.length >= MAX_COMPARE}>
      <SelectTrigger className="h-10 w-full rounded-xl sm:w-64" aria-label={t("calculator.compare.addAria")}>
        <Plus />
        <SelectValue placeholder={selected.length >= MAX_COMPARE ? t("calculator.compare.max") : t("calculator.compare.add")} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {available.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name} · {s.address.city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (selected.length === 0) {
    return (
      <EmptyState
        icon={<GitCompareArrows />}
        title={t("calculator.compare.emptyTitle")}
        description={t("calculator.compare.emptyDesc")}
        action={
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            {picker}
            <Button asChild>
              <Link href="/">{t("calculator.compare.openMap")}</Link>
            </Button>
          </div>
        }
      />
    );
  }

  // nejnižší Kč/kWh pro každé palivo (zvýraznění)
  const bestKwh: Record<string, number> = {};
  for (const cat of FUEL_CATEGORIES) {
    const vals = selected
      .map((s) => mainProduct(s, cat))
      .filter((p) => p !== undefined)
      .map((p) => pricePerKwh(p));
    if (vals.length > 1) bestKwh[cat] = Math.min(...vals);
  }

  const cols = { gridTemplateColumns: `minmax(120px,160px) repeat(${selected.length}, minmax(170px,1fr))` };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {picker}
        <Button variant="outline" size="sm" onClick={clearCompare}>
          <X /> {t("calculator.compare.clearAll")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <div className="grid min-w-max text-sm sm:min-w-0" style={cols}>
          <div className="border-b bg-secondary/40 p-3" />
          {selected.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-2 border-b border-l bg-secondary/40 p-3">
              <div className="min-w-0">
                <Link href={`/prodejci/${s.slug}`} className="font-semibold hover:text-primary hover:underline">
                  {s.name}
                </Link>
                <p className="text-xs text-muted-foreground">{s.address.city}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => toggleCompare(s.id)}
                aria-label={t("calculator.compare.remove", { name: s.name })}
              >
                <X />
              </Button>
            </div>
          ))}

          <Row label={t("calculator.compare.rating")}>
            {selected.map((s) => (
              <Cell key={s.id}>
                <StarRating rating={s.rating} reviewCount={s.reviewCount} size="md" />
              </Cell>
            ))}
          </Row>
          <Row label={t("calculator.compare.distanceFrom", { place: location.label })}>
            {selected.map((s) => (
              <Cell key={s.id}>
                <span className="num font-medium">{formatKm(roadDistanceKm(s.location, location))}</span>
                <span className="text-xs text-muted-foreground">{t("calculator.compare.byRoad")}</span>
              </Cell>
            ))}
          </Row>

          {FUEL_CATEGORIES.map((cat) => (
            <Row key={cat} label={FUEL_META[cat].label}>
              {selected.map((s) => {
                const p = mainProduct(s, cat);
                if (!p) return <Cell key={s.id}><span className="text-muted-foreground">{t("calculator.compare.notOffered")}</span></Cell>;
                const best = bestKwh[cat] !== undefined && pricePerKwh(p) === bestKwh[cat];
                const unit = baseUnitLabel(cat);
                return (
                  <Cell key={s.id}>
                    <p className={cn("num text-base font-semibold", best && "text-moss-strong")}>
                      {formatCzkPerUnit(pricePerBaseUnit(p), unit)}
                    </p>
                    <p className={cn("num text-xs", best ? "font-medium text-moss-strong" : "text-muted-foreground")}>
                      {formatKwhPrice(pricePerKwh(p))}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.name}</p>
                  </Cell>
                );
              })}
            </Row>
          ))}

          <Row label={t("calculator.compare.delivery")}>
            {selected.map((s) => {
              const d = s.delivery;
              return (
                <Cell key={s.id}>
                  {d.ownDelivery == null ? (
                    <span className="text-xs text-muted-foreground">{t("sellers.delivery.unspecified")}</span>
                  ) : d.ownDelivery ? (
                    <ul className="num space-y-0.5 text-xs">
                      <li>{t("calculator.compare.flatFee", { price: d.baseFee != null ? formatCzk(d.baseFee) : "–" })}</li>
                      <li>
                        {d.pricePerKm != null
                          ? `${formatNumber(toDisplayCurrency(d.pricePerKm), currencySymbol() === "€" ? 2 : 1)} ${currencySymbol()}/km`
                          : "–"}
                      </li>
                      <li>
                        {t("calculator.compare.freeUpTo", {
                          distance: (d.freeRadiusKm ?? 0) > 0 ? formatKm(d.freeRadiusKm ?? 0) : t("calculator.compare.freeNever"),
                        })}
                      </li>
                      <li>{t("calculator.compare.range", { distance: d.maxRadiusKm != null ? formatKm(d.maxRadiusKm) : "–" })}</li>
                    </ul>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("calculator.compare.noOwnDelivery")}</span>
                  )}
                  <p className="mt-1 text-xs">
                    {t("calculator.compare.arm")}{" "}
                    <span className={d.hydraulicArm ? "font-medium text-moss-strong" : "text-muted-foreground"}>
                      {d.hydraulicArm
                        ? d.hydraulicArmFee
                          ? t("calculator.compare.yesWithFee", { price: formatCzk(d.hydraulicArmFee) })
                          : t("calculator.compare.yes")
                        : t("calculator.compare.no")}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("calculator.compare.pickup", { value: d.pickupAvailable ? t("calculator.compare.yes") : t("calculator.compare.no") })}
                  </p>
                </Cell>
              );
            })}
          </Row>

          <Row label={t("calculator.compare.tags")}>
            {selected.map((s) => (
              <Cell key={s.id}>
                <SellerTags tags={s.tags} max={4} />
              </Cell>
            ))}
          </Row>
        </div>
      </div>
      {selected.length < 2 && (
        <p className="text-sm text-muted-foreground">{t("calculator.compare.addMore")}</p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Fragment>
      <div className="border-b bg-secondary/20 p-3 text-xs font-medium text-muted-foreground last-of-type:border-b-0">
        {label}
      </div>
      {children}
    </Fragment>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-l p-3">{children}</div>;
}
