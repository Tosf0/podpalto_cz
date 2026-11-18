-- =============================================================================
-- podpalto.cz – 6 Výstup agentů: pole ze specu, „neuvedeno“, kontrola cen,
-- akční a množstevní ceny jako samostatné produkty
-- =============================================================================
-- Podklad: docs/agent-output-spec.md a rozhodnutí 1–4 v docs/TODO.md
-- („Opravy API: rozhodnutí z kontroly specu“, 18. 11. 2026).
--
-- 1. Akce a množstevní pásmo = vlastní produkt (`is_promo`, `price_tier_*`,
--    `base_product_id`). Mapa, srovnání a statistiky berou jen běžné produkty, takže
--    trigger aktuální ceny nikdy nepřepíše běžnou cenu akční.
-- 2. Pole ze specu, která schéma nemělo (původ ceny, DPH, příznaky, poloha, registr…).
-- 3. „Neuvedeno“ = NULL: sklad, doprava, velikost firmy a poloha nemají výchozí hodnotu,
--    která by se tvářila jako zjištěný údaj („skladem“, „nedováží“, „malá firma“).
-- 4. Stav kontroly (`review_status`) u prodejců a produktů. Blokující příznaky jsou na
--    jednom místě (`review_blocking_flags()`), nastavují je triggery, schvaluje admin.
--    `active` dál znamená jen „produkt u zdroje existuje“.
--
-- Agenti zapisují service role klíčem (RLS obchází) v pořadí sellers → products →
-- price_observations → scrape_runs, upsert podle `sellers.external_key` a
-- `products (seller_id, external_id)`. Při vložení produktu nastavit
-- `price_updated_at = observed_at` první ceny, jinak trigger starší zjištění nepoužije.

-- ---------------------------------------------------------------------------
-- Stav kontroly a blokující příznaky (bod 4)
-- ---------------------------------------------------------------------------
create type public.review_status as enum ('ok', 'needs_review', 'rejected');

-- Jediné místo, kde je seznam příznaků, které záznam skryjí do ruční kontroly.
-- Ostatní příznaky (např. `vat_assumed_from_registry`, `price_from`) jsou jen informace.
create or replace function public.review_blocking_flags()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    -- cena (docs/agent-output-spec.md, sekce 9)
    'outlier_vs_market', 'unit_price_implausible', 'price_jump',
    -- nemá se do aplikace vůbec dostat; kdyby přišlo, neukázat
    'package_size_unknown', 'volume_stacking_unknown',
    -- poloha prodejce
    'location_unknown', 'location_region_mismatch'
  ]::text[];
$$;

create or replace function public.blocking_flags_in(flags text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(f order by f), '{}'::text[])
  from unnest(coalesce(flags, '{}'::text[])) as f
  where f = any(public.review_blocking_flags());
$$;

-- ---------------------------------------------------------------------------
-- Prodejci / provozovny (spec, sekce 5)
-- ---------------------------------------------------------------------------
alter table public.sellers
  -- identita od agentů (`seller_key` ze specu); `ico` = `company_ico` ze specu
  add column external_key text unique,
  add column branch_name text,
  -- poloha (5.3)
  add column ruian_address_code bigint check (ruian_address_code > 0),
  add column location_source text
    check (location_source in ('ruian', 'geocoder_mapy', 'geocoder_nominatim', 'seller_map', 'manual')),
  add column location_precision text
    check (location_precision in ('address_point', 'building', 'street', 'municipality')),
  add column location_checked_at timestamptz,
  -- registr ARES (5.2): status, ico_found_on, name, address, ruian_address_code, active, checked_at
  add column registry jsonb check (registry is null or jsonb_typeof(registry) = 'object'),
  -- doprava (5.4)
  add column delivery_zones jsonb check (delivery_zones is null or jsonb_typeof(delivery_zones) = 'array'),
  add column delivery_free_over_quantity_unit public.price_unit,
  add column delivery_evidence jsonb check (delivery_evidence is null or jsonb_typeof(delivery_evidence) = 'object'),
  -- externí hodnocení (5.6); hodnota, počet a zdroj už existují
  add column external_rating_url text,
  add column external_rating_fetched_at timestamptz,
  -- kvalita (sekce 9) a kontrola
  add column flags text[] not null default '{}',
  add column review_status public.review_status not null default 'ok',
  add column review_reasons text[] not null default '{}',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null;

-- „neuvedeno“ (bod 3): bez polohy se prodejce neukáže na mapě (`location_unknown`),
-- neznámá doprava a velikost nesmí vypadat jako „nevozí“ / „malá firma“
alter table public.sellers
  alter column lat drop not null,
  alter column lng drop not null,
  add constraint sellers_location_complete check ((lat is null) = (lng is null)),
  alter column size drop not null,
  alter column size drop default,
  alter column own_delivery drop not null,
  alter column own_delivery drop default,
  alter column hydraulic_arm drop not null,
  alter column hydraulic_arm drop default,
  alter column pickup_available drop not null,
  alter column pickup_available drop default,
  alter column delivery_base_fee drop not null,
  alter column delivery_base_fee drop default,
  alter column delivery_price_per_km drop not null,
  alter column delivery_price_per_km drop default,
  alter column delivery_free_radius_km drop not null,
  alter column delivery_free_radius_km drop default,
  alter column delivery_max_radius_km drop not null,
  alter column delivery_max_radius_km drop default;

create index sellers_review_idx on public.sellers (review_status) where review_status <> 'ok';

-- ---------------------------------------------------------------------------
-- Produkty (spec, sekce 6)
-- ---------------------------------------------------------------------------
alter table public.products
  add column name_raw text,
  add column quality_raw text,
  -- dřevo (6.2)
  add column wood_species_raw text,
  add column log_length_cm_exact numeric(5, 1) check (log_length_cm_exact > 0),
  add column seasoning text,
  -- pelety (6.3)
  add column certificate_id text,
  -- brikety (6.4)
  add column briquette_material text check (briquette_material in ('wood', 'coal')),
  -- uhlí a koks (6.5): `coal_origin` = původ (SD Bílina…), ne jakost
  add column coal_origin text,
  add column grain_mm text,
  -- dodání
  add column delivery_days integer check (delivery_days >= 0),
  add column delivery_override jsonb check (delivery_override is null or jsonb_typeof(delivery_override) = 'object'),
  -- akce a množstevní pásma jako samostatný produkt (bod 1)
  add column is_promo boolean not null default false,
  add column promo_valid_until date,
  add column price_tier_min_quantity numeric(8, 2) check (price_tier_min_quantity > 0),
  add column price_tier_unit public.price_unit,
  add column base_product_id uuid references public.products (id) on delete cascade,
  -- kvalita a kontrola
  add column flags text[] not null default '{}',
  add column review_status public.review_status not null default 'ok',
  add column review_reasons text[] not null default '{}',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add constraint products_price_tier_complete check ((price_tier_min_quantity is null) = (price_tier_unit is null)),
  add constraint products_promo_until_only_for_promo check (promo_valid_until is null or is_promo),
  add constraint products_base_not_self check (base_product_id is null or base_product_id <> id);

-- „neuvedeno“ (bod 3)
alter table public.products
  alter column stock drop not null,
  alter column stock drop default;

create index products_review_idx on public.products (review_status) where review_status <> 'ok';
create index products_base_idx on public.products (base_product_id) where base_product_id is not null;

-- ---------------------------------------------------------------------------
-- Zjištění cen (spec, sekce 7)
-- ---------------------------------------------------------------------------
alter table public.price_observations
  add column vat_status text check (vat_status in ('included', 'added', 'assumed')),
  add column original_price numeric(12, 2) check (original_price > 0),
  add column original_unit text check (original_unit in ('kg', 'q', 't', 'bag', 'pallet', 'm3', 'prmr', 'prms')),
  add column original_quantity numeric(10, 3) check (original_quantity > 0),
  add column original_price_includes_vat boolean,
  -- kraje, kde cena platí; celostátně ['CZ']; neznámo = NULL
  add column valid_in_regions text[] check (valid_in_regions <@ array[
    'CZ', 'PHA', 'STC', 'JHC', 'PLK', 'KVK', 'ULK', 'LBK', 'HKK', 'PAK', 'VYS', 'JHM', 'OLK', 'ZLK', 'MSK'
  ]::text[]),
  add column delivery_included boolean,
  -- přepočty služby tools pro kontrolu: per_kg, per_t, per_prms, per_kwh, calorific_mj_kg, calorific_source
  add column normalized jsonb check (normalized is null or jsonb_typeof(normalized) = 'object'),
  add column snapshot_id bigint,
  add column flags text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Běhy a zdroje agentů (spec, sekce 8)
-- ---------------------------------------------------------------------------
alter table public.scrape_sources
  -- id zdroje z registru služby tools (`sources.yaml`)
  add column source_key text unique;

alter table public.scrape_runs
  add column source_key text,
  add column snapshot_id bigint,
  add column agent_version text,
  add column model text,
  add column http_status smallint,
  add column content_sha256 text,
  add column changed boolean,
  add column rejected_count integer check (rejected_count >= 0),
  -- tools: ok → success, error → failed, blocked_by_robots → blocked
  drop constraint scrape_runs_status_check,
  add constraint scrape_runs_status_check check (status in ('running', 'success', 'failed', 'blocked'));

create index scrape_runs_source_key_idx on public.scrape_runs (source_key, started_at desc);

-- ---------------------------------------------------------------------------
-- Triggery kontroly (bod 4)
-- ---------------------------------------------------------------------------

-- Nové zjištění ceny: přepíše aktuální cenu (jako dřív) a s blokujícím příznakem pošle
-- produkt do kontroly. Produkt, který admin schválil, se znovu neotevře, dokud se cena
-- nezmění (jinak by se stejná odlehlá cena vracela do fronty po každém sběru).
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
           when cardinality(blocking) > 0 and p.review_status <> 'rejected'
                and (p.reviewed_at is null or p.price_czk <> new.price_czk)
             then 'needs_review'::public.review_status
           else p.review_status
         end,
         review_reasons = case
           when cardinality(blocking) > 0 and p.review_status <> 'rejected'
                and (p.reviewed_at is null or p.price_czk <> new.price_czk)
             then blocking
           else p.review_reasons
         end
   where p.id = new.product_id and p.price_updated_at <= new.observed_at;
  return new;
end;
$$;

-- Příznaky produktu: vyhodnotí se při vložení a při změně `flags`.
create or replace function public.products_review_from_flags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  blocking text[];
begin
  if tg_op = 'UPDATE' and new.flags is not distinct from old.flags then
    return new;
  end if;
  blocking := public.blocking_flags_in(new.flags);
  if cardinality(blocking) > 0 and new.review_status <> 'rejected' then
    new.review_status := 'needs_review';
    new.review_reasons := blocking;
  end if;
  return new;
end;
$$;

create trigger products_review_from_flags
  before insert or update on public.products
  for each row execute function public.products_review_from_flags();

-- Příznaky a poloha prodejce: vyhodnotí se při vložení a při změně `flags` nebo polohy.
-- Prodejce bez polohy dostane `location_unknown`, i když ho agent neposlal.
create or replace function public.sellers_review_from_flags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  blocking text[];
begin
  if tg_op = 'UPDATE'
     and new.flags is not distinct from old.flags
     and new.lat is not distinct from old.lat
     and new.lng is not distinct from old.lng then
    return new;
  end if;
  blocking := public.blocking_flags_in(new.flags);
  if new.lat is null and not ('location_unknown' = any(blocking)) then
    blocking := blocking || 'location_unknown'::text;
  end if;
  if cardinality(blocking) > 0 and new.review_status <> 'rejected' then
    new.review_status := 'needs_review';
    new.review_reasons := blocking;
  end if;
  return new;
end;
$$;

create trigger sellers_review_from_flags
  before insert or update on public.sellers
  for each row execute function public.sellers_review_from_flags();

-- ---------------------------------------------------------------------------
-- Ruční kontrola: admin schválí nebo zamítne (důvody zůstávají kvůli auditu)
-- ---------------------------------------------------------------------------
create or replace function public.review_product(product_id uuid, decision public.review_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Pouze admin může schvalovat produkty' using errcode = '42501';
  end if;
  if decision = 'needs_review' then
    raise exception 'Rozhodnutí musí být ok nebo rejected';
  end if;
  update public.products
     set review_status = decision, reviewed_at = now(), reviewed_by = (select auth.uid())
   where id = product_id;
  if not found then
    raise exception 'Produkt % neexistuje', product_id;
  end if;
end;
$$;

create or replace function public.review_seller(seller_id uuid, decision public.review_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Pouze admin může schvalovat prodejce' using errcode = '42501';
  end if;
  if decision = 'needs_review' then
    raise exception 'Rozhodnutí musí být ok nebo rejected';
  end if;
  update public.sellers
     set review_status = decision, reviewed_at = now(), reviewed_by = (select auth.uid())
   where id = seller_id;
  if not found then
    raise exception 'Prodejce % neexistuje', seller_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: neschválené záznamy vidí jen vlastník a admin
-- ---------------------------------------------------------------------------
drop policy "Přihlášení čtou aktivní prodejce" on public.sellers;
create policy "Přihlášení čtou aktivní prodejce" on public.sellers for select to authenticated
  using (
    (status = 'active' and review_status = 'ok')
    or owner_id = (select auth.uid())
    or (select public.is_admin())
  );

drop policy "Přihlášení čtou produkty" on public.products;
create policy "Přihlášení čtou produkty" on public.products for select to authenticated
  using (
    review_status = 'ok'
    or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- API pro frontend: jen schválení prodejci s polohou a jen běžné produkty
-- (tvar odpovědi beze změny; akce a pásma frontend zatím nezobrazuje)
-- ---------------------------------------------------------------------------
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
            'threatLevel', i.threat_level,
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

create or replace function public.sellers_within(p_lat double precision, p_lng double precision, p_km double precision)
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id from public.sellers s
  where s.status = 'active'
    and s.review_status = 'ok'
    and s.geog is not null
    and extensions.st_dwithin(s.geog, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, p_km * 1000);
$$;

-- ---------------------------------------------------------------------------
-- Oprávnění
-- ---------------------------------------------------------------------------
-- vlastník (tarif seller) smí upravit i nové popisné údaje; poloha z RÚIAN, registr,
-- příznaky a stav kontroly zůstávají agentům a adminovi
grant update (branch_name, delivery_zones, delivery_free_over_quantity_unit) on public.sellers to authenticated;
grant update (
  quality_raw, log_length_cm_exact, seasoning, certificate_id, briquette_material, coal_origin, grain_mm,
  delivery_days, is_promo, promo_valid_until, price_tier_min_quantity, price_tier_unit, base_product_id
) on public.products to authenticated;

revoke execute on function public.products_review_from_flags() from public, anon, authenticated;
revoke execute on function public.sellers_review_from_flags() from public, anon, authenticated;
revoke execute on function public.review_product(uuid, public.review_status) from public, anon;
revoke execute on function public.review_seller(uuid, public.review_status) from public, anon;
grant execute on function public.review_product(uuid, public.review_status), public.review_seller(uuid, public.review_status) to authenticated;
