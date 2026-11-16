import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Zástupný vzhled mapy během načítání Leafletu. */
export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("relative flex size-full items-center justify-center overflow-hidden bg-muted", className)}
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative flex flex-col items-center gap-2 text-muted-foreground">
        <MapPin aria-hidden className="size-8 animate-bounce text-primary" />
        <span className="text-sm font-medium">Načítám mapu…</span>
      </div>
    </div>
  );
}
