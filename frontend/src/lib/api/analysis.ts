import type { AnalysisRun, CrewLogEntry, CrewStep, StartAnalysisRequest, StartAnalysisResponse } from "@/types";
import { t } from "@/lib/i18n/translate";
import { mockResolve } from "./client";
import { USES_DB, db, invalidate, unwrap } from "./db";
import { getSimulatedRun, pendingSteps, startSimulatedRun } from "./mock/analysis-sim";

/**
 * Spuštění analýzy = vložení řádku do fronty `analysis_runs` (žádné REST API).
 * Služba `app` si běh vyzvedne (`claim_analysis_run`), zapisuje do řádku stav, kroky a logy
 * a na konci uloží report do `analysis_reports` a jeho id do `report_id`.
 * Offline (bez Supabase) se běh simuluje v prohlížeči.
 */
export async function startAnalysis(req: StartAnalysisRequest): Promise<StartAnalysisResponse> {
  if (!USES_DB) return mockResolve(startSimulatedRun(req.competitor_url), 250);
  const row = unwrap<{ run_id: string; status: AnalysisRun["status"] }>(
    await db()
      .from("analysis_runs")
      .insert({ kind: "url", competitor_url: req.competitor_url })
      .select("run_id, status")
      .single(),
  );
  return { run_id: row.run_id, status: row.status };
}

interface RunRow {
  run_id: string;
  competitor_url: string | null;
  status: AnalysisRun["status"];
  progress: number;
  steps: CrewStep[] | null;
  logs: CrewLogEntry[] | null;
  report_id: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

/** Stav běhu (frontend polluje každých `ANALYSIS_POLL_MS`). */
export async function getAnalysisRun(runId: string): Promise<AnalysisRun> {
  if (!USES_DB) {
    const run = getSimulatedRun(runId);
    if (!run) throw new Error(t("ci.api.runNotFound", { id: runId }));
    return mockResolve(run, 60);
  }
  const row = unwrap<RunRow | null>(
    await db()
      .from("analysis_runs")
      .select("run_id, competitor_url, status, progress, steps, logs, report_id, error, started_at, finished_at")
      .eq("run_id", runId)
      .maybeSingle(),
  );
  if (!row) throw new Error(t("ci.api.runNotFound", { id: runId }));
  // nový report se má v archivu objevit hned
  if (row.status === "completed") invalidate("reports:");
  return {
    run_id: row.run_id,
    competitor_url: row.competitor_url ?? "",
    status: row.status,
    progress: row.progress,
    steps: row.steps && row.steps.length > 0 ? row.steps : pendingSteps(),
    logs: row.logs ?? [],
    started_at: row.started_at,
    ...(row.finished_at ? { finished_at: row.finished_at } : {}),
    ...(row.report_id ? { report_id: row.report_id } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}

/** Interval pollingu stavu běhu v ms. */
export const ANALYSIS_POLL_MS = 1500;
