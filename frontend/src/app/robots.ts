import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/blog/utils";

/** /robots.txt – interní CI Studio a editor blogu se neindexují. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/ci-studio", "/blog/novy"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
