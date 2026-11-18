/**
 * SEO a GEO: společné hodnoty pro metadata, robots, sitemapu, JSON-LD a llms.txt.
 *
 * Indexace je ZAPNUTÁ jen tam, kde je `NEXT_PUBLIC_SITE_INDEXABLE=true` – tedy jen na ostré
 * doméně (podpalto.cz). Dočasná `*.vercel.app`, náhledy a localhost se neindexují, aby po
 * přepnutí domény nevznikly ve vyhledávačích duplicity. Postup přepnutí: README kap. 7.
 */
import { SITE_URL } from "@/lib/blog/utils";

export { SITE_URL };

export const SITE_INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";

export const SITE_NAME = "podpalto.cz";

export const SITE_DESCRIPTION =
  "Srovnání cen palivového dřeva, pelet, briket a uhlí od prodejců v celé ČR – ceny vč. dopravy, přepočet na Kč/kWh, průměry po krajích a vývoj cen.";

/** Ověření vlastnictví webu pro Google Search Console a Bing Webmaster Tools (meta tag). */
export const SITE_VERIFICATION = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || undefined,
};

/** Absolutní URL z cesty. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** JSON-LD jako bezpečný řetězec pro <script type="application/ld+json"> (bez `</script>`). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Organizace a web – vkládá se do kořenového layoutu. */
export function siteJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/icon.svg"),
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Česká republika" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "cs-CZ",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ];
}

/** Drobečková navigace jako JSON-LD. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/** Otázky a odpovědi jako JSON-LD (musí odpovídat textu viditelnému na stránce). */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

/** Roboti AI vyhledávačů – povolení kvůli GEO (citace v ChatGPT, Perplexity, Claude, Gemini…). */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

/** Cesty, které se nemají indexovat (za přihlášením nebo bez obsahu). */
export const PRIVATE_PATHS = [
  "/ci-studio",
  "/blog/novy",
  "/admin",
  "/auth",
  "/nove-heslo",
  "/kalkulacka",
  "/prodejci/",
];
