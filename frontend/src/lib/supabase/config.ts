/**
 * Konfigurace Supabase (projekt „Podpalto“). Obě hodnoty jsou veřejné – přístup k datům hlídá RLS.
 * Když nejsou vyplněné, aplikace běží v demo režimu nad ukázkovými daty ze `src/data/` a bez přihlášení.
 */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Supabase je zapnutý (data z databáze + povinné přihlášení). */
export const SUPABASE_ENABLED = SUPABASE_URL !== "" && SUPABASE_KEY !== "";

/** Kam se posílá nepřihlášený uživatel. */
export const LOGIN_PATH = "/prihlaseni";

/** Kam se posílá uživatel bez potřebného tarifu. */
export const PLANS_PATH = "/plany";

/**
 * Cesty dostupné bez přihlášení:
 * - ukázkové verze: mapa `/` (kraje a průměry), `/prodejci` (5 prodejců denně), `/trendy` (6 měsíců),
 * - blog (kromě editoru), ceník, přihlášení / registrace a auth callbacky.
 * Za účtem: detail prodejce, kalkulačka, CI Studio (Pro), editor blogu, administrace.
 */
export const TEASER_PATHS = ["/", "/prodejci", "/trendy"];

export function isPublicPath(pathname: string): boolean {
  if (TEASER_PATHS.includes(pathname)) return true;
  if (pathname === "/blog") return true;
  if (pathname.startsWith("/blog/")) return !pathname.startsWith("/blog/novy");
  return (
    pathname.startsWith(LOGIN_PATH) ||
    pathname.startsWith(PLANS_PATH) ||
    pathname.startsWith("/auth/") ||
    pathname === "/nove-heslo" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/** Bezpečný návrat po přihlášení – jen interní cesty. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
