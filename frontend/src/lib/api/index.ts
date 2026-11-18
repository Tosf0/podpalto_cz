/**
 * Servisní vrstva podpalto.cz.
 * Komponenty importují pouze odsud: `import { getSellers } from "@/lib/api"`.
 *
 * Jediný zdroj dat je Supabase (agenti zapisují, frontend čte). Bez Supabase běží aplikace
 * offline nad ukázkovými daty ze `src/data/`. Žádné REST API.
 */
export * from "./sellers";
export * from "./market";
export * from "./reports";
export * from "./analysis";
export * from "./reviews";
export * from "./orders";
export * from "./public";
export * from "./review-queue";
export * from "./claims";
export { IS_MOCK } from "./config";
export { USES_DB, invalidate as invalidateApiCache } from "./db";
