"use client";

import { Building2, MapPinned, Truck } from "lucide-react";
import type { Seller } from "@/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { locationNote } from "./seller-utils";

const ICONS = { nationwide: Truck, registeredOffice: Building2, approximate: MapPinned } as const;

/** Poznámka k poloze prodejce: celostátní prodejce, sídlo firmy místo skladu, přibližná poloha. */
export function LocationNote({ seller, className }: { seller: Seller; className?: string }) {
  const { t } = useI18n();
  const kind = locationNote(seller);
  if (!kind) return null;
  const Icon = ICONS[kind];
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{t(`sellers.location.${kind}`)}</span>
    </p>
  );
}
