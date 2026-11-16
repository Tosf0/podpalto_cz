import type { FuelCategory } from "@/types";
import { FUEL_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FuelIcon } from "./fuel-icon";

const SIZE_CLASS = {
  sm: "gap-1 px-1.5 py-px text-[11px]",
  md: "gap-1.5 px-2.5 py-0.5 text-xs",
} as const;

/** Pilulka s názvem a barvou paliva. */
export function FuelBadge({
  category,
  size = "md",
  showIcon = true,
  className,
}: {
  category: FuelCategory;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}) {
  const meta = FUEL_META[category];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-lg border font-medium",
        SIZE_CLASS[size],
        meta.className,
        className,
      )}
    >
      {showIcon && <FuelIcon category={category} className={size === "sm" ? "size-3" : "size-3.5"} />}
      {size === "sm" ? meta.short : meta.label}
    </span>
  );
}
