import { getBlogPosts } from "@/lib/api/blog";
import {
  COMMODITIES,
  FUEL_PAGES,
  REGION_SLUGS,
  byPriceIndex,
  czkPerUnit,
  getMarketSnapshot,
  heatPrice,
  int,
  kwhPrice,
  monthLabel,
} from "@/lib/seo-data";
import { REGIONS } from "@/lib/constants";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/seo";

/**
 * /llms.txt – stručný popis webu pro jazykové modely a AI vyhledávače (GEO).
 * Formát podle llmstxt.org: nadpis, shrnutí, klíčová fakta a odkazy na hlavní stránky.
 */
async function buildText(): Promise<string> {
  "use cache";
  const [s, posts] = await Promise.all([getMarketSnapshot(), getBlogPosts()]);
  const last = s.trends.at(-1);
  const month = monthLabel(last?.month);

  const prices = last
    ? COMMODITIES.map((c) => `- ${c.label}: ${czkPerUnit(last[c.key], c.unit)} vč. DPH (teplo ≈ ${kwhPrice(heatPrice(last[c.key], c))})`).join("\n")
    : "- (data se připravují)";

  const regions = [...s.regions]
    .sort(byPriceIndex)
    .map((r) =>
      Number.isFinite(r.priceIndex)
        ? `- [${REGIONS[r.region].name}](${SITE_URL}/ceny/${REGION_SLUGS[r.region]}): cenový index ${int(r.priceIndex)}, tvrdé dřevo ${czkPerUnit(r.avgPrices.hardWoodPrms, "PRMS")}`
        : `- [${REGIONS[r.region].name}](${SITE_URL}/ceny/${REGION_SLUGS[r.region]}): zatím bez průměrných cen`,
    )
    .join("\n");

  return `# podpalto.cz

> ${SITE_DESCRIPTION}

podpalto.cz je český srovnávač cen tuhých paliv (palivové dřevo, dřevěné pelety, brikety, hnědé a černé uhlí, koks). Ceny sbírá z veřejných ceníků prodejců, převádí je na společné jednotky (PRMS, PRM, PLM, tuna) a na cenu za kWh tepla a ukazuje je na mapě včetně odhadu ceny dopravy. Všechny ceny jsou včetně DPH.

## Průměrné ceny v ČR (${month})

${prices}

## Ceny podle krajů (index: 100 = průměr ČR)

${regions}

## Hlavní stránky

- [Ceny paliv podle krajů](${SITE_URL}/ceny): průměry ČR a 14 krajů, vývoj za 6 měsíců
${FUEL_PAGES.map((f) => `- [${f.title}](${SITE_URL}/ceny/${f.slug}): srovnání krajů a vývoj`).join("\n")}
- [Metodika a zdroje dat](${SITE_URL}/metodika): odkud jsou ceny, přepočty jednotek a výhřevnosti, odhad dopravy
- [Trh a trendy](${SITE_URL}/trendy): vývoj cen a sezónnost
- [Mapa cen](${SITE_URL}/): prodejci v okolí s cenou vč. dopravy (plná verze po registraci zdarma)

## Blog

${posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.excerpt}`).join("\n")}

## Užitečná fakta

- 1 PRM (rovnaný) ≈ 0,7 PLM, 1 PRMS (sypaný) ≈ 0,45 PLM, 1 PRM ≈ 1,56 PRMS.
- Suché palivové dřevo má vlhkost pod 20 %; čerstvé dřevo nad 35 % dává jen asi dvě třetiny energie.
- Tuhá paliva bývají nejlevnější na jaře a v létě, mimo topnou sezónu.
`;
}

export async function GET() {
  return new Response(await buildText(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
