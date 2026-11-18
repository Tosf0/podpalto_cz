-- =============================================================================
-- podpalto.cz – převzetí profilu prodejcem + akční a množstevní ceny v API
-- =============================================================================
-- Převzetí profilu (základní verze):
--   1. přihlášený uživatel na detailu prodejce pošle žádost (kontakt, role ve firmě, IČO,
--      doklad – odkaz na web/rejstřík nebo popis, jak to ověřit),
--   2. admin ji v /admin/kontrola → Převzetí profilů schválí nebo zamítne s poznámkou,
--   3. po schválení je uživatel vlastníkem profilu (`sellers.owner_id`) a dostane tarif Prodejce,
--      takže může upravovat profil, produkty a nahrát vlastní fotku.
-- TODO (s platbami): schvalovat až po zaplacení tarifu Prodejce, tarif pak nedávat při schválení.

alter table public.seller_claims
  add column contact_email text,
  add column role_in_company text,
  add column ico text,
  add column proof_url text,
  add column review_note text,
  add column reviewed_by uuid references public.profiles (id) on delete set null;

alter table public.seller_claims
  add constraint seller_claims_ico_check check (ico is null or ico ~ '^[0-9]{8}$'),
  add constraint seller_claims_lengths_check check (
    char_length(contact_name) between 2 and 120
    and coalesce(char_length(role_in_company), 0) <= 120
    and coalesce(char_length(proof_url), 0) <= 500
    and coalesce(char_length(review_note), 0) <= 1000
  );

create index seller_claims_pending_idx on public.seller_claims (created_at) where status = 'pending';

-- žádat jde jen o profil, který zatím nikdo nevlastní
drop policy "Uživatel žádá o převzetí profilu" on public.seller_claims;
create policy "Uživatel žádá o převzetí profilu"
  on public.seller_claims for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and exists (select 1 from public.sellers s where s.id = seller_id and s.owner_id is null)
  );

-- zamítnutou žádost může uživatel opravit a poslat znovu (jen zpět do stavu pending)
create policy "Uživatel opravuje zamítnutou žádost"
  on public.seller_claims for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'rejected')
  with check (user_id = (select auth.uid()) and status = 'pending');

grant update (contact_name, contact_phone, contact_email, role_in_company, ico, proof_url, message, status)
  on public.seller_claims to authenticated;
-- tabulka má práva po sloupcích – nové sloupce je potřeba povolit i pro vložení
grant insert (contact_email, role_in_company, ico, proof_url, status) on public.seller_claims to authenticated;

-- schválení: vlastník + tarif Prodejce, ostatní čekající žádosti o stejný profil se zamítnou
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
  if exists (select 1 from public.sellers s where s.id = c.seller_id and s.owner_id is not null and s.owner_id <> c.user_id) then
    raise exception 'Profil už má jiného vlastníka' using errcode = '23505';
  end if;
  update public.seller_claims
     set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), review_note = null
   where id = claim_id;
  update public.seller_claims
     set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(),
         review_note = 'Profil převzal jiný uživatel.'
   where seller_id = c.seller_id and id <> claim_id and status = 'pending';
  update public.sellers set owner_id = c.user_id, verified = true, source = 'seller' where id = c.seller_id;
  -- dokud nejsou platby, schválení zároveň odemkne tarif Prodejce
  update public.profiles set plan = 'seller' where id = c.user_id and plan <> 'seller';
end;
$$;

create or replace function public.reject_seller_claim(claim_id uuid, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Pouze admin může zamítat žádosti prodejců' using errcode = '42501';
  end if;
  update public.seller_claims
     set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), review_note = nullif(trim(note), '')
   where id = claim_id and status = 'pending';
  if not found then
    raise exception 'Žádost % neexistuje nebo už je vyřízená', claim_id;
  end if;
end;
$$;

revoke execute on function public.approve_seller_claim(uuid) from public, anon;
revoke execute on function public.reject_seller_claim(uuid, text) from public, anon;
grant execute on function public.approve_seller_claim(uuid) to authenticated;
grant execute on function public.reject_seller_claim(uuid, text) to authenticated;

-- vlastník smí při nahrání vlastní fotky vynulovat zdroj převzaté fotky
grant update (photo_source_url) on public.sellers to authenticated;

-- api_sellers:
--  a) vlastní fotka vlastníka (bez photo_source_url) se ukazuje vždy, převzatá jen v režimu „seller“
--  b) nové pole `offers`: akční ceny a množstevní slevy (v `products` dál jen základní ceník)
do $$
declare
  def text := pg_get_functiondef('public.api_sellers'::regproc);
begin
  def := replace(def,
    '''photoUrl'', case when public.seller_photos_from_websites() then s.photo_url end',
    '''photoUrl'', case when public.seller_photos_from_websites() or s.photo_source_url is null then s.photo_url end');
  def := replace(def,
    '''products'', coalesce(pr.products, ''[]''::jsonb),',
    '''products'', coalesce(pr.products, ''[]''::jsonb),
        ''offers'', coalesce(off.offers, ''[]''::jsonb),');
  def := replace(def,
    ') pr on true',
    ') pr on true
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          ''id'', p.id,
          ''baseProductId'', p.base_product_id,
          ''name'', p.name,
          ''category'', p.category,
          ''price'', p.price_czk,
          ''unit'', p.unit,
          ''packageKg'', p.package_kg,
          ''isPromo'', p.is_promo,
          ''promoValidUntil'', p.promo_valid_until,
          ''tierMinQuantity'', p.price_tier_min_quantity,
          ''tierUnit'', p.price_tier_unit,
          ''updatedAt'', p.price_updated_at
        )
        order by p.sort_order, p.created_at
      ) as offers
      from public.products p
      where p.seller_id = s.id and p.active and p.review_status = ''ok''
        and (p.is_promo or p.price_tier_min_quantity is not null)
        and (p.promo_valid_until is null or p.promo_valid_until >= current_date)
    ) off on true');
  if position('''offers''' in def) = 0 or position('or s.photo_source_url is null' in def) = 0 then
    raise exception 'api_sellers: nepodařilo se doplnit offers / fotku';
  end if;
  execute def;
end
$$;
