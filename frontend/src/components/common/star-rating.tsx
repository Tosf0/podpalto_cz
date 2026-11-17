import { Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
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
          ? `, ${t("common.rating", { rating: formatNumber(rating, 1), count: formatNumber(reviewCount) })}`
          : `, ${t("map.ui.ratingOnly", { rating: formatNumber(rating, 1) })}`}
      </span>
    </span>
  );
}
