"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/auth-errors";
import { useI18n } from "@/lib/i18n";

/** Nastavení nového hesla po kliknutí na odkaz z e-mailu (session už vytvořil /auth/callback). */
export function NewPasswordPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    if (password.length < 8) {
      setError(t("account.auth.errorWeak"));
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    toast.success(t("account.auth.newPasswordSaved"));
    router.replace("/");
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm space-y-5 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <KeyRound aria-hidden className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-semibold">{t("account.auth.newPasswordTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("account.auth.newPasswordText", { email: user?.email ?? "" })}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">{t("account.auth.password")}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl"
          />
          <p className="text-xs text-muted-foreground">{t("account.auth.passwordHint")}</p>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !user}>
          {busy && <Loader2 className="animate-spin" />}
          {t("account.auth.newPasswordSubmit")}
        </Button>
      </form>
    </div>
  );
}
