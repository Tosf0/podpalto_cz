-- =============================================================================
-- podpalto.cz – 7 Opravy kontroly záznamů, oprávnění, CI shrnutí, Sčítání 2021
-- =============================================================================
-- Navazuje na 20261118120000_agent_output.sql (kontrola z 18. 11. 2026, docs/TODO.md):
--
-- 1. Triggery kontroly porovnávají jen MNOŽINU BLOKUJÍCÍCH příznaků. Schválený záznam se
--    znovu otevře jen tehdy, když přibude nový blokující příznak (ne při jiném pořadí
--    příznaků ani při novém informačním příznaku). Když blokující příznaky zmizí,
--    záznam čekající na kontrolu se sám uvolní (poloha dohledaná později, čistá cena).
-- 2. Vlastník prodejce smí vkládat produkty a ceny jen do vybraných sloupců (ne stav
--    kontroly, příznaky ani údaje agentů) a základ varianty musí být jeho vlastní produkt.
-- 3. Historie cen je vidět jen u produktů, které uživatel smí vidět.
-- 4. Opakovaný export stejného snímku nezdvojí běh agenta.
-- 5. CI shrnutí prodejce bez „úrovně hrozby“ (rozhodnutí o CI Studiu) – nově
--    „srovnání s trhem“.
-- 6. Data ze Sčítání 2021 (čím domácnosti topí) pro Trendy a reporty.

-- ---------------------------------------------------------------------------
-- 1. Triggery kontroly
-- ---------------------------------------------------------------------------
create or replace function public.apply_price_observation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  blocking text[] := public.blocking_flags_in(new.flags);
begin
  update public.products p
     set price_czk = new.price_czk,
         price_updated_at = new.observed_at,
         review_status = case
           when p.review_status = 'rejected' then p.review_status
           -- blokující příznak: do kontroly, schválený produkt jen při jiné ceně
           when cardinality(blocking) > 0 and (p.reviewed_at is null or p.price_czk <> new.price_czk)
             then 'needs_review'::public.review_status
           -- čistá cena uvolní produkt, který čekal jen kvůli ceně
           when cardinality(blocking) = 0 and p.review_status = 'needs_review'
                and cardinality(public.blocking_flags_in(p.flags)) = 0
             then 'ok'::public.review_status
           else p.review_status
         end,
         review_reasons = case
           when p.review_status = 'rejected' then p.review_reasons
           when cardinality(blocking) > 0 and (p.reviewed_at is null or p.price_czk <> new.price_czk)
             then blocking
           when cardinality(blocking) = 0 and p.review_status = 'needs_review'
                and cardinality(public.blocking_flags_in(p.flags)) = 0
             then '{}'::text[]
           else p.review_reasons
         end
   where p.id = new.product_id and p.price_updated_at <= new.observed_at;
  return new;
end;
$$;

create or replace function public.products_review_from_flags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  new_blocking text[] := public.blocking_flags_in(new.flags);
  old_blocking text[];
begin
  if tg_op = 'INSERT' then
    if cardinality(new_blocking) > 0 and new.review_status <> 'rejected' then
      new.review_status := 'needs_review';
      new.review_reasons := new_blocking;
    end if;
    return new;
  end if;

  if new.flags is not distinct from old.flags or new.review_status = 'rejected' then
    return new;
  end if;

  old_blocking := public.blocking_flags_in(old.flags);
  if not (new_blocking <@ old_blocking) then
    -- přibyl nový blokující příznak
    new.review_status := 'needs_review';
    new.review_reasons := new_blocking;
  elsif cardinality(new_blocking) = 0 and new.review_status = 'needs_review'
        and not exists (
          select 1
          from (
            select o.flags from public.price_observations o
            where o.product_id = new.id
            order by o.observed_at desc
            limit 1
          ) last_obs
          where cardinality(public.blocking_flags_in(last_obs.flags)) > 0
        ) then
    -- blokující příznaky zmizely z produktu i z poslední ceny
    new.review_status := 'ok';
    new.review_reasons := '{}';
  end if;
  return new;
end;
$$;

create or replace function public.sellers_review_from_flags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  new_blocking text[] := public.blocking_flags_in(new.flags);
  old_blocking text[];
begin
  if new.lat is null and not ('location_unknown' = any(new_blocking)) then
    new_blocking := new_blocking || 'location_unknown'::text;
  end if;

  if tg_op = 'INSERT' then
    if cardinality(new_blocking) > 0 and new.review_status <> 'rejected' then
      new.review_status := 'needs_review';
      new.review_reasons := new_blocking;
    end if;
    return new;
  end if;

  if (new.flags is not distinct from old.flags
      and new.lat is not distinct from old.lat
      and new.lng is not distinct from old.lng)
     or new.review_status = 'rejected' then
    return new;
  end if;

  old_blocking := public.blocking_flags_in(old.flags);
  if old.lat is null and not ('location_unknown' = any(old_blocking)) then
    old_blocking := old_blocking || 'location_unknown'::text;
  end if;

  if not (new_blocking <@ old_blocking) then
    new.review_status := 'needs_review';
    new.review_reasons := new_blocking;
  elsif cardinality(new_blocking) = 0 and new.review_status = 'needs_review' then
    -- např. poloha dohledaná dodatečně
    new.review_status := 'ok';
    new.review_reasons := '{}';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Vlastník prodejce: jen vybrané sloupce, základ varianty jen vlastní produkt
-- ---------------------------------------------------------------------------
revoke insert on public.products from authenticated;
grant insert (
  seller_id, external_id, name, category, wood_species, wood_group, wood_form, moisture, moisture_percent,
  log_length_cm, certification, briquette_type, coal_type, diameter_mm, declared_mj_per_kg, price_czk, unit,
  package_kg, package_prm, min_order, stock, source_url, active, sort_order, name_raw, quality_raw,
  wood_species_raw, log_length_cm_exact, seasoning, certificate_id, briquette_material, coal_origin, grain_mm,
  delivery_days, is_promo, promo_valid_until, price_tier_min_quantity, price_tier_unit, base_product_id
) on public.products to authenticated;

revoke insert on public.price_observations from authenticated;
grant insert (
  product_id, price_czk, observed_at, source, source_url, vat_status, original_price, original_unit,
  original_quantity, original_price_includes_vat, valid_in_regions, delivery_included
) on public.price_observations to authenticated;

drop policy "Vlastník přidává produkty" on public.products;
create policy "Vlastník přidává produkty" on public.products for insert to authenticated
  with check (
    exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
    and (select public.current_plan()) = 'seller'
    and (base_product_id is null or exists (
      select 1 from public.products b where b.id = base_product_id and b.seller_id = products.seller_id
    ))
  );

drop policy "Vlastník upravuje produkty" on public.products;
create policy "Vlastník upravuje produkty" on public.products for update to authenticated
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
    and (select public.current_plan()) = 'seller'
  )
  with check (
    base_product_id is null or exists (
      select 1 from public.products b where b.id = base_product_id and b.seller_id = products.seller_id
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Historie cen jen u viditelných produktů (RLS produktů platí i v poddotazu)
-- ---------------------------------------------------------------------------
drop policy "Přihlášení čtou historii cen" on public.price_observations;
create policy "Přihlášení čtou historii cen" on public.price_observations for select to authenticated
  using (exists (select 1 from public.products p where p.id = product_id));

-- ---------------------------------------------------------------------------
-- 4. Jeden běh agenta na snímek zdroje
-- ---------------------------------------------------------------------------
create unique index scrape_runs_source_snapshot_uq on public.scrape_runs (source_key, snapshot_id)
  where snapshot_id is not null;

-- ---------------------------------------------------------------------------
-- 5. CI shrnutí prodejce: neutrální profil, bez úrovně hrozby
-- ---------------------------------------------------------------------------
alter table public.seller_intel
  drop column threat_level,
  -- kde je prodejce levnější / dražší než kraj a ČR a v čem (strukturovaně od SellerProfileFlow)
  add column market_comparison jsonb check (market_comparison is null or jsonb_typeof(market_comparison) = 'object');

drop type public.threat_level;

create or replace function public.api_sellers(
  p_slug text default null,
  p_region public.region_code default null,
  p_category public.fuel_category default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.seller order by x.name), '[]'::jsonb)
  from (
    select
      s.name,
      jsonb_strip_nulls(jsonb_build_object(
        'id', s.id,
        'slug', s.slug,
        'name', s.name,
        'legalName', s.legal_name,
        'ico', s.ico,
        'website', coalesce(s.website, ''),
        'phone', s.phone,
        'email', s.email,
        'description', s.description,
        'photoUrl', s.photo_url,
        'address', jsonb_build_object('street', s.street, 'city', s.city, 'zip', s.zip, 'region', s.region, 'district', s.district),
        'location', jsonb_build_object('lat', s.lat, 'lng', s.lng),
        'size', s.size,
        'foundedYear', s.founded_year,
        'rating', coalesce(rt.rating, 0),
        'reviewCount', coalesce(rt.review_count, 0),
        'categories', coalesce(cat.categories, '[]'::jsonb),
        'tags', to_jsonb(s.tags),
        'products', coalesce(pr.products, '[]'::jsonb),
        'delivery', jsonb_build_object(
          'ownDelivery', s.own_delivery,
          'hydraulicArm', s.hydraulic_arm,
          'pickupAvailable', s.pickup_available,
          'baseFee', s.delivery_base_fee,
          'pricePerKm', s.delivery_price_per_km,
          'freeRadiusKm', s.delivery_free_radius_km,
          'freeOverQuantity', s.delivery_free_over_quantity,
          'hydraulicArmFee', s.hydraulic_arm_fee,
          'maxRadiusKm', s.delivery_max_radius_km,
          'notes', s.delivery_notes
        ),
        'intel', (
          select jsonb_build_object(
            'reportId', i.report_id,
            'positioning', i.positioning,
            'toneOfVoice', i.tone_of_voice,
            'usp', to_jsonb(i.usp),
            'swot', i.swot,
            'priceIndexVsCz', i.price_index_vs_cz,
            'marketComparison', i.market_comparison,
            'analyzedAt', i.analyzed_at
          )
          from public.seller_intel i where i.seller_id = s.id
        ),
        'verified', s.verified,
        'claimed', s.owner_id is not null,
        'lastScrapedAt', coalesce(s.last_scraped_at, s.updated_at)
      )) as seller
    from public.sellers s
    left join lateral (
      select
        s.external_review_count + count(r.id) as review_count,
        round(
          ((coalesce(s.external_rating, 0) * s.external_review_count + coalesce(sum(r.rating), 0))
            / nullif(s.external_review_count + count(r.id), 0))::numeric,
          1
        ) as rating
      from public.reviews r
      where r.seller_id = s.id and r.status = 'published'
    ) rt on true
    left join lateral (
      select jsonb_agg(c.category order by c.category) as categories
      from (
        select distinct p.category from public.products p
        where p.seller_id = s.id and p.active and p.review_status = 'ok'
          and not p.is_promo and p.price_tier_min_quantity is null
      ) c
    ) cat on true
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'sellerId', p.seller_id,
          'name', p.name,
          'category', p.category,
          'woodSpecies', to_jsonb(p.wood_species),
          'woodGroup', p.wood_group,
          'woodForm', p.wood_form,
          'moisture', p.moisture,
          'moisturePercent', p.moisture_percent,
          'logLengthCm', p.log_length_cm,
          'certification', p.certification,
          'briquetteType', p.briquette_type,
          'coalType', p.coal_type,
          'diameterMm', p.diameter_mm,
          'declaredMjPerKg', p.declared_mj_per_kg,
          'price', p.price_czk,
          'unit', p.unit,
          'packageKg', p.package_kg,
          'packagePrm', p.package_prm,
          'minOrder', p.min_order,
          'stock', p.stock,
          'priceHistory', coalesce(h.history, '[]'::jsonb),
          'updatedAt', p.price_updated_at
        )
        order by p.sort_order, p.created_at
      ) as products
      from public.products p
      left join lateral (
        select jsonb_agg(jsonb_build_object('date', m.month, 'price', m.price) order by m.month) as history
        from (
          select
            to_char(date_trunc('month', o.observed_at), 'YYYY-MM') as month,
            (array_agg(o.price_czk order by o.observed_at desc))[1] as price
          from public.price_observations o
          where o.product_id = p.id
            and o.observed_at >= date_trunc('month', now()) - interval '11 months'
          group by 1
        ) m
      ) h on true
      where p.seller_id = s.id and p.active and p.review_status = 'ok'
        and not p.is_promo and p.price_tier_min_quantity is null
    ) pr on true
    where s.status = 'active'
      and s.review_status = 'ok'
      and s.lat is not null
      and (p_slug is null or s.slug = p_slug)
      and (p_region is null or s.region = p_region)
      and (p_category is null or exists (
        select 1 from public.products p2
        where p2.seller_id = s.id and p2.active and p2.category = p_category and p2.review_status = 'ok'
          and not p2.is_promo and p2.price_tier_min_quantity is null
      ))
  ) x;
$$;

revoke execute on function public.api_sellers(text, public.region_code, public.fuel_category) from public, anon;

-- ---------------------------------------------------------------------------
-- 6. Sčítání 2021: obydlené byty podle zdroje vytápění (ČSÚ, otevřená data)
-- ---------------------------------------------------------------------------
create table public.heating_census (
  -- kód kraje, nebo 'CZ' = celá republika
  region text primary key check (region in (
    'CZ', 'PHA', 'STC', 'JHC', 'PLK', 'KVK', 'ULK', 'LBK', 'HKK', 'PAK', 'VYS', 'JHM', 'OLK', 'ZLK', 'MSK'
  )),
  census_date date not null,
  households_total integer not null check (households_total >= 0),
  coal_coke_briquettes integer not null check (coal_coke_briquettes >= 0),
  wood_and_wood_briquettes integer not null check (wood_and_wood_briquettes >= 0),
  wood_pellets integer not null check (wood_pellets >= 0),
  source text not null,
  loaded_at timestamptz not null default now()
);

alter table public.heating_census enable row level security;
create policy "Sčítání čte každý" on public.heating_census for select to anon, authenticated using (true);
revoke all on public.heating_census from anon, authenticated;
grant select on public.heating_census to anon, authenticated;

insert into public.heating_census (region, census_date, households_total, coal_coke_briquettes, wood_and_wood_briquettes, wood_pellets, source) values
  ('CZ',  '2021-03-26', 4480139, 240623, 357583, 23953, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('PHA', '2021-03-26',  627705,    916,   1642,   190, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('STC', '2021-03-26',  561642,  52245,  43977,  5104, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('JHC', '2021-03-26',  265601,  22598,  40692,  2606, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('PLK', '2021-03-26',  247030,  19884,  26311,  1261, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('KVK', '2021-03-26',  125299,   6516,   7253,   554, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('ULK', '2021-03-26',  353285,  22967,  15784,  1464, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('LBK', '2021-03-26',  187627,  16511,  17755,  1329, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('HKK', '2021-03-26',  228569,  19518,  24489,  1231, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('PAK', '2021-03-26',  209133,  14680,  24427,  1255, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('VYS', '2021-03-26',  195098,  18024,  33741,  1151, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('JHM', '2021-03-26',  490005,   4569,  30473,  1207, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('OLK', '2021-03-26',  259885,  10024,  29935,  1446, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('ZLK', '2021-03-26',  226219,   5053,  32076,  1550, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data'),
  ('MSK', '2021-03-26',  503041,  27118,  29028,  3605, 'https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data');
