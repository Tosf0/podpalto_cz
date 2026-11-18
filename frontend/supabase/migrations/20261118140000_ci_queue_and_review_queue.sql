-- =============================================================================
-- podpalto.cz – 8 Fronta analýz CI Studia v databázi + fronta ruční kontroly
-- =============================================================================
-- Rozhodnutí „jediný zdroj dat je Supabase“ (docs/TODO.md, 18. 11. 2026): frontend nevolá
-- žádné REST API. Analýzu zadá vložením řádku do `analysis_runs`, služba `app` si řádek
-- vyzvedne (`claim_analysis_run`), průběžně do něj zapisuje stav a na konci uloží report.
-- Frontend sleduje řádek (polling / Supabase Realtime).
--
-- Typy analýz (rozhodnutí o CI Studiu): `market` (palivo + kraj, MarketResearchFlow),
-- `seller` (prodejce z katalogu, SellerProfileFlow), `url` (dnešní formulář s URL webu,
-- do přestavby CI Studia).

-- ---------------------------------------------------------------------------
-- Fronta analýz
-- ---------------------------------------------------------------------------
alter table public.analysis_runs
  add column kind text not null default 'url' check (kind in ('url', 'market', 'seller')),
  -- market: {"fuel_category": "wood", "region": "STC"}; seller: {} (prodejce v subject_seller_id)
  add column params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  add column subject_seller_id uuid references public.sellers (id) on delete set null,
  -- kdo běh zpracovává (id workeru služby app) a odkdy
  add column claimed_by text,
  add column claimed_at timestamptz,
  alter column competitor_url drop not null,
  add constraint analysis_runs_kind_input check (
    (kind = 'url' and competitor_url is not null)
    or (kind = 'market' and params ? 'fuel_category')
    or (kind = 'seller' and subject_seller_id is not null)
  );

create index analysis_runs_queue_idx on public.analysis_runs (started_at) where status = 'queued';

alter table public.analysis_reports
  add column kind text not null default 'url' check (kind in ('url', 'market', 'seller')),
  add column params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object');

-- uživatel (Pro) smí zadat jen vstup analýzy, stav a výsledek zapisuje služba app
revoke insert on public.analysis_runs from authenticated;
grant insert (competitor_url, kind, params, subject_seller_id) on public.analysis_runs to authenticated;

-- Worker služby app (service role) si atomicky vezme nejstarší čekající běh.
-- `for update skip locked` = víc workerů si nikdy nevezme stejný běh.
create or replace function public.claim_analysis_run(worker text)
returns setof public.analysis_runs
language sql
security definer
set search_path = ''
as $$
  update public.analysis_runs r
     set status = 'running', claimed_by = worker, claimed_at = now()
   where r.run_id = (
     select q.run_id from public.analysis_runs q
     where q.status = 'queued'
     order by q.started_at
     for update skip locked
     limit 1
   )
  returning r.*;
$$;

revoke execute on function public.claim_analysis_run(text) from public, anon, authenticated;

-- změny řádků posílat přes Supabase Realtime (frontend sleduje svůj běh)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.analysis_runs;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Fronta ruční kontroly (stránka /admin/kontrola, jen role admin)
-- ---------------------------------------------------------------------------
create or replace function public.api_review_queue()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Pouze admin vidí frontu kontroly' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'sellers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'slug', s.slug, 'name', s.name, 'city', s.city, 'region', s.region,
        'website', s.website, 'reasons', to_jsonb(s.review_reasons), 'flags', to_jsonb(s.flags),
        'lat', s.lat, 'lng', s.lng, 'updatedAt', s.updated_at
      ) order by s.updated_at desc)
      from public.sellers s where s.review_status = 'needs_review'
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'category', p.category, 'unit', p.unit, 'price', p.price_czk,
        'priceUpdatedAt', p.price_updated_at, 'reasons', to_jsonb(p.review_reasons),
        'sourceUrl', p.source_url, 'sellerName', s.name, 'sellerSlug', s.slug,
        'lastObservation', (
          select jsonb_build_object('price', o.price_czk, 'observedAt', o.observed_at, 'flags', to_jsonb(o.flags), 'sourceUrl', o.source_url)
          from public.price_observations o where o.product_id = p.id order by o.observed_at desc limit 1
        )
      ) order by p.price_updated_at desc)
      from public.products p join public.sellers s on s.id = p.seller_id
      where p.review_status = 'needs_review'
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.api_review_queue() from public, anon;
grant execute on function public.api_review_queue() to authenticated;
