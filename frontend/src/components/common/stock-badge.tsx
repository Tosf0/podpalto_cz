import type { StockLevel } from "@/types";
import { STOCK_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  green: { text: "text-moss-strong", dot: "bg-moss" },
  orange: { text: "text-wood-strong", dot: "bg-wood" },
  red: { text: "text-clay-strong", dot: "bg-clay" },
  neutral: { text: "text-muted-foreground", dot: "bg-coal/50" },
} as const;

/** Stav skladem: tečka + popisek. */
export function StockBadge({ stock, className }: { stock: StockLevel; className?: string }) {
  const meta = STOCK_LEVELS[stock];
  const tone = TONE_CLASS[meta.tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", tone.text, className)}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      {meta.label}
    </span>
  );
}
