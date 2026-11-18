/**
 * Konfigurace servisní vrstvy.
 *
 * Jediný zdroj dat je Supabase (rozhodnutí z 18. 11. 2026, docs/TODO.md). Žádné REST API.
 * Bez vyplněného `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` běží aplikace offline
 * nad ukázkovými daty ze `src/data/` (lokální vývoj, ukázka bez účtů).
 */
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

/** Offline režim: ukázková data místo databáze (a simulace analýz v CI Studiu). */
export const IS_MOCK = !SUPABASE_ENABLED;

/** Umělá latence ukázkových dat v ms (ukáže skeletony jako u databáze). */
export const MOCK_LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 150);
