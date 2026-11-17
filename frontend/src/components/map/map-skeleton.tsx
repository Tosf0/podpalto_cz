"use client";

import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Zástupný vzhled mapy během načítání Leafletu. */
export function MapSkeleton({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("relative flex size-full items-center justify-center overflow-hidden bg-muted", className)}
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative flex flex-col items-center gap-2 text-muted-foreground">
        <MapPin aria-hidden className="size-8 animate-bounce text-primary" />
        <span className="text-sm font-medium">{t("map.skeleton.loading")}</span>
      </div>
    </div>
  );
}
