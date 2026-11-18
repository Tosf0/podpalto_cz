import type { CrewAnalysisReport, CrewAnalysisReportSummary } from "@/types";
import { mockResolve } from "./client";
import { USES_DB, cached, db, unwrap } from "./db";
import { REPORTS } from "@/data/reports";
import { getSimulatedReports } from "./mock/analysis-sim";
import { extractSection } from "@/lib/report-parser";

function allMockReports(): CrewAnalysisReport[] {
  return [...getSimulatedReports(), ...REPORTS].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function toSummary(r: CrewAnalysisReport): CrewAnalysisReportSummary {
  const { report, ...rest } = r;
  const summary = extractSection(report, "summary") ?? report;
  const plain = summary
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { ...rest, excerpt: plain.length > 240 ? `${plain.slice(0, 237)}…` : plain };
}

type ReportRow = Omit<CrewAnalysisReport, "seller_id" | "region" | "categories" | "swot"> & {
  seller_id: string | null;
  region: CrewAnalysisReport["region"] | null;
  categories: CrewAnalysisReport["categories"] | null;
  swot: CrewAnalysisReport["swot"] | null;
};

function fromRow(r: ReportRow): CrewAnalysisReport {
  return {
    ...r,
    seller_id: r.seller_id ?? undefined,
    region: r.region ?? undefined,
    categories: r.categories ?? undefined,
    swot: r.swot ?? undefined,
  };
}

const REPORT_COLUMNS =
  "id, competitor_url, competitor_name, competitor_domain, report, report_path, status, model, duration_s, seller_id, region, categories, swot, created_at";

/** Reporty z databáze (RLS: jen tarif Pro). */
function dbReports(): Promise<CrewAnalysisReport[]> {
  return cached("reports:all", async () => {
    const rows = unwrap<ReportRow[]>(
      await db().from("analysis_reports").select(REPORT_COLUMNS).order("created_at", { ascending: false }),
    );
    return rows.map(fromRow);
  });
}

/** Archiv reportů (nejnovější první, bez těla reportu). Zahrnuje i běhy simulované v tomto prohlížeči. */
export async function getReports(): Promise<CrewAnalysisReportSummary[]> {
  if (USES_DB) {
    const all = [...getSimulatedReports(), ...(await dbReports())].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return all.map(toSummary);
  }
  return mockResolve(allMockReports().map(toSummary));
}

/** Celý report vč. Markdownu. */
export async function getReport(id: string): Promise<CrewAnalysisReport | null> {
  if (USES_DB) {
    const simulated = getSimulatedReports().find((r) => r.id === id);
    if (simulated) return simulated;
    return (await dbReports()).find((r) => r.id === id) ?? null;
  }
  return mockResolve(allMockReports().find((r) => r.id === id) ?? null);
}
