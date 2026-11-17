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
import { useI18n } from "@/lib/i18n/use-i18n";
import { t as tr, type MessageKey } from "@/lib/i18n/translate";
import { useApi } from "@/hooks/use-api";
import { EmptyState, FuelBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "./markdown";
import { SwotMatrix } from "./swot-matrix";

const TAB_LABEL: Record<ReportSectionKey, MessageKey> = {
  summary: "ci.viewer.tabs.summary",
  offering: "ci.viewer.tabs.offering",
  positioning: "ci.viewer.tabs.positioning",
  swot: "ci.viewer.tabs.swot",
  recommendations: "ci.viewer.tabs.recommendations",
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
    <ol className="grid gap-3 md:grid-cols-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-border bg-background p-4">
          <span className="num flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
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
    toast.success(tr("ci.viewer.copied"));
  } catch {
    toast.error(tr("ci.viewer.copyFailed"));
  }
}

function Meta({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "col-span-full min-w-0 space-y-0.5" : "min-w-0 space-y-0.5"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

export function ReportViewer({ reportId }: { reportId: string }) {
  const { t } = useI18n();
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
        title={t("ci.viewer.notFound")}
        description={error ? error.message : t("ci.viewer.notFoundHint", { id: reportId })}
      />
    );
  }

  const activeTab = sections.some((s) => s.key === tab) ? tab : (sections[0]?.key ?? "summary");

  return (
    <article className="min-w-0 space-y-6">
      <div className="min-w-0 space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-heading text-xl font-semibold">{report.competitor_name}</h3>
            <p className="font-mono text-xs break-all text-muted-foreground">{report.competitor_domain}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void copyMd(report)}>
              <Copy /> {t("ci.viewer.copyMd")}
            </Button>
            <Button size="sm" onClick={() => download(report)}>
              <Download /> {t("ci.viewer.downloadMd")}
            </Button>
          </div>
        </header>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <Markdown>{report.report}</Markdown>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setTab(v as ReportSectionKey)} className="gap-3">
            <div className="sticky top-14 z-20 -mx-1 overflow-x-auto bg-background/90 px-1 py-2 backdrop-blur lg:top-0">
              <TabsList variant="line" className="h-auto w-max gap-1 bg-transparent p-0">
                {sections.map((s) => (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="h-8 flex-none rounded-xl border-border px-3 data-active:border-primary/40 data-active:bg-accent data-active:text-accent-foreground"
                  >
                    {t(TAB_LABEL[s.key])}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {sections.map((s) => (
              <TabsContent key={s.key} value={s.key} className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
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
                          {t("ci.viewer.originalMd")}
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

      <section aria-label={t("ci.viewer.meta.aria")} className="rounded-2xl border border-border bg-card p-5">
        <h4 className="mb-3 text-sm font-semibold">{t("ci.viewer.meta.title")}</h4>
        {/* krátké hodnoty v mřížce, dlouhé (web, model, soubor) přes celou šířku – nic se neláme uprostřed slova */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          <Meta label={t("ci.viewer.meta.created")}>
            <span className="num">{formatDateTime(report.created_at)}</span>
          </Meta>
          <Meta label={t("ci.viewer.meta.duration")}>
            <span className="num">{t("ci.run.seconds", { value: Math.round(report.duration_s) })}</span>
          </Meta>
          {report.region && <Meta label={t("ci.viewer.meta.region")}>{REGIONS[report.region].name}</Meta>}
          {report.categories && report.categories.length > 0 && (
            <Meta label={t("ci.viewer.meta.fuels")}>
              <div className="flex flex-wrap gap-1">
                {report.categories.map((c) => (
                  <FuelBadge key={c} category={c} size="sm" />
                ))}
              </div>
            </Meta>
          )}
          {seller && (
            <Meta label={t("ci.viewer.meta.seller")}>
              <Link href={`/prodejci/${seller.slug}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <Store className="size-3.5" aria-hidden /> {seller.name}
              </Link>
            </Meta>
          )}
          <Meta label={t("ci.viewer.meta.website")} wide>
            <a
              href={report.competitor_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
            >
              <span className="truncate">{report.competitor_url}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          </Meta>
          <Meta label={t("ci.viewer.meta.model")} wide>
            <code className="font-mono text-xs">{report.model}</code>
          </Meta>
          <Meta label={t("ci.viewer.meta.file")} wide>
            <code className="block truncate font-mono text-xs" title={report.report_path}>
              {report.report_path}
            </code>
          </Meta>
        </dl>
      </section>
    </article>
  );
}
