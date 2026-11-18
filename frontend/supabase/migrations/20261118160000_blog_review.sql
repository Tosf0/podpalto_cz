-- =============================================================================
-- podpalto.cz – Blog: články od přihlášených uživatelů se schvalováním
-- =============================================================================
-- Napsat článek smí kdokoli přihlášený. Běžný uživatel ho uloží jako koncept (draft) nebo
-- odešle ke schválení (pending); publikovat (published) nebo zamítnout (rejected) smí jen
-- redaktor/admin (`is_editor()`), v administraci /admin/kontrola → Blog.
--
-- Fotky: bucket `blog-images`. Běžný uživatel nahrává jen do své složky `<uid>/…`.
-- Při smazání nebo zamítnutí článku maže administrace jeho fotky z bucketu (Storage API);
-- RPC `blog_orphan_images()` najde fotky, na které už žádný článek neodkazuje.

alter table public.blog_posts drop constraint blog_posts_status_check;
alter table public.blog_posts
  add constraint blog_posts_status_check check (status in ('draft', 'pending', 'published', 'rejected'));

alter table public.blog_posts
  add column submitted_at timestamptz,
  add column review_note text,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null;

-- datum publikace vyžaduje jen publikovaný článek (dřív i vše kromě konceptu)
alter table public.blog_posts drop constraint published_has_date;
alter table public.blog_posts add constraint published_has_date check (status <> 'published' or published_at is not null);

create index blog_posts_pending_idx on public.blog_posts (submitted_at) where status = 'pending';
create index blog_posts_author_idx on public.blog_posts (author_id);

-- ---------------------------------------------------------------------------
-- Pravidla pro ne-redaktory (trigger – robustnější než skládání RLS podmínek)
-- ---------------------------------------------------------------------------
create or replace function public.blog_posts_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status = 'pending' and old.status is distinct from 'pending' then
    new.submitted_at := now();
  elsif tg_op = 'INSERT' and new.status = 'pending' then
    new.submitted_at := now();
  end if;

  -- service role / SQL konzole (bez přihlášeného uživatele) a redaktoři smí vše
  if auth.uid() is null or public.is_editor() then
    if new.status in ('published', 'rejected')
       and (tg_op = 'INSERT' or old.status is distinct from new.status) and auth.uid() is not null then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
    end if;
    return new;
  end if;

  if new.status not in ('draft', 'pending') then
    raise exception 'Článek může publikovat jen administrátor – odešlete ho ke schválení.'
      using errcode = '42501';
  end if;

  new.author_id := auth.uid();
  new.published_at := null;
  if tg_op = 'INSERT' then
    new.review_note := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  else
    new.review_note := old.review_note;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;
  return new;
end;
$$;

revoke execute on function public.blog_posts_guard() from public, anon, authenticated;

create trigger blog_posts_guard
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_guard();

-- ---------------------------------------------------------------------------
-- RLS: autor vidí, upravuje a maže své nepublikované články
-- ---------------------------------------------------------------------------
create policy "Autoři čtou své články"
  on public.blog_posts for select
  to authenticated
  using (author_id = (select auth.uid()));

create policy "Přihlášení píší články"
  on public.blog_posts for insert
  to authenticated
  with check (author_id = (select auth.uid()) and status in ('draft', 'pending'));

create policy "Autoři upravují nepublikované články"
  on public.blog_posts for update
  to authenticated
  using (author_id = (select auth.uid()) and status in ('draft', 'pending', 'rejected'))
  with check (author_id = (select auth.uid()) and status in ('draft', 'pending'));

create policy "Autoři mažou nepublikované články"
  on public.blog_posts for delete
  to authenticated
  using (author_id = (select auth.uid()) and status <> 'published');

-- ---------------------------------------------------------------------------
-- Storage: přihlášený nahrává a maže fotky jen ve své složce `<uid>/…`
-- ---------------------------------------------------------------------------
create policy "Autoři nahrávají obrázky blogu do své složky"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Autoři mažou obrázky blogu ve své složce"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Fotky, na které žádný článek neodkazuje (úklid z administrace)
-- ---------------------------------------------------------------------------
create or replace function public.blog_orphan_images(min_age interval default interval '1 day')
returns table (name text, created_at timestamptz, size bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_editor() then
    raise exception 'Jen pro redaktory.' using errcode = '42501';
  end if;
  return query
    select o.name, o.created_at, coalesce((o.metadata ->> 'size')::bigint, 0)
    from storage.objects o
    where o.bucket_id = 'blog-images'
      and o.created_at < now() - min_age
      and not exists (
        select 1 from public.blog_posts p
        where position(o.name in coalesce(p.content, '')) > 0
           or position(o.name in coalesce(p.cover_url, '')) > 0
      )
    order by o.created_at;
end;
$$;

revoke execute on function public.blog_orphan_images(interval) from public, anon;
grant execute on function public.blog_orphan_images(interval) to authenticated;
