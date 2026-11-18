-- Poloha prodejce na webu a celostátní ceny (handoff 2026-11-18 #01, body 3.3 a 3.4).
--
-- * api_sellers vrací navíc:
--     locationPrecision  address_point | building | street | municipality (web u street /
--                        municipality ukáže „přibližná poloha“),
--     registeredOffice   true = poloha je sídlo firmy (příznak location_is_registered_office,
--                        neblokující – prodejce se zobrazí, ale s poznámkou),
--     nationwide         true = ceny platí pro celou ČR (e-shop, řetězec): web ho ukáže bez
--                        špendlíku na mapě jako „rozváží po celé ČR“ a nefiltruje ho okruhem.
-- * refresh_market_stats: celostátní nabídky se počítají jen do celostátního mediánu, ne do
--   mediánu kraje, kde má firma sídlo (jinak by e-shopy zkreslily Prahu a Středočeský kraj),
--   a nepočítají se do počtu prodejců v kraji.

-- Ceny prodejce platí pro celou ČR: některá aktivní nabídka má pozorování s valid_in_regions = CZ.
create or replace function public.seller_prices_nationwide(p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    join public.price_observations o on o.product_id = p.id
    where p.seller_id = p_seller_id and p.active and 'CZ' = any(o.valid_in_regions)
  );
$$;

revoke all on function public.seller_prices_nationwide(uuid) from public;
grant execute on function public.seller_prices_nationwide(uuid) to anon, authenticated, service_role;

-- api_sellers: tři nová pole (zbytek funkce beze změny).
do $$
declare
  def text := pg_get_functiondef('public.api_sellers(text, public.region_code, public.fuel_category)'::regprocedure);
  anchor text := '''verified'', s.verified,';
begin
  if position(anchor in def) = 0 then
    raise exception 'api_sellers: kotva % nenalezena', anchor;
  end if;
  def := replace(def, anchor,
    '''locationPrecision'', s.location_precision,'
    || ' ''registeredOffice'', case when ''location_is_registered_office'' = any(coalesce(s.flags, ''{}''::text[])) then true end,'
    || ' ''nationwide'', case when public.seller_prices_nationwide(s.id) then true end,'
    || ' ' || anchor);
  execute def;
end;
$$;

-- refresh_market_stats: celostátní nabídky jen do celostátního mediánu.
create or replace function public.refresh_market_stats(p_month date default (date_trunc('month', now()))::date)
returns table (commodity public.commodity_key, region public.region_code, avg_price_czk numeric, sample_size integer)
language plpgsql
security definer
set search_path = ''
as $function$
#variable_conflict use_column
declare
  m date := date_trunc('month', p_month)::date;
  is_current boolean := date_trunc('month', p_month) >= date_trunc('month', now());
begin
  drop table if exists pg_temp._offers, pg_temp._per_seller;
  create temporary table _offers on commit drop as
  select s.id as seller_id, s.region,
         exists (
           select 1 from public.price_observations o2
            where o2.product_id = p.id and 'CZ' = any(o2.valid_in_regions)
         ) as nationwide,
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
               when 'PRMS' then pr.price_czk
               when 'PRM' then pr.price_czk * 0.45 / 0.7
               when 'PLM' then pr.price_czk * 0.45
             end
           else
             case
               when p.unit = 't' then pr.price_czk
               when p.unit in ('pytel', 'paleta') and p.package_kg > 0 then pr.price_czk / p.package_kg * 1000
             end
         end as price
  from public.products p
  join public.sellers s on s.id = p.seller_id
  cross join lateral (
    select case
      when is_current then p.price_czk
      else (
        select o.price_czk from public.price_observations o
         where o.product_id = p.id and o.observed_at < (m + interval '1 month')
         order by o.observed_at desc
         limit 1
      )
    end as price_czk
  ) pr
  where p.active and p.review_status = 'ok'
    and s.status = 'active' and s.review_status = 'ok' and s.lat is not null
    and not p.is_promo and p.price_tier_min_quantity is null and p.base_product_id is null;

  delete from _offers where commodity is null or price is null;

  create temporary table _per_seller on commit drop as
  select o.seller_id, o.region, o.commodity, bool_or(o.nationwide) as nationwide,
         percentile_cont(0.5) within group (order by o.price) as price
  from _offers o
  group by o.seller_id, o.region, o.commodity;

  delete from public.commodity_price_stats c where c.month = m;

  -- celostátní medián: všichni prodejci včetně e-shopů s cenou pro celou ČR
  insert into public.commodity_price_stats (month, region, commodity, avg_price_czk, sample_size, computed_at)
  select m, null, ps.commodity, round(percentile_cont(0.5) within group (order by ps.price)::numeric, 0), count(*), now()
  from _per_seller ps
  group by ps.commodity;

  -- medián kraje: jen místní nabídky (celostátní by se připsaly kraji sídla firmy)
  insert into public.commodity_price_stats (month, region, commodity, avg_price_czk, sample_size, computed_at)
  select m, ps.region, ps.commodity, round(percentile_cont(0.5) within group (order by ps.price)::numeric, 0), count(*), now()
  from _per_seller ps
  where not ps.nationwide
  group by ps.region, ps.commodity;

  delete from public.region_stats r where r.month = m;

  insert into public.region_stats (region, month, seller_count, price_index, change_pct, computed_at)
  select rg.code, m,
         (select count(*) from public.sellers s
           where s.region = rg.code and s.status = 'active' and s.review_status = 'ok' and s.lat is not null
             and not public.seller_prices_nationwide(s.id)),
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
  where exists (select 1 from public.commodity_price_stats c where c.month = m and c.region = rg.code);

  return query
    select c.commodity, c.region, c.avg_price_czk, c.sample_size
    from public.commodity_price_stats c
    where c.month = m
    order by c.region nulls first, c.commodity;
end;
$function$;

-- index pro dotaz „má produkt celostátní cenu“ (GIN nad polem krajů)
create index if not exists price_observations_valid_in_regions on public.price_observations using gin (valid_in_regions);
