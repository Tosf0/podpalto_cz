"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Ukázková verze stránky: Supabase je zapnutý, načtení session skončilo a nikdo není přihlášen.
 * Během načítání vrací `null` (ještě nevíme) – stránka má počkat, ať neblikne zamčená verze.
 */
export function useTeaser(): boolean | null {
  const { enabled, loading, user } = useAuth();
  if (!enabled) return false;
  if (loading) return null;
  return !user;
}

/** Odkazy na registraci / přihlášení, které po dokončení vrátí uživatele na tuto stránku. */
function useAuthLinks() {
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || "/");
  return { signup: `/prihlaseni?mode=signup&next=${next}`, signin: `/prihlaseni?next=${next}` };
}

/** Malý štítek „Ukázka“ k nadpisu stránky. */
export function TeaserBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full bg-wood-soft px-2.5 text-[11px] font-semibold tracking-wide text-wood-strong uppercase",
        className,
      )}
    >
      <Sparkles aria-hidden className="size-3" />
      {t("account.teaser.badge")}
    </span>
  );
}

/** Tlačítka „Založit účet zdarma“ + „Mám účet“. */
export function RegisterButtons({
  className,
  size = "default",
  inverted = false,
}: {
  className?: string;
  size?: "default" | "sm" | "lg";
  /** Na tmavém podkladu (levý panel, tmavá karta). */
  inverted?: boolean;
}) {
  const { t } = useI18n();
  const links = useAuthLinks();
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button asChild size={size} variant={inverted ? "secondary" : "default"}>
        <Link href={links.signup}>{t("account.teaser.signup")}</Link>
      </Button>
      <Button
        asChild
        size={size}
        variant={inverted ? "ghost" : "outline"}
        className={inverted ? "text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground" : undefined}
      >
        <Link href={links.signin}>{t("account.teaser.signin")}</Link>
      </Button>
    </div>
  );
}

/** Výrazná výzva k registraci (pruh nad obsahem nebo karta v panelu). */
export function RegisterCta({
  title,
  text,
  className,
  tone = "accent",
}: {
  title?: string;
  text?: string;
  className?: string;
  tone?: "accent" | "dark";
}) {
  const { t } = useI18n();
  const dark = tone === "dark";
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between",
        dark ? "bg-sidebar text-sidebar-foreground" : "border border-primary/25 bg-accent text-accent-foreground",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            dark ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-card text-primary",
          )}
        >
          <Lock aria-hidden className="size-5" />
        </span>
        <div className="space-y-0.5">
          <p className="font-heading text-lg leading-snug font-semibold">{title ?? t("account.teaser.unlockTitle")}</p>
          <p className={cn("text-sm", dark ? "text-sidebar-foreground/75" : "text-accent-foreground/80")}>
            {text ?? t("account.teaser.unlockText")}
          </p>
        </div>
      </div>
      <RegisterButtons className="shrink-0" inverted={dark} />
    </section>
  );
}

/**
 * Zamčený náhled: obsah se vykreslí rozmazaně a neklikatelně, nad ním výzva k registraci.
 * Obsah je pro čtečky skrytý (`aria-hidden`), přístupný je jen text výzvy.
 */
export function LockedPreview({ children, title, className }: { children: React.ReactNode; title?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <div aria-hidden inert className="pointer-events-none max-h-[34rem] overflow-hidden opacity-60 blur-[3px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background/10 via-background/40 to-background/80 p-4">
        <div className="max-w-sm space-y-3 rounded-2xl border border-border bg-card p-5 text-center shadow-float">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent text-primary">
            <Lock aria-hidden className="size-5" />
          </span>
          <p className="font-heading text-lg font-semibold">{title ?? t("account.teaser.locked")}</p>
          <p className="text-sm text-muted-foreground">{t("account.teaser.unlockText")}</p>
          <RegisterButtons className="justify-center" />
        </div>
      </div>
    </div>
  );
}
