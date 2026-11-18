"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { decideReview, getReviewQueue, type ReviewDecision } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { formatCzk, formatDate } from "@/lib/format";

/** Popisky blokujících příznaků (docs/agent-output-spec.md, sekce 9). Interní stránka – jen česky. */
const REASON_LABELS: Record<string, string> = {
  outlier_vs_market: "Cena mimo běžné rozpětí trhu",
  unit_price_implausible: "Nevěrohodná cena za jednotku",
  price_jump: "Skok ceny o víc než 30 %",
  package_size_unknown: "Neznámá velikost balení",
  volume_stacking_unknown: "Neznámý způsob uložení objemu",
  location_unknown: "Chybí poloha prodejce",
  location_region_mismatch: "Poloha nesedí s krajem adresy",
};

function Reasons({ reasons }: { reasons: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((r) => (
        <span key={r} className="rounded-md bg-clay-soft px-2 py-0.5 text-xs font-medium text-clay-strong" title={r}>
          {REASON_LABELS[r] ?? r}
        </span>
      ))}
    </div>
  );
}

function DecisionButtons({ onDecide }: { onDecide: (d: ReviewDecision) => Promise<void> }) {
  const [busy, setBusy] = useState<ReviewDecision | null>(null);
  const run = async (d: ReviewDecision) => {
    setBusy(d);
    try {
      await onDecide(d);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" onClick={() => void run("ok")} disabled={!!busy}>
        {busy === "ok" ? <Loader2 className="animate-spin" /> : <Check />} Schválit
      </Button>
      <Button size="sm" variant="outline" onClick={() => void run("rejected")} disabled={!!busy}>
        {busy === "rejected" ? <Loader2 className="animate-spin" /> : <X />} Zamítnout
      </Button>
    </div>
  );
}

/**
 * Fronta ruční kontroly (role admin): záznamy, které agenti označili blokujícím příznakem.
 * Schválení = zobrazí se v aplikaci, zamítnutí = zůstane skryté (historie se nemaže).
 */
export function ReviewQueuePage() {
  const { data, loading, error, reload } = useApi(() => getReviewQueue(), []);

  const decide = async (kind: "product" | "seller", id: string, d: ReviewDecision) => {
    try {
      await decideReview(kind, id, d);
      toast.success(d === "ok" ? "Schváleno" : "Zamítnuto");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const empty = data && data.sellers.length === 0 && data.products.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={<ShieldCheck />}
        eyebrow="Administrace"
        title="Kontrola dat od agentů"
        description="Ceny a prodejci s blokujícím příznakem čekají na ruční kontrolu. Do té doby se v aplikaci nezobrazují."
      />

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : error ? (
        <EmptyState title="Frontu se nepodařilo načíst" description={error.message} action={<Button onClick={reload}>Zkusit znovu</Button>} />
      ) : empty ? (
        <EmptyState icon={<ShieldCheck />} title="Nic ke kontrole" description="Všechny záznamy od agentů jsou schválené." />
      ) : (
        <>
          {data && data.sellers.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Prodejci ({data.sellers.length})</h2>
              {data.sellers.map((s) => (
                <article key={s.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-semibold">
                      {s.name} <span className="font-normal text-muted-foreground">· {s.city} ({s.region})</span>
                    </p>
                    <Reasons reasons={s.reasons} />
                    <p className="text-xs text-muted-foreground">
                      {s.lat != null ? `${s.lat.toFixed(5)}, ${s.lng?.toFixed(5)}` : "bez polohy"} · změna {formatDate(s.updatedAt)}
                      {s.website && (
                        <>
                          {" · "}
                          <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                            web <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <DecisionButtons onDecide={(d) => decide("seller", s.id, d)} />
                </article>
              ))}
            </section>
          )}

          {data && data.products.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Ceny a produkty ({data.products.length})</h2>
              {data.products.map((p) => (
                <article key={p.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-semibold">
                      {p.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        · <Link href={`/prodejci/${p.sellerSlug}`} className="underline">{p.sellerName}</Link>
                      </span>
                    </p>
                    <Reasons reasons={p.reasons} />
                    <p className="num text-xs text-muted-foreground">
                      {formatCzk(p.price)} / {p.unit} · {formatDate(p.priceUpdatedAt)}
                      {p.lastObservation?.sourceUrl && (
                        <>
                          {" · "}
                          <a href={p.lastObservation.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                            zdroj <ExternalLink className="size-3" />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <DecisionButtons onDecide={(d) => decide("product", p.id, d)} />
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
