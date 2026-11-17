"use client";

import { useState } from "react";
import { Loader2, MessageSquareQuote, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Seller, SellerReview } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/common";
import { useAuth } from "@/components/providers/auth-provider";
import { USES_DB, deleteMyReview, getReviews, saveMyReview } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Výběr 1–5 hvězdiček (radio skupina ovladatelná i klávesnicí). */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label={t("account.reviews.ratingLabel")} className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("account.reviews.star", { count: n })}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Star aria-hidden className={cn("size-7", n <= shown ? "fill-wood text-wood" : "text-border")} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  seller,
  existing,
  onDone,
}: {
  seller: Seller;
  existing?: SellerReview;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast(t("account.reviews.pickRating"));
      return;
    }
    setBusy(true);
    try {
      await saveMyReview(seller.id, { rating, title, body }, existing?.id);
      toast.success(t("account.reviews.saved"));
      onDone();
    } catch (err) {
      toast.error(t("account.auth.errorGeneric", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-2xl bg-secondary/60 p-4">
      <StarPicker value={rating} onChange={setRating} />
      <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={t("account.reviews.titlePlaceholder")} className="h-10 rounded-xl bg-card" />
      <Textarea
        value={body}
        maxLength={2000}
        rows={3}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("account.reviews.bodyPlaceholder")}
        className="rounded-xl bg-card"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {existing ? t("account.reviews.save") : t("account.reviews.submit")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("account.reviews.cancel")}
        </Button>
      </div>
    </form>
  );
}

/** Hodnocení prodejce: souhrn, formulář pro vlastní recenzi a seznam recenzí z aplikace. */
export function SellerReviews({ seller, onChanged }: { seller: Seller; onChanged?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: reviews, loading, reload } = useApi(() => getReviews(seller.id), [seller.id]);
  const [editing, setEditing] = useState(false);
  const mine = reviews?.find((r) => r.user_id === user?.id);
  const others = (reviews ?? []).filter((r) => r.user_id !== user?.id);

  const done = () => {
    setEditing(false);
    reload();
    onChanged?.();
  };

  const remove = async (review: SellerReview) => {
    try {
      await deleteMyReview(seller.id, review.id);
      toast(t("account.reviews.deleted"));
      done();
    } catch (err) {
      toast.error(t("account.auth.errorGeneric", { message: err instanceof Error ? err.message : String(err) }));
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-4.5">
            <MessageSquareQuote />
          </span>
          <div>
            <h2 className="text-xl font-semibold">{t("account.reviews.title")}</h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StarRating rating={seller.rating} reviewCount={seller.reviewCount} size="md" />
              <span>· {t("account.reviews.external")}</span>
            </p>
          </div>
        </div>
        {USES_DB && user && !mine && !editing && (
          <Button onClick={() => setEditing(true)}>
            <Star /> {t("account.reviews.write")}
          </Button>
        )}
      </header>

      {!USES_DB ? (
        <p className="text-sm text-muted-foreground">{t("account.reviews.demo")}</p>
      ) : (
        <div className="space-y-4">
          {editing && <ReviewForm seller={seller} existing={mine} onDone={done} />}

          {mine && !editing && (
            <article className="rounded-2xl border border-primary/30 bg-accent/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("account.reviews.yours")}</p>
                  <ReviewBody review={mine} />
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" aria-label={t("account.reviews.edit")} onClick={() => setEditing(true)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={t("account.reviews.delete")} onClick={() => void remove(mine)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </article>
          )}

          {loading && !reviews ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : others.length === 0 && !mine ? (
            <p className="text-sm text-muted-foreground">{t("account.reviews.empty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {others.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                  <ReviewBody review={r} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ReviewBody({ review }: { review: SellerReview }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex" aria-label={t("account.reviews.star", { count: review.rating })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} aria-hidden className={cn("size-4", n <= review.rating ? "fill-wood text-wood" : "text-border")} />
          ))}
        </span>
        <span className="text-sm font-semibold">{review.author_name}</span>
        <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
      </div>
      {review.title && <p className="font-medium">{review.title}</p>}
      {review.body && <p className="text-sm leading-relaxed text-foreground/85">{review.body}</p>}
      {review.seller_reply && (
        <div className="mt-2 rounded-xl bg-secondary p-3 text-sm">
          <p className="text-xs font-semibold text-muted-foreground">{t("account.reviews.reply")}</p>
          <p className="mt-0.5">{review.seller_reply}</p>
        </div>
      )}
    </div>
  );
}
