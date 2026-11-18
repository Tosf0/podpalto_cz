"use client";

import { BadgePercent } from "lucide-react";
import type { Seller, SellerOffer } from "@/types";
import { formatCzkPerUnit, formatDate, formatNumber, plural, unitLabel } from "@/lib/format";
import { getCurrentLang, t } from "@/lib/i18n/translate";

/** Jednotka po „Od …“: v češtině 2. pád („od 1 palety“, „od 10 pytlů“), jinak běžný název. */
function tierUnitLabel(unit: string, qty: number): string {
  if (getCurrentLang() === "cs" && Number.isInteger(qty)) {
    if (unit === "paleta") return plural(qty, "palety", "palet", "palet");
    if (unit === "pytel") return plural(qty, "pytle", "pytlů", "pytlů");
  }
  return unitLabel(unit);
}

function offerLabel(o: SellerOffer): string {
  if (!o.isPromo && o.tierMinQuantity) {
    const unit = o.tierUnit ?? o.unit;
    return t("sellers.detail.offers.tier", {
      qty: formatNumber(o.tierMinQuantity, o.tierMinQuantity % 1 ? 1 : 0),
      unit: tierUnitLabel(unit, o.tierMinQuantity),
    });
  }
  return o.promoValidUntil ? t("sellers.detail.offers.promoUntil", { date: formatDate(o.promoValidUntil) }) : t("sellers.detail.offers.promo");
}

/**
 * Akční ceny a množstevní slevy prodejce (API `offers`). Základní ceník (`products`) je zvlášť –
 * u nabídky navázané na základní produkt ukazujeme pro srovnání i běžnou cenu.
 */
export function SellerOffers({ seller }: { seller: Seller }) {
  const offers = seller.offers ?? [];
  if (offers.length === 0) return null;
  const base = new Map(seller.products.map((p) => [p.id, p]));

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <BadgePercent aria-hidden className="size-4 text-clay-strong" />
        {t("sellers.detail.offers.title")}
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {offers.map((o) => {
          const b = o.baseProductId ? base.get(o.baseProductId) : undefined;
          return (
            <li key={o.id} className="flex items-start justify-between gap-3 rounded-xl border border-clay/30 bg-clay-soft/40 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{o.name}</p>
                <span className="mt-1 inline-flex rounded-md bg-clay-soft px-1.5 py-0.5 text-[11px] font-semibold text-clay-strong">
                  {offerLabel(o)}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <p className="num text-sm font-semibold">{formatCzkPerUnit(o.price, o.unit)}</p>
                {b && (
                  <p className="num text-xs text-muted-foreground line-through">
                    {t("sellers.detail.offers.instead", { price: formatCzkPerUnit(b.price, b.unit) })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
