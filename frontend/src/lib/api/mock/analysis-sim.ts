/**
 * Simulátor běhu CrewAI `CompetitorAnalysisFlow` pro mock režim.
 * Stav běhu je čistá funkce uplynulého času – žádné timery, jen scénář (timeline).
 */
import type {
  AnalysisRun,
  CrewAnalysisReport,
  CrewLogEntry,
  CrewStep,
  CrewStepId,
  FuelCategory,
  RegionCode,
  StartAnalysisResponse,
  Swot,
} from "@/types";

const SPEED = Math.max(0.1, Number(process.env.NEXT_PUBLIC_MOCK_RUN_SPEED ?? 1) || 1);
const MODEL = "anthropic/claude-opus-5-5";

interface RunRecord {
  url: string;
  startedAt: number;
}

const runs = new Map<string, RunRecord>();
const reports = new Map<string, CrewAnalysisReport>();

/* ------------------------------------------------------------------ */
/* Pomocné funkce                                                      */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], h: number, offset = 0): T {
  return arr[(h + offset * 7919) % arr.length];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYYMMDD-HHMMSS` jako `datetime.now().strftime("%Y%m%d-%H%M%S")`. */
function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function slugify(url: string): string {
  return url
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

function domainOf(u: URL): string {
  return u.hostname.replace(/^www\./, "");
}

function nameOf(domain: string): string {
  const label = domain.split(".")[0] ?? domain;
  return label
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* Scénář                                                              */
/* ------------------------------------------------------------------ */

interface StepDef {
  id: CrewStepId;
  method: CrewStep["method"];
  label: string;
  agent?: CrewStep["agent"];
  agent_role?: string;
  start: number; // scénářové s
  end: number;
}

const STEP_DEFS: StepDef[] = [
  { id: "validate_input", method: "validate_input", label: "Validace URL konkurenta", start: 0, end: 1.6 },
  {
    id: "run_research.web_researcher",
    method: "run_research",
    label: "Průzkum webu konkurenta",
    agent: "web_researcher",
    agent_role: "Competitive Intelligence Web Researcher",
    start: 1.6,
    end: 15,
  },
  {
    id: "run_research.market_analyst",
    method: "run_research",
    label: "Analýza trhu a doporučení",
    agent: "market_analyst",
    agent_role: "Market Analyst for podpalto.cz",
    start: 15,
    end: 27,
  },
  { id: "save_report", method: "save_report", label: "Uložení Markdown reportu", start: 27, end: 29.5 },
];

const TOTAL_S = 29.5;

/** Kroky flow ve stavu „čeká“ – zobrazí se u běhu, který je zatím jen ve frontě v databázi. */
export function pendingSteps(): CrewStep[] {
  return STEP_DEFS.map((d) => ({
    id: d.id,
    method: d.method,
    label: d.label,
    agent: d.agent,
    agent_role: d.agent_role,
    status: "pending" as const,
  }));
}

interface LogDef {
  t: number;
  step: CrewStepId;
  level: CrewLogEntry["level"];
  message: string;
}

function buildLogs(url: string, domain: string, h: number, reportPath: string): LogDef[] {
  const base = url.replace(/\/+$/, "");
  const products = 5 + (h % 5);
  const month = pick(["10/2026", "11/2026"], h);
  return [
    { t: 0.2, step: "validate_input", level: "info", message: `Flow CompetitorAnalysisFlow spuštěn, competitor_url=${url}` },
    { t: 1.0, step: "validate_input", level: "success", message: "URL je platná (http/https, doména s tečkou)" },
    { t: 1.8, step: "run_research.web_researcher", level: "info", message: "Agent Competitive Intelligence Web Researcher převzal research_task" },
    { t: 2.6, step: "run_research.web_researcher", level: "thought", message: `Začnu úvodní stránkou ${domain} a pak projdu ceník, dopravu a „o nás“.` },
    { t: 3.6, step: "run_research.web_researcher", level: "tool", message: `PageTextTool → GET ${base}/` },
    { t: 5.2, step: "run_research.web_researcher", level: "info", message: "200 OK, 18,4 kB textu, nalezeno hlavní menu a 6 odkazů" },
    { t: 6.4, step: "run_research.web_researcher", level: "tool", message: `PageTextTool → GET ${base}/cenik` },
    { t: 8.0, step: "run_research.web_researcher", level: "info", message: `Nalezeno ${products} produktů, ceník aktualizován ${month}` },
    { t: 9.2, step: "run_research.web_researcher", level: "thought", message: "Cena je uvedena s DPH, doprava se počítá zvlášť – ověřím podmínky." },
    { t: 10.2, step: "run_research.web_researcher", level: "tool", message: `PageTextTool → GET ${base}/doprava` },
    { t: 11.8, step: "run_research.web_researcher", level: "info", message: "Doprava zdarma nad hranicí objednávky, jinak paušál dle vzdálenosti" },
    { t: 12.8, step: "run_research.web_researcher", level: "tool", message: `PageTextTool → GET ${base}/o-nas` },
    { t: 14.2, step: "run_research.web_researcher", level: "success", message: "research_task dokončen – fakta seskupena podle témat, u každého zdrojová URL" },
    { t: 15.3, step: "run_research.market_analyst", level: "info", message: "Agent Market Analyst for podpalto.cz převzal analysis_task (context: research_task)" },
    { t: 16.8, step: "run_research.market_analyst", level: "thought", message: "Porovnávám ceny s průměrem kraje…" },
    { t: 19.0, step: "run_research.market_analyst", level: "info", message: "Cenový index vůči průměru kraje spočítán" },
    { t: 21.0, step: "run_research.market_analyst", level: "thought", message: "Sestavuji SWOT…" },
    { t: 23.2, step: "run_research.market_analyst", level: "thought", message: "Formuluji doporučení pro podpalto.cz" },
    { t: 26.4, step: "run_research.market_analyst", level: "success", message: "Markdown report sestaven (5 sekcí)" },
    { t: 27.4, step: "save_report", level: "info", message: "Vytvářím adresář outputs/ (pokud neexistuje)" },
    { t: 28.6, step: "save_report", level: "success", message: `Report uložen: ${reportPath}` },
    { t: 29.4, step: "save_report", level: "success", message: "Flow dokončen" },
  ];
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const REGION_POOL: RegionCode[] = ["PHA", "STC", "JHC", "PLK", "ULK", "LBK", "HKK", "PAK", "VYS", "JHM", "OLK", "MSK"];
const CAT_POOL: FuelCategory[][] = [
  ["wood"],
  ["wood", "pellets"],
  ["pellets", "briquettes"],
  ["wood", "pellets", "briquettes"],
  ["wood", "briquettes", "coal"],
];

function buildSwot(h: number, name: string): Swot {
  return {
    strengths: [
      pick(["Široký sortiment dřeva, pelet a briket na jednom místě", "Silná lokální značka a dlouhá historie na trhu", "Jasně komunikované ceny přímo na webu"], h),
      pick(["Rychlá expedice do 48 hodin", "Doprava zdarma nad stanovenou hranici objednávky", "Možnost platby kartou online i na dobírku"], h, 1),
      pick(["Certifikované pelety ENplus A1 skladem", "Suché dřevo s deklarovanou vlhkostí do 20 %", "Přehledný e-shop s košíkem"], h, 2),
    ],
    weaknesses: [
      pick(["Web neukazuje cenu v Kč/kWh, zákazník se v nabídce hůře orientuje", "Chybí srovnání cen s okolními prodejci", "Dostupnost zásob není na webu vidět"], h, 3),
      pick(["Doprava mimo domovský kraj je výrazně dražší", "Omezený rozvozový radius", "Minimální hodnota objednávky odrazuje menší domácnosti"], h, 4),
      pick(["Slabý obsah a návody pro zákazníky", "Mobilní verze webu je pomalá", "Žádné zákaznické recenze na webu"], h, 5),
    ],
    opportunities: [
      pick(["Cílení na dotazy typu „palivové dřevo cena“ v celém kraji", "Rostoucí zájem o pelety kvůli cenám plynu", "Partnerství s montéry kotlů a kamen"], h, 6),
      pick(["Sezónní kampaně před topnou sezónou", "Předplatné pravidelných dodávek pelet", "Nabídka kalkulačky nákladů na vytápění"], h, 7),
    ],
    threats: [
      pick(["Cenová válka s regionálními prodejci", "Rostoucí ceny vstupů (těžba, doprava)", "Vstup velkých e-shopů na trh s palivy"], h, 8),
      pick(["Regulace emisí a dotace na výměnu kotlů snižují poptávku po tuhých palivech", "Teplé zimy snižují sezónní prodeje", "Zvýšení sazby DPH nebo poplatků"], h, 9),
      `Podpalto.cz může ztratit zákazníky, pokud ${name} zlepší cenovou transparentnost`,
    ],
  };
}

function bullets(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

function czk(n: number): string {
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

function buildReportMarkdown(url: string, domain: string, name: string, h: number, swot: Swot): string {
  const wood = 1900 + (h % 700);
  const pellets = 6300 + ((h >> 3) % 1400);
  const briq = 5400 + ((h >> 5) % 1100);
  const idx = ((h >> 7) % 17) - 8; // -8..+8 %
  const pos = idx > 0 ? "nad" : "pod";
  return `# Competitor report: ${domain}

## Summary

${name} (${domain}) je ${pick(["regionální prodejce", "online prodejce", "tradiční rodinný obchod s palivy"], h)} zaměřený na domácnosti vytápějící dřevem a peletami. Ceny se pohybují ${Math.abs(idx)} % ${pos} průměrem kraje a web klade důraz na ${pick(["rychlou dodávku", "kvalitu paliva", "nízkou cenu"], h, 1)}. Pro podpalto.cz jde o ${pick(["středně významného", "významného", "okrajového"], h, 2)} konkurenta v cílovém regionu.

Zdroj: ${url}

## Offering & Pricing

| Produkt | Jednotka | Cena s DPH | Poznámka |
| --- | --- | --- | --- |
| Tvrdé dřevo (štípané, 33 cm) | Kč/PRMS | ${czk(wood)} | vlhkost do 20 % |
| Pelety ENplus A1 | Kč/t | ${czk(pellets)} | pytle 15 kg na paletě |
| Dřevěné brikety | Kč/t | ${czk(briq)} | paleta 960 kg |

Doprava: ${pick(["zdarma nad 5 000 Kč, jinak 390 Kč", "paušál 450 Kč do 30 km", "dle vzdálenosti, 18 Kč/km"], h, 3)}. Platba: ${pick(["karta, převod, dobírka", "převod a hotovost při převzetí", "online platba kartou"], h, 4)}.

## Positioning

${name} se prezentuje jako ${pick(["spolehlivý místní dodavatel", "cenově dostupná alternativa k velkým e-shopům", "specialista na kvalitní suché dřevo"], h, 5)}. Tón komunikace je ${pick(["věcný a přátelský", "tradiční, důraz na rodinnou firmu", "moderní, s důrazem na ekologii"], h, 6)}. Cílí na ${pick(["majitele rodinných domů", "chataře a chalupáře", "domácnosti s krbovými kamny"], h, 7)}.

## SWOT

### Strengths

${bullets(swot.strengths)}

### Weaknesses

${bullets(swot.weaknesses)}

### Opportunities

${bullets(swot.opportunities)}

### Threats

${bullets(swot.threats)}

## Recommendations for podpalto.cz

1. **Zdůraznit cenu v Kč/kWh.** ${name} ji neuvádí – podpalto.cz může být v transparentnosti jasně lepší.
2. **Cílit na kraj konkurenta.** Spustit lokální kampaň s nabídkou dopravy zdarma nad nižší hranici.
3. **Sledovat cenu pelet.** Při změně ceníku u ${domain} do ${pick(["týdne", "14 dnů"], h, 8)} reagovat úpravou doporučených cen.
4. **Využít slabinu v dostupnosti.** Zobrazit na kartě prodejce stav skladu a termín dodání.
`;
}

function finishTime(rec: RunRecord): number {
  return rec.startedAt + (TOTAL_S * 1000) / SPEED;
}

function reportIdFor(rec: RunRecord): string {
  return `${stamp(new Date(finishTime(rec)))}_${slugify(rec.url)}`;
}

function createReport(rec: RunRecord): CrewAnalysisReport {
  const u = parseUrl(rec.url)!;
  const domain = domainOf(u);
  const h = hashString(domain);
  const name = nameOf(domain);
  const swot = buildSwot(h, name);
  const id = reportIdFor(rec);
  return {
    id,
    competitor_url: rec.url,
    report: buildReportMarkdown(rec.url, domain, name, h, swot),
    report_path: `outputs/${id}.md`,
    competitor_name: name,
    competitor_domain: domain,
    created_at: new Date(finishTime(rec)).toISOString(),
    status: "completed",
    model: MODEL,
    duration_s: TOTAL_S,
    region: pick(REGION_POOL, h, 1),
    categories: pick(CAT_POOL, h, 2),
    swot,
  };
}

/* ------------------------------------------------------------------ */
/* Veřejné API                                                         */
/* ------------------------------------------------------------------ */

export function startSimulatedRun(competitorUrl: string): StartAnalysisResponse {
  const run_id = `run_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  runs.set(run_id, { url: competitorUrl.trim(), startedAt: Date.now() });
  return { run_id, status: "queued" };
}

export function getSimulatedRun(runId: string): AnalysisRun | undefined {
  const rec = runs.get(runId);
  if (!rec) return undefined;

  const elapsed = ((Date.now() - rec.startedAt) / 1000) * SPEED; // scénářové sekundy
  const iso = (t: number) => new Date(rec.startedAt + (t * 1000) / SPEED).toISOString();
  const started_at = new Date(rec.startedAt).toISOString();
  const u = parseUrl(rec.url);

  /* --- neplatná URL --- */
  if (!u) {
    const failAt = 1.0;
    const done = elapsed >= failAt;
    const error =
      "Neplatná URL konkurenta – zadejte celou adresu včetně http:// nebo https:// a existující domény (např. https://www.drevo-praha.cz).";
    const steps: CrewStep[] = STEP_DEFS.map((d, i) => {
      const status: CrewStep["status"] = i === 0 ? (done ? "error" : elapsed > 0.2 ? "running" : "pending") : "pending";
      return {
        id: d.id,
        method: d.method,
        label: d.label,
        agent: d.agent,
        agent_role: d.agent_role,
        status,
        ...(status !== "pending" ? { started_at: iso(0) } : {}),
        ...(status === "error" ? { finished_at: iso(failAt) } : {}),
      };
    });
    const logs: CrewLogEntry[] = [];
    if (elapsed >= 0.2) {
      logs.push({ ts: iso(0.2), step: "validate_input", level: "info", message: `Flow CompetitorAnalysisFlow spuštěn, competitor_url=${rec.url}` });
    }
    if (done) logs.push({ ts: iso(failAt), step: "validate_input", level: "error", message: error });
    return {
      run_id: runId,
      competitor_url: rec.url,
      status: done ? "failed" : "running",
      progress: done ? 10 : Math.round(Math.min(elapsed / failAt, 1) * 8),
      steps,
      logs,
      started_at,
      ...(done ? { finished_at: iso(failAt), error } : {}),
    };
  }

  /* --- platná URL --- */
  const domain = domainOf(u);
  const h = hashString(domain);
  const reportId = reportIdFor(rec);
  const finished = elapsed >= TOTAL_S;
  if (finished && !reports.has(runId)) reports.set(runId, createReport(rec));

  const steps: CrewStep[] = STEP_DEFS.map((d) => {
    const status: CrewStep["status"] = elapsed >= d.end ? "done" : elapsed >= d.start ? "running" : "pending";
    return {
      id: d.id,
      method: d.method,
      label: d.label,
      agent: d.agent,
      agent_role: d.agent_role,
      status,
      ...(status !== "pending" ? { started_at: iso(d.start) } : {}),
      ...(status === "done" ? { finished_at: iso(d.end) } : {}),
    };
  });

  const agentOf = (id: CrewStepId) => STEP_DEFS.find((d) => d.id === id)?.agent;
  const logs: CrewLogEntry[] = buildLogs(rec.url, domain, h, `outputs/${reportId}.md`)
    .filter((l) => l.t <= elapsed)
    .map((l) => {
      const agent = agentOf(l.step);
      return { ts: iso(l.t), step: l.step, level: l.level, message: l.message, ...(agent ? { agent } : {}) };
    });

  return {
    run_id: runId,
    competitor_url: rec.url,
    status: finished ? "completed" : elapsed > 0.3 ? "running" : "queued",
    progress: finished ? 100 : Math.min(99, Math.round((elapsed / TOTAL_S) * 100)),
    steps,
    logs,
    started_at,
    ...(finished ? { finished_at: iso(TOTAL_S), report_id: reportId } : {}),
  };
}

/** Reporty z dokončených simulovaných běhů v této relaci prohlížeče. */
export function getSimulatedReports(): CrewAnalysisReport[] {
  for (const [runId, rec] of runs) {
    if (!reports.has(runId) && parseUrl(rec.url) && Date.now() >= finishTime(rec)) {
      reports.set(runId, createReport(rec));
    }
  }
  return [...reports.values()];
}
