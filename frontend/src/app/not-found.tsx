import Link from "next/link";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Flame className="size-7" />
      </div>
      <p className="num text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold">Tady to nehoří</h1>
      <p className="text-muted-foreground">
        Stránku jsme nenašli. Možná byl prodejce odstraněn z katalogu, nebo je odkaz neplatný.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">Na mapu cen</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/prodejci">Katalog prodejců</Link>
        </Button>
      </div>
    </div>
  );
}
