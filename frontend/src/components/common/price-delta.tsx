import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Změna v % s ikonou. `goodWhen` určí, zda je pokles (nebo růst) dobrá zpráva. */
export function PriceDelta({
  value,
  goodWhen = "down",
  className,
}: {
  value: number;
  goodWhen?: "down" | "up";
  className?: string;
}) {
  const flat = Math.abs(value) < 0.05;
  const rising = value > 0;
  const good = goodWhen === "down" ? !rising : rising;

  const Icon = flat ? Minus : rising ? TrendingUp : TrendingDown;
  const tone = flat ? "text-muted-foreground" : good ? "text-moss-strong" : "text-clay-strong";

  return (
    <span className={cn("num inline-flex items-center gap-1 text-sm font-medium", tone, className)}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {formatPct(value)}
    </span>
  );
}
