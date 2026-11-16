import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Prázdný stav seznamu nebo výsledků s volitelnou akcí. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-6">
          {icon}
        </span>
      )}
      <div className="max-w-sm space-y-1">
        <p className="font-heading text-lg font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
