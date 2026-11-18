-- =============================================================================
-- podpalto.cz – fotky prodejců: přepínač „fotky z webů prodejců“ / „obecné fotky podle paliva“
-- =============================================================================
-- Fotky převzaté z webů prodejců jsou JEN PRO VÝVOJ A UKÁZKU (showcase) – nemáme od prodejců
-- svolení. V produkci se přepne na obecné fotky podle paliva (volné licence, viz
-- public/sellers/generic/CREDITS.md), dokud prodejce nedá souhlas nebo nenahraje vlastní fotku.
-- Přepíná admin v /admin/kontrola → Nastavení (tabulka `app_settings`, klíč `seller_photos`).

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.app_settings enable row level security;

create policy "Kdokoli čte nastavení aplikace"
  on public.app_settings for select
  to anon, authenticated
  using (true);

create policy "Admin mění nastavení aplikace"
  on public.app_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant update (value, updated_at, updated_by) on public.app_settings to authenticated;

insert into public.app_settings (key, value, description) values (
  'seller_photos', '"seller"',
  'Fotky prodejců: "seller" = fotky z webů prodejců (jen vývoj a ukázka, bez svolení prodejců), "generic" = jen obecné fotky podle paliva (produkce)'
);

/** true = posílat do aplikace fotky převzaté z webů prodejců. */
create or replace function public.seller_photos_from_websites()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.value #>> '{}' from public.app_settings s where s.key = 'seller_photos'), 'generic') = 'seller';
$$;

grant execute on function public.seller_photos_from_websites() to anon, authenticated;

-- odkud fotka je (kvůli žádosti o svolení a rychlému odstranění na žádost prodejce)
alter table public.sellers add column photo_source_url text;

-- api_sellers: fotku z webu prodejce posílat jen v režimu „seller“
do $$
begin
  execute replace(
    pg_get_functiondef('public.api_sellers'::regproc),
    '''photoUrl'', s.photo_url',
    '''photoUrl'', case when public.seller_photos_from_websites() then s.photo_url end'
  );
end
$$;
