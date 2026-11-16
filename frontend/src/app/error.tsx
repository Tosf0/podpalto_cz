"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-clay-soft text-clay-strong">
        <TriangleAlert className="size-7" />
      </div>
      <h1 className="text-3xl font-semibold">Něco se pokazilo</h1>
      <p className="text-muted-foreground">
        Nepodařilo se načíst data. Pokud je nastavené <code className="num">NEXT_PUBLIC_API_URL</code>, zkontrolujte,
        že backend na Railway běží.
      </p>
      <Button onClick={reset}>Zkusit znovu</Button>
    </div>
  );
}
