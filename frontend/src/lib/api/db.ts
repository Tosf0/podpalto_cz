/**
 * Supabase datový zdroj pro servisní vrstvu (volá se z klientských komponent přes `@/lib/api`).
 * Data přicházejí z RPC funkcí v databázi už v přesném tvaru TypeScript typů (viz migrace).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

/** Data čteme z databáze (Supabase zapnutý). */
export const USES_DB = SUPABASE_ENABLED;

export function db(): SupabaseClient {
  const client = getSupabaseBrowser();
  if (!client) throw new Error("Supabase není nakonfigurovaný.");
  return client;
}

/** Je návštěvník přihlášený? Nepřihlášený dostává jen ukázková (veřejná) data. */
export async function isSignedIn(): Promise<boolean> {
  const { data } = await db().auth.getSession();
  return !!data.session;
}

/** Krátkodobá cache požadavků – mapa, kalkulačka i detail volají totéž několikrát za sebou. */
const cache = new Map<string, { at: number; promise: Promise<unknown> }>();
const TTL_MS = 60_000;

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise as Promise<T>;
  const promise = load().catch((e: unknown) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

/** Po zápisu (recenze, poptávka) nebo změně účtu zahodí cache, aby se změna hned projevila. */
export function invalidate(prefix = ""): void {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

/** Vyhodí chybu Supabase jako běžnou `Error` se srozumitelnou zprávou. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
