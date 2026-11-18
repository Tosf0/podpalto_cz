-- =============================================================================
-- podpalto.cz – přepočet statistik trhu z aktuálních cen (commodity_price_stats, region_stats)
-- =============================================================================
-- `select public.refresh_market_stats();` přepočítá aktuální měsíc (nebo zadaný `p_month`).
-- Volá ji služba agentů po každém importu (service role); z prohlížeče volat nejde.
--
-- Metodika (shodná s /metodika na webu):
-- - jen schválené, aktivní nabídky (produkt i prodejce review_status = 'ok', prodejce s polohou)
-- - bez akčních a množstevních cen (is_promo, price_tier_min_quantity)
-- - ceny převedené na společnou jednotku: dřevo na PRMS (1 PRM = 0,7 PLM, 1 PRMS = 0,45 PLM),
--   pelety / brikety / uhlí na tunu (balení přes package_kg)
-- - nejdřív medián za prodejce (aby prodejce s 10 druhy uhlí nepřeválcoval ostatní),
--   potom medián přes prodejce; sample_size = počet prodejců
-- - kraj bez nabídky dané komodity nemá hodnotu (žádné dopočítávání)
-- - cenový index kraje = průměr poměrů (medián kraje / medián ČR) přes dostupné komodity × 100

create or replace function public.refresh_market_stats(p_month date default date_trunc('month', now())::date)
returns table (commodity public.commodity_key, region public.region_code, avg_price_czk numeric, sample_size integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  m date := date_trunc('month', p_month)::date;
begin
  create temporary table _offers on commit drop as
  select s.id as seller_id, s.region,
         case
           when p.category = 'wood' and p.wood_group = 'hard' then 'hardWoodPrms'
           when p.category = 'wood' and p.wood_group = 'soft' then 'softWoodPrms'
           when p.category = 'pellets' then 'pelletsT'
           when p.category = 'briquettes' and coalesce(p.briquette_type::text, '') <> 'hnědouhelné' then 'briquettesT'
           when p.category = 'coal' and p.coal_type::text like 'hnědé%' then 'coalT'
         end::public.commodity_key as commodity,
         case
           when p.category = 'wood' then
             case p.unit
               when 'PRMS' then p.price_czk
               when 'PRM' then p.price_czk * 0.45 / 0.7
               when 'PLM' then p.price_czk * 0.45
             end
           else
             case
               when p.unit = 't' then p.price_czk
               when p.unit in ('pytel', 'paleta') and p.package_kg > 0 then p.price_czk / p.package_kg * 1000
             end
         end as price
  from public.products p
  join public.sellers s on s.id = p.seller_id
  where p.active and p.review_status = 'ok'
    and s.status = 'active' and s.review_status = 'ok' and s.lat is not null
    and not p.is_promo and p.price_tier_min_quantity is null and p.base_product_id is null;

  delete from _offers where commodity is null or price is null;

  create temporary table _per_seller on commit drop as
  select o.seller_id, o.region, o.commodity,
         percentile_cont(0.5) within group (order by o.price) as price
  from _offers o
  group by o.seller_id, o.region, o.commodity;

  delete from public.commodity_price_stats c where c.month = m;

  insert into public.commodity_price_stats (month, region, commodity, avg_price_czk, sample_size, computed_at)
  select m, null, ps.commodity, round(percentile_cont(0.5) within group (order by ps.price)::numeric, 0), count(*), now()
  from _per_seller ps
  group by ps.commodity;

  insert into public.commodity_price_stats (month, region, commodity, avg_price_czk, sample_size, computed_at)
  select m, ps.region, ps.commodity, round(percentile_cont(0.5) within group (order by ps.price)::numeric, 0), count(*), now()
  from _per_seller ps
  group by ps.region, ps.commodity;

  delete from public.region_stats r where r.month = m;

  insert into public.region_stats (region, month, seller_count, price_index, change_pct, computed_at)
  select rg.code, m,
         (select count(*) from public.sellers s
           where s.region = rg.code and s.status = 'active' and s.review_status = 'ok' and s.lat is not null),
         coalesce((
           select round(avg(c.avg_price_czk / cz.avg_price_czk) * 100, 1)
           from public.commodity_price_stats c
           join public.commodity_price_stats cz on cz.month = m and cz.region is null and cz.commodity = c.commodity
           where c.month = m and c.region = rg.code
         ), 100),
         coalesce((
           select round(avg((c.avg_price_czk - prev.avg_price_czk) / prev.avg_price_czk) * 100, 1)
           from public.commodity_price_stats c
           join public.commodity_price_stats prev
             on prev.region = c.region and prev.commodity = c.commodity and prev.month = (m - interval '1 month')::date
           where c.month = m and c.region = rg.code
         ), 0),
         now()
  from public.regions rg
  -- kraj bez jediné ceny řádek nedostane (mapa ho ukáže šedě, nevymýšlíme index 100)
  where exists (select 1 from public.commodity_price_stats c where c.month = m and c.region = rg.code);

  return query
    select c.commodity, c.region, c.avg_price_czk, c.sample_size
    from public.commodity_price_stats c
    where c.month = m
    order by c.region nulls first, c.commodity;
end;
$$;

revoke execute on function public.refresh_market_stats(date) from public, anon, authenticated;
