"use client";

import { useState } from "react";
import { Check, Image as ImageIcon, Loader2, ShieldAlert, Trees } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { db, invalidate } from "@/lib/api/db";
import { cn } from "@/lib/utils";

type PhotoMode = "seller" | "generic";

async function readMode(): Promise<PhotoMode> {
  const { data, error } = await db().from("app_settings").select("value").eq("key", "seller_photos").maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.value as PhotoMode) === "seller" ? "seller" : "generic";
}

const OPTIONS: { value: PhotoMode; title: string; text: string; icon: typeof ImageIcon; badge: string }[] = [
  {
    value: "seller",
    title: "Fotky z webů prodejců",
    text: "Pro vývoj a ukázku (showcase). Fotky jsou převzaté z webů prodejců bez jejich svolení – nepoužívat v ostrém provozu.",
    icon: ImageIcon,
    badge: "Jen vývoj",
  },
  {
    value: "generic",
    title: "Jen obecné fotky podle paliva",
    text: "Pro produkci. Každý prodejce dostane volně licencovanou fotku podle hlavního paliva (dřevo, pelety, brikety, uhlí), dokud nedá souhlas nebo nenahraje vlastní fotku.",
    icon: Trees,
    badge: "Produkce",
  },
];

/** Nastavení aplikace (admin): přepínač zdroje fotek prodejců – tabulka `app_settings`, klíč `seller_photos`. */
export function AdminSettingsPanel() {
  const { data: mode, loading, error, reload } = useApi(() => readMode(), []);
  const [saving, setSaving] = useState<PhotoMode | null>(null);

  const change = async (value: PhotoMode) => {
    if (value === mode) return;
    setSaving(value);
    try {
      const { data: auth } = await db().auth.getUser();
      const { error: e } = await db()
        .from("app_settings")
        .update({ value, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null })
        .eq("key", "seller_photos");
      if (e) throw new Error(e.message);
      invalidate("sellers:");
      invalidate("public:");
      toast.success(value === "seller" ? "Zobrazují se fotky z webů prodejců (vývoj)" : "Zobrazují se jen obecné fotky podle paliva");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Fotky prodejců</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Přepínač platí pro celou aplikaci (mapu, katalog i detail prodejce). Změna se projeví po obnovení stránky.
        </p>
      </div>

      {loading && !mode ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Nastavení se nepodařilo načíst: {error.message}</p>
      ) : (
        <div role="radiogroup" aria-label="Zdroj fotek prodejců" className="grid gap-3 md:grid-cols-2">
          {OPTIONS.map((o) => {
            const active = mode === o.value;
            const Icon = o.icon;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => void change(o.value)}
                disabled={!!saving}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors",
                  active ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon className="size-4" aria-hidden /> {o.title}
                  </span>
                  {saving === o.value ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : active ? (
                    <Check className="size-4 text-primary" aria-hidden />
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">{o.text}</span>
                <span className="w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{o.badge}</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-clay-soft px-4 py-3 text-sm text-clay-strong">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        Před spuštěním produkce přepněte na obecné fotky. Fotky z webů prodejců smíme používat až po jejich svolení (TODO
        v docs/TODO.md – žádost o svolení, případně vlastní fotky po převzetí profilu).
      </p>
    </section>
  );
}
