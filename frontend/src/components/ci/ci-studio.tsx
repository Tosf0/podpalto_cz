"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Archive, Bot, FileText, FolderOutput, GitBranch, Radar, Wrench } from "lucide-react";
import { API_URL, IS_MOCK, getReports } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { RunPanel } from "./run-panel";
import { ReportArchive } from "./report-archive";
import { ReportViewer } from "./report-viewer";

function PipelineDiagram() {
  const node = "rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-soft";
  const arrow = <ArrowRight className="mx-auto size-4 shrink-0 rotate-90 text-muted-foreground lg:rotate-0" aria-hidden />;
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4 sm:p-5" aria-label="Schéma CrewAI flow">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        <GitBranch className="size-3.5" aria-hidden /> CompetitorAnalysisFlow
      </div>
      <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
        <div className={node}>
          <p className="font-mono font-semibold">validate_input</p>
          <p className="text-muted-foreground">@start · kontrola URL</p>
        </div>
        {arrow}
        <div className="flex-1 rounded-xl border border-moss/30 bg-accent p-3">
          <p className="flex items-center gap-1.5 font-mono text-xs font-semibold">
            <Bot className="size-3.5 text-moss-strong" aria-hidden /> run_research
            <span className="font-sans font-normal text-muted-foreground">· ResearchCrew, Process.sequential</span>
          </p>
          <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className={node}>
              <p className="font-mono font-semibold">web_researcher</p>
              <p className="flex items-center gap-1 text-muted-foreground">
                <Wrench className="size-3" aria-hidden /> PageTextTool
              </p>
            </div>
            {arrow}
            <div className={node}>
              <p className="font-mono font-semibold">market_analyst</p>
              <p className="text-muted-foreground">SWOT + doporučení</p>
            </div>
          </div>
        </div>
        {arrow}
        <div className={node}>
          <p className="font-mono font-semibold">save_report</p>
          <p className="text-muted-foreground">Markdown zápis</p>
        </div>
        {arrow}
        <div className={node}>
          <p className="flex items-center gap-1 font-mono font-semibold">
            <FolderOutput className="size-3.5" aria-hidden /> outputs/
          </p>
          <p className="text-muted-foreground">YYYYMMDD-HHMMSS_slug.md</p>
        </div>
      </div>
    </div>
  );
}

export function CiStudio() {
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
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Competitive Intelligence"
        title="CI Studio"
        icon={<Radar />}
        description="Automatická analýza konkurence: dva CrewAI agenti projdou web konkurenta, porovnají ho s podpalto.cz a připraví report se SWOT a doporučeními."
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
            {IS_MOCK ? "Mock režim – simulace" : `Připojeno: ${API_URL}`}
          </Badge>
        }
      />

      <PipelineDiagram />

      <RunPanel initialUrl={initialUrl} onCompleted={() => reload()} onOpenReport={openReport} />

      <section aria-labelledby="archive-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <Archive className="size-5 text-moss-strong" aria-hidden />
          <h2 id="archive-title" className="text-xl font-semibold">
            Archiv reportů <code className="font-mono text-sm font-normal text-muted-foreground">outputs/</code>
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ReportArchive reports={reports} loading={loading} selectedId={selectedId} onSelect={select} />
          <div id="report-viewer" className="min-w-0 scroll-mt-20">
            {selectedId ? (
              <ReportViewer key={selectedId} reportId={selectedId} />
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
                <FileText className="size-8 text-muted-foreground" aria-hidden />
                <p className="font-heading text-lg font-semibold">Vyberte report z archivu</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Zobrazí se souhrn, ceník, positioning, SWOT matice a doporučení pro podpalto.cz.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
