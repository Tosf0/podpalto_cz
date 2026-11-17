-- RLS pomocníky (tarif / role přihlášeného) volají jen přihlášení – anon je nepotřebuje.
-- Vrací vždy jen údaje volajícího, proto jsou pro `authenticated` v pořádku.
revoke execute on function public.current_plan() from public, anon;
revoke execute on function public.current_role_name() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_editor() from public, anon;
revoke execute on function public.is_pro() from public, anon;
grant execute on function public.current_plan(), public.current_role_name(), public.is_admin(), public.is_editor(), public.is_pro() to authenticated;
