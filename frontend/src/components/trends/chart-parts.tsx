"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

/** Malá ikona (i) – vysvětlivky schované do tooltipu místo dlouhých textů. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Info aria-hidden="true" className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-pretty">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/** Segmentový přepínač (radiogroup) – ovládání režimů grafů. Může se uvnitř sebe posouvat, nikdy nestlačí okolí. */
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
      className={cn(
        "flex max-w-full gap-1 overflow-x-auto rounded-full bg-secondary p-1 [scrollbar-width:none]",
        className,
      )}
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
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Karta sekce: nadpis (+ volitelná vysvětlivka), jedna krátká věta a ovládání, které se při nedostatku místa zalomí pod nadpis. */
export function Section({
  id,
  title,
  description,
  info,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  info?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("@container scroll-mt-24 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-64 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {info && <InfoTip label={`Vysvětlivka: ${title}`}>{info}</InfoTip>}
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="min-w-0 max-w-full">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
