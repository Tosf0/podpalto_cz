"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, Check, Lock, Sparkles, Store, User } from "lucide-react";
import { toast } from "sonner";
import type { PlanTier } from "@/types";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { usePreferences } from "@/components/providers/preferences-provider";
import { localeOf } from "@/lib/i18n/translate";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PlanDef {
  id: PlanTier;
  /** Měsíční cena v Kč (výchozí měna) a v eurech (když si uživatel v Nastavení zvolí EUR). */
  priceCzk: number;
  priceEur: number;
  icon: React.ReactNode;
  tagline: MessageKey;
  features: MessageKey[];
  highlight?: boolean;
}

/** Ceník – shodný s tabulkou `plans` v Supabase (`price_czk_month`, `price_eur_month`; Stripe zatím nenapojený). */
const PLANS: PlanDef[] = [
  {
    id: "free",
    priceCzk: 0,
    priceEur: 0,
    icon: <User />,
    tagline: "account.plans.freeTagline",
    features: ["account.plans.freeF1", "account.plans.freeF2", "account.plans.freeF3", "account.plans.freeF4", "account.plans.freeF5"],
  },
  {
    id: "pro",
    priceCzk: 490,
    priceEur: 20,
    icon: <Bot />,
    tagline: "account.plans.proTagline",
    features: ["account.plans.proF1", "account.plans.proF2", "account.plans.proF3", "account.plans.proF4"],
    highlight: true,
  },
  {
    id: "seller",
    priceCzk: 490,
    priceEur: 20,
    icon: <Store />,
    tagline: "account.plans.sellerTagline",
    features: ["account.plans.sellerF1", "account.plans.sellerF2", "account.plans.sellerF3", "account.plans.sellerF4"],
  },
];

/** /plany – tarify Zdarma, Pro a Prodejce. Tlačítko platby zatím jen oznámí, že platby nejsou v provozu. */
export function PlansPage() {
  const { t } = useI18n();
  const { lang, currency } = usePreferences();
  const { user, plan: currentPlan, enabled } = useAuth();
  const params = useSearchParams();
  const feature = params.get("feature");
  // ceny jsou v Kč, v eurech jen když si uživatel zvolí EUR (Nastavení → Měna)
  const price = new Intl.NumberFormat(localeOf(lang), { style: "currency", currency, currencyDisplay: "symbol", maximumFractionDigits: 0 });

  const choose = () =>
    toast(t("account.plans.paymentsOff"), {
      description: t("account.plans.paymentsOffDesc"),
      icon: <Lock className="size-4" />,
    });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader icon={<Sparkles />} eyebrow={t("account.plans.eyebrow")} title={t("account.plans.title")} description={t("account.plans.description")} />

      {feature === "ci" && (
        <p className="flex items-center gap-2.5 rounded-2xl border border-primary/25 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">
          <Lock aria-hidden className="size-4 shrink-0" /> {t("account.plans.featureCi")}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = !!user && currentPlan === p.id;
          return (
            <article
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-6 shadow-soft",
                p.highlight ? "border-primary ring-2 ring-primary/20" : "border-border",
              )}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
                  {t("account.plans.popular")}
                </span>
              )}
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-5">{p.icon}</span>
              <h2 className="mt-4 font-heading text-2xl font-semibold">{t(`account.planNames.${p.id}`)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(p.tagline)}</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="num font-heading text-4xl font-semibold">{price.format(currency === "EUR" ? p.priceEur : p.priceCzk)}</span>
                <span className="text-sm text-muted-foreground">{t("account.plans.perMonth")}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    {t(f)}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    {t("account.plans.current")}
                  </Button>
                ) : enabled && !user ? (
                  <Button asChild variant={p.highlight ? "default" : "outline"} className="w-full">
                    <Link href="/prihlaseni?mode=signup&next=/plany">{t("account.plans.signupFree")}</Link>
                  </Button>
                ) : p.id === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t(`account.planNames.${p.id}`)}
                  </Button>
                ) : (
                  <Button variant={p.highlight ? "default" : "outline"} className="w-full" onClick={choose}>
                    {t("account.plans.choose", { plan: t(`account.planNames.${p.id}`) })}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">{t("account.plans.note")}</p>
    </div>
  );
}
