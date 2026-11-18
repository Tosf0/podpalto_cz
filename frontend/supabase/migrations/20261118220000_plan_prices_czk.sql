-- Ceny tarifů v Kč (výchozí měna aplikace) a v eurech; cena v USD byla chybné zadání.
alter table public.plans
  add column price_czk_month numeric(10, 2) not null default 0,
  add column price_eur_month numeric(10, 2) not null default 0;

update public.plans set price_czk_month = 0, price_eur_month = 0 where id = 'free';
update public.plans set price_czk_month = 490, price_eur_month = 20 where id in ('pro', 'seller');

alter table public.plans drop column price_usd_month;
