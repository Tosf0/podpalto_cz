import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./config";

/**
 * Supabase klient pro Server Components, Route Handlers a Server Actions – čte session z cookies.
 * Vrací `null` v demo režimu. Čte cookies → volat jen v dynamické části stránky (uvnitř <Suspense>).
 */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!SUPABASE_ENABLED) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Volané ze Server Component – cookies obnovuje proxy, tady je lze ignorovat.
        }
      },
    },
  });
}

export interface ServerAccount {
  userId: string;
  plan: "free" | "pro" | "seller";
  role: "user" | "editor" | "admin";
}

/** Přihlášený uživatel a jeho tarif (null = nepřihlášen nebo demo režim). */
export async function getServerAccount(): Promise<ServerAccount | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_expires_at, role")
    .eq("id", userId)
    .maybeSingle();
  const expired = profile?.plan_expires_at ? new Date(profile.plan_expires_at) < new Date() : false;
  return {
    userId,
    plan: !profile || expired ? "free" : (profile.plan as ServerAccount["plan"]),
    role: (profile?.role as ServerAccount["role"]) ?? "user",
  };
}
