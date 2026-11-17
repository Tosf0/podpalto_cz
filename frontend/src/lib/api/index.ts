/**
 * Servisní vrstva podpalto.cz.
 * Komponenty importují pouze odsud: `import { getSellers } from "@/lib/api"`.
 *
 * Zdroj dat (v tomto pořadí):
 * 1. Supabase (NEXT_PUBLIC_SUPABASE_URL + _PUBLISHABLE_KEY) – produkční databáze,
 * 2. REST backend (NEXT_PUBLIC_API_URL) – FastAPI + CrewAI,
 * 3. ukázková data ze `src/data/`.
 */
export * from "./sellers";
export * from "./market";
export * from "./reports";
export * from "./analysis";
export * from "./reviews";
export * from "./orders";
export { ApiError } from "./client";
export { API_URL, IS_MOCK } from "./config";
export { USES_DB, invalidate as invalidateApiCache } from "./db";
