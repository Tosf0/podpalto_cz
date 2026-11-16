"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sdílené barvy os a mřížky grafů – CSS proměnné, takže fungují ve světlém i tmavém režimu. */
export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;
export const GRID_STROKE = "var(--border)";
export const AXIS_LINE = { stroke: "var(--border)" } as const;

/** Rámeček tooltipu grafu v designu aplikace. */
export function ChartTooltipFrame({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-44 rounded-xl border border-border bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-soft">
      {title && <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{title}</div>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function ChartTooltipRow({
  color,
  label,
  value,
  hint,
}: {
  color?: string;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2">
        {color && <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
        <span>{label}</span>
      </span>
      <span className="num text-right font-medium">
        {value}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}

/** Segmentový přepínač (radiogroup) – ovládání režimů grafů. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-grid shrink-0 auto-cols-fr grid-flow-col gap-1 rounded-full bg-secondary p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Karta sekce s nadpisem a popisem. */
export function Section({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6", className)}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
