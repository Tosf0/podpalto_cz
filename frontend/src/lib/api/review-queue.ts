/** Fronta ruční kontroly (jen admin): podezřelé ceny a prodejci bez polohy (RPC `api_review_queue`). */
import type { FuelCategory, PriceUnit, RegionCode } from "@/types";
import { USES_DB, db, invalidate, unwrap } from "./db";

export interface ReviewQueueSeller {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: RegionCode;
  website: string | null;
  reasons: string[];
  flags: string[];
  lat: number | null;
  lng: number | null;
  updatedAt: string;
}

export interface ReviewQueueProduct {
  id: string;
  name: string;
  category: FuelCategory;
  unit: PriceUnit;
  price: number;
  priceUpdatedAt: string;
  reasons: string[];
  sourceUrl: string | null;
  sellerName: string;
  sellerSlug: string;
  lastObservation: { price: number; observedAt: string; flags: string[]; sourceUrl: string | null } | null;
}

export interface ReviewQueue {
  sellers: ReviewQueueSeller[];
  products: ReviewQueueProduct[];
}

export async function getReviewQueue(): Promise<ReviewQueue> {
  if (!USES_DB) return { sellers: [], products: [] };
  return unwrap<ReviewQueue>(await db().rpc("api_review_queue"));
}

export type ReviewDecision = "ok" | "rejected";

/** Schválit / zamítnout produkt nebo prodejce (RPC `review_product` / `review_seller`, kontroluje admina). */
export async function decideReview(kind: "product" | "seller", id: string, decision: ReviewDecision): Promise<void> {
  if (kind === "product") unwrap(await db().rpc("review_product", { product_id: id, decision }));
  else unwrap(await db().rpc("review_seller", { seller_id: id, decision }));
  invalidate("sellers:");
  invalidate("public:");
}
