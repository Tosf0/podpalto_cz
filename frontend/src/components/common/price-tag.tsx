"use client";

import { usePreferences } from "@/components/providers/preferences-provider";
import type { FuelProduct, PriceMode } from "@/types";
import { formatCzkPerUnit, formatKwhPrice, formatNumber, NBSP } from "@/lib/format";
import { pricePerKwh } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: { main: "text-sm", sub: "text-[11px]" },
  md: { main: "text-base", sub: "text-xs" },
  lg: { main: "text-2xl", sub: "text-sm" },
} as const;

/** Hmotnost balení (paleta / pytel) pro doplňující řádek, např. „paleta 975 kg“. */
function packageWeight(product: FuelProduct): string | null {
  if (product.unit !== "paleta" && product.unit !== "pytel") return null;
  if (product.packageKg) return `${product.unit} ${formatNumber(product.packageKg)}${NBSP}kg`;
  if (product.packagePrm) return `${product.unit} ${formatNumber(product.packagePrm, 1)}${NBSP}PRM`;
  return null;
}

/**
 * Cena produktu. Režim `unit` = Kč za jednotku (hlavní řádek) + Kč/kWh (vedlejší),
 * režim `kwh` je prohozený. Bez `mode` se použije preference z `usePreferences`.
 */
export function PriceTag({
  product,
  mode,
  size = "md",
  showSecondary = true,
  className,
}: {
  product: FuelProduct;
  mode?: PriceMode;
  size?: "sm" | "md" | "lg";
  showSecondary?: boolean;
  className?: string;
}) {
  const { priceMode } = usePreferences();
  const effective = mode ?? priceMode;

  const perUnit = formatCzkPerUnit(product.price, product.unit);
  const perKwh = formatKwhPrice(pricePerKwh(product));
  const weight = packageWeight(product);

  const main = effective === "unit" ? perUnit : perKwh;
  const secondaryBase = effective === "unit" ? perKwh : perUnit;
  const secondary = weight ? `${secondaryBase} · ${weight}` : secondaryBase;

  return (
    <div className={cn("flex min-w-0 flex-col leading-tight", className)}>
      <span className={cn("num font-bold tracking-tight text-foreground", SIZE_CLASS[size].main)}>{main}</span>
      {showSecondary && (
        <span className={cn("num text-muted-foreground", SIZE_CLASS[size].sub)}>{secondary}</span>
      )}
    </div>
  );
}
