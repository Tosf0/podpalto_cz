import type { MetadataRoute } from "next";
import { getBlogSlugs } from "@/lib/api/blog";
import { getMockSellerSlugs } from "@/lib/api/sellers";
import { SITE_URL } from "@/lib/blog/utils";
import { allPriceSlugs } from "@/lib/seo-data";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

/**
 * /sitemap.xml. S účty (Supabase) jsou veřejné ukázkové verze mapy, prodejců a trendů, blog,
 * stránky cen (/ceny), metodika a ceník. Stránky za přihlášením (kalkulačka, detail prodejce,
 * CI Studio) ani přihlášení samotné se do sitemapy nedávají – jsou `noindex`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = (await getBlogSlugs()).map(({ slug, updated_at }) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: updated_at,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  const lastPost = posts[0]?.lastModified;

  const prices: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/ceny`, changeFrequency: "weekly", priority: 0.9 },
    ...allPriceSlugs().map((slug) => ({
      url: `${SITE_URL}/ceny/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/metodika`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/obchodni-podminky`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/ochrana-osobnich-udaju`, changeFrequency: "yearly", priority: 0.2 },
  ];

  if (SUPABASE_ENABLED) {
    return [
      { url: SITE_URL, changeFrequency: "daily", priority: 1 },
      ...prices,
      { url: `${SITE_URL}/prodejci`, changeFrequency: "daily", priority: 0.7 },
      { url: `${SITE_URL}/trendy`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${SITE_URL}/blog`, lastModified: lastPost, changeFrequency: "weekly", priority: 0.8 },
      ...posts,
      { url: `${SITE_URL}/plany`, changeFrequency: "monthly", priority: 0.4 },
    ];
  }

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...prices,
    { url: `${SITE_URL}/blog`, lastModified: lastPost, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/prodejci`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/trendy`, changeFrequency: "weekly", priority: 0.7 },
  ];
  const sellers = getMockSellerSlugs().map((slug) => ({
    url: `${SITE_URL}/prodejci/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
  return [...pages, ...posts, ...sellers];
}
