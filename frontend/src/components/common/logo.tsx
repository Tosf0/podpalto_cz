import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Logo podpalto.cz – plamen v oranžovo-jantarovém čtverci a wordmark. Odkaz na úvodní stránku.
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
  const inverted = tone === "inverted";
  return (
    <Link
      href="/"
      aria-label="podpalto.cz – úvodní stránka"
      className={cn(
        "group inline-flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-soft transition-transform duration-200 group-hover:scale-105">
        <Flame aria-hidden="true" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-heading text-lg font-semibold tracking-tight",
            inverted ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          podpalto<span className="text-orange-500">.cz</span>
        </span>
        {!compact && (
          <span
            className={cn(
              "mt-1.5 truncate text-[11px]",
              inverted ? "text-sidebar-foreground/65" : "text-muted-foreground",
            )}
          >
            Cenová mapa &amp; CI tuhých paliv
          </span>
        )}
      </span>
    </Link>
  );
}
