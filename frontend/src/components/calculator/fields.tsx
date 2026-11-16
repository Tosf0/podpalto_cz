"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Převod textového vstupu (čárka i tečka) na nezáporné číslo. */
export function parseNum(v: string): number {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  step = "any",
  className,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("num h-10 text-base", suffix && "pr-14")}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wider text-moss-strong uppercase">{eyebrow}</p>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
      {children}
    </section>
  );
}
