import type { NextConfig } from "next";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Fotky blogu ze Supabase Storage se zmenšují přes next/image (editoři nahrávají i 5MB fotky
  // z mobilu – v mřížce článků to sekalo scroll). Jen veřejný bucket našeho projektu.
  images: {
    remotePatterns: SUPABASE_URL ? [new URL(`${SUPABASE_URL}/storage/v1/object/public/**`)] : [],
    qualities: [75],
  },
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
