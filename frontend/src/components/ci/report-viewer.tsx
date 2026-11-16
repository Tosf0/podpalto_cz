"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Copy, Download, ExternalLink, FileText, Store } from "lucide-react";
import type { CrewAnalysisReport } from "@/types";
import { getReport, getSellers } from "@/lib/api";
import { splitReport, parseSwot, type ReportSectionKey } from "@/lib/report-parser";
import { formatDateTime } from "@/lib/format";
import { REGIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { EmptyState, FuelBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "./markdown";
import { SwotMatrix } from "./swot-matrix";

const TAB_LABEL: Record<ReportSectionKey, string> = {
  summary: "Summary",
  offering: "Offering & Pricing",
  positioning: "Positioning",
  swot: "SWOT",
  recommendations: "Recommendations for podpalto.cz",
};

/** Vytáhne očíslované/odrážkové položky z Markdownu (pokračovací řádky se připojí k předchozí položce). */
function listItems(body: string): string[] {
  const items: string[] = [];
  for (const raw of body.split("\n")) {
    const m = /^\s*(?:\d+[.)]|[-*+])\s+(.*)$/.exec(raw);
    if (m) items.push(m[1]);
    else if (raw.trim() && items.length > 0 && /^\s+/.test(raw)) items[items.length - 1] += ` ${raw.trim()}`;
  }
  return items;
}

function Recommendations({ body }: { body: string }) {
  const items = listItems(body);
  if (items.length === 0) return <Markdown>{body}</Markdown>;
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <span className="num flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
            {i + 1}
          </span>
          <Markdown className="[&_p]:my-0">{it}</Markdown>
        </li>
      ))}
    </ol>
  );
}

function download(report: CrewAnalysisReport) {
  const name = report.report_path.split(/[\\/]/).pop() || `${report.id}.md`;
  const blob = new Blob([report.report], { type: "text/markdown;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

async function copyMd(report: CrewAnalysisReport) {
  try {
    await navigator.clipboard.writeText(report.report);
    toast.success("Markdown zkopírován do schránky");
  } catch {
    toast.error("Kopírování se nezdařilo");
  }
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

export function ReportViewer({ reportId }: { reportId: string }) {
  const { data: report, loading, error } = useApi(() => getReport(reportId), [reportId]);
  const { data: sellers } = useApi(() => getSellers(), []);
  const [tab, setTab] = useState<ReportSectionKey>("summary");
  const [rawOpen, setRawOpen] = useState(false);

  const sections = useMemo(() => (report ? splitReport(report.report) : []), [report]);
  const swot = useMemo(() => (report ? (report.swot ?? parseSwot(report.report)) : undefined), [report]);
  const swotBody = sections.find((s) => s.key === "swot")?.body;
  const seller = report?.seller_id ? sellers?.find((s) => s.id === report.seller_id) : undefined;

  if (loading || (!report && !error)) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !report) {
    return (
      <EmptyState
        icon={<FileText />}
        title="Report nenalezen"
        description={error ? error.message : `Report ${reportId} v archivu neexistuje.`}
      />
    );
  }

  const activeTab = sections.some((s) => s.key === tab) ? tab : (sections[0]?.key ?? "summary");

  return (
    <article className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold tracking-wider text-moss-strong uppercase">Report konkurenta</p>
          <h3 className="text-xl font-semibold">{report.competitor_name}</h3>
          <p className="font-mono text-xs text-muted-foreground">{report.competitor_domain}</p>
        </header>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <Markdown>{report.report}</Markdown>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setTab(v as ReportSectionKey)} className="gap-4">
            <div className="sticky top-14 z-20 lg:top-0 -mx-1 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur">
              <TabsList variant="line" className="h-auto w-max gap-1 bg-transparent p-0">
                {sections.map((s) => (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="h-8 flex-none rounded-xl border-border px-3 data-active:border-primary/40 data-active:bg-accent data-active:text-accent-foreground"
                  >
                    {TAB_LABEL[s.key]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {sections.map((s) => (
              <TabsContent key={s.key} value={s.key} className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6">
                {s.key === "swot" && swot ? (
                  <div className="space-y-4">
                    <SwotMatrix swot={swot} />
                    {swotBody && (
                      <div className="border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() => setRawOpen((v) => !v)}
                          aria-expanded={rawOpen}
                          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className={cn("size-4 transition-transform", !rawOpen && "-rotate-90")} aria-hidden />
                          Zobrazit původní Markdown
                        </button>
                        {rawOpen && <Markdown className="mt-2">{swotBody}</Markdown>}
                      </div>
                    )}
                  </div>
                ) : s.key === "recommendations" ? (
                  <Recommendations body={s.body} />
                ) : (
                  <Markdown>{s.body}</Markdown>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      <aside className="space-y-3 xl:sticky xl:top-36 xl:self-start">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h4 className="mb-3 text-sm font-semibold">Metadata</h4>
          <dl className="space-y-3">
            <Meta label="competitor_url">
              <a
                href={report.competitor_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
              >
                {report.competitor_url} <ExternalLink className="size-3 shrink-0" aria-hidden />
              </a>
            </Meta>
            <Meta label="report_path">
              <code className="font-mono text-xs">{report.report_path}</code>
            </Meta>
            <Meta label="Vytvořeno">
              <span className="num">{formatDateTime(report.created_at)}</span>
            </Meta>
            <Meta label="Model">
              <code className="font-mono text-xs">{report.model}</code>
            </Meta>
            <Meta label="Doba běhu">
              <span className="num">{Math.round(report.duration_s)} s</span>
            </Meta>
            {report.region && <Meta label="Kraj">{REGIONS[report.region].name}</Meta>}
            {report.categories && report.categories.length > 0 && (
              <Meta label="Paliva">
                <div className="flex flex-wrap gap-1">
                  {report.categories.map((c) => (
                    <FuelBadge key={c} category={c} size="sm" />
                  ))}
                </div>
              </Meta>
            )}
            {seller && (
              <Meta label="Prodejce v katalogu">
                <Link href={`/prodejci/${seller.slug}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  <Store className="size-3.5" aria-hidden /> {seller.name}
                </Link>
              </Meta>
            )}
          </dl>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => download(report)} className="w-full">
            <Download /> Stáhnout .md
          </Button>
          <Button variant="outline" onClick={() => void copyMd(report)} className="w-full">
            <Copy /> Kopírovat Markdown
          </Button>
        </div>
      </aside>
    </article>
  );
}
