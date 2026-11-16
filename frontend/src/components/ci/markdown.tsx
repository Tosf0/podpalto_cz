"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ className, ...p }) => <h2 className={cn("mt-6 mb-3 text-xl font-semibold", className)} {...p} />,
  h2: ({ className, ...p }) => <h3 className={cn("mt-6 mb-2 text-lg font-semibold", className)} {...p} />,
  h3: ({ className, ...p }) => <h4 className={cn("mt-5 mb-2 text-base font-semibold", className)} {...p} />,
  h4: ({ className, ...p }) => <h5 className={cn("mt-4 mb-1.5 text-sm font-semibold", className)} {...p} />,
  p: ({ className, ...p }) => <p className={cn("my-3 text-sm leading-relaxed text-foreground/90", className)} {...p} />,
  ul: ({ className, ...p }) => <ul className={cn("my-3 list-disc space-y-1.5 pl-5 text-sm marker:text-primary", className)} {...p} />,
  ol: ({ className, ...p }) => <ol className={cn("my-3 list-decimal space-y-1.5 pl-5 text-sm marker:font-semibold marker:text-primary", className)} {...p} />,
  li: ({ className, ...p }) => <li className={cn("leading-relaxed text-foreground/90", className)} {...p} />,
  strong: ({ className, ...p }) => <strong className={cn("font-semibold text-foreground", className)} {...p} />,
  a: ({ className, ...p }) => (
    <a
      className={cn("font-medium text-primary underline-offset-4 hover:underline", className)}
      target="_blank"
      rel="noopener noreferrer"
      {...p}
    />
  ),
  blockquote: ({ className, ...p }) => (
    <blockquote
      className={cn("my-4 rounded-r-xl border-l-4 border-moss/50 bg-accent px-4 py-2 text-sm text-muted-foreground italic", className)}
      {...p}
    />
  ),
  hr: () => <hr className="my-6 border-border" />,
  code: ({ className, ...p }) => (
    <code className={cn("rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em]", className)} {...p} />
  ),
  pre: ({ className, ...p }) => (
    <pre className={cn("my-4 overflow-x-auto rounded-xl bg-[#1b221d] p-4 font-mono text-xs text-[#e6e0d4]", className)} {...p} />
  ),
  table: ({ className, ...p }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-border">
      <table className={cn("w-full border-collapse text-sm", className)} {...p} />
    </div>
  ),
  thead: ({ className, ...p }) => <thead className={cn("bg-muted/60", className)} {...p} />,
  th: ({ className, ...p }) => (
    <th className={cn("border-b border-border px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase", className)} {...p} />
  ),
  td: ({ className, ...p }) => <td className={cn("border-b border-border/70 px-3 py-2 align-top", className)} {...p} />,
  tr: ({ className, ...p }) => <tr className={cn("last:[&>td]:border-b-0", className)} {...p} />,
};

/** Vykreslení Markdownu (GFM) s vlastní typografií. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("min-w-0 [&>:first-child]:mt-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
