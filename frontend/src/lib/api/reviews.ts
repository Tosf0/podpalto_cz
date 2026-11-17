import type { SellerReview } from "@/types";
import { USES_DB, cached, db, invalidate, unwrap } from "./db";

const COLUMNS =
  "id, seller_id, user_id, author_name, rating, title, body, seller_reply, seller_replied_at, created_at, updated_at";

/** Zveřejněné recenze prodejce (nejnovější první). V demo režimu prázdné. */
export async function getReviews(sellerId: string): Promise<SellerReview[]> {
  if (!USES_DB) return [];
  return cached(`reviews:${sellerId}`, async () =>
    unwrap<SellerReview[]>(
      await db().from("reviews").select(COLUMNS).eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(50),
    ),
  );
}

export interface ReviewInput {
  rating: number;
  title?: string;
  body?: string;
}

/** Uloží (nebo upraví) recenzi přihlášeného uživatele – jedna recenze na prodejce. */
export async function saveMyReview(sellerId: string, input: ReviewInput, existingId?: string): Promise<void> {
  const payload = { rating: input.rating, title: input.title?.trim() || null, body: input.body?.trim() || null };
  if (existingId) {
    unwrap(await db().from("reviews").update(payload).eq("id", existingId));
  } else {
    unwrap(await db().from("reviews").insert({ seller_id: sellerId, ...payload }));
  }
  invalidate(`reviews:${sellerId}`);
  invalidate("sellers:");
}

/** Smaže vlastní recenzi. */
export async function deleteMyReview(sellerId: string, reviewId: string): Promise<void> {
  unwrap(await db().from("reviews").delete().eq("id", reviewId));
  invalidate(`reviews:${sellerId}`);
  invalidate("sellers:");
}
