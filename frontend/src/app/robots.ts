import type { MetadataRoute } from "next";
import { AI_CRAWLERS, PRIVATE_PATHS, SITE_INDEXABLE, SITE_URL } from "@/lib/seo";

/**
 * /robots.txt
 * - mimo ostrou doménu (`NEXT_PUBLIC_SITE_INDEXABLE` ≠ true) zakáže indexaci úplně,
 * - na ostré doméně povolí vše veřejné vč. robotů AI vyhledávačů (GEO), skryje stránky za
 *   přihlášením a odkáže na sitemapu a llms.txt.
 */
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
