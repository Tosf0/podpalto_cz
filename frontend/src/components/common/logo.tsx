"use client";

import { useId } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Obrys plamene (stejný tvar jako lucide `Flame`) vybarvený oranžovo-jantarovým přechodem. */
function FlameMark({ className }: { className?: string }) {
  const id = useId();
  const gradient = `flame-${id.replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradient} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        stroke={`url(#${gradient})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Logo podpalto.cz – plamen v oranžovo-jantarovém přechodu (bez podkladu) a wordmark
 * „PODPALTO“ verzálkami s malým „.cz“ ve stejném přechodu. Odkaz na úvodní stránku.
 * Plamen je záměrně jediný „ohnivý“ akcent v jinak lesní paletě.
 * `tone="inverted"` = světlý wordmark pro tmavý navigační panel.
 */
export function Logo({
  compact = false,
  tone = "default",
  className,
}: {
  compact?: boolean;
  tone?: "default" | "inverted";
  className?: string;
}) {
  const { t } = useI18n();
  const inverted = tone === "inverted";
  return (
    <Link
      href="/"
      aria-label={t("map.ui.logoAria")}
      className={cn(
        "group inline-flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <FlameMark className="size-9 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="flex items-baseline font-heading font-semibold">
          <span className={cn("text-lg tracking-[0.08em] uppercase", inverted ? "text-sidebar-foreground" : "text-foreground")}>
            podpalto
          </span>
          <span className="bg-gradient-to-b from-amber-400 to-orange-500 bg-clip-text text-sm tracking-tight text-transparent lowercase">
            .cz
          </span>
        </span>
        {!compact && (
          <span
            className={cn(
              "mt-1.5 truncate text-[11px]",
              inverted ? "text-sidebar-foreground/65" : "text-muted-foreground",
            )}
          >
            {t("map.ui.tagline")}
          </span>
        )}
      </span>
    </Link>
  );
}
