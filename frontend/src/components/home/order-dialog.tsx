"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatCzk, formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { offerTotal } from "@/lib/pricing";
import { USES_DB, submitOrderRequest } from "@/lib/api";
import type { FuelProduct, Seller, UserLocation } from "@/types";

/**
 * Poptávka / objednávka u prodejce. Se Supabase se uloží do `order_requests` (prodejce ji uvidí
 * ve svém účtu), v demo režimu jen potvrdí souhrn.
 */
export function OrderDialog({
  seller,
  initialProduct,
  location,
  open,
  onOpenChange,
}: {
  seller: Seller;
  initialProduct: FuelProduct;
  location: UserLocation;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();
  const products = seller.products.filter((p) => p.stock !== "out_of_stock");
  const [productId, setProductId] = useState(initialProduct.id);
  const [quantity, setQuantity] = useState(String(initialProduct.minOrder ?? (initialProduct.category === "wood" ? 5 : 1)));
  const [arm, setArm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const product = products.find((p) => p.id === productId) ?? initialProduct;
  const qty = Math.max(0, Number(quantity.replace(",", ".")) || 0);
  const offer = offerTotal(seller, product, qty, location, arm);
  const canSubmit = qty > 0 && name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{t("home.order.title")}</DialogTitle>
          <DialogDescription>
            {t("home.order.description", { seller: seller.name, city: seller.address.city })}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canSubmit || sending) return;
            const summary = { qty: formatNumber(qty, qty % 1 ? 1 : 0), unit: product.unit, total: formatCzk(offer.total) };
            if (!USES_DB) {
              onOpenChange(false);
              toast.success(t("home.order.toastTitle"), { description: t("home.order.toastDesc", summary), icon: <CheckCircle2 className="size-4" /> });
              return;
            }
            setSending(true);
            try {
              await submitOrderRequest({
                sellerId: seller.id,
                productId: product.id,
                productName: product.name,
                unit: product.unit,
                quantity: qty,
                unitPriceCzk: product.price,
                deliveryFeeCzk: offer.delivery.outOfRange ? null : offer.delivery.fee,
                hydraulicArm: arm,
                totalCzk: offer.total,
                distanceKm: Number.isFinite(offer.delivery.distanceKm) ? Math.round(offer.delivery.distanceKm * 10) / 10 : null,
                contactName: name.trim(),
                contactPhone: phone.trim(),
                deliveryLabel: location.label,
                deliveryLat: location.lat,
                deliveryLng: location.lng,
                note,
              });
              onOpenChange(false);
              toast.success(t("account.order.sentTitle"), { description: t("account.order.sentDesc", summary), icon: <CheckCircle2 className="size-4" /> });
            } catch (err) {
              toast.error(t("account.order.failed", { message: err instanceof Error ? err.message : String(err) }));
            } finally {
              setSending(false);
            }
          }}
        >
          <div className="grid grid-cols-[1fr_7.5rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="order-product">{t("home.order.product")}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="order-product" className="h-10 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[1300]">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-qty">{t("home.order.quantity", { unit: product.unit })}</Label>
              <Input id="order-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="num h-10 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="order-name">{t("home.order.name")}</Label>
              <Input id="order-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-phone">{t("home.order.phone")}</Label>
              <Input id="order-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="order-note">{t("home.order.note")}</Label>
            <Textarea id="order-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl" />
          </div>

          {seller.delivery.hydraulicArm && (
            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
              {t("home.order.arm")}
              <Switch checked={arm} onCheckedChange={setArm} />
            </label>
          )}

          {/* Souhrn */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary p-3 text-center">
            <div>
              <p className="text-[11px] text-secondary-foreground/70">{t("home.order.fuel")}</p>
              <p className="num text-sm font-semibold text-secondary-foreground">{formatCzk(offer.goods)}</p>
            </div>
            <div>
              <p className="flex items-center justify-center gap-1 text-[11px] text-secondary-foreground/70">
                <Truck aria-hidden className="size-3" /> {t("home.order.delivery")}
              </p>
              <p className="num text-sm font-semibold text-secondary-foreground">
                {offer.delivery.outOfRange ? t("home.order.pickup") : offer.delivery.free ? t("home.order.free") : formatCzk(offer.delivery.fee)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-secondary-foreground/70">{t("home.order.total")}</p>
              <p className="num text-sm font-bold text-wood-strong">{formatCzk(offer.total)}</p>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || sending}>
            {sending && <Loader2 className="animate-spin" />}
            {t("home.order.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
