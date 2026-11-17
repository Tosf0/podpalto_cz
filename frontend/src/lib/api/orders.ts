import type { PriceUnit } from "@/types";
import { USES_DB, db, unwrap } from "./db";

export interface OrderRequestInput {
  sellerId: string;
  productId: string;
  productName: string;
  unit: PriceUnit;
  quantity: number;
  unitPriceCzk: number;
  deliveryFeeCzk: number | null;
  hydraulicArm: boolean;
  totalCzk: number | null;
  distanceKm: number | null;
  contactName: string;
  contactPhone: string;
  deliveryLabel?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  note?: string;
}

/** Uloží poptávku do `order_requests` (prodejce ji uvidí ve svém účtu). V demo režimu vrátí `false`. */
export async function submitOrderRequest(o: OrderRequestInput): Promise<boolean> {
  if (!USES_DB) return false;
  unwrap(
    await db()
      .from("order_requests")
      .insert({
        seller_id: o.sellerId,
        product_id: o.productId,
        product_name: o.productName,
        unit: o.unit,
        quantity: o.quantity,
        unit_price_czk: o.unitPriceCzk,
        delivery_fee_czk: o.deliveryFeeCzk,
        hydraulic_arm: o.hydraulicArm,
        total_czk: o.totalCzk,
        distance_km: o.distanceKm,
        contact_name: o.contactName,
        contact_phone: o.contactPhone,
        delivery_label: o.deliveryLabel ?? null,
        delivery_lat: o.deliveryLat ?? null,
        delivery_lng: o.deliveryLng ?? null,
        note: o.note?.trim() || null,
      }),
  );
  return true;
}
