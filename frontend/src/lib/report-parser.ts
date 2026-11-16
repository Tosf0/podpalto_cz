/**
 * Parser Markdown reportů z CrewAI (`analysis_task` → sekce
 * Summary, Offering & Pricing, Positioning, SWOT, Recommendations for podpalto.cz).
 * Toleruje anglické i české nadpisy a různé úrovně (#, ##, ###).
 */
import type { Swot } from "@/types";

export type ReportSectionKey = "summary" | "offering" | "positioning" | "swot" | "recommendations";

export const REPORT_SECTIONS: { key: ReportSectionKey; label: string; patterns: RegExp[] }[] = [
  { key: "summary", label: "Summary", patterns: [/summary/i, /shrnut/i, /souhrn/i] },
  { key: "offering", label: "Offering & Pricing", patterns: [/offering/i, /pricing/i, /nabídk/i, /cen[íy]/i] },
  { key: "positioning", label: "Positioning", patterns: [/positioning/i, /pozic/i] },
  { key: "swot", label: "SWOT", patterns: [/swot/i] },
  {
    key: "recommendations",
    label: "Recommendations for podpalto.cz",
    patterns: [/recommendation/i, /doporučení/i],
  },
];

interface Heading {
  level: number;
  title: string;
  start: number; // index začátku řádku nadpisu
  bodyStart: number; // index za řádkem nadpisu
}

function headings(md: string): Heading[] {
  const re = /^(#{1,6})\s+(.+?)\s*#*\s*$/gm;
  const out: Heading[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    out.push({ level: m[1].length, title: m[2], start: m.index, bodyStart: m.index + m[0].length });
  }
  return out;
}

/** Vrátí tělo sekce (bez nadpisu) nebo `undefined`. */
export function extractSection(md: string, key: ReportSectionKey): string | undefined {
  const def = REPORT_SECTIONS.find((s) => s.key === key);
  if (!def) return undefined;
  const hs = headings(md);
  // ignoruj H1 titulek dokumentu, pokud existují nižší úrovně
  const minLevel = Math.min(...hs.filter((h) => h.level > 1).map((h) => h.level), 6);
  const idx = hs.findIndex((h) => h.level <= minLevel && h.level > 1 && def.patterns.some((p) => p.test(h.title)));
  const fallbackIdx = idx === -1 ? hs.findIndex((h) => def.patterns.some((p) => p.test(h.title))) : idx;
  if (fallbackIdx === -1) return undefined;
  const h = hs[fallbackIdx];
  const next = hs.slice(fallbackIdx + 1).find((n) => n.level <= h.level);
  return md.slice(h.bodyStart, next ? next.start : undefined).trim();
}

/** Rozdělí report na známé sekce (pořadí dle REPORT_SECTIONS). */
export function splitReport(md: string): { key: ReportSectionKey; label: string; body: string }[] {
  return REPORT_SECTIONS.flatMap((s) => {
    const body = extractSection(md, s.key);
    return body ? [{ key: s.key, label: s.label, body }] : [];
  });
}

const SWOT_PATTERNS: Record<keyof Swot, RegExp> = {
  strengths: /strength|siln/i,
  weaknesses: /weakness|slab/i,
  opportunities: /opportunit|příležitost/i,
  threats: /threat|hrozb/i,
};

function bullets(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^([-*+]|\d+\.)\s+/.test(l))
    .map((l) => l.replace(/^([-*+]|\d+\.)\s+/, "").trim());
}

/**
 * Vytáhne SWOT z Markdownu. Podporuje podnadpisy (### Strengths) i tučné štítky (**Strengths:**).
 */
export function parseSwot(md: string): Swot {
  const swotBody = extractSection(md, "swot") ?? md;
  const result: Swot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  const lines = swotBody.split("\n");
  let current: keyof Swot | null = null;
  const buckets: Record<keyof Swot, string[]> = { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  for (const raw of lines) {
    const line = raw.trim();
    const isLabel = /^(#{2,6}\s+|\*\*|__)/.test(line) || /^[A-ZÁ-Ž][^.]{0,40}:$/.test(line);
    if (isLabel) {
      const key = (Object.keys(SWOT_PATTERNS) as (keyof Swot)[]).find((k) => SWOT_PATTERNS[k].test(line));
      if (key) {
        current = key;
        continue;
      }
    }
    if (current) buckets[current].push(raw);
  }
  for (const k of Object.keys(buckets) as (keyof Swot)[]) {
    result[k] = bullets(buckets[k].join("\n"));
  }
  return result;
}
