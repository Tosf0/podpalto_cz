"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Globe, MapPin, Phone, Scale, ShoppingBasket, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { FuelBadge, PriceTag, SellerCover, SellerTags, StarRating, StockBadge } from "@/components/common";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { REGIONS } from "@/lib/constants";
import { deliveryLabel, popupProducts, type SellerMatch } from "@/lib/filters";
import { formatCzk, formatCzkPerUnit, formatKm, formatRelative } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PRICE_TIER_META } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { OrderDialog } from "./order-dialog";

function InfoTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col gap-1 rounded-2xl border border-border bg-card p-3.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className="num text-base font-bold text-foreground">{value}</span>
      {hint && <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * Detail prodejce v pravém panelu (2/5 šířky): fotka, ceník, doprava a akce (Objednat, Porovnat…).
 */
export function SellerPanel({ match, isBest, onClose }: { match: SellerMatch; isBest: boolean; onClose: () => void }) {
  const { seller, product } = match;
  const { location, compareIds, toggleCompare } = usePreferences();
  const { t } = useI18n();
  const [orderOpen, setOrderOpen] = useState(false);
  const router = useRouter();
  const comparing = compareIds.includes(seller.id);
  const products = popupProducts(seller, product, 4);
  const tier = PRICE_TIER_META[match.tier];
  const d = seller.delivery;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Fotka */}
        <div className="relative p-4 pb-0">
          <div className="relative h-52 overflow-hidden rounded-2xl bg-muted">
            <SellerCover seller={seller} fuel={product.category} />
            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {seller.categories.map((c) => (
                  <FuelBadge key={c} category={c} size="sm" className="bg-card/90 backdrop-blur" />
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("home.panel.closeDetail")}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card/90 text-foreground shadow-soft backdrop-blur transition-colors hover:bg-card"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            {isBest && (
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-soft">
                <Check aria-hidden className="size-3.5" /> {t("home.panel.bestPrice")}
              </span>
            )}
          </div>
        </div>

        {/* Název */}
        <div className="space-y-2 px-5 pt-4">
          <h2 className="font-heading text-2xl leading-tight font-semibold">{seller.name}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <StarRating rating={seller.rating} reviewCount={seller.reviewCount} />
            <span className="flex items-center gap-1">
              <MapPin aria-hidden className="size-3.5" />
              {seller.address.city}, {REGIONS[seller.address.region].short}
            </span>
            <span className="num">{t("home.panel.fromYou", { distance: formatKm(match.distanceKm) })}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">{seller.description}</p>
          <SellerTags tags={seller.tags} max={5} className="pt-1" />
        </div>

        {/* Ceník */}
        <section className="space-y-3 px-5 pt-6">
          <div className="flex items-baseline justify-between">
            <h3 className="font-heading text-lg font-semibold">{t("home.panel.priceList")}</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-2 rounded-full" style={{ background: tier.color }} />
              {tier.label}
            </span>
          </div>
          <div className="grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2">
            {products.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex h-full flex-col justify-between gap-3 rounded-2xl border p-3.5",
                  p.id === product.id ? "border-moss/50 bg-moss-soft" : "border-border bg-card",
                )}
              >
                <p className="line-clamp-2 text-sm leading-snug font-medium text-foreground">{p.name}</p>
                <div className="flex items-end justify-between gap-2">
                  <PriceTag product={p} size="sm" />
                  <StockBadge stock={p.stock} className="shrink-0" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("home.panel.pricesNote", { when: formatRelative(product.updatedAt) })}{" "}
            <Link href={`/prodejci/${seller.slug}`} className="font-medium text-moss-strong underline-offset-2 hover:underline">
              {t("home.panel.fullPriceList")}
            </Link>
          </p>
        </section>

        {/* Doprava */}
        <section className="space-y-3 px-5 pt-6 pb-6">
          <h3 className="font-heading text-lg font-semibold">{t("home.panel.deliveryTitle")}</h3>
          <div className="grid auto-rows-fr grid-cols-2 gap-2.5">
            <InfoTile
              icon={<Truck aria-hidden />}
              label={t("home.panel.deliveryEstimate")}
              value={match.delivery.outOfRange ? "—" : match.delivery.free ? t("home.panel.free") : formatCzk(match.delivery.fee)}
              hint={deliveryLabel(match.delivery, seller)}
            />
            <InfoTile
              icon={<ShoppingBasket aria-hidden />}
              label={t("home.panel.totalFor", { ref: match.reference.label })}
              value={formatCzk(match.totalForReference)}
              hint={t("home.panel.fuelPlusDelivery")}
            />
            <InfoTile
              icon={<MapPin aria-hidden />}
              label={t("home.panel.reach")}
              value={d.ownDelivery ? `${d.maxRadiusKm} km` : t("home.panel.pickupOnly")}
              hint={d.freeRadiusKm ? t("home.panel.freeWithin", { km: d.freeRadiusKm }) : formatCzkPerUnit(d.pricePerKm, "km")}
            />
            <InfoTile
              icon={<Truck aria-hidden />}
              label={t("home.panel.hydraulicArm")}
              value={d.hydraulicArm ? t("home.panel.yes") : t("home.panel.no")}
              hint={d.hydraulicArm && d.hydraulicArmFee ? t("home.panel.armSurcharge", { price: formatCzk(d.hydraulicArmFee) }) : undefined}
            />
          </div>
          {d.notes && <p className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs leading-relaxed text-secondary-foreground">{d.notes}</p>}

          <div className="grid grid-cols-2 gap-2.5 pt-1 text-sm">
            {seller.phone && (
              <a href={`tel:${seller.phone.replace(/\s/g, "")}`} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border hover:bg-muted">
                <Phone aria-hidden className="size-4 text-moss" />
                <span className="num text-xs">{seller.phone}</span>
              </a>
            )}
            <a
              href={seller.website}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-border hover:bg-muted"
            >
              <Globe aria-hidden className="size-4 text-moss" />
              <span className="truncate text-xs">{seller.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
            </a>
          </div>
        </section>
      </div>

      {/* Akce – vždy viditelné */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 border-t border-border bg-card p-4">
        <Button size="lg" className="col-span-2" onClick={() => setOrderOpen(true)}>
          <ShoppingBasket aria-hidden />
          {t("common.actions.order")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            toggleCompare(seller.id);
            toast(comparing ? t("home.panel.removedCompare") : t("home.panel.addedCompare"), {
              action: comparing ? undefined : { label: t("common.actions.compare"), onClick: () => router.push("/kalkulacka#srovnani") },
            });
          }}
          className={cn(comparing && "border-moss/50 bg-moss-soft text-moss-strong")}
        >
          <Scale aria-hidden />
          {comparing ? t("common.actions.inCompare") : t("common.actions.compare")}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/prodejci/${seller.slug}`}>
            {t("common.actions.profile")}
            <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>

      <OrderDialog seller={seller} initialProduct={product} location={location} open={orderOpen} onOpenChange={setOrderOpen} />
    </div>
  );
}
