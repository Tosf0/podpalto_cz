-- =============================================================================
-- podpalto.cz – 1/4 Jádro: účty, tarify, předplatné, uživatelské preference
-- =============================================================================
-- Každý přihlášený uživatel má řádek v `profiles` (tarif, role) a v `user_preferences`
-- (vše, co si nastaví v aplikaci). Oba řádky zakládá trigger při registraci.
--
-- Tarify:  free   – mapa, kalkulačka, prodejci, trendy, blog
--          pro    – navíc CI Studio (analýzy konkurence, SWOT prodejců)
--          seller – účet prodejce (správa vlastního profilu, cen a poptávek)
-- Role:    user | editor (píše blog) | admin (vše)
-- Tarif a roli mění jen admin / backend (service role) – uživatel je sám změnit nemůže.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Číselníky
-- ---------------------------------------------------------------------------
create type public.plan_tier as enum ('free', 'pro', 'seller');
create type public.user_role as enum ('user', 'editor', 'admin');
create type public.ui_lang as enum ('cs', 'de', 'en');
create type public.ui_currency as enum ('CZK', 'EUR');
create type public.price_mode as enum ('unit', 'kwh');
create type public.ui_theme as enum ('light', 'dark', 'system');
create type public.region_code as enum (
  'PHA', 'STC', 'JHC', 'PLK', 'KVK', 'ULK', 'LBK', 'HKK', 'PAK', 'VYS', 'JHM', 'OLK', 'ZLK', 'MSK'
);

-- updated_at se nastaví automaticky při každé změně řádku
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tarify (ceník pro stránku /plany; platby zatím nenapojené)
-- ---------------------------------------------------------------------------
create table public.plans (
  id public.plan_tier primary key,
  price_usd_month numeric(8, 2) not null default 0 check (price_usd_month >= 0),
  stripe_price_id text,
  active boolean not null default true,
  sort_order smallint not null default 0
);

insert into public.plans (id, price_usd_month, sort_order) values
  ('free', 0, 0),
  ('pro', 20, 1),
  ('seller', 20, 2);

-- ---------------------------------------------------------------------------
-- Profily
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text,
  phone text check (char_length(phone) <= 40),
  plan public.plan_tier not null default 'free',
  -- null = bez omezení (ruční přidělení); jinak po tomto datu platí `free`
  plan_expires_at timestamptz,
  role public.user_role not null default 'user',
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Pomocné funkce pro RLS (security definer → nečtou přes RLS, nezacyklí se)
-- ---------------------------------------------------------------------------
create or replace function public.current_plan()
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when p.plan_expires_at is null or p.plan_expires_at > now() then p.plan else 'free'::public.plan_tier end
       from public.profiles p where p.id = (select auth.uid())),
    'free'::public.plan_tier
  );
$$;

create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role from public.profiles p where p.id = (select auth.uid())), 'user'::public.user_role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_role_name() = 'admin';
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_role_name() in ('editor', 'admin');
$$;

-- Pro funkce (CI Studio): tarif `pro`, nebo admin
create or replace function public.is_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_plan() = 'pro' or public.is_admin();
$$;

-- ---------------------------------------------------------------------------
-- Uživatelské preference (vše z Nastavení + stav mapy)
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lang public.ui_lang not null default 'cs',
  currency public.ui_currency not null default 'CZK',
  price_mode public.price_mode not null default 'unit',
  theme public.ui_theme not null default 'light',
  -- výchozí poloha (adresa / PSČ / „moje poloha“)
  location_label text check (char_length(location_label) <= 200),
  location_lat double precision check (location_lat between -90 and 90),
  location_lng double precision check (location_lng between -180 and 180),
  location_zip text check (char_length(location_zip) <= 10),
  location_region public.region_code,
  -- prodejci vybraní k porovnání (max. 4)
  compare_seller_ids text[] not null default '{}' check (cardinality(compare_seller_ids) <= 4),
  -- mapa
  map_show_regions boolean not null default false,
  map_strip_open boolean not null default true,
  map_filters jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint location_complete check ((location_lat is null) = (location_lng is null))
);

create trigger user_preferences_touch_updated_at
  before update on public.user_preferences
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Předplatné (připraveno pro Stripe – zapisuje jen backend / webhook)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan public.plan_tier not null check (plan <> 'free'),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  provider text not null default 'manual' check (provider in ('manual', 'stripe')),
  provider_customer_id text,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Registrace: založí profil + preference (jméno a jazyk z metadat registrace)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_lang text := new.raw_user_meta_data ->> 'lang';
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 120), ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.user_preferences (user_id, lang)
  values (new.id, case when meta_lang in ('cs', 'de', 'en') then meta_lang::public.ui_lang else 'cs' end);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- e-mail v profilu drží krok se Supabase Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.subscriptions enable row level security;

create policy "Ceník vidí všichni"
  on public.plans for select
  to anon, authenticated
  using (active);

create policy "Uživatel vidí svůj profil, admin všechny"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Uživatel upravuje svůj profil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Uživatel vidí své preference"
  on public.user_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Uživatel zakládá své preference"
  on public.user_preferences for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Uživatel mění své preference"
  on public.user_preferences for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Uživatel vidí své předplatné"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Oprávnění (explicitně; tarif a roli smí měnit jen service role)
-- ---------------------------------------------------------------------------
revoke all on public.plans, public.profiles, public.user_preferences, public.subscriptions from anon, authenticated;

grant select on public.plans to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, phone, marketing_consent) on public.profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select on public.subscriptions to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
