/**
 * Pomocné funkce blogu – bez Reactu, použitelné na serveru i v klientu (editor, náhled).
 */

/** „Jak poznat suché dřevo?“ → „jak-poznat-suche-drevo“ (URL slug / id nadpisu). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Obsah článku z nadpisů `##` a `###` (id odpovídá `slugify` v renderu nadpisů). */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  let inCode = false;
  for (const line of markdown.split("\n")) {
    if (line.trim().startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "");
    items.push({ id: slugify(text), text, level: m[1].length as 2 | 3 });
  }
  return items;
}

/** Text Markdownu bez formátování – pro meta description a počítání slov. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Odhad doby čtení (≈ 200 slov za minutu). */
export function estimateReadingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(plainText(markdown).split(" ").filter(Boolean).length / 200));
}

/** Základní URL webu pro kanonické odkazy, sitemapu a Open Graph. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://podpalto.cz").replace(/\/+$/, "");
