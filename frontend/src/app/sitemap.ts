import type { MetadataRoute } from "next";
import { getBlogSlugs } from "@/lib/api/blog";
import { getMockSellerSlugs } from "@/lib/api/sellers";
import { SITE_URL } from "@/lib/blog/utils";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

/**
 * /sitemap.xml. S účty (Supabase) jsou veřejně dostupné jen blog, ceník a přihlášení –
 * aplikace za přihlášením se do sitemapy nedává (vyhledávač by viděl jen přesměrování).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = (await getBlogSlugs()).map(({ slug, updated_at }) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: updated_at,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  if (SUPABASE_ENABLED) {
    return [
      { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 1 },
      ...posts,
      { url: `${SITE_URL}/plany`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/prihlaseni`, changeFrequency: "yearly", priority: 0.4 },
    ];
  }

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/kalkulacka`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/prodejci`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/trendy`, changeFrequency: "weekly", priority: 0.7 },
  ];
  const sellers = getMockSellerSlugs().map((slug) => ({
    url: `${SITE_URL}/prodejci/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
  return [...pages, ...posts, ...sellers];
}
