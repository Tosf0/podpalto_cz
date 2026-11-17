"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton řádků ve tvaru karet – zobrazuje se během načítání seznamů. */
export function ListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-3", className)}>
      <span className="sr-only">{t("map.ui.listLoading")}</span>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="hidden shrink-0 space-y-2 sm:block">
            <Skeleton className="ml-auto h-5 w-24" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
