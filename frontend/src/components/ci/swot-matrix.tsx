import { Rocket, ShieldAlert, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import type { Swot } from "@/types";
import { cn } from "@/lib/utils";

const QUADRANTS: {
  key: keyof Swot;
  label: string;
  sub: string;
  icon: LucideIcon;
  box: string;
  head: string;
  dot: string;
}[] = [
  {
    key: "strengths",
    label: "Silné stránky",
    sub: "Strengths",
    icon: ThumbsUp,
    box: "border-moss/30 bg-moss-soft",
    head: "text-moss-strong",
    dot: "bg-moss",
  },
  {
    key: "weaknesses",
    label: "Slabé stránky",
    sub: "Weaknesses",
    icon: ThumbsDown,
    box: "border-clay/30 bg-clay-soft",
    head: "text-clay-strong",
    dot: "bg-clay",
  },
  {
    key: "opportunities",
    label: "Příležitosti",
    sub: "Opportunities",
    icon: Rocket,
    box: "border-pine/30 bg-pine-soft",
    head: "text-pine-strong",
    dot: "bg-pine",
  },
  {
    key: "threats",
    label: "Hrozby",
    sub: "Threats",
    icon: ShieldAlert,
    box: "border-wood/30 bg-wood-soft",
    head: "text-wood-strong",
    dot: "bg-wood",
  },
];

/** Vizuální SWOT matice 2×2. */
export function SwotMatrix({
  swot,
  compact = false,
  className,
}: {
  swot: Swot;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid auto-rows-fr gap-3 sm:grid-cols-2", className)}>
      {QUADRANTS.map((q) => {
        const items = swot[q.key];
        const Icon = q.icon;
        return (
          <section key={q.key} className={cn("h-full rounded-xl border", q.box, compact ? "p-3" : "p-4")}>
            <header className="mb-2 flex items-center gap-2">
              <Icon className={cn("size-4 shrink-0", q.head)} aria-hidden />
              <h4 className={cn("text-sm leading-none font-semibold", q.head)}>{q.label}</h4>
              <span className="text-xs text-muted-foreground">{q.sub}</span>
              <span className="num ml-auto text-xs text-muted-foreground">{items.length}</span>
            </header>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Bez údajů</p>
            ) : (
              <ul className={cn("space-y-1.5", compact ? "text-xs" : "text-sm")}>
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-foreground/90">
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", q.dot)} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
