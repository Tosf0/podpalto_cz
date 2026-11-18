-- Ukázka prodejců pro nepřihlášené: přednostně prodejci, kteří mají aspoň jednu cenu
-- (s reálnými daty má zhruba třetina prodejců jen kontakt bez ceníku).
create or replace function public.api_public_seller_sample(p_limit integer default 5)
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  with all_sellers as (
    select e.value as seller
    from jsonb_array_elements(public.api_sellers()) as e
  )
  select jsonb_build_object(
    'sellers', coalesce((
      select jsonb_agg(sample.seller - 'intel')
      from (
        select a.seller from all_sellers a
        order by (jsonb_array_length(coalesce(a.seller -> 'products', '[]'::jsonb)) = 0),
                 md5((a.seller ->> 'id') || current_date::text)
        limit least(greatest(coalesce(p_limit, 5), 1), 5)
      ) sample
    ), '[]'::jsonb),
    'total', (select count(*) from all_sellers)
  );
$function$;
