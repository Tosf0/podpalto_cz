"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Lock } from "lucide-react";
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
      <Eye aria-hidden className="size-3" />
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

/** Kompaktní akce: „Odemknout zdarma“ (registrace) + textový odkaz „Mám účet“. */
export function UnlockActions({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const { t } = useI18n();
  const links = useAuthLinks();
  return (
    <div className={cn("flex shrink-0 items-center gap-3", className)}>
      <Button asChild size="sm" variant={inverted ? "secondary" : "default"}>
        <Link href={links.signup}>{t("account.teaser.unlockButton")}</Link>
      </Button>
      <Link
        href={links.signin}
        className={cn(
          "text-xs font-medium underline-offset-2 hover:underline",
          inverted ? "text-sidebar-foreground/80 hover:text-sidebar-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {t("account.teaser.signin")}
      </Link>
    </div>
  );
}

/**
 * Decentní výzva k registraci: zámek, krátký nadpis, jeden řádek s tím, co uživatel získá,
 * a malé tlačítko. V úzkém panelu se akce zalomí pod text.
 */
export function RegisterCta({
  title,
  text,
  className,
  tone = "accent",
}: {
  title?: string;
  /** Krátký výčet výhod („Všichni prodejci · ceny s dopravou · …“). */
  text?: string;
  className?: string;
  tone?: "accent" | "dark";
}) {
  const { t } = useI18n();
  const dark = tone === "dark";
  return (
    <section
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl px-3.5 py-3",
        dark ? "bg-sidebar text-sidebar-foreground" : "border border-primary/20 bg-accent/60 text-accent-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          dark ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-card text-primary",
        )}
      >
        <Lock aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm leading-tight font-semibold">{title ?? t("account.teaser.unlockTitle")}</p>
        <p className={cn("mt-0.5 text-xs leading-snug", dark ? "text-sidebar-foreground/70" : "text-muted-foreground")}>
          {text ?? t("account.teaser.unlockText")}
        </p>
      </div>
      <UnlockActions inverted={dark} />
    </section>
  );
}

/**
 * Zamčený náhled: obsah se vykreslí rozmazaně a neklikatelně, nad ním malá karta s výzvou.
 * Obsah je pro čtečky skrytý (`aria-hidden`), přístupný je jen text výzvy.
 */
export function LockedPreview({
  children,
  title,
  text,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  text?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <div aria-hidden inert className="pointer-events-none max-h-[34rem] overflow-hidden opacity-60 blur-[3px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background/10 via-background/40 to-background/80 p-4">
        <div className="flex max-w-xs flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-center shadow-float">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Lock aria-hidden className="size-4 text-primary" />
            {title ?? t("account.teaser.locked")}
          </span>
          <p className="text-xs text-muted-foreground">{text ?? t("account.teaser.unlockText")}</p>
          <UnlockActions className="mt-1" />
        </div>
      </div>
    </div>
  );
}
