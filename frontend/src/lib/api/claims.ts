/**
 * Převzetí profilu prodejcem: žádost uživatele (`seller_claims`), schválení adminem
 * (RPC `approve_seller_claim` / `reject_seller_claim`) a úpravy profilu vlastníkem
 * (`sellers`, bucket `seller-photos`). Vše hlídá RLS – viz migrace …210000_seller_claims_and_offers.
 */
import { USES_DB, db, invalidate, unwrap } from "./db";

export type ClaimStatus = "pending" | "approved" | "rejected";

export interface ClaimInput {
  sellerId: string;
  contactName: string;
  roleInCompany: string;
  contactPhone: string;
  contactEmail: string;
  ico: string;
  proofUrl: string;
  message: string;
}

export interface MyClaim {
  id: string;
  status: ClaimStatus;
  review_note: string | null;
  created_at: string;
}

export interface AdminClaim {
  id: string;
  status: ClaimStatus;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  role_in_company: string | null;
  ico: string | null;
  proof_url: string | null;
  message: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  seller: { id: string; name: string; slug: string; city: string; ico: string | null; website: string | null; email: string | null; phone: string | null } | null;
}

/** Moje žádost o daný profil (nebo null). */
export async function getMyClaim(sellerId: string, userId: string): Promise<MyClaim | null> {
  if (!USES_DB) return null;
  const { data, error } = await db()
    .from("seller_claims")
    .select("id, status, review_note, created_at")
    .eq("seller_id", sellerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MyClaim | null) ?? null;
}

/** Odeslat novou žádost, nebo znovu poslat zamítnutou (opravenou). */
export async function submitClaim(input: ClaimInput, existing: MyClaim | null): Promise<void> {
  const row = {
    contact_name: input.contactName.trim(),
    role_in_company: input.roleInCompany.trim() || null,
    contact_phone: input.contactPhone.trim() || null,
    contact_email: input.contactEmail.trim() || null,
    ico: input.ico.replace(/\s/g, "") || null,
    proof_url: input.proofUrl.trim() || null,
    message: input.message.trim() || null,
    status: "pending" as const,
  };
  const res = existing
    ? await db().from("seller_claims").update(row).eq("id", existing.id)
    : await db().from("seller_claims").insert({ ...row, seller_id: input.sellerId });
  unwrap(res);
}

/** ID prodejců, které přihlášený uživatel vlastní. */
export async function getOwnedSellerIds(userId: string): Promise<string[]> {
  if (!USES_DB) return [];
  const { data, error } = await db().from("sellers").select("id").eq("owner_id", userId);
  if (error) throw new Error(error.message);
  return ((data as { id: string }[]) ?? []).map((r) => r.id);
}

export interface OwnerSellerFields {
  description: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  delivery_notes: string | null;
}

export async function getOwnerSellerFields(sellerId: string): Promise<OwnerSellerFields> {
  const { data, error } = await db()
    .from("sellers")
    .select("description, phone, email, website, delivery_notes")
    .eq("id", sellerId)
    .single();
  if (error) throw new Error(error.message);
  return data as OwnerSellerFields;
}

/** Úprava profilu vlastníkem (RLS: vlastník s tarifem Prodejce). */
export async function updateOwnedSeller(sellerId: string, fields: OwnerSellerFields): Promise<void> {
  const { data, error } = await db().from("sellers").update(fields).eq("id", sellerId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Profil se nepodařilo uložit – úpravy vyžadují tarif Prodejce.");
  invalidate("sellers:");
}

/** Vlastní fotka prodejce do bucketu `seller-photos/<seller_id>/…`; nahradí převzatou fotku. */
export async function uploadSellerPhoto(sellerId: string, file: File): Promise<string> {
  const supabase = db();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${sellerId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("seller-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const url = supabase.storage.from("seller-photos").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("sellers").update({ photo_url: url, photo_source_url: null }).eq("id", sellerId);
  if (error) throw new Error(error.message);
  invalidate("sellers:");
  return url;
}

/* ------------------------------ admin ------------------------------ */

export async function getClaims(status: ClaimStatus | "all" = "pending"): Promise<AdminClaim[]> {
  if (!USES_DB) return [];
  let q = db()
    .from("seller_claims")
    .select(
      "id, status, contact_name, contact_phone, contact_email, role_in_company, ico, proof_url, message, review_note, created_at, reviewed_at, seller:sellers(id, name, slug, city, ico, website, email, phone)",
    )
    .order("created_at", { ascending: true });
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as unknown as AdminClaim[]) ?? [];
}

export async function approveClaim(id: string): Promise<void> {
  unwrap(await db().rpc("approve_seller_claim", { claim_id: id }));
  invalidate("sellers:");
}

export async function rejectClaim(id: string, note: string): Promise<void> {
  unwrap(await db().rpc("reject_seller_claim", { claim_id: id, note }));
}
