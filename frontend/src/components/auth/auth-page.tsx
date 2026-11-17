"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Loader2, MailCheck, Newspaper } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/components/providers/preferences-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { safeNext } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "reset";

function modeFrom(value: string | null): Mode {
  return value === "signup" || value === "reset" ? value : "signin";
}

/** Převede chybu Supabase Auth na srozumitelnou hlášku. */
function useAuthError() {
  const { t } = useI18n();
  return (message: string) => {
    const m = message.toLowerCase();
    if (m.includes("invalid login")) return t("account.auth.errorInvalid");
    if (m.includes("not confirmed")) return t("account.auth.errorNotConfirmed");
    if (m.includes("already registered") || m.includes("already exists")) return t("account.auth.errorExists");
    if (m.includes("password") && (m.includes("6") || m.includes("8") || m.includes("short") || m.includes("weak"))) return t("account.auth.errorWeak");
    return t("account.auth.errorGeneric", { message });
  };
}

/**
 * Přihlášení / registrace / zapomenuté heslo (Supabase Auth, e-mail + heslo).
 * `?mode=signup` otevře registraci, `?next=/cesta` vrátí uživatele po přihlášení zpět.
 */
export function AuthPage() {
  const { t } = useI18n();
  const { lang } = usePreferences();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const gated = params.has("next");
  const callbackFailed = params.get("error") === "callback";
  const supabase = getSupabaseBrowser();
  const toMessage = useAuthError();

  const [mode, setMode] = useState<Mode>(modeFrom(params.get("mode")));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(callbackFailed ? t("account.auth.callbackError") : null);
  const [sentTo, setSentTo] = useState<{ email: string; kind: "confirm" | "reset" } | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSentTo(null);
  };

  const callbackUrl = (target: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || busy) return;
    if (mode !== "reset" && password.length < 8) {
      setError(t("account.auth.errorWeak"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: callbackUrl(next), data: { full_name: name.trim(), lang } },
        });
        if (err) throw err;
        if (data.session) {
          router.replace(next);
          router.refresh();
          return;
        }
        // Supabase vrací uživatele bez identit, pokud e-mail už existuje (ochrana proti zjišťování účtů)
        if (data.user && data.user.identities?.length === 0) throw new Error("already registered");
        setSentTo({ email: email.trim(), kind: "confirm" });
        return;
      }
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl("/nove-heslo") });
      if (err) throw err;
      setSentTo({ email: email.trim(), kind: "reset" });
    } catch (err) {
      setError(toMessage(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signup" ? t("account.auth.titleSignup") : mode === "reset" ? t("account.auth.titleReset") : t("account.auth.titleSignin");
  const subtitle =
    mode === "signup" ? t("account.auth.subtitleSignup") : mode === "reset" ? t("account.auth.subtitleReset") : t("account.auth.subtitleSignin");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Levý panel – značka a výhody účtu */}
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-gradient-to-br from-orange-500/25 to-amber-400/10 blur-3xl" />
        <Logo tone="inverted" />
        <div className="relative max-w-md space-y-6">
          <h2 className="font-heading text-4xl leading-tight font-semibold text-balance">{t("account.auth.subtitleSignup")}</h2>
          <ul className="space-y-3">
            {(["perk1", "perk2", "perk3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-3 text-sidebar-foreground/85">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                  <Check aria-hidden className="size-3.5" />
                </span>
                {t(`account.auth.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <Link href="/blog" className="relative inline-flex items-center gap-2 text-sm font-medium text-sidebar-foreground/75 hover:text-sidebar-foreground">
          <Newspaper aria-hidden className="size-4" /> {t("account.auth.readBlog")}
        </Link>
      </aside>

      {/* Formulář */}
      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-6">
          <Logo className="lg:hidden" />

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {gated && mode !== "reset" && (
            <p className="rounded-xl border border-primary/20 bg-accent px-3.5 py-2.5 text-sm text-accent-foreground">{t("account.auth.gate")}</p>
          )}

          {!supabase && <p className="rounded-xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">{t("account.auth.demo")}</p>}

          {mode !== "reset" && (
            <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    "h-9 rounded-full text-sm font-semibold transition-colors",
                    mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "signin" ? t("account.auth.tabSignin") : t("account.auth.tabSignup")}
                </button>
              ))}
            </div>
          )}

          {sentTo ? (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <MailCheck aria-hidden className="size-6" />
              </span>
              <p className="font-heading text-xl font-semibold">{t("account.auth.checkEmailTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {sentTo.kind === "confirm"
                  ? t("account.auth.checkEmailText", { email: sentTo.email })
                  : t("account.auth.resetSent", { email: sentTo.email })}
              </p>
              <Button variant="outline" className="w-full" onClick={() => switchMode("signin")}>
                {t("account.auth.backToSignin")}
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-name">{t("account.auth.name")}</Label>
                  <Input
                    id="auth-name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("account.auth.namePlaceholder")}
                    className="h-11 rounded-xl"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="auth-email">{t("account.auth.email")}</Label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("account.auth.emailPlaceholder")}
                  className="h-11 rounded-xl"
                />
              </div>
              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="auth-password">{t("account.auth.password")}</Label>
                    {mode === "signin" && (
                      <button type="button" onClick={() => switchMode("reset")} className="text-xs font-medium text-primary hover:underline">
                        {t("account.auth.forgot")}
                      </button>
                    )}
                  </div>
                  <Input
                    id="auth-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  {mode === "signup" && <p className="text-xs text-muted-foreground">{t("account.auth.passwordHint")}</p>}
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy || !supabase || !email.trim()}>
                {busy && <Loader2 className="animate-spin" />}
                {mode === "signup" ? t("account.auth.submitSignup") : mode === "reset" ? t("account.auth.submitReset") : t("account.auth.submitSignin")}
              </Button>

              {mode === "reset" && (
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft aria-hidden className="size-4" /> {t("account.auth.backToSignin")}
                </button>
              )}
              {mode === "signup" && <p className="text-xs leading-relaxed text-muted-foreground">{t("account.auth.terms")}</p>}
            </form>
          )}

          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden">
            <Newspaper aria-hidden className="size-4" /> {t("account.auth.readBlog")}
          </Link>
        </div>
      </main>
    </div>
  );
}
