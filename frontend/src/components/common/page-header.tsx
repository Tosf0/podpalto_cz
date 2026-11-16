import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hlavička stránky: ikona, eyebrow, serifový nadpis, popis a akce vpravo. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-4 sm:items-center">
        {icon && (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-6">
            {icon}
          </span>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow && <p className="text-xs font-semibold tracking-wider text-moss-strong uppercase">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold text-foreground text-balance sm:text-3xl">{title}</h1>
          {description && <div className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
