-- =============================================================================
-- podpalto.cz – 4/4 Storage: fotky prodejců a avatary uživatelů
-- =============================================================================
-- Cesty:  seller-photos/<seller_id>/<soubor>   avatars/<user_id>/<soubor>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('seller-photos', 'seller-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- fotky prodejce nahrává jeho vlastník (tarif seller) nebo admin
create policy "Vlastník nahrává fotky prodejce"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'seller-photos' and (
      (select public.is_admin())
      or exists (
        select 1 from public.sellers s
        where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
      )
    )
  );

create policy "Vlastník mění fotky prodejce"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'seller-photos' and (
      (select public.is_admin())
      or exists (
        select 1 from public.sellers s
        where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
      )
    )
  );

create policy "Vlastník maže fotky prodejce"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'seller-photos' and (
      (select public.is_admin())
      or exists (
        select 1 from public.sellers s
        where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
      )
    )
  );

-- avatar si každý spravuje ve své složce
create policy "Uživatel nahrává svůj avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Uživatel mění svůj avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Uživatel maže svůj avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
