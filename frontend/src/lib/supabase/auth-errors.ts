import { isAuthWeakPasswordError } from "@supabase/supabase-js";
import { t } from "@/lib/i18n/translate";

/**
 * Chyba Supabase Auth → srozumitelná hláška v jazyce UI.
 * Slabé heslo rozlišuje podle `reasons`: `pwned` = heslo se objevilo v únicích dat
 * (zapnutá ochrana „Prevent use of leaked passwords“, kontrola přes HaveIBeenPwned),
 * `length` / `characters` = nesplňuje pravidla délky či znaků.
 */
export function authErrorMessage(err: unknown): string {
  if (isAuthWeakPasswordError(err)) {
    return err.reasons.includes("pwned") ? t("account.auth.errorPwned") : t("account.auth.errorWeak");
  }
  const message = err instanceof Error ? err.message : String(err);
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return t("account.auth.errorInvalid");
  if (m.includes("not confirmed")) return t("account.auth.errorNotConfirmed");
  if (m.includes("already registered") || m.includes("already exists")) return t("account.auth.errorExists");
  if (m.includes("pwned") || m.includes("leaked") || m.includes("data breach")) return t("account.auth.errorPwned");
  if (m.includes("password") && (m.includes("short") || m.includes("weak") || m.includes("at least"))) return t("account.auth.errorWeak");
  return t("account.auth.errorGeneric", { message });
}
