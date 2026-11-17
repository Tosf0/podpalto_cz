import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./config";

let browserClient: SupabaseClient | null = null;

/**
 * Supabase klient pro prohlížeč (sdílená instance). Session je v cookies, takže ji vidí i server a proxy.
 * Vrací `null`, když Supabase není nakonfigurovaný (demo režim).
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!SUPABASE_ENABLED) return null;
  browserClient ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return browserClient;
}

/** Jako `getSupabaseBrowser`, ale vyhodí chybu v demo režimu (pro místa, kde se volá jen se zapnutým Supabase). */
export function requireSupabaseBrowser(): SupabaseClient {
  const client = getSupabaseBrowser();
  if (!client) throw new Error("Supabase není nakonfigurovaný (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");
  return client;
}
