import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, SUPABASE_ENABLED, isPublicPath, safeNext } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (dříve middleware):
 * 1. obnoví Supabase session v cookies,
 * 2. nepřihlášeného uživatele pošle na registraci – volně dostupný je jen blog (čtení), ceník a přihlášení,
 * 3. přihlášeného z /prihlaseni vrátí do aplikace.
 * Tarif (Pro pro CI Studio) se ověřuje až na stránce, data navíc chrání RLS v databázi.
 */
export async function proxy(request: NextRequest) {
  if (!SUPABASE_ENABLED) return NextResponse.next();

  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url);
    // zachovat případně obnovené session cookies
    response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
    return res;
  };

  if (!userId && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = `?mode=signup&next=${encodeURIComponent(pathname + search)}`;
    return redirectTo(url);
  }

  if (userId && pathname === LOGIN_PATH) {
    return redirectTo(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url));
  }

  return response;
}

export const config = {
  // vše kromě statických souborů Next.js a obrázků/dat z /public
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|json|geojson|txt|xml|webmanifest)$).*)"],
};
