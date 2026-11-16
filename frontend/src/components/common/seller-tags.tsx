import type { SellerTag } from "@/types";
import { SELLER_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  green: "border-moss/30 bg-moss-soft text-moss-strong",
  orange: "border-wood/30 bg-wood-soft text-wood-strong",
  neutral: "border-border bg-secondary text-secondary-foreground",
} as const;

/** Jeden štítek prodejce. */
export function SellerTagBadge({ tag }: { tag: SellerTag }) {
  const meta = SELLER_TAGS[tag];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-lg border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[meta.tone],
      )}
    >
      {meta.label}
    </span>
  );
}

/** Řada štítků; při `max` zobrazí „+N“ pro zbylé. */
export function SellerTags({ tags, max, className }: { tags: SellerTag[]; max?: number; className?: string }) {
  const visible = max !== undefined ? tags.slice(0, max) : tags;
  const hidden = tags.length - visible.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((tag) => (
        <SellerTagBadge key={tag} tag={tag} />
      ))}
      {hidden > 0 && (
        <span className="inline-flex items-center rounded-lg border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          +{hidden}
        </span>
      )}
    </div>
  );
}
