"use client";

import { useRef, useState } from "react";
import { BadgeCheck, Clock, ImagePlus, KeyRound, Loader2, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Seller } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { useApi } from "@/hooks/use-api";
import {
  getMyClaim,
  getOwnedSellerIds,
  getOwnerSellerFields,
  submitClaim,
  updateOwnedSeller,
  uploadSellerPhoto,
  type ClaimInput,
  type MyClaim,
  type OwnerSellerFields,
} from "@/lib/api/claims";
import { USES_DB } from "@/lib/api/db";
import { t } from "@/lib/i18n/translate";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Žádost o převzetí                                                   */
/* ------------------------------------------------------------------ */

function ClaimDialog({
  seller,
  existing,
  open,
  onOpenChange,
  onSent,
}: {
  seller: Seller;
  existing: MyClaim | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSent: () => void;
}) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState<Omit<ClaimInput, "sellerId">>({
    contactName: profile?.full_name ?? "",
    roleInCompany: "",
    contactPhone: profile?.phone ?? "",
    contactEmail: user?.email ?? "",
    ico: seller.ico ?? "",
    proofUrl: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = async () => {
    if (form.contactName.trim().length < 2 || !form.proofUrl.trim()) {
      toast.error(t("sellers.detail.claim.required"));
      return;
    }
    setBusy(true);
    try {
      await submitClaim({ ...form, sellerId: seller.id }, existing);
      toast.success(t("sellers.detail.claim.sent"));
      onOpenChange(false);
      onSent();
    } catch (e) {
      toast.error(t("sellers.detail.claim.failed", { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("sellers.detail.claim.title")}</DialogTitle>
          <DialogDescription>{t("sellers.detail.claim.intro")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="claim-name" label={t("sellers.detail.claim.contactName")}>
            <Input id="claim-name" value={form.contactName} onChange={set("contactName")} className="h-9 rounded-xl" />
          </Field>
          <Field id="claim-role" label={t("sellers.detail.claim.role")}>
            <Input
              id="claim-role"
              value={form.roleInCompany}
              onChange={set("roleInCompany")}
              placeholder={t("sellers.detail.claim.rolePlaceholder")}
              className="h-9 rounded-xl"
            />
          </Field>
          <Field id="claim-phone" label={t("sellers.detail.claim.phone")}>
            <Input id="claim-phone" type="tel" value={form.contactPhone} onChange={set("contactPhone")} className="h-9 rounded-xl" />
          </Field>
          <Field id="claim-ico" label={t("sellers.detail.claim.ico")}>
            <Input id="claim-ico" inputMode="numeric" value={form.ico} onChange={set("ico")} className="h-9 rounded-xl" />
          </Field>
          <div className="sm:col-span-2">
            <Field id="claim-email" label={t("sellers.detail.claim.email")} hint={t("sellers.detail.claim.emailHint")}>
              <Input id="claim-email" type="email" value={form.contactEmail} onChange={set("contactEmail")} className="h-9 rounded-xl" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="claim-proof" label={t("sellers.detail.claim.proof")}>
              <Input
                id="claim-proof"
                value={form.proofUrl}
                onChange={set("proofUrl")}
                placeholder={t("sellers.detail.claim.proofPlaceholder")}
                className="h-9 rounded-xl"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="claim-message" label={t("sellers.detail.claim.message")}>
              <Textarea id="claim-message" value={form.message} onChange={set("message")} rows={3} className="rounded-xl" />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("sellers.detail.claim.cancel")}
          </Button>
          <Button onClick={() => void send()} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {existing ? t("sellers.detail.claim.resubmit") : t("sellers.detail.claim.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Úprava profilu vlastníkem                                           */
/* ------------------------------------------------------------------ */

function OwnerEditDialog({
  seller,
  open,
  onOpenChange,
  onSaved,
}: {
  seller: Seller;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { data, loading } = useApi(() => (open ? getOwnerSellerFields(seller.id) : Promise.resolve(null)), [open, seller.id]);
  const [edits, setEdits] = useState<Partial<OwnerSellerFields>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const value = (k: keyof OwnerSellerFields) => edits[k] ?? data?.[k] ?? "";
  const set = (k: keyof OwnerSellerFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEdits((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const merged = { ...data, ...edits };
      await updateOwnedSeller(seller.id, {
        description: (merged.description ?? "").trim(),
        phone: merged.phone?.trim() || null,
        email: merged.email?.trim() || null,
        website: merged.website?.trim() || null,
        delivery_notes: merged.delivery_notes?.trim() || null,
      });
      toast.success(t("sellers.detail.claim.saved"));
      setEdits({});
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(t("sellers.detail.claim.failed", { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadSellerPhoto(seller.id, file);
      toast.success(t("sellers.detail.claim.photoUploaded"));
      onSaved();
    } catch (e) {
      toast.error(t("sellers.detail.claim.failed", { message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("sellers.detail.claim.editTitle")}</DialogTitle>
          <DialogDescription>{seller.name}</DialogDescription>
        </DialogHeader>
        {loading && !data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3">
            <Field id="own-desc" label={t("sellers.detail.claim.description")}>
              <Textarea id="own-desc" value={value("description")} onChange={set("description")} rows={4} className="rounded-xl" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="own-phone" label={t("sellers.detail.claim.phone")}>
                <Input id="own-phone" value={value("phone")} onChange={set("phone")} className="h-9 rounded-xl" />
              </Field>
              <Field id="own-email" label={t("sellers.detail.claim.email")}>
                <Input id="own-email" type="email" value={value("email")} onChange={set("email")} className="h-9 rounded-xl" />
              </Field>
            </div>
            <Field id="own-web" label={t("sellers.detail.claim.website")}>
              <Input id="own-web" value={value("website")} onChange={set("website")} className="h-9 rounded-xl" />
            </Field>
            <Field id="own-delivery" label={t("sellers.detail.claim.deliveryNotes")}>
              <Textarea id="own-delivery" value={value("delivery_notes")} onChange={set("delivery_notes")} rows={2} className="rounded-xl" />
            </Field>
            <Field id="own-photo" label={t("sellers.detail.claim.photo")}>
              <div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {t("sellers.detail.claim.photoPick")}
                </Button>
                <input
                  id="own-photo"
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("sellers.detail.claim.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={busy || !data}>
            {busy && <Loader2 className="animate-spin" />}
            {t("sellers.detail.claim.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Pruh na detailu prodejce                                            */
/* ------------------------------------------------------------------ */

/**
 * Stav převzetí profilu pro přihlášeného uživatele: vlastník → „Upravit profil“, čekající /
 * zamítnutá žádost → stav, jinak (profil bez vlastníka) decentní odkaz „Jste majitel?“.
 */
export function SellerClaimBox({ seller, onChanged }: { seller: Seller; onChanged: () => void }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const owned = useApi(() => (userId ? getOwnedSellerIds(userId) : Promise.resolve([])), [userId, seller.id]);
  const claim = useApi(() => (userId && !seller.claimed ? getMyClaim(seller.id, userId) : Promise.resolve(null)), [userId, seller.id, seller.claimed]);

  if (!USES_DB || !userId) return null;
  const isOwner = owned.data?.includes(seller.id);

  if (isOwner) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-accent/60 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <BadgeCheck aria-hidden className="size-4 text-primary" /> {t("sellers.detail.claim.owner")}
        </span>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Pencil /> {t("sellers.detail.claim.edit")}
        </Button>
        <OwnerEditDialog seller={seller} open={open} onOpenChange={setOpen} onSaved={onChanged} />
      </div>
    );
  }
  if (seller.claimed || claim.loading) return null;

  const mine = claim.data;
  if (mine?.status === "pending") {
    return (
      <p className="mt-5 flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Clock aria-hidden className="size-4" /> {t("sellers.detail.claim.pending")}
      </p>
    );
  }

  return (
    <div className="mt-5">
      {mine?.status === "rejected" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-clay-soft px-4 py-3 text-sm text-clay-strong">
          <span className="flex items-start gap-2">
            <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {t("sellers.detail.claim.rejected")}
              {mine.review_note && <> {t("sellers.detail.claim.note", { note: mine.review_note })}</>}
            </span>
          </span>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {t("sellers.detail.claim.resubmit")}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <KeyRound aria-hidden className="size-4" /> {t("sellers.detail.claim.cta")}
        </button>
      )}
      <ClaimDialog seller={seller} existing={mine ?? null} open={open} onOpenChange={setOpen} onSent={claim.reload} />
    </div>
  );
}
