-- =============================================================================
-- podpalto.cz – 9 Ukázková (veřejná) data pro nepřihlášené
-- =============================================================================
-- Nepřihlášený návštěvník vidí mapu krajů, průměry trhu, 5 ukázkových prodejců denně a
-- zkrácené trendy. Tabulky zůstávají pro anon zavřené – dostupné jsou jen tyto dvě funkce,
-- které vrací souhrny a omezený vzorek (žádné CI shrnutí, žádný celý katalog).

-- Souhrn trhu: měsíční průměry ČR (posledních 6 měsíců), statistiky krajů, počty
-- prodejců v naší databázi po krajích a Sčítání 2021.
create or replace function public.api_public_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'trends', public.api_price_trends(6),
    'regions', public.api_region_stats(),
    'listedSellers', coalesce((
      select jsonb_object_agg(c.region, c.n)
      from (
        select s.region, count(*) as n
        from public.sellers s
        where s.status = 'active' and s.review_status = 'ok' and s.lat is not null
        group by s.region
      ) c
    ), '{}'::jsonb),
    'totalSellers', (
      select count(*) from public.sellers s
      where s.status = 'active' and s.review_status = 'ok' and s.lat is not null
    )
  );
$$;

-- Ukázkoví prodejci: stejných 5 po celý den (pořadí podle otisku id + data), bez CI shrnutí.
-- Denní střídání brání tomu, aby se přes ukázku dal rychle stáhnout celý katalog.
create or replace function public.api_public_seller_sample(p_limit integer default 5)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with all_sellers as (
    select e.value as seller
    from jsonb_array_elements(public.api_sellers()) as e
  )
  select jsonb_build_object(
    'sellers', coalesce((
      select jsonb_agg(sample.seller - 'intel')
      from (
        select a.seller from all_sellers a
        order by md5((a.seller ->> 'id') || current_date::text)
        limit least(greatest(coalesce(p_limit, 5), 1), 5)
      ) sample
    ), '[]'::jsonb),
    'total', (select count(*) from all_sellers)
  );
$$;

revoke execute on function public.api_public_overview() from public;
revoke execute on function public.api_public_seller_sample(integer) from public;
grant execute on function public.api_public_overview() to anon, authenticated;
grant execute on function public.api_public_seller_sample(integer) to anon, authenticated;
