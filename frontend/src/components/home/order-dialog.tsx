"use client";

import { useState } from "react";
import { CheckCircle2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatCzk, formatNumber } from "@/lib/format";
import { offerTotal } from "@/lib/pricing";
import type { FuelProduct, Seller, UserLocation } from "@/types";

/**
 * Poptávka / objednávka u prodejce. V demo režimu se nikam neodesílá – jen potvrdí souhrn.
 * Po napojení backendu: POST /api/orders { seller_id, product_id, quantity, … }.
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
  const products = seller.products.filter((p) => p.stock !== "out_of_stock");
  const [productId, setProductId] = useState(initialProduct.id);
  const [quantity, setQuantity] = useState(String(initialProduct.minOrder ?? (initialProduct.category === "wood" ? 5 : 1)));
  const [arm, setArm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const product = products.find((p) => p.id === productId) ?? initialProduct;
  const qty = Math.max(0, Number(quantity.replace(",", ".")) || 0);
  const offer = offerTotal(seller, product, qty, location, arm);
  const canSubmit = qty > 0 && name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Objednat u prodejce</DialogTitle>
          <DialogDescription>
            {seller.name} · {seller.address.city}. Prodejce vás bude kontaktovat a potvrdí termín dovozu.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onOpenChange(false);
            toast.success("Poptávka připravena", {
              description: `${formatNumber(qty, qty % 1 ? 1 : 0)} × ${product.unit} · celkem ~ ${formatCzk(offer.total)}. (Demo – nic se neodeslalo.)`,
              icon: <CheckCircle2 className="size-4" />,
            });
          }}
        >
          <div className="grid grid-cols-[1fr_7.5rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="order-product">Produkt</Label>
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
              <Label htmlFor="order-qty">Množství ({product.unit})</Label>
              <Input id="order-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="num h-10 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="order-name">Jméno</Label>
              <Input id="order-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-phone">Telefon</Label>
              <Input id="order-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="order-note">Poznámka (příjezd, složení, termín)</Label>
            <Textarea id="order-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl" />
          </div>

          {seller.delivery.hydraulicArm && (
            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
              Složit hydraulickou rukou
              <Switch checked={arm} onCheckedChange={setArm} />
            </label>
          )}

          {/* Souhrn */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary p-3 text-center">
            <div>
              <p className="text-[11px] text-secondary-foreground/70">Palivo</p>
              <p className="num text-sm font-semibold text-secondary-foreground">{formatCzk(offer.goods)}</p>
            </div>
            <div>
              <p className="flex items-center justify-center gap-1 text-[11px] text-secondary-foreground/70">
                <Truck aria-hidden className="size-3" /> Doprava
              </p>
              <p className="num text-sm font-semibold text-secondary-foreground">
                {offer.delivery.outOfRange ? "odběr" : offer.delivery.free ? "zdarma" : formatCzk(offer.delivery.fee)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-secondary-foreground/70">Celkem</p>
              <p className="num text-sm font-bold text-wood-strong">{formatCzk(offer.total)}</p>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
            Odeslat poptávku
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
