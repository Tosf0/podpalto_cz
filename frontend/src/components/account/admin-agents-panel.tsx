"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Bot, CalendarClock, Check, Database, Loader2, Play, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import {
  AgentJobsMissingError,
  cancelAgentJobRun,
  getAgentJobRuns,
  getAgentJobs,
  requestAgentJob,
  saveAgentJobSchedule,
  type AgentJob,
  type AgentJobRun,
  type AgentJobSchedule,
  type JobFrequency,
  type JobRunStatus,
} from "@/lib/api/agent-jobs";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const FREQUENCIES: { value: JobFrequency; label: string }[] = [
  { value: "daily", label: "Denně" },
  { value: "weekly", label: "Týdně" },
  { value: "monthly", label: "Měsíčně" },
  { value: "quarterly", label: "Čtvrtletně" },
];

const WEEKDAYS = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];

const STATUS: Record<JobRunStatus, { label: string; cls: string }> = {
  queued: { label: "Ve frontě", cls: "bg-wood-soft text-wood-strong" },
  running: { label: "Běží", cls: "bg-accent text-primary" },
  completed: { label: "Hotovo", cls: "bg-pine-soft text-pine" },
  failed: { label: "Chyba", cls: "bg-clay-soft text-clay-strong" },
  cancelled: { label: "Zrušeno", cls: "bg-muted text-muted-foreground" },
};

const JOB_ICON = { collect: Database, market_report: Bot } as const;

/** Po jaké době bez převzetí upozornit, že worker zřejmě neběží. */
const STALE_QUEUE_MS = 15 * 60_000;

const isActive = (r: AgentJobRun) => r.status === "queued" || r.status === "running";

function scheduleText(s: AgentJobSchedule): string {
  if (!s.enabled) return "Jen ruční spuštění";
  const at = `v ${s.hour}:00`;
  if (s.frequency === "daily") return `Každý den ${at}`;
  if (s.frequency === "weekly") return `Každý týden – ${WEEKDAYS[s.weekday - 1]} ${at}`;
  if (s.frequency === "quarterly") return `Každé čtvrtletí – ${s.day_of_month}. den ${at}`;
  return `Každý měsíc – ${s.day_of_month}. den ${at}`;
}

function duration(run: AgentJobRun): string | null {
  if (!run.started_at) return null;
  const ms = new Date(run.finished_at ?? run.updated_at).getTime() - new Date(run.started_at).getTime();
  const min = Math.round(ms / 60_000);
  return min < 1 ? "< 1 min" : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

const SUMMARY_LABELS: Record<string, string> = {
  sources: "zdrojů",
  sources_failed: "zdrojů s chybou",
  observations: "cen",
  products_new: "nových produktů",
  sellers_new: "nových prodejců",
};

function SummaryText({ run }: { run: AgentJobRun }) {
  if (run.error) return <span className="text-clay-strong">{run.error}</span>;
  const parts = Object.entries(SUMMARY_LABELS)
    .filter(([key]) => typeof run.summary?.[key] === "number")
    .map(([key, label]) => `${run.summary[key] as number} ${label}`);
  const reportId = typeof run.summary?.report_id === "string" ? run.summary.report_id : null;
  if (!parts.length && !reportId) return <span className="text-muted-foreground">–</span>;
  return (
    <span>
      {parts.join(" · ")}
      {reportId && (
        <>
          {parts.length > 0 && " · "}
          <Link href={`/ci-studio?report=${encodeURIComponent(reportId)}`} className="text-primary underline-offset-2 hover:underline">
            report
          </Link>
        </>
      )}
    </span>
  );
}

function JobCard({ job, runs, onChanged }: { job: AgentJob; runs: AgentJobRun[]; onChanged: () => void }) {
  const [form, setForm] = useState<AgentJobSchedule>({
    enabled: job.enabled,
    frequency: job.frequency,
    day_of_month: job.day_of_month,
    weekday: job.weekday,
    hour: job.hour,
  });
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const active = runs.find((r) => r.job === job.job && isActive(r));
  const last = runs.find((r) => r.job === job.job && !isActive(r));
  const dirty =
    form.enabled !== job.enabled ||
    form.frequency !== job.frequency ||
    form.day_of_month !== job.day_of_month ||
    form.weekday !== job.weekday ||
    form.hour !== job.hour;
  const Icon = JOB_ICON[job.job];
  const set = <K extends keyof AgentJobSchedule>(key: K, value: AgentJobSchedule[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveAgentJobSchedule(job.job, form);
      toast.success("Plán uložen", {
        description: saved.next_run_at ? `Příští spuštění ${formatDateTime(saved.next_run_at)}` : "Job se spustí jen ručně.",
      });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const start = async () => {
    const cost = job.job === "collect" ? "Sběr trvá kolem 15 minut a ceníky čte AI (spotřebuje tokeny)." : "Report připravuje tým AI agentů (spotřebuje tokeny).";
    if (!window.confirm(`Spustit „${job.title}“ hned teď? ${cost}`)) return;
    setStarting(true);
    try {
      await requestAgentJob(job.job);
      toast.success("Job zařazen do fronty", { description: "Převezme ho worker služby app." });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const cancel = async (run: AgentJobRun) => {
    try {
      await cancelAgentJobRun(run.id);
      toast("Běh zrušen");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">{job.title}</h3>
            {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
          </div>
        </div>
        <Button onClick={() => void start()} disabled={starting || !!active}>
          {starting ? <Loader2 className="animate-spin" /> : <Play />} Spustit nyní
        </Button>
      </header>

      {active && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS[active.status].cls)}>{STATUS[active.status].label}</span>
              {active.status === "queued"
                ? `zadáno ${formatRelative(active.requested_at)} – čeká na worker služby app`
                : `převzal ${active.claimed_by ?? "worker"} ${active.started_at ? formatRelative(active.started_at) : ""}`}
            </span>
            {active.status === "queued" && (
              <Button size="sm" variant="ghost" onClick={() => void cancel(active)}>
                <X /> Zrušit
              </Button>
            )}
          </div>
          {active.status === "running" && <Progress value={active.progress} aria-label="Průběh jobu" />}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <Switch id={`enabled-${job.job}`} checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
          <Label htmlFor={`enabled-${job.job}`}>Spouštět automaticky podle plánu</Label>
        </div>
        <div className="space-y-1.5">
          <Label>Frekvence</Label>
          <Select value={form.frequency} onValueChange={(v) => set("frequency", v as JobFrequency)} disabled={!form.enabled}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.frequency === "weekly" ? (
          <div className="space-y-1.5">
            <Label>Den v týdnu</Label>
            <Select value={String(form.weekday)} onValueChange={(v) => set("weekday", Number(v))} disabled={!form.enabled}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d, i) => (
                  <SelectItem key={d} value={String(i + 1)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : form.frequency !== "daily" ? (
          <div className="space-y-1.5">
            <Label>{form.frequency === "quarterly" ? "Den v prvním měsíci čtvrtletí" : "Den v měsíci"}</Label>
            <Select value={String(form.day_of_month)} onValueChange={(v) => set("day_of_month", Number(v))} disabled={!form.enabled}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {i + 1}.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label>Čas spuštění</Label>
          <Select value={String(form.hour)} onValueChange={(v) => set("hour", Number(v))} disabled={!form.enabled}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, h) => (
                <SelectItem key={h} value={String(h)}>
                  {h}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Plán:</dt>
            <dd>{scheduleText(form)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Příští spuštění:</dt>
            <dd>{dirty ? "po uložení" : job.next_run_at ? formatDateTime(job.next_run_at) : "–"}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Naposledy:</dt>
            <dd>
              {last ? (
                <>
                  {formatDateTime(last.finished_at ?? last.requested_at)}{" "}
                  <span className={cn("ml-1 rounded-md px-1.5 py-0.5 text-xs font-medium", STATUS[last.status].cls)}>{STATUS[last.status].label}</span>
                </>
              ) : (
                "zatím nikdy"
              )}
            </dd>
          </div>
        </dl>
        <Button variant="outline" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />} Uložit plán
        </Button>
      </footer>
    </article>
  );
}

/**
 * Joby agentů (jen admin): plán automatického spouštění (výchozí jednou měsíčně), ruční spuštění
 * a historie běhů. Joby zpracovává worker služby `app` (CrewAI) – frontend jen zakládá běhy
 * ve frontě a čte jejich stav z databáze.
 */
export function AdminAgentsPanel() {
  const jobs = useApi(() => getAgentJobs(), []);
  const runs = useApi(() => getAgentJobRuns(), []);
  const reloadJobs = jobs.reload;
  const reloadRuns = runs.reload;
  const anyActive = runs.data?.some(isActive) ?? false;
  /** Aktuální čas pro upozornění na zaseknutou frontu (obnovuje se po minutě). */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Dokud něco čeká nebo běží, obnovovat stav každých 5 s.
  useEffect(() => {
    if (!anyActive) return;
    const id = window.setInterval(() => {
      reloadRuns();
      reloadJobs();
    }, 5000);
    return () => window.clearInterval(id);
  }, [anyActive, reloadJobs, reloadRuns]);

  const reloadAll = () => {
    reloadJobs();
    reloadRuns();
  };

  const error = jobs.error ?? runs.error;
  if (error instanceof AgentJobsMissingError) {
    return (
      <EmptyState
        icon={<Database />}
        title="Joby agentů zatím nejsou v databázi"
        description="Nahrajte do Supabase migraci frontend/supabase/migrations/20261118230000_agent_jobs.sql – vytvoří plán jobů (výchozí jednou měsíčně), frontu běhů a funkce pro worker služby app."
      />
    );
  }
  if (error) {
    return <EmptyState title="Joby se nepodařilo načíst" description={error.message} action={<Button onClick={reloadAll}>Zkusit znovu</Button>} />;
  }
  if (!jobs.data || !runs.data) return <Skeleton className="h-96 rounded-2xl" />;

  const history = runs.data;
  const lastClaim = history.find((r) => r.claimed_by && r.started_at);
  const staleQueued = history.find((r) => r.status === "queued" && now - new Date(r.requested_at).getTime() > STALE_QUEUE_MS);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Plán spouštění jobů služby <span className="font-mono text-xs">app</span> (CrewAI). Časy jsou v místním čase. Worker si naplánované i ručně
          spuštěné běhy bere z fronty v databázi a po sběru cen se přepočítají statistiky pro Trh a Trendy.
        </p>
        <Button variant="ghost" size="sm" onClick={reloadAll}>
          <RotateCw /> Obnovit
        </Button>
      </div>

      <p
        className={cn(
          "flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm",
          staleQueued || !lastClaim ? "bg-wood-soft text-wood-strong dark:bg-wood/10" : "bg-pine-soft text-pine",
        )}
      >
        {staleQueued || !lastClaim ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CalendarClock className="mt-0.5 size-4 shrink-0" />}
        <span>
          {staleQueued
            ? `Běh čeká ve frontě od ${formatDateTime(staleQueued.requested_at)} – worker služby app zřejmě neběží.`
            : lastClaim
              ? `Worker „${lastClaim.claimed_by}“ naposledy převzal běh ${formatRelative(lastClaim.started_at!)}.`
              : "Worker služby app se zatím nepřipojil – běhy se založí, ale zůstanou ve frontě, dokud nepoběží."}
        </span>
      </p>

      <div className="space-y-4">
        {jobs.data.map((job) => (
          <JobCard key={`${job.job}:${job.updated_at}`} job={job} runs={history} onChanged={reloadAll} />
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Historie běhů</h3>
        {!history.length ? (
          <p className="text-sm text-muted-foreground">Zatím žádný běh.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 font-medium">Spuštění</th>
                  <th className="px-3 py-2 font-medium">Stav</th>
                  <th className="px-3 py-2 font-medium">Zadáno</th>
                  <th className="px-3 py-2 font-medium">Doba</th>
                  <th className="px-3 py-2 font-medium">Výsledek</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{jobs.data?.find((j) => j.job === r.job)?.title ?? r.job}</td>
                    <td className="px-3 py-2">{r.trigger === "manual" ? "ručně" : "plán"}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS[r.status].cls)}>
                        {STATUS[r.status].label}
                        {r.status === "running" && ` ${r.progress} %`}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.requested_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{duration(r) ?? "–"}</td>
                    <td className="px-3 py-2">
                      <SummaryText run={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
