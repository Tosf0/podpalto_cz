"use client";

import { useId } from "react";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Malá vlajka jazyka (CZ / DE / GB) jako inline SVG – bez externích obrázků. */
export function Flag({ lang, className }: { lang: Lang; className?: string }) {
  const id = useId().replace(/:/g, "");
  const cls = cn("h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10", className);

  if (lang === "cs") {
    return (
      <svg viewBox="0 0 6 4" preserveAspectRatio="none" className={cls} aria-hidden>
        <rect width="6" height="2" fill="#ffffff" />
        <rect y="2" width="6" height="2" fill="#d7141a" />
        <path d="M0 0 3 2 0 4z" fill="#11457e" />
      </svg>
    );
  }
  if (lang === "de") {
    return (
      <svg viewBox="0 0 5 3" preserveAspectRatio="none" className={cls} aria-hidden>
        <rect width="5" height="1" fill="#000000" />
        <rect y="1" width="5" height="1" fill="#dd0000" />
        <rect y="2" width="5" height="1" fill="#ffce00" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={cls} aria-hidden>
      <clipPath id={`${id}t`}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#ffffff" strokeWidth="6" />
      <path d="M0 0l60 30m0-30L0 30" clipPath={`url(#${id}t)`} stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0v30M0 15h60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
