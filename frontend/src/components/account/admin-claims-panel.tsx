"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { approveClaim, getClaims, rejectClaim, type AdminClaim, type ClaimStatus } from "@/lib/api/claims";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS: { value: ClaimStatus | "all"; label: string }[] = [
  { value: "pending", label: "Čekající" },
  { value: "approved", label: "Schválené" },
  { value: "rejected", label: "Zamítnuté" },
  { value: "all", label: "Vše" },
];

const STATUS: Record<ClaimStatus, { label: string; cls: string }> = {
  pending: { label: "Čeká", cls: "bg-wood-soft text-wood-strong" },
  approved: { label: "Schváleno", cls: "bg-pine-soft text-pine" },
  rejected: { label: "Zamítnuto", cls: "bg-clay-soft text-clay-strong" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Odkaz, pokud text vypadá jako URL. */
function MaybeLink({ text }: { text: string }) {
  if (!/^https?:\/\//i.test(text.trim())) return <>{text}</>;
  return (
    <a href={text.trim()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
      {text.trim()} <ExternalLink className="size-3" />
    </a>
  );
}

/**
 * Žádosti o převzetí profilu prodejce (jen admin). Schválení = uživatel se stane vlastníkem
 * profilu a dostane tarif Prodejce (dokud nejsou platby). Ověřte údaje proti profilu (IČO,
 * doména e-mailu vs. web, doklad) – v případě pochybností prodejci zavolejte na veřejné číslo.
 */
export function AdminClaimsPanel() {
  const [filter, setFilter] = useState<ClaimStatus | "all">("pending");
  const { data, loading, error, reload } = useApi(() => getClaims(filter), [filter]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminClaim | null>(null);
  const [note, setNote] = useState("");

  const approve = async (c: AdminClaim) => {
    if (!window.confirm(`Schválit převzetí profilu „${c.seller?.name}“ uživatelem ${c.contact_name}? Uživatel dostane tarif Prodejce.`)) return;
    setBusy(c.id);
    try {
      await approveClaim(c.id);
      toast.success("Žádost schválena, profil má vlastníka");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    const c = rejecting;
    setRejecting(null);
    setBusy(c.id);
    try {
      await rejectClaim(c.id, note);
      toast.success("Žádost zamítnuta");
      setNote("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Ověřte, že žadatel firmu zastupuje (IČO, e-mail na doméně webu, doklad). Po schválení může upravovat profil.
        </p>
        <div role="group" aria-label="Filtr žádostí" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : error ? (
        <EmptyState title="Žádosti se nepodařilo načíst" description={error.message} action={<Button onClick={reload}>Zkusit znovu</Button>} />
      ) : !data?.length ? (
        <EmptyState title="Žádné žádosti" description="V tomto stavu teď žádná žádost o převzetí profilu není." />
      ) : (
        <ul className="space-y-3">
          {data.map((c) => {
            const emailDomain = c.contact_email?.split("@")[1]?.toLowerCase();
            const webDomain = c.seller?.website?.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0]?.toLowerCase();
            const domainMatch = !!emailDomain && !!webDomain && webDomain.endsWith(emailDomain.replace(/^www\./, ""));
            const icoMatch = !!c.ico && c.ico === c.seller?.ico;
            return (
              <li key={c.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS[c.status].cls)}>{STATUS[c.status].label}</span>
                    {c.seller ? (
                      <Link href={`/prodejci/${c.seller.slug}`} className="font-semibold underline-offset-2 hover:underline" target="_blank">
                        {c.seller.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">Prodejce smazán</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {c.seller?.city} · odesláno {formatDate(c.created_at)}
                    </span>
                  </div>
                  {c.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void approve(c)} disabled={!!busy}>
                        {busy === c.id ? <Loader2 className="animate-spin" /> : <Check />} Schválit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejecting(c)} disabled={!!busy}>
                        <X /> Zamítnout
                      </Button>
                    </div>
                  )}
                </div>
                <dl className="grid gap-1.5 md:grid-cols-2">
                  <Row label="Žadatel">
                    {c.contact_name}
                    {c.role_in_company && <span className="text-muted-foreground"> · {c.role_in_company}</span>}
                  </Row>
                  <Row label="Telefon">{c.contact_phone ?? "–"}</Row>
                  <Row label="E-mail">
                    {c.contact_email ?? "–"}
                    {c.contact_email && (
                      <span className={cn("ml-2 text-xs", domainMatch ? "text-moss-strong" : "text-muted-foreground")}>
                        {domainMatch ? "✓ doména webu" : "jiná doména než web"}
                      </span>
                    )}
                  </Row>
                  <Row label="IČO">
                    {c.ico ?? "–"}
                    {c.ico && (
                      <span className={cn("ml-2 text-xs", icoMatch ? "text-moss-strong" : "text-clay-strong")}>
                        {icoMatch ? "✓ shoda s profilem" : `profil: ${c.seller?.ico ?? "neuvedeno"}`}
                      </span>
                    )}
                  </Row>
                  <Row label="Ověření">{c.proof_url ? <MaybeLink text={c.proof_url} /> : "–"}</Row>
                  <Row label="Kontakt profilu">
                    {[c.seller?.phone, c.seller?.email].filter(Boolean).join(" · ") || "–"}
                  </Row>
                  {c.message && <Row label="Zpráva">{c.message}</Row>}
                  {c.review_note && <Row label="Poznámka">{c.review_note}</Row>}
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zamítnout žádost</DialogTitle>
            <DialogDescription>Žadatel uvidí poznámku na profilu prodejce a může žádost opravit a poslat znovu.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Proč žádost zamítáte / co doložit (nepovinné)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Zrušit
            </Button>
            <Button onClick={() => void confirmReject()}>
              <X /> Zamítnout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
