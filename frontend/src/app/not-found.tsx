"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Flame className="size-7" />
      </div>
      <p className="num text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold">{t("layout.notFound.title")}</h1>
      <p className="text-muted-foreground">{t("layout.notFound.text")}</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">{t("layout.notFound.toMap")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/prodejci">{t("layout.notFound.toSellers")}</Link>
        </Button>
      </div>
    </div>
  );
}
