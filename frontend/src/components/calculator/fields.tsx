"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Převod textového vstupu (čárka i tečka) na nezáporné číslo. */
export function parseNum(v: string): number {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Jednotný panel (karta) kalkulačky – jedno odsazení všude. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>{children}</div>
  );
}

/** Nadpis panelu s volitelnou nápovědou. */
export function PanelTitle({ children, tip, className }: { children: ReactNode; tip?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <h3 className="font-heading text-base font-semibold">{children}</h3>
      {tip && <InfoTip>{tip}</InfoTip>}
    </div>
  );
}

/** Malé (i) – vysvětlení po najetí / kliknutí. */
export function InfoTip({ children, label }: { children: ReactNode; label?: string }) {
  const { t } = useI18n();
  label ??= t("calculator.fields.moreInfo");
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Info className="size-4" aria-hidden="true" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-80 max-w-[90vw] space-y-2 text-sm text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Pilulkový přepínač (segmented control) s jasným aktivním stavem. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  tip,
  className,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
  tip?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center gap-1">
          <Label>{label}</Label>
          {tip && <InfoTip>{tip}</InfoTip>}
        </div>
      )}
      <div role="group" aria-label={label} className="flex w-full gap-1 rounded-full bg-muted p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              title={o.title}
              onClick={() => onChange(o.value)}
              className={cn(
                "h-8 flex-1 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  step = "any",
  className,
  inputClassName,
  ariaLabel,
}: {
  id: string;
  ariaLabel?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label ? undefined : ariaLabel}
          className={cn("num h-10 rounded-xl text-base", suffix && "pr-14", inputClassName)}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/** Sbalitelný blok – bez animací, vždy správná výška. */
export function Collapsible({
  title,
  icon,
  children,
  defaultOpen = false,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-xl border border-border bg-secondary/40", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-4 py-2 text-left text-sm font-medium transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}
