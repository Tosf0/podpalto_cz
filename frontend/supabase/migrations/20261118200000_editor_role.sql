-- =============================================================================
-- podpalto.cz – role editor: spravuje blog, ale články nemaže
-- =============================================================================
-- Editor (`profiles.role = 'editor'`) má v /admin/kontrola jen záložku Blog: vidí všechny
-- články, píše nové, upravuje je, publikuje, schvaluje / zamítá a skrývá (stáhne do konceptů).
-- Mazat články smí jen admin (kromě vlastních nepublikovaných konceptů – pravidlo pro autory).
-- Kontrolu dat od agentů a nastavení aplikace má jen admin (RPC / RLS to hlídají zvlášť).

drop policy "Redaktoři mažou články" on public.blog_posts;

create policy "Admin maže články"
  on public.blog_posts for delete
  to authenticated
  using ((select public.is_admin()));
