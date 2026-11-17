/**
 * Vygeneruje `supabase/seed.sql` z ukázkových dat ve `src/data/` (prodejci, produkty,
 * 12 měsíců historie cen, statistiky trhu, CI reporty, články blogu).
 *
 *   node scripts/generate-seed.mjs
 *
 * Seed je idempotentní (on conflict do nothing / update) – lze ho pustit opakovaně
 * v Supabase SQL Editoru. ID prodejců a produktů jsou deterministická UUID (md5 z mock ID),
 * takže vazby (reporty → prodejci) sedí i při opakovaném spuštění.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createJiti } from "jiti";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": join(root, "src") } });

const { SELLERS } = await jiti.import(join(root, "src/data/sellers/index.ts"));
const { PRICE_TRENDS, REGION_STATS } = await jiti.import(join(root, "src/data/market.ts"));
const { REPORTS } = await jiti.import(join(root, "src/data/reports.ts"));
const { BLOG_POSTS } = await jiti.import(join(root, "src/data/blog.ts"));

/** Deterministické UUID z textového ID. */
function uuidOf(id) {
  const h = createHash("md5").update(`podpalto:${id}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const q = (v) => (v === undefined || v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === undefined || v === null ? "null" : String(v));
const b = (v) => (v ? "true" : "false");
const arr = (v, type) => (v === undefined || v === null ? "null" : `array[${v.map(q).join(", ")}]::${type}[]`);
const arrNN = (v, type) => (v && v.length ? arr(v, type) : `'{}'::${type}[]`);
const json = (v) => (v === undefined || v === null ? "null" : `${q(JSON.stringify(v))}::jsonb`);
const monthDate = (m) => `'${m}-01'`;

const reportIds = new Set(REPORTS.map((r) => r.id));
const out = [];
const section = (title) => out.push(`\n-- ${"-".repeat(75)}\n-- ${title}\n-- ${"-".repeat(75)}`);

out.push(`-- podpalto.cz – ukázková data (vygenerováno scripts/generate-seed.mjs)
-- Spuštění: Supabase SQL Editor (celý soubor). Opakované spuštění nic nezdvojí.`);

section("Prodejci");
out.push(`insert into public.sellers (id, slug, name, legal_name, ico, website, phone, email, description, photo_url,
  street, city, zip, district, region, lat, lng, size, founded_year, tags,
  own_delivery, hydraulic_arm, pickup_available, delivery_base_fee, delivery_price_per_km, delivery_free_radius_km,
  delivery_free_over_quantity, hydraulic_arm_fee, delivery_max_radius_km, delivery_notes,
  external_rating, external_review_count, external_rating_source, status, source, last_scraped_at)
values
${SELLERS.map((s) => {
  const d = s.delivery;
  return `('${uuidOf(s.id)}', ${q(s.slug)}, ${q(s.name)}, ${q(s.legalName)}, ${q(s.ico)}, ${q(s.website)}, ${q(s.phone)}, ${q(s.email)}, ${q(s.description)}, ${q(s.photoUrl)}, ${q(s.address.street)}, ${q(s.address.city)}, ${q(s.address.zip)}, ${q(s.address.district)}, ${q(s.address.region)}, ${n(s.location.lat)}, ${n(s.location.lng)}, ${q(s.size)}, ${n(s.foundedYear)}, ${arrNN(s.tags, "public.seller_tag")}, ${b(d.ownDelivery)}, ${b(d.hydraulicArm)}, ${b(d.pickupAvailable)}, ${n(d.baseFee)}, ${n(d.pricePerKm)}, ${n(d.freeRadiusKm)}, ${n(d.freeOverQuantity)}, ${n(d.hydraulicArmFee)}, ${n(d.maxRadiusKm)}, ${q(d.notes)}, ${n(s.rating)}, ${n(s.reviewCount)}, 'import (demo)', 'active', 'scraper', ${q(s.lastScrapedAt)})`;
}).join(",\n")}
on conflict (id) do nothing;`);

section("Produkty");
const productRows = SELLERS.flatMap((s) =>
  s.products.map(
    (p, i) =>
      `('${uuidOf(p.id)}', '${uuidOf(s.id)}', ${q(p.id)}, ${q(p.name)}, ${q(p.category)}, ${arr(p.woodSpecies, "public.wood_species")}, ${q(p.woodGroup)}, ${q(p.woodForm)}, ${q(p.moisture)}, ${n(p.moisturePercent)}, ${n(p.logLengthCm)}, ${q(p.certification)}, ${q(p.briquetteType)}, ${q(p.coalType)}, ${n(p.diameterMm)}, ${n(p.declaredMjPerKg)}, ${n(p.price)}, ${q(p.unit)}, ${n(p.packageKg)}, ${n(p.packagePrm)}, ${n(p.minOrder)}, ${q(p.stock)}, ${q(p.updatedAt)}, ${i})`,
  ),
);
out.push(`insert into public.products (id, seller_id, external_id, name, category, wood_species, wood_group, wood_form, moisture,
  moisture_percent, log_length_cm, certification, briquette_type, coal_type, diameter_mm, declared_mj_per_kg,
  price_czk, unit, package_kg, package_prm, min_order, stock, price_updated_at, sort_order)
values
${productRows.join(",\n")}
on conflict (id) do nothing;`);

section("Historie cen – 12 měsíců zpět od aktuální ceny (sezónnost topné sezóny + šum ±1,5 %)");
out.push(`insert into public.price_observations (product_id, price_czk, observed_at, source)
select
  p.id,
  case when m.i = 11 then p.price_czk
       else greatest(1, round(
         p.price_czk * (s.f[m.i + 1] / s.f[12])
           * (1 + ((('x' || substr(md5(p.id::text || m.i::text), 1, 6))::bit(24)::int / 16777215.0) - 0.5) * 0.03)
           / (case when p.unit = 'pytel' then 1 else 10 end)
       ) * (case when p.unit = 'pytel' then 1 else 10 end))
  end,
  case when m.i = 11 then p.price_updated_at
       else (date_trunc('month', p.price_updated_at) - make_interval(months => 11 - m.i) + interval '14 days 9 hours')
  end,
  'scraper'
from public.products p
cross join generate_series(0, 11) as m(i)
join (values
  ('wood'::public.fuel_category,       array[1.02, 1.03, 1.01, 0.97, 0.93, 0.92, 0.92, 0.93, 0.95, 0.98, 1.0, 1.0]),
  ('pellets'::public.fuel_category,    array[1.04, 1.05, 1.02, 0.96, 0.91, 0.9, 0.9, 0.92, 0.95, 0.98, 1.0, 1.0]),
  ('briquettes'::public.fuel_category, array[1.03, 1.04, 1.01, 0.97, 0.93, 0.92, 0.92, 0.93, 0.96, 0.98, 1.0, 1.0]),
  ('coal'::public.fuel_category,       array[1.01, 1.02, 1.01, 0.99, 0.97, 0.97, 0.97, 0.98, 0.98, 0.99, 1.0, 1.0])
) as s(category, f) on s.category = p.category
where not exists (select 1 from public.price_observations o where o.product_id = p.id);`);

section("Zdroje pro scraping agenty (weby prodejců)");
out.push(`insert into public.scrape_sources (seller_id, url, kind)
values
${SELLERS.filter((s) => s.website).map((s) => `('${uuidOf(s.id)}', ${q(s.website)}, 'website')`).join(",\n")}
on conflict (url) do nothing;`);

section("CI reporty (CrewAI)");
for (const r of REPORTS) {
  out.push(`insert into public.analysis_reports (id, competitor_url, competitor_name, competitor_domain, report, report_path, status, model, duration_s, seller_id, region, categories, swot, created_at)
values (${q(r.id)}, ${q(r.competitor_url)}, ${q(r.competitor_name)}, ${q(r.competitor_domain)}, ${q(r.report)}, ${q(r.report_path)}, ${q(r.status)}, ${q(r.model)}, ${n(r.duration_s)},
  ${r.seller_id ? `'${uuidOf(r.seller_id)}'` : "null"}, ${q(r.region)}, ${arr(r.categories, "public.fuel_category")}, ${json(r.swot)}, ${q(r.created_at)})
on conflict (id) do nothing;`);
}

section("CI shrnutí prodejců");
for (const s of SELLERS) {
  const i = s.intel;
  if (!i) continue;
  out.push(`insert into public.seller_intel (seller_id, report_id, positioning, tone_of_voice, usp, swot, price_index_vs_cz, threat_level, analyzed_at)
values ('${uuidOf(s.id)}', ${i.reportId && reportIds.has(i.reportId) ? q(i.reportId) : "null"}, ${q(i.positioning)}, ${q(i.toneOfVoice)}, ${arrNN(i.usp, "text")}, ${json(i.swot)}, ${n(i.priceIndexVsCz)}, ${q(i.threatLevel)}, ${q(i.analyzedAt)})
on conflict (seller_id) do nothing;`);
}

const COMMODITIES = ["hardWoodPrms", "softWoodPrms", "pelletsT", "briquettesT", "coalT"];

section("Statistiky trhu – průměry ČR (12 měsíců)");
const national = PRICE_TRENDS.flatMap((p) =>
  COMMODITIES.map((c) => `(${monthDate(p.month)}::date, null::public.region_code, '${c}'::public.commodity_key, ${n(p[c])})`),
);
out.push(`insert into public.commodity_price_stats (month, region, commodity, avg_price_czk)
values ${national.join(",\n  ")}
on conflict on constraint commodity_price_stats_key do update set avg_price_czk = excluded.avg_price_czk, computed_at = now();`);

section("Statistiky trhu – kraje (poslední měsíc)");
const lastMonth = PRICE_TRENDS[PRICE_TRENDS.length - 1].month;
const regional = REGION_STATS.flatMap((r) =>
  COMMODITIES.map((c) => `(${monthDate(lastMonth)}::date, '${r.region}'::public.region_code, '${c}'::public.commodity_key, ${n(r.avgPrices[c])})`),
);
out.push(`insert into public.commodity_price_stats (month, region, commodity, avg_price_czk)
values ${regional.join(",\n  ")}
on conflict on constraint commodity_price_stats_key do update set avg_price_czk = excluded.avg_price_czk, computed_at = now();`);
out.push(`insert into public.region_stats (region, month, seller_count, price_index, change_pct)
values ${REGION_STATS.map((r) => `('${r.region}', ${monthDate(lastMonth)}, ${r.sellerCount}, ${r.priceIndex}, ${r.changePct})`).join(",\n  ")}
on conflict (region, month) do update set seller_count = excluded.seller_count, price_index = excluded.price_index, change_pct = excluded.change_pct, computed_at = now();`);

section("Blog – ukázkové články");
for (const p of BLOG_POSTS) {
  out.push(`insert into public.blog_posts (id, slug, title, excerpt, content, cover_url, cover_alt, cover_credit, category, tags, author_name, author_role, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at)
values ('${uuidOf(`blog:${p.id}`)}', ${q(p.slug)}, ${q(p.title)}, ${q(p.excerpt)}, ${q(p.content)}, ${q(p.cover?.url)}, ${q(p.cover?.alt)}, ${q(p.cover?.credit)}, ${q(p.category)}, ${arrNN(p.tags, "text")},
  ${q(p.author.name)}, ${q(p.author.role)}, ${q(p.status)}, ${q(p.published_at)}, ${n(p.reading_minutes)}, ${q(p.seo_title)}, ${q(p.seo_description)}, ${q(p.published_at ?? p.updated_at)}, ${q(p.updated_at)})
on conflict (slug) do nothing;`);
}

const sql = `${out.join("\n")}\n`;
writeFileSync(join(root, "supabase/seed.sql"), sql, "utf8");
const productCount = SELLERS.reduce((a, s) => a + s.products.length, 0);
console.log(
  `supabase/seed.sql: ${SELLERS.length} prodejců, ${productCount} produktů, ${REPORTS.length} reportů, ${BLOG_POSTS.length} článků, ${(sql.length / 1024).toFixed(0)} kB`,
);
