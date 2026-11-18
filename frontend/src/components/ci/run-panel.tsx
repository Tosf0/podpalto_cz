"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileText,
  Globe,
  Loader2,
  Play,
  Terminal,
} from "lucide-react";
import type { AnalysisRun, CrewLogEntry, CrewStep } from "@/types";
import { ANALYSIS_POLL_MS, getAnalysisRun, startAnalysis } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/use-i18n";
import { t as tr, getCurrentLang, localeOf } from "@/lib/i18n/translate";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const EXAMPLES = [
  "https://www.palivo-ricany.cz",
  "https://www.drevo-praha.cz",
  "https://www.hradecke-pelety.cz",
  "https://www.brnenske-palivo.cz",
];

function validateUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return tr("ci.run.validation.empty");
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return tr("ci.run.validation.protocol");
    if (!u.hostname.includes(".")) return tr("ci.run.validation.domain");
    return null;
  } catch {
    return tr("ci.run.validation.invalid");
  }
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(localeOf(getCurrentLang()), { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function stepDuration(s: CrewStep): string | null {
  if (!s.started_at || !s.finished_at) return null;
  const sec = (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 1000;
  return tr("ci.run.seconds", { value: formatNumber(sec, 1) });
}

const LOG_STYLE: Record<CrewLogEntry["level"], { tag: string; cls: string }> = {
  info: { tag: "INFO", cls: "text-[#a9b3a5]" },
  tool: { tag: "TOOL", cls: "text-[#a9c0a8]" },
  thought: { tag: "THINK", cls: "text-[#d8c09a] italic" },
  success: { tag: "OK", cls: "text-[#8faa88]" },
  error: { tag: "ERR", cls: "text-[#d8957f]" },
};

function StepIcon({ status }: { status: CrewStep["status"] }) {
  if (status === "running") return <Loader2 className="size-5 animate-spin text-moss-strong" aria-label={tr("ci.run.stepRunning")} />;
  if (status === "done") return <CheckCircle2 className="size-5 text-moss-strong" aria-label={tr("ci.run.stepDone")} />;
  if (status === "error") return <AlertCircle className="size-5 text-clay-strong" aria-label={tr("ci.run.stepError")} />;
  return <Circle className="size-5 text-muted-foreground/50" aria-label={tr("ci.run.stepPending")} />;
}

export function RunPanel({
  initialUrl,
  onCompleted,
  onOpenReport,
}: {
  initialUrl?: string;
  onCompleted: (reportId: string) => void;
  onOpenReport: (reportId: string) => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  });

  // Polling stavu běhu
  useEffect(() => {
    if (!runId) return;
    let stopped = false;
    const stop = () => {
      stopped = true;
      clearInterval(timer);
    };

    const tick = async () => {
      try {
        const next = await getAnalysisRun(runId);
        if (stopped) return;
        setRun(next);
        if (next.status === "completed" || next.status === "failed") {
          stop();
          if (next.status === "completed" && next.report_id) {
            onCompletedRef.current(next.report_id);
            toast.success(tr("ci.run.toastDone"), { description: tr("ci.run.toastDoneHint") });
          } else if (next.status === "failed") {
            toast.error(tr("ci.run.toastFailed"), { description: next.error });
          }
        }
      } catch (e) {
        if (stopped) return;
        stop();
        toast.error(tr("ci.run.toastPollFailed"), { description: e instanceof Error ? e.message : undefined });
      }
    };

    const timer = setInterval(() => void tick(), ANALYSIS_POLL_MS);
    void tick();
    return stop;
  }, [runId]);

  // Auto-scroll konzole
  const logCount = run?.logs.length ?? 0;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logCount]);

  const running = starting || run?.status === "running" || run?.status === "queued";

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const err = validateUrl(url);
      setUrlError(err);
      if (err) return;
      setStarting(true);
      setRun(null);
      setRunId(null);
      try {
        const res = await startAnalysis({ competitor_url: url.trim() });
        setRunId(res.run_id);
      } catch (error) {
        toast.error(tr("ci.run.toastStartFailed"), {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setStarting(false);
      }
    },
    [url],
  );

  return (
    <Card className="rounded-2xl border border-border shadow-soft ring-0">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t("ci.run.title")}</CardTitle>
        <CardDescription>{t("ci.run.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Globe className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="url"
                inputMode="url"
                name="competitor_url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://www.konkurent.cz"
                aria-label={t("ci.run.urlLabel")}
                aria-invalid={urlError ? true : undefined}
                disabled={running}
                className="h-10 bg-card pl-9 font-mono text-sm"
              />
            </div>
            <Button type="submit" size="lg" disabled={running} className="h-10 px-5">
              {running ? <Loader2 className="animate-spin" /> : <Play />}
              {running ? t("ci.run.analyzing") : t("ci.run.start")}
            </Button>
          </div>
          {urlError && (
            <p role="alert" className="text-sm text-clay-strong">
              {urlError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("ci.run.tryExamples")}</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={running}
                onClick={() => {
                  setUrl(ex);
                  setUrlError(null);
                }}
                className="rounded-lg border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {ex.replace("https://", "")}
              </button>
            ))}
          </div>
        </form>

        {run && (
          <div className="space-y-4 border-t border-border pt-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {run.status === "completed"
                    ? t("ci.run.statusDone")
                    : run.status === "failed"
                      ? t("ci.run.statusFailed")
                      : run.status === "queued"
                        ? t("ci.run.statusQueued")
                        : t("ci.run.statusRunning")}
                </span>
                <span className="num text-muted-foreground">{run.progress} %</span>
              </div>
              <Progress
                value={run.progress}
                aria-label={t("ci.run.progressLabel")}
                className={cn("h-2", run.status === "failed" && "[&>div]:bg-clay", run.status === "completed" && "[&>div]:bg-moss")}
              />
            </div>

            <div className="space-y-4">
              <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {run.steps.map((s) => (
                  <li
                    key={s.id}
                    title={`${s.method}${s.agent_role ? " · " + s.agent_role : ""}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2",
                      s.status === "running" ? "border-moss/40 bg-accent/60" : "border-border bg-card",
                    )}
                  >
                    <StepIcon status={s.status} />
                    <div className="min-w-0">
                      <p className={cn("text-sm leading-tight font-medium", s.status === "pending" && "text-muted-foreground")}>{s.label}</p>
                      {stepDuration(s) && <p className="num text-xs text-muted-foreground">{stepDuration(s)}</p>}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="overflow-hidden rounded-xl border border-[#2f4535] bg-[#1b221d] shadow-soft">
                <div className="flex items-center gap-2 border-b border-[#2f4535] px-3 py-2 text-xs text-[#a9b3a5]">
                  <Terminal className="size-3.5" aria-hidden />
                  <span className="font-mono">crew.log</span>
                  <span className="num ml-auto">{t("ci.run.logLines", { count: run.logs.length })}</span>
                </div>
                <div ref={logRef} role="log" aria-live="polite" className="h-44 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
                  {run.logs.length === 0 && <p className="text-[#7f8a7c]">{t("ci.run.waiting")}</p>}
                  {run.logs.map((l, i) => {
                    const st = LOG_STYLE[l.level];
                    return (
                      <div key={i} className="flex gap-2 py-0.5">
                        <span className="shrink-0 text-[#5d6a5b]">{fmtTime(l.ts)}</span>
                        <span className={cn("w-11 shrink-0 font-semibold", st.cls)}>{st.tag}</span>
                        <span className={cn("min-w-0 break-words", st.cls, l.level === "info" && "text-[#d3d8cc]")}>{l.message}</span>
                      </div>
                    );
                  })}
                  {running && <span className="inline-block h-3.5 w-1.5 animate-pulse bg-[#7f8a7c] align-middle" aria-hidden />}
                </div>
              </div>
            </div>

            {run.status === "completed" && run.report_id && (
              <div className="flex flex-col gap-3 rounded-xl border border-moss/30 bg-moss-soft p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-moss-strong" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-moss-strong">{t("ci.run.completedTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("ci.run.completedHint")}</p>
                  </div>
                </div>
                <Button onClick={() => onOpenReport(run.report_id!)}>
                  <FileText /> {t("ci.run.showReport")}
                </Button>
              </div>
            )}

            {run.status === "failed" && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-clay/30 bg-clay-soft p-4">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-clay-strong" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-clay-strong">{t("ci.run.failedTitle")}</p>
                  <p className="text-sm text-muted-foreground">{run.error ?? t("ci.run.unknownError")}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
