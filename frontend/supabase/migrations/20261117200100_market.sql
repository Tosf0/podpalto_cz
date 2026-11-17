-- =============================================================================
-- podpalto.cz – 2/4 Trh: kraje, prodejci, produkty, ceny, hodnocení, poptávky,
-- statistiky trhu, CI reporty a podklady pro scraping agenty
-- =============================================================================
-- Data o trhu čtou jen přihlášení uživatelé. Agenti (scraping, CrewAI) zapisují
-- přes service role klíč na serveru – RLS je obchází, žádné policy pro ně nejsou potřeba.
--
-- Jak agent zapíše novou cenu:  insert into price_observations (product_id, price_czk, source_url)
--   → trigger přepíše aktuální `products.price_czk` a `price_updated_at`.

-- ---------------------------------------------------------------------------
-- Číselníky (hodnoty = TypeScript typy v src/types/index.ts)
-- ---------------------------------------------------------------------------
create type public.fuel_category as enum ('wood', 'pellets', 'briquettes', 'coal');
create type public.price_unit as enum ('PRMS', 'PRM', 'PLM', 't', 'paleta', 'pytel');
create type public.stock_level as enum ('in_stock', 'low', 'out_of_stock', 'preorder');
create type public.wood_species as enum ('buk', 'dub', 'habr', 'jasan', 'briza', 'smrk', 'borovice', 'modrin', 'mix-tvrde', 'mix-mekke');
create type public.wood_group as enum ('hard', 'soft', 'birch');
create type public.wood_form as enum ('sypane', 'rovnane', 'metrovky', 'paleta');
create type public.moisture as enum ('dry', 'semi', 'fresh');
create type public.pellet_certification as enum ('ENplus A1', 'ENplus A2', 'DINplus', 'bez certifikace');
create type public.briquette_type as enum ('RUF', 'PINI KAY', 'válcové', 'hnědouhelné');
create type public.coal_type as enum ('hnědé ořech 1', 'hnědé ořech 2', 'hnědé kostka', 'černé ořech', 'černé kostka', 'koks');
create type public.seller_tag as enum (
  'skladem', 'hydraulicka-ruka', 'enplus-a1', 'suche-18', 'vlastni-doprava',
  'osobni-odber', 'platba-kartou', 'doprava-zdarma', 'fsc-pefc', 'expres-48h'
);
create type public.seller_size as enum ('small', 'medium', 'large');
create type public.seller_status as enum ('active', 'hidden', 'closed');
create type public.data_source as enum ('scraper', 'seller', 'manual');
create type public.commodity_key as enum ('hardWoodPrms', 'softWoodPrms', 'pelletsT', 'briquettesT', 'coalT');
create type public.threat_level as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- Kraje
-- ---------------------------------------------------------------------------
create table public.regions (
  code public.region_code primary key,
  name text not null,
  short_name text not null,
  capital text not null,
  center_lat double precision not null,
  center_lng double precision not null
);

insert into public.regions (code, name, short_name, capital, center_lat, center_lng) values
  ('PHA', 'Hlavní město Praha', 'Praha', 'Praha', 50.0755, 14.4378),
  ('STC', 'Středočeský kraj', 'Středočeský', 'Praha', 49.9, 14.6),
  ('JHC', 'Jihočeský kraj', 'Jihočeský', 'České Budějovice', 49.05, 14.45),
  ('PLK', 'Plzeňský kraj', 'Plzeňský', 'Plzeň', 49.6, 13.3),
  ('KVK', 'Karlovarský kraj', 'Karlovarský', 'Karlovy Vary', 50.17, 12.75),
  ('ULK', 'Ústecký kraj', 'Ústecký', 'Ústí nad Labem', 50.5, 13.75),
  ('LBK', 'Liberecký kraj', 'Liberecký', 'Liberec', 50.7, 14.95),
  ('HKK', 'Královéhradecký kraj', 'Královéhradecký', 'Hradec Králové', 50.4, 15.8),
  ('PAK', 'Pardubický kraj', 'Pardubický', 'Pardubice', 49.9, 16.1),
  ('VYS', 'Kraj Vysočina', 'Vysočina', 'Jihlava', 49.45, 15.65),
  ('JHM', 'Jihomoravský kraj', 'Jihomoravský', 'Brno', 49.0, 16.6),
  ('OLK', 'Olomoucký kraj', 'Olomoucký', 'Olomouc', 49.75, 17.15),
  ('ZLK', 'Zlínský kraj', 'Zlínský', 'Zlín', 49.2, 17.75),
  ('MSK', 'Moravskoslezský kraj', 'Moravskoslezský', 'Ostrava', 49.8, 18.2);

-- ---------------------------------------------------------------------------
-- Prodejci (provozovny na mapě)
-- ---------------------------------------------------------------------------
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  legal_name text,
  ico text check (ico ~ '^[0-9]{8}$'),
  dic text,
  website text,
  phone text,
  email text,
  description text not null default '',
  photo_url text,
  -- adresa
  street text not null default '',
  city text not null,
  zip text not null,
  district text,
  region public.region_code not null references public.regions (code),
  -- poloha na mapě (WGS84); `geog` se dopočítá pro dotazy „v okruhu X km“
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  geog extensions.geography(point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  size public.seller_size not null default 'small',
  founded_year smallint check (founded_year between 1800 and 2100),
  tags public.seller_tag[] not null default '{}',
  -- otevírací doba, např. {"mon": "7:00-16:00", "sat": "8:00-12:00"}
  opening_hours jsonb,
  -- doprava
  own_delivery boolean not null default false,
  hydraulic_arm boolean not null default false,
  pickup_available boolean not null default true,
  delivery_base_fee numeric(10, 2) not null default 0 check (delivery_base_fee >= 0),
  delivery_price_per_km numeric(10, 2) not null default 0 check (delivery_price_per_km >= 0),
  delivery_free_radius_km numeric(6, 1) not null default 0 check (delivery_free_radius_km >= 0),
  delivery_free_over_quantity numeric(8, 2) check (delivery_free_over_quantity > 0),
  hydraulic_arm_fee numeric(10, 2) check (hydraulic_arm_fee >= 0),
  delivery_max_radius_km numeric(6, 1) not null default 0 check (delivery_max_radius_km >= 0),
  delivery_notes text,
  -- hodnocení převzaté z externího zdroje (Google, Firmy.cz…) – kombinuje se s recenzemi v aplikaci
  external_rating numeric(2, 1) check (external_rating between 0 and 5),
  external_review_count integer not null default 0 check (external_review_count >= 0),
  external_rating_source text,
  -- správa záznamu
  status public.seller_status not null default 'active',
  source public.data_source not null default 'scraper',
  owner_id uuid references public.profiles (id) on delete set null,
  verified boolean not null default false,
  last_scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sellers_region_idx on public.sellers (region) where status = 'active';
create index sellers_geog_idx on public.sellers using gist (geog);
create index sellers_owner_idx on public.sellers (owner_id) where owner_id is not null;

create trigger sellers_touch_updated_at
  before update on public.sellers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Produkty (co prodejce prodává) + aktuální cena
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  -- ID položky u zdroje (e-shop, scraper) – pro párování při dalším běhu agenta
  external_id text,
  name text not null check (char_length(name) between 2 and 200),
  category public.fuel_category not null,
  -- palivové dřevo
  wood_species public.wood_species[],
  wood_group public.wood_group,
  wood_form public.wood_form,
  moisture public.moisture,
  moisture_percent numeric(4, 1) check (moisture_percent between 0 and 100),
  log_length_cm smallint check (log_length_cm in (25, 33, 40, 50, 100)),
  -- pelety / brikety / uhlí
  certification public.pellet_certification,
  briquette_type public.briquette_type,
  coal_type public.coal_type,
  diameter_mm numeric(3, 1),
  declared_mj_per_kg numeric(5, 2),
  -- cena (Kč vč. DPH za 1 jednotku) – aktualizuje ji trigger z `price_observations`
  price_czk numeric(10, 2) not null check (price_czk > 0),
  unit public.price_unit not null,
  package_kg numeric(8, 2) check (package_kg > 0),
  package_prm numeric(6, 3) check (package_prm > 0),
  min_order numeric(8, 2) check (min_order > 0),
  stock public.stock_level not null default 'in_stock',
  price_updated_at timestamptz not null default now(),
  source_url text,
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, external_id),
  constraint wood_fields check (category = 'wood' or (wood_species is null and wood_group is null and wood_form is null)),
  constraint package_defined check (unit not in ('paleta', 'pytel') or package_kg is not null or package_prm is not null)
);

create index products_seller_idx on public.products (seller_id, sort_order) where active;
create index products_category_idx on public.products (category) where active;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Historie cen (každé zjištění ceny agentem / prodejcem)
-- ---------------------------------------------------------------------------
create table public.price_observations (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  price_czk numeric(10, 2) not null check (price_czk > 0),
  observed_at timestamptz not null default now(),
  source public.data_source not null default 'scraper',
  source_url text,
  created_at timestamptz not null default now()
);

create index price_observations_product_idx on public.price_observations (product_id, observed_at desc);

create or replace function public.apply_price_observation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products
     set price_czk = new.price_czk, price_updated_at = new.observed_at
   where id = new.product_id and price_updated_at <= new.observed_at;
  return new;
end;
$$;

create trigger price_observations_apply
  after insert on public.price_observations
  for each row execute function public.apply_price_observation();

-- ---------------------------------------------------------------------------
-- Recenze a hodnocení prodejců (1 recenze na uživatele a prodejce)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null default 'Uživatel',
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text check (char_length(body) <= 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  seller_reply text check (char_length(seller_reply) <= 2000),
  seller_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, user_id)
);

create index reviews_seller_idx on public.reviews (seller_id, created_at desc) where status = 'published';

create trigger reviews_touch_updated_at
  before update on public.reviews
  for each row execute function public.touch_updated_at();

-- jméno autora se převezme z profilu (zobrazuje se ostatním bez přístupu k profilům)
create or replace function public.set_review_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(nullif(split_part(p.full_name, ' ', 1) || coalesce(' ' || left(nullif(split_part(p.full_name, ' ', 2), ''), 1) || '.', ''), ''), 'Uživatel')
    into new.author_name
    from public.profiles p where p.id = new.user_id;
  new.author_name := coalesce(new.author_name, 'Uživatel');
  return new;
end;
$$;

create trigger reviews_set_author
  before insert on public.reviews
  for each row execute function public.set_review_author();

-- ---------------------------------------------------------------------------
-- CI Studio – reporty CrewAI a běhy analýz (jen tarif Pro)
-- ---------------------------------------------------------------------------
create table public.analysis_reports (
  -- název souboru z `outputs/` bez přípony, např. 20261110-142233_https-www-drevo-praha-cz
  id text primary key,
  competitor_url text not null,
  competitor_name text not null,
  competitor_domain text not null,
  report text not null,
  report_path text not null default '',
  status text not null default 'completed' check (status in ('completed', 'failed')),
  model text not null default '',
  duration_s numeric(8, 1) not null default 0,
  seller_id uuid references public.sellers (id) on delete set null,
  region public.region_code,
  categories public.fuel_category[],
  swot jsonb,
  requested_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index analysis_reports_created_idx on public.analysis_reports (created_at desc);
create index analysis_reports_seller_idx on public.analysis_reports (seller_id);

create table public.analysis_runs (
  run_id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  competitor_url text not null check (competitor_url ~* '^https?://'),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  progress smallint not null default 0 check (progress between 0 and 100),
  steps jsonb not null default '[]'::jsonb,
  logs jsonb not null default '[]'::jsonb,
  report_id text references public.analysis_reports (id) on delete set null,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index analysis_runs_user_idx on public.analysis_runs (user_id, started_at desc);

-- Shrnutí CI pro profil prodejce (odvozené z posledního reportu)
create table public.seller_intel (
  seller_id uuid primary key references public.sellers (id) on delete cascade,
  report_id text references public.analysis_reports (id) on delete set null,
  positioning text not null,
  tone_of_voice text not null,
  usp text[] not null default '{}',
  swot jsonb not null default '{"strengths": [], "weaknesses": [], "opportunities": [], "threats": []}'::jsonb,
  price_index_vs_cz numeric(6, 2) not null default 0,
  threat_level public.threat_level not null default 'low',
  analyzed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Statistiky trhu (počítá / zapisuje agent; frontend z nich skládá trendy a KPI)
-- ---------------------------------------------------------------------------
create table public.commodity_price_stats (
  -- první den měsíce
  month date not null check (extract(day from month) = 1),
  -- null = celá ČR
  region public.region_code references public.regions (code),
  commodity public.commodity_key not null,
  avg_price_czk numeric(10, 2) not null check (avg_price_czk > 0),
  sample_size integer check (sample_size >= 0),
  computed_at timestamptz not null default now(),
  constraint commodity_price_stats_key unique nulls not distinct (month, region, commodity)
);

create table public.region_stats (
  region public.region_code not null references public.regions (code),
  month date not null check (extract(day from month) = 1),
  seller_count integer not null check (seller_count >= 0),
  -- 100 = průměr ČR
  price_index numeric(6, 2) not null,
  change_pct numeric(6, 2) not null default 0,
  computed_at timestamptz not null default now(),
  primary key (region, month)
);

-- ---------------------------------------------------------------------------
-- Poptávky / objednávky u prodejců
-- ---------------------------------------------------------------------------
create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit public.price_unit not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price_czk numeric(10, 2) not null check (unit_price_czk >= 0),
  delivery_fee_czk numeric(10, 2),
  hydraulic_arm boolean not null default false,
  total_czk numeric(12, 2),
  distance_km numeric(7, 1),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 9 and 40),
  contact_email text,
  delivery_label text,
  delivery_lat double precision,
  delivery_lng double precision,
  note text check (char_length(note) <= 2000),
  status text not null default 'new' check (status in ('new', 'sent', 'accepted', 'declined', 'cancelled', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_requests_user_idx on public.order_requests (user_id, created_at desc);
create index order_requests_seller_idx on public.order_requests (seller_id, created_at desc);

create trigger order_requests_touch_updated_at
  before update on public.order_requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Účty prodejců: žádost o převzetí (claim) profilu, který posbíral agent
-- ---------------------------------------------------------------------------
create table public.seller_claims (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  contact_name text not null,
  contact_phone text,
  message text check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (seller_id, user_id)
);

-- Admin schválí žádost: prodejce dostane vlastníka a odznak „ověřeno“
create or replace function public.approve_seller_claim(claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.seller_claims;
begin
  if not public.is_admin() then
    raise exception 'Pouze admin může schvalovat žádosti prodejců' using errcode = '42501';
  end if;
  select * into c from public.seller_claims where id = claim_id for update;
  if not found then
    raise exception 'Žádost % neexistuje', claim_id;
  end if;
  update public.seller_claims set status = 'approved', reviewed_at = now() where id = claim_id;
  update public.sellers set owner_id = c.user_id, verified = true, source = 'seller' where id = c.seller_id;
end;
$$;

-- Prodejce odpoví na recenzi svého obchodu
create or replace function public.reply_to_review(review_id uuid, reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reviews r
     set seller_reply = nullif(trim(reply), ''), seller_replied_at = now()
   where r.id = review_id
     and exists (select 1 from public.sellers s where s.id = r.seller_id and s.owner_id = (select auth.uid()));
  if not found then
    raise exception 'Na tuto recenzi nemůžete odpovědět' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Podklady pro agenty: zdroje ke scrapování a log běhů (jen service role / admin)
-- ---------------------------------------------------------------------------
create table public.scrape_sources (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers (id) on delete cascade,
  url text not null unique,
  kind text not null default 'website' check (kind in ('website', 'eshop', 'facebook', 'google', 'firmy', 'bazos', 'other')),
  active boolean not null default true,
  -- jak často se má zdroj procházet (v hodinách)
  interval_hours integer not null default 24 check (interval_hours > 0),
  last_run_at timestamptz,
  last_status text,
  created_at timestamptz not null default now()
);

create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.scrape_sources (id) on delete set null,
  seller_id uuid references public.sellers (id) on delete set null,
  agent text not null default 'scraper',
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_found integer,
  prices_inserted integer,
  error text,
  raw jsonb
);

create index scrape_runs_started_idx on public.scrape_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- API pro frontend: prodejci v přesném tvaru `Seller` (src/types/index.ts)
-- security invoker → platí RLS volajícího (např. `intel` jen pro Pro)
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
      from (select distinct p.category from public.products p where p.seller_id = s.id and p.active) c
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
      where p.seller_id = s.id and p.active
    ) pr on true
    where s.status = 'active'
      and (p_slug is null or s.slug = p_slug)
      and (p_region is null or s.region = p_region)
      and (p_category is null or exists (
        select 1 from public.products p2 where p2.seller_id = s.id and p2.active and p2.category = p_category
      ))
  ) x;
$$;

-- Statistiky krajů v tvaru `RegionStats[]` (poslední měsíc s daty)
create or replace function public.api_region_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (select max(month) as month from public.region_stats)
  select coalesce(jsonb_agg(jsonb_build_object(
    'region', rs.region,
    'name', rg.name,
    'avgPrices', coalesce((
      select jsonb_object_agg(c.commodity, c.avg_price_czk)
      from public.commodity_price_stats c
      where c.region = rs.region and c.month = rs.month
    ), '{}'::jsonb),
    'sellerCount', rs.seller_count,
    'priceIndex', rs.price_index,
    'changePct', rs.change_pct
  ) order by rg.name), '[]'::jsonb)
  from public.region_stats rs
  join latest l on rs.month = l.month
  join public.regions rg on rg.code = rs.region;
$$;

-- Měsíční průměry ČR v tvaru `PriceTrendPoint[]` (nejstarší první)
create or replace function public.api_price_trends(p_months integer default 12)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(t.point order by t.month), '[]'::jsonb)
  from (
    select c.month, jsonb_build_object('month', to_char(c.month, 'YYYY-MM')) || jsonb_object_agg(c.commodity, c.avg_price_czk) as point
    from public.commodity_price_stats c
    where c.region is null
      and c.month > (select max(month) from public.commodity_price_stats where region is null) - make_interval(months => greatest(p_months, 1))
    group by c.month
  ) t;
$$;

-- Prodejci v okruhu (pro budoucí serverové filtrování; mapa zatím filtruje v prohlížeči)
create or replace function public.sellers_within(p_lat double precision, p_lng double precision, p_km double precision)
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id from public.sellers s
  where s.status = 'active'
    and extensions.st_dwithin(s.geog, extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, p_km * 1000);
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.regions enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.price_observations enable row level security;
alter table public.reviews enable row level security;
alter table public.analysis_reports enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.seller_intel enable row level security;
alter table public.commodity_price_stats enable row level security;
alter table public.region_stats enable row level security;
alter table public.order_requests enable row level security;
alter table public.seller_claims enable row level security;
alter table public.scrape_sources enable row level security;
alter table public.scrape_runs enable row level security;

-- čtení trhu: každý přihlášený
create policy "Přihlášení čtou kraje" on public.regions for select to authenticated using (true);
create policy "Přihlášení čtou aktivní prodejce" on public.sellers for select to authenticated
  using (status = 'active' or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Přihlášení čtou produkty" on public.products for select to authenticated using (true);
create policy "Přihlášení čtou historii cen" on public.price_observations for select to authenticated using (true);
create policy "Přihlášení čtou statistiky komodit" on public.commodity_price_stats for select to authenticated using (true);
create policy "Přihlášení čtou statistiky krajů" on public.region_stats for select to authenticated using (true);

-- prodejce (tarif seller, schválený vlastník) spravuje svůj profil a produkty
create policy "Vlastník upravuje svého prodejce" on public.sellers for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.current_plan()) = 'seller')
  with check (owner_id = (select auth.uid()));
create policy "Vlastník přidává produkty" on public.products for insert to authenticated
  with check (exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
              and (select public.current_plan()) = 'seller');
create policy "Vlastník upravuje produkty" on public.products for update to authenticated
  using (exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
         and (select public.current_plan()) = 'seller');
create policy "Vlastník maže produkty" on public.products for delete to authenticated
  using (exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
         and (select public.current_plan()) = 'seller');
create policy "Vlastník zapisuje ceny" on public.price_observations for insert to authenticated
  with check (source = 'seller' and exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = product_id and s.owner_id = (select auth.uid())
  ) and (select public.current_plan()) = 'seller');

-- recenze
create policy "Přihlášení čtou zveřejněné recenze" on public.reviews for select to authenticated
  using (status = 'published' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Uživatel píše recenzi" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Uživatel upravuje svou recenzi" on public.reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Uživatel maže svou recenzi" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- CI: jen Pro
create policy "Pro čte reporty" on public.analysis_reports for select to authenticated using ((select public.is_pro()));
create policy "Pro čte CI shrnutí prodejců" on public.seller_intel for select to authenticated using ((select public.is_pro()));
create policy "Pro vidí své běhy analýz" on public.analysis_runs for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_pro()));
create policy "Pro spouští analýzu" on public.analysis_runs for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_pro()));

-- poptávky
create policy "Uživatel odesílá poptávku" on public.order_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Uživatel a prodejce vidí poptávku" on public.order_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "Uživatel a prodejce mění stav poptávky" on public.order_requests for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id = (select auth.uid()))
  );

-- žádosti prodejců
create policy "Uživatel žádá o převzetí profilu" on public.seller_claims for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Uživatel vidí své žádosti" on public.seller_claims for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- agenti: jen admin čte (zápis service role)
create policy "Admin čte zdroje" on public.scrape_sources for select to authenticated using ((select public.is_admin()));
create policy "Admin čte běhy" on public.scrape_runs for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Oprávnění
-- ---------------------------------------------------------------------------
revoke all on
  public.regions, public.sellers, public.products, public.price_observations, public.reviews,
  public.analysis_reports, public.analysis_runs, public.seller_intel, public.commodity_price_stats,
  public.region_stats, public.order_requests, public.seller_claims, public.scrape_sources, public.scrape_runs
from anon, authenticated;

grant select on
  public.regions, public.sellers, public.products, public.price_observations, public.reviews,
  public.analysis_reports, public.analysis_runs, public.seller_intel, public.commodity_price_stats,
  public.region_stats, public.order_requests, public.seller_claims, public.scrape_sources, public.scrape_runs
to authenticated;

-- prodejce smí měnit jen „veřejné“ údaje, ne slug, vlastníka, ověření ani hodnocení
grant update (
  name, legal_name, ico, dic, website, phone, email, description, photo_url,
  street, city, zip, district, region, lat, lng, size, founded_year, tags, opening_hours,
  own_delivery, hydraulic_arm, pickup_available, delivery_base_fee, delivery_price_per_km,
  delivery_free_radius_km, delivery_free_over_quantity, hydraulic_arm_fee, delivery_max_radius_km, delivery_notes
) on public.sellers to authenticated;

grant insert, delete on public.products to authenticated;
grant update (
  name, category, wood_species, wood_group, wood_form, moisture, moisture_percent, log_length_cm,
  certification, briquette_type, coal_type, diameter_mm, declared_mj_per_kg, unit, package_kg,
  package_prm, min_order, stock, active, sort_order
) on public.products to authenticated;
grant insert on public.price_observations to authenticated;

grant insert (seller_id, rating, title, body), delete on public.reviews to authenticated;
grant update (rating, title, body) on public.reviews to authenticated;

grant insert (competitor_url) on public.analysis_runs to authenticated;

grant insert (
  seller_id, product_id, product_name, unit, quantity, unit_price_czk, delivery_fee_czk, hydraulic_arm,
  total_czk, distance_km, contact_name, contact_phone, contact_email, delivery_label, delivery_lat,
  delivery_lng, note
) on public.order_requests to authenticated;
grant update (status) on public.order_requests to authenticated;

grant insert (seller_id, contact_name, contact_phone, message) on public.seller_claims to authenticated;

revoke execute on function public.apply_price_observation() from public, anon, authenticated;
revoke execute on function public.set_review_author() from public, anon, authenticated;
revoke execute on function public.approve_seller_claim(uuid) from public, anon;
revoke execute on function public.reply_to_review(uuid, text) from public, anon;
revoke execute on function public.api_sellers(text, public.region_code, public.fuel_category) from public, anon;
revoke execute on function public.api_region_stats() from public, anon;
revoke execute on function public.api_price_trends(integer) from public, anon;
revoke execute on function public.sellers_within(double precision, double precision, double precision) from public, anon;
