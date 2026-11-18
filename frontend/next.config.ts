import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Mimo ostrou doménu (NEXT_PUBLIC_SITE_INDEXABLE ≠ true) zakázat indexaci i hlavičkou –
  // platí i pro soubory, které nemají meta tag (obrázky, PDF, llms.txt).
  async headers() {
    if (process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
