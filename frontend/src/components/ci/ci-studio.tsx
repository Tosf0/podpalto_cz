"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, ChevronDown, FileText, Radar } from "lucide-react";
import { IS_MOCK, getReports } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/use-i18n";
import { PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { RunPanel } from "./run-panel";
import { ReportArchive } from "./report-archive";
import { ReportViewer } from "./report-viewer";

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} aria-hidden />
        {title}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Kompaktní schéma CrewAI flow – wrapuje se, žádný horizontální scroll. */
function PipelineDiagram() {
  const { t } = useI18n();
  const chip = "rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-xs";
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2" aria-label="CompetitorAnalysisFlow">
        <li className={chip}>validate_input</li>
        <li aria-hidden>→</li>
        <li className={cn(chip, "border-moss/30 bg-accent")}>run_research: web_researcher → market_analyst</li>
        <li aria-hidden>→</li>
        <li className={chip}>save_report</li>
        <li aria-hidden>→</li>
        <li className={chip}>outputs/YYYYMMDD-HHMMSS_slug.md</li>
      </ol>
      <p>{t("ci.studio.pipelineNote")}</p>
    </div>
  );
}

export function CiStudio() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("report");
  const initialUrl = params.get("url") ?? undefined;

  const { data: reports, loading, reload } = useApi(() => getReports(), []);

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("report", id);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const openReport = useCallback(
    (id: string) => {
      select(id);
      setTimeout(() => document.getElementById("report-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    },
    [select],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={t("ci.studio.title")}
        icon={<Radar />}
        description={t("ci.studio.description")}
        actions={
          <Badge
            variant="outline"
            className={
              IS_MOCK
                ? "h-6 rounded-lg border-dashed border-wood/60 bg-wood-soft px-2.5 text-wood-strong"
                : "h-6 rounded-lg border-moss/40 bg-moss-soft px-2.5 text-moss-strong"
            }
          >
            <span className={`size-1.5 rounded-full ${IS_MOCK ? "bg-wood" : "bg-moss"}`} aria-hidden />
            {IS_MOCK ? t("ci.studio.simulation") : t("ci.studio.connected")}
          </Badge>
        }
      />

      <RunPanel initialUrl={initialUrl} onCompleted={() => reload()} onOpenReport={openReport} />

      <section aria-labelledby="archive-title" className="space-y-4">
        <h2 id="archive-title" className="flex items-center gap-2 text-xl font-semibold">
          <Archive className="size-5 text-moss-strong" aria-hidden />
          {t("ci.studio.reports")}
        </h2>
        <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <ReportArchive reports={reports} loading={loading} selectedId={selectedId} onSelect={select} />
          <div id="report-viewer" className="min-w-0 scroll-mt-20">
            {selectedId ? (
              <ReportViewer key={selectedId} reportId={selectedId} />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
                <FileText className="size-8 text-muted-foreground" aria-hidden />
                <p className="font-heading text-lg font-semibold">{t("ci.studio.pickReport")}</p>
                <p className="text-sm text-muted-foreground">{t("ci.studio.pickReportHint")}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-label={t("ci.studio.forDevs")}>
        <Disclosure title={t("ci.studio.howItWorks")}>
          <PipelineDiagram />
        </Disclosure>
        <Disclosure title={t("ci.studio.apiContract")}>
          <pre className="overflow-x-auto rounded-xl bg-[#1b221d] p-4 font-mono text-xs leading-relaxed text-[#e6e0d4]">
            {`POST /api/analyze
{"competitor_url": "https://www.konkurent.cz"}
→ {"run_id": "run_ab12", "status": "queued"}

GET  /api/analyze/{run_id}      → AnalysisRun
     { status, progress, steps[], logs[], report_id?, error? }

GET  /api/reports               → CrewAnalysisReportSummary[]
GET  /api/reports/{id}          → CrewAnalysisReport (vč. Markdownu)`}
          </pre>
        </Disclosure>
      </section>
    </div>
  );
}
