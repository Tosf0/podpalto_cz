"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-clay-soft text-clay-strong">
        <TriangleAlert className="size-7" />
      </div>
      <h1 className="text-3xl font-semibold">{t("layout.error.title")}</h1>
      <p className="text-muted-foreground">
        {t("layout.error.textBefore")}
      </p>
      <Button onClick={reset}>{t("common.actions.retry")}</Button>
    </div>
  );
}
