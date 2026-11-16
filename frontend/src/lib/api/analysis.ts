import type { AnalysisRun, StartAnalysisRequest, StartAnalysisResponse } from "@/types";
import { IS_MOCK } from "./config";
import { apiFetch, mockResolve } from "./client";
import { getSimulatedRun, startSimulatedRun } from "./mock/analysis-sim";

/**
 * POST /api/analyze  body: { competitor_url }
 * Backend spustí `CompetitorAnalysisFlow().kickoff(inputs={"competitor_url": url})` na pozadí.
 */
export async function startAnalysis(req: StartAnalysisRequest): Promise<StartAnalysisResponse> {
  if (!IS_MOCK) {
    return apiFetch<StartAnalysisResponse>("/api/analyze", { method: "POST", body: JSON.stringify(req) });
  }
  return mockResolve(startSimulatedRun(req.competitor_url), 250);
}

/** GET /api/analyze/{run_id} – stav běhu (frontend polluje každých `ANALYSIS_POLL_MS`). */
export async function getAnalysisRun(runId: string): Promise<AnalysisRun> {
  if (!IS_MOCK) return apiFetch<AnalysisRun>(`/api/analyze/${encodeURIComponent(runId)}`);
  const run = getSimulatedRun(runId);
  if (!run) throw new Error(`Běh ${runId} neexistuje`);
  return mockResolve(run, 60);
}

/** Interval pollingu stavu běhu v ms. */
export const ANALYSIS_POLL_MS = 1500;
