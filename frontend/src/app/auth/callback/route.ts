import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import { LOGIN_PATH, safeNext } from "@/lib/supabase/config";

/**
 * Návrat z e-mailu (potvrzení registrace, obnova hesla, změna e-mailu):
 * - `?code=` (PKCE) → výměna za session,
 * - `?token_hash=&type=` (vlastní šablona e-mailu) → ověření OTP.
 * Pak přesměruje na `next` (výchozí `/`).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await getSupabaseServer();
  if (supabase) {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, request.url));
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=callback`, request.url));
}
