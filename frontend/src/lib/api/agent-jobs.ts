/**
 * Joby agentů (služba `app`, CrewAI) – plán spouštění a ruční spuštění z administrace.
 * Tabulky `agent_jobs` (plán) a `agent_job_runs` (běhy), RPC `request_agent_job` /
 * `cancel_agent_job_run`; worker volá `claim_agent_job` a `finish_agent_job_run`.
 * Vše jen pro admina (RLS) – viz migrace …230000_agent_jobs.sql.
 */
import { db } from "./db";

export type AgentJobKey = "collect" | "market_report";
export type JobFrequency = "daily" | "weekly" | "monthly" | "quarterly";
export type JobRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface AgentJob {
  job: AgentJobKey;
  title: string;
  description: string | null;
  enabled: boolean;
  frequency: JobFrequency;
  /** 1–28 (u měsíčního a čtvrtletního plánu). */
  day_of_month: number;
  /** ISO 1 = pondělí … 7 = neděle (u týdenního plánu). */
  weekday: number;
  /** 0–23, místní čas Europe/Prague. */
  hour: number;
  next_run_at: string | null;
  last_run_at: string | null;
  updated_at: string;
}

export type AgentJobSchedule = Pick<AgentJob, "enabled" | "frequency" | "day_of_month" | "weekday" | "hour">;

/** Řádek logu běhu (worker zapisuje po každém kroku, u sběru po každém zdroji). */
export interface JobLogEntry {
  ts: string;
  step?: string;
  level: "info" | "tool" | "thought" | "success" | "error";
  message: string;
}

export interface AgentJobRun {
  id: string;
  job: AgentJobKey;
  trigger: "schedule" | "manual";
  status: JobRunStatus;
  requested_at: string;
  claimed_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  progress: number;
  summary: Record<string, unknown>;
  logs: JobLogEntry[];
  error: string | null;
}

/** Migrace s tabulkami jobů ještě není v databázi nahraná. */
export class AgentJobsMissingError extends Error {
  constructor() {
    super("V databázi chybí tabulky agent_jobs / agent_job_runs (migrace 20261118230000_agent_jobs.sql).");
    this.name = "AgentJobsMissingError";
  }
}

function check(error: { message: string; code?: string } | null): void {
  if (!error) return;
  if (error.code === "PGRST205" || error.code === "42P01" || /agent_job/.test(error.message) && /not find|does not exist/i.test(error.message)) {
    throw new AgentJobsMissingError();
  }
  throw new Error(error.message);
}

export async function getAgentJobs(): Promise<AgentJob[]> {
  const { data, error } = await db()
    .from("agent_jobs")
    .select("job, title, description, enabled, frequency, day_of_month, weekday, hour, next_run_at, last_run_at, updated_at")
    .order("job");
  check(error);
  return (data as AgentJob[]) ?? [];
}

export async function getAgentJobRuns(limit = 25): Promise<AgentJobRun[]> {
  const { data, error } = await db()
    .from("agent_job_runs")
    .select("id, job, trigger, status, requested_at, claimed_by, started_at, finished_at, updated_at, progress, summary, logs, error")
    .order("requested_at", { ascending: false })
    .limit(limit);
  check(error);
  return (data as AgentJobRun[]) ?? [];
}

/** Uloží plán; příští spuštění přepočítá databáze (trigger) a vrátí ho. */
export async function saveAgentJobSchedule(job: AgentJobKey, schedule: AgentJobSchedule): Promise<AgentJob> {
  const { data, error } = await db()
    .from("agent_jobs")
    .update(schedule)
    .eq("job", job)
    .select("job, title, description, enabled, frequency, day_of_month, weekday, hour, next_run_at, last_run_at, updated_at")
    .single();
  check(error);
  return data as AgentJob;
}

/** Ruční spuštění – založí běh ve frontě (když job už čeká nebo běží, vrátí chybu). */
export async function requestAgentJob(job: AgentJobKey): Promise<string> {
  const { data, error } = await db().rpc("request_agent_job", { p_job: job });
  check(error);
  return data as string;
}

/** Zrušit běh, který ještě nezačal. */
export async function cancelAgentJobRun(id: string): Promise<void> {
  const { error } = await db().rpc("cancel_agent_job_run", { p_id: id });
  check(error);
}
