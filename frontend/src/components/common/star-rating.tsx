import { Star } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Hodnocení: jedna zlatá hvězda, číslo s desetinnou čárkou a případně počet recenzí. */
export function StarRating({
  rating,
  reviewCount,
  size = "sm",
  className,
}: {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const textSize = size === "md" ? "text-sm" : "text-xs";
  const iconSize = size === "md" ? "size-4" : "size-3.5";

  return (
    <span className={cn("inline-flex items-center gap-1 font-medium text-foreground", textSize, className)}>
      <Star aria-hidden="true" className={cn(iconSize, "fill-wood text-wood")} />
      <span className="num">{formatNumber(rating, 1)}</span>
      {reviewCount !== undefined && (
        <span className="num font-normal text-muted-foreground">({formatNumber(reviewCount)})</span>
      )}
      <span className="sr-only">
        {reviewCount !== undefined
          ? `, ${formatNumber(rating, 1)} z 5 hvězdiček, ${formatNumber(reviewCount)} recenzí`
          : `, hodnocení ${formatNumber(rating, 1)} z 5`}
      </span>
    </span>
  );
}
