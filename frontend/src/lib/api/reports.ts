import type { CrewAnalysisReport, CrewAnalysisReportSummary } from "@/types";
import { IS_MOCK } from "./config";
import { apiFetch, mockResolve } from "./client";
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

/** GET /api/reports – archiv reportů z `outputs/` (nejnovější první, bez těla reportu). */
export async function getReports(): Promise<CrewAnalysisReportSummary[]> {
  if (!IS_MOCK) return apiFetch<CrewAnalysisReportSummary[]>("/api/reports");
  return mockResolve(allMockReports().map(toSummary));
}

/** GET /api/reports/{id} – celý report vč. Markdownu. */
export async function getReport(id: string): Promise<CrewAnalysisReport | null> {
  if (!IS_MOCK) {
    try {
      return await apiFetch<CrewAnalysisReport>(`/api/reports/${encodeURIComponent(id)}`);
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  }
  return mockResolve(allMockReports().find((r) => r.id === id) ?? null);
}
