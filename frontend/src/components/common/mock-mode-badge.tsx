"use client";

import { IS_MOCK } from "@/lib/api/config";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Upozornění, že aplikace běží na lokálních mock datech (bez backendu). Mimo mock režim se nevykreslí. */
export function MockModeBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  if (!IS_MOCK) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          tabIndex={0}
          variant="outline"
          className={cn(
            "h-5 cursor-help border-dashed border-wood/60 bg-wood-soft px-2 rounded-md text-[11px] text-wood-strong dark:bg-wood/10 dark:text-wood-strong",
            className,
          )}
        >
          {t("map.ui.mockBadge")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-center leading-snug">
        {t("map.ui.mockBadgeHint")}
      </TooltipContent>
    </Tooltip>
  );
}
