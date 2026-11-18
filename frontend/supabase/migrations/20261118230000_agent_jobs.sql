-- Joby agentů (služba app, CrewAI): plán spouštění, ruční spuštění z administrace a historie běhů.
--
-- Kontrakt pro worker služby app (připojený secret klíčem / service role):
--   1. každou ~minutu  select * from public.claim_agent_job('<id workeru>');
--      – sama založí naplánované běhy, jejichž čas nastal (agent_jobs.next_run_at <= now()),
--      – vrátí nejstarší čekající běh (ruční i plánovaný) a přepne ho na running, nebo nic;
--   2. během běhu  update agent_job_runs set progress, logs, summary where id = …;
--      sběr navíc zapisuje scrape_runs (job_run_id = id běhu) a price_observations;
--   3. na konci    select public.finish_agent_job_run(id, 'completed' | 'failed', summary, error);
--      u jobu collect se po úspěchu přepočítají měsíční statistiky (refresh_market_stats).
-- Admin v /admin/kontrola (záložka „Agenti“) mění plán a spouští job ručně (request_agent_job).

-- ------------------------------------------------------------------ plán jobů
create table public.agent_jobs (
  job text primary key check (job in ('collect', 'market_report')),
  title text not null,
  description text,
  enabled boolean not null default true,
  frequency text not null default 'monthly' check (frequency in ('daily', 'weekly', 'monthly', 'quarterly')),
  day_of_month smallint not null default 1 check (day_of_month between 1 and 28),
  weekday smallint not null default 1 check (weekday between 1 and 7), -- ISO, 1 = pondělí
  hour smallint not null default 3 check (hour between 0 and 23),       -- místní čas Europe/Prague
  params jsonb not null default '{}'::jsonb,
  next_run_at timestamptz,
  last_run_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.agent_jobs is
  'Plán jobů agentů (služba app). Plánované běhy zakládá claim_agent_job(), když nastane next_run_at.';

-- Příští spuštění po čase p_after podle plánu (vše v čase Europe/Prague).
create or replace function public.agent_job_next_run(
  p_frequency text, p_day smallint, p_weekday smallint, p_hour smallint, p_after timestamptz default now()
) returns timestamptz
language plpgsql stable
set search_path = ''
as $$
declare
  t timestamp := p_after at time zone 'Europe/Prague';
  c timestamp;
begin
  if p_frequency = 'daily' then
    c := date_trunc('day', t) + make_interval(hours => p_hour);
    if c <= t then c := c + interval '1 day'; end if;
  elsif p_frequency = 'weekly' then
    c := date_trunc('day', t) + make_interval(days => (p_weekday - extract(isodow from t)::int + 7) % 7, hours => p_hour);
    if c <= t then c := c + interval '7 days'; end if;
  elsif p_frequency = 'quarterly' then
    c := date_trunc('quarter', t) + make_interval(days => p_day - 1, hours => p_hour);
    if c <= t then c := date_trunc('quarter', t) + interval '3 months' + make_interval(days => p_day - 1, hours => p_hour); end if;
  else -- monthly
    c := date_trunc('month', t) + make_interval(days => p_day - 1, hours => p_hour);
    if c <= t then c := date_trunc('month', t) + interval '1 month' + make_interval(days => p_day - 1, hours => p_hour); end if;
  end if;
  return c at time zone 'Europe/Prague';
end;
$$;

-- Při změně plánu přepočítat příští spuštění (vypnutý job nemá žádné).
create or replace function public.agent_jobs_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or (new.enabled, new.frequency, new.day_of_month, new.weekday, new.hour)
        is distinct from (old.enabled, old.frequency, old.day_of_month, old.weekday, old.hour) then
    new.next_run_at := case
      when new.enabled then public.agent_job_next_run(new.frequency, new.day_of_month, new.weekday, new.hour)
    end;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;

create trigger agent_jobs_schedule
  before insert or update on public.agent_jobs
  for each row execute function public.agent_jobs_schedule();

insert into public.agent_jobs (job, title, description, frequency, day_of_month, hour, params) values
  ('collect', 'Sběr cen',
   'CollectionFlow: e-shopy, feedy a ceníky prodejců → ceny do price_observations, potom přepočet měsíčních statistik (Trh, Trendy).',
   'monthly', 1, 3, '{}'::jsonb),
  ('market_report', 'Přehled trhu',
   'MarketResearchFlow: report o trhu tuhých paliv (ceny, trendy, regulace, recenze) do archivu CI Studia.',
   'monthly', 2, 6, '{"fuel_category": null, "region": null}'::jsonb);

alter table public.agent_jobs enable row level security;

create policy "Admin čte plán jobů" on public.agent_jobs
  for select to authenticated using ((select public.is_admin()));
create policy "Admin mění plán jobů" on public.agent_jobs
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.agent_jobs from anon, authenticated;
grant select on public.agent_jobs to authenticated;
grant update (enabled, frequency, day_of_month, weekday, hour) on public.agent_jobs to authenticated;

-- ------------------------------------------------------------------ běhy jobů
create table public.agent_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null references public.agent_jobs (job) on delete cascade,
  trigger text not null check (trigger in ('schedule', 'manual')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  params jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  claimed_by text,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  progress smallint not null default 0 check (progress between 0 and 100),
  -- výsledek pro administraci, např. {"sources": 22, "sources_failed": 1, "observations": 371,
  -- "products_new": 12, "report_id": "…", "market_stats_refreshed": true}
  summary jsonb not null default '{}'::jsonb,
  logs jsonb not null default '[]'::jsonb, -- CrewLogEntry[] jako u analysis_runs
  error text
);

comment on table public.agent_job_runs is
  'Běhy jobů agentů. Zakládá je request_agent_job (admin) a claim_agent_job (plán), zpracovává worker služby app.';

create index agent_job_runs_queue on public.agent_job_runs (status, requested_at);
create index agent_job_runs_history on public.agent_job_runs (job, requested_at desc);
-- od každého jobu nejvýš jeden čekající nebo běžící běh
create unique index agent_job_runs_one_active on public.agent_job_runs (job) where status in ('queued', 'running');

create trigger agent_job_runs_touch
  before update on public.agent_job_runs
  for each row execute function public.touch_updated_at();

alter table public.agent_job_runs enable row level security;

create policy "Admin čte běhy jobů" on public.agent_job_runs
  for select to authenticated using ((select public.is_admin()));

revoke all on public.agent_job_runs from anon, authenticated;
grant select on public.agent_job_runs to authenticated;

alter publication supabase_realtime add table public.agent_job_runs;

-- Sběr: každý zdroj v rámci jobu zapisuje scrape_runs s odkazem na běh jobu.
alter table public.scrape_runs
  add column job_run_id uuid references public.agent_job_runs (id) on delete set null;
create index scrape_runs_job_run on public.scrape_runs (job_run_id);

-- ------------------------------------------------------------------ RPC: administrace
-- Ruční spuštění (admin). Když job už čeká nebo běží, vrátí chybu.
create or replace function public.request_agent_job(p_job text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Jen administrátor může spouštět joby agentů.' using errcode = '42501';
  end if;
  if exists (select 1 from public.agent_job_runs r where r.job = p_job and r.status in ('queued', 'running')) then
    raise exception 'Tento job už čeká ve frontě nebo běží.' using errcode = 'P0001';
  end if;
  insert into public.agent_job_runs (job, trigger, params, requested_by)
  select j.job, 'manual', j.params, auth.uid() from public.agent_jobs j where j.job = p_job
  returning id into v_id;
  if v_id is null then
    raise exception 'Neznámý job: %', p_job using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

-- Zrušení běhu, který ještě nezačal (admin).
create or replace function public.cancel_agent_job_run(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Jen administrátor může rušit joby agentů.' using errcode = '42501';
  end if;
  update public.agent_job_runs
     set status = 'cancelled', finished_at = now(), error = 'Zrušeno v administraci'
   where id = p_id and status = 'queued';
  if not found then
    raise exception 'Zrušit jde jen běh, který čeká ve frontě.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.request_agent_job(text) from public, anon;
revoke all on function public.cancel_agent_job_run(uuid) from public, anon;
grant execute on function public.request_agent_job(text) to authenticated;
grant execute on function public.cancel_agent_job_run(uuid) to authenticated;

-- ------------------------------------------------------------------ RPC: worker služby app
-- Založí naplánované běhy, uklidí zaseknuté a vrátí jeden běh ke zpracování (nebo nic).
create or replace function public.claim_agent_job(p_worker text)
returns setof public.agent_job_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  j record;
begin
  -- běh, který se přes 2 hodiny neozval (žádný update), považujeme za spadlý
  update public.agent_job_runs
     set status = 'failed', finished_at = now(),
         error = coalesce(error, 'Worker se přes 2 hodiny neozval – běh označen jako neúspěšný.')
   where status = 'running' and updated_at < now() - interval '2 hours';

  -- naplánované joby, jejichž čas nastal (zameškané se nespouští vícekrát, jen jednou)
  for j in
    select * from public.agent_jobs
     where enabled and next_run_at is not null and next_run_at <= now()
     for update skip locked
  loop
    if not exists (select 1 from public.agent_job_runs r where r.job = j.job and r.status in ('queued', 'running')) then
      insert into public.agent_job_runs (job, trigger, params) values (j.job, 'schedule', j.params);
    end if;
    update public.agent_jobs
       set next_run_at = public.agent_job_next_run(j.frequency, j.day_of_month, j.weekday, j.hour, now())
     where job = j.job;
  end loop;

  return query
  update public.agent_job_runs r
     set status = 'running', claimed_by = p_worker, started_at = now(), progress = 0
   where r.id = (
     select q.id from public.agent_job_runs q
      where q.status = 'queued'
      order by q.requested_at
      for update skip locked
      limit 1
   )
  returning r.*;
end;
$$;

-- Konec běhu. U úspěšného sběru přepočítá měsíční statistiky (Trh, Trendy, heat mapa).
create or replace function public.finish_agent_job_run(
  p_id uuid, p_status text, p_summary jsonb default '{}'::jsonb, p_error text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job text;
  v_summary jsonb := coalesce(p_summary, '{}'::jsonb);
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'Stav musí být completed nebo failed.' using errcode = '22023';
  end if;
  select job into v_job from public.agent_job_runs where id = p_id and status = 'running';
  if v_job is null then
    raise exception 'Běh % neexistuje nebo neběží.', p_id using errcode = 'P0002';
  end if;
  if p_status = 'completed' and v_job = 'collect' then
    perform public.refresh_market_stats();
    v_summary := v_summary || jsonb_build_object('market_stats_refreshed', true);
  end if;
  update public.agent_job_runs
     set status = p_status, finished_at = now(), error = p_error,
         progress = case when p_status = 'completed' then 100 else progress end,
         summary = summary || v_summary
   where id = p_id;
  update public.agent_jobs set last_run_at = now() where job = v_job;
end;
$$;

revoke all on function public.claim_agent_job(text) from public, anon, authenticated;
revoke all on function public.finish_agent_job_run(uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.claim_agent_job(text) to service_role;
grant execute on function public.finish_agent_job_run(uuid, text, jsonb, text) to service_role;
revoke all on function public.agent_job_next_run(text, smallint, smallint, smallint, timestamptz) from public, anon;
grant execute on function public.agent_job_next_run(text, smallint, smallint, smallint, timestamptz) to authenticated, service_role;

-- ------------------------------------------------------------------ časová osa: statistiky k danému měsíci
-- Dřív se měsíční mediány vždy počítaly z dnešních cen (products.price_czk), takže přepočet
-- minulého měsíce by do něj zapsal dnešní ceny. Nově: aktuální měsíc = aktuální cena,
-- minulý měsíc = poslední pozorování ceny (price_observations) před koncem toho měsíce;
-- produkt bez pozorování v daném období se nezapočítá. Zbytek výpočtu beze změny.
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
  -- více přepočtů v jedné transakci (např. backfill několika měsíců)
  drop table if exists pg_temp._offers, pg_temp._per_seller;
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
  where exists (select 1 from public.commodity_price_stats c where c.month = m and c.region = rg.code);

  return query
    select c.commodity, c.region, c.avg_price_czk, c.sample_size
    from public.commodity_price_stats c
    where c.month = m
    order by c.region nulls first, c.commodity;
end;
$function$;

-- Index pro dotaz „poslední cena produktu před datem“ (časová osa, přepočet minulých měsíců).
create index if not exists price_observations_product_time on public.price_observations (product_id, observed_at desc);
