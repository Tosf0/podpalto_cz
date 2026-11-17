-- Blog podpalto.cz – schéma pro Supabase (PŘIPRAVENO, ZATÍM NESPUŠTĚNO).
-- Spuštění: Supabase Dashboard → SQL Editor, nebo `supabase db push` (Supabase CLI).
-- Frontend mapuje řádky v src/lib/blog/supabase.ts (BlogRow ↔ BlogPost).

-- ---------------------------------------------------------------------------
-- Redaktoři: kdo smí psát a publikovat (uživatelé ze Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.blog_editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.blog_editors enable row level security;

create or replace function public.is_blog_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.blog_editors where user_id = (select auth.uid()));
$$;

create policy "Redaktoři vidí seznam redaktorů"
  on public.blog_editors for select
  to authenticated
  using ((select public.is_blog_editor()));

-- ---------------------------------------------------------------------------
-- Články
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 200),
  excerpt text not null default '',
  content text not null default '',            -- Markdown (GFM)
  cover_url text,
  cover_alt text,
  cover_credit text,
  category text not null default 'rady' check (category in ('rady', 'trh', 'pruvodce')),
  tags text[] not null default '{}',
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_role text,
  author_avatar_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  reading_minutes integer not null default 1,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_date check (status = 'draft' or published_at is not null)
);

create index if not exists blog_posts_published_idx
  on public.blog_posts (published_at desc)
  where status = 'published';

create index if not exists blog_posts_tags_idx on public.blog_posts using gin (tags);

-- updated_at se nastaví automaticky při každé změně
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

create trigger blog_posts_touch_updated_at
  before update on public.blog_posts
  for each row execute function public.touch_updated_at();

alter table public.blog_posts enable row level security;

-- Kdokoli (i nepřihlášený) čte jen publikované články
create policy "Veřejnost čte publikované články"
  on public.blog_posts for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

-- Redaktoři vidí vše včetně konceptů a mohou psát, upravovat a mazat
create policy "Redaktoři čtou všechny články"
  on public.blog_posts for select
  to authenticated
  using ((select public.is_blog_editor()));

create policy "Redaktoři vytváří články"
  on public.blog_posts for insert
  to authenticated
  with check ((select public.is_blog_editor()));

create policy "Redaktoři upravují články"
  on public.blog_posts for update
  to authenticated
  using ((select public.is_blog_editor()))
  with check ((select public.is_blog_editor()));

create policy "Redaktoři mažou články"
  on public.blog_posts for delete
  to authenticated
  using ((select public.is_blog_editor()));

-- ---------------------------------------------------------------------------
-- Obrázky: bucket `blog-images` (veřejné čtení, zápis jen redaktoři)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "Redaktoři nahrávají obrázky blogu"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-images' and (select public.is_blog_editor()));

create policy "Redaktoři mění obrázky blogu"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-images' and (select public.is_blog_editor()));

create policy "Redaktoři mažou obrázky blogu"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-images' and (select public.is_blog_editor()));
