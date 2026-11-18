import { isValidElement, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb } from "lucide-react";
import { canOptimizeImage, slugify } from "@/lib/blog/utils";
import { cn } from "@/lib/utils";

/**
 * Typografie článku blogu (Markdown / GFM). Bez "use client" – renderuje se na serveru (SEO),
 * ale funguje i v klientském náhledu editoru.
 *
 * - `##` / `###` dostanou id → kotvy pro obsah článku
 * - samostatný obrázek `![alt](url "popisek")` → <figure> s popiskem
 * - interní odkazy (/kalkulacka) přes next/link, externí do nového okna
 * - citace → zvýrazněný box s tipem
 */

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

const components: Components = {
  h1: ({ children }) => <h2 className="mt-12 mb-4 scroll-mt-24 font-heading text-2xl font-semibold text-foreground sm:text-[1.7rem]">{children}</h2>,
  h2: ({ children }) => (
    <h2 id={slugify(textOf(children))} className="mt-12 mb-4 scroll-mt-24 font-heading text-2xl font-semibold text-foreground text-balance sm:text-[1.7rem]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 id={slugify(textOf(children))} className="mt-9 mb-3 scroll-mt-24 font-heading text-xl font-semibold text-foreground">
      {children}
    </h3>
  ),
  h4: ({ children }) => <h4 className="mt-7 mb-2 text-base font-semibold text-foreground">{children}</h4>,
  // obrázek samostatně v odstavci → bez <p>, aby <figure> nebyla uvnitř <p>
  p: ({ node, children }) => {
    const only = node?.children.length === 1 ? node.children[0] : null;
    if (only && only.type === "element" && only.tagName === "img") return <>{children}</>;
    return <p className="my-5 text-[1.0625rem] leading-8 text-foreground/85">{children}</p>;
  },
  img: ({ src, alt, title }) => {
    const url = typeof src === "string" ? src : undefined;
    const cls = "h-auto w-full rounded-2xl border border-border bg-muted object-cover";
    return (
      <figure className="my-9">
        {url && canOptimizeImage(url) ? (
          // zmenšená verze na šířku sloupce textu (~44 rem); poměr stran určí fotka sama (h-auto)
          <Image src={url} alt={alt ?? ""} width={1408} height={880} sizes="(min-width: 768px) 704px, 100vw" className={cls} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- náhled v editoru (blob:) nebo cizí URL
          <img src={url} alt={alt ?? ""} loading="lazy" decoding="async" className={cls} />
        )}
        {(title || alt) && <figcaption className="mt-2.5 px-1 text-center text-sm text-muted-foreground">{title || alt}</figcaption>}
      </figure>
    );
  },
  a: ({ href = "", children }) =>
    href.startsWith("/") || href.startsWith("#") ? (
      <Link href={href} className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
        {children}
      </Link>
    ) : (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
      >
        {children}
      </a>
    ),
  ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-[1.0625rem] leading-8 text-foreground/85 marker:text-moss">{children}</ul>,
  ol: ({ children }) => (
    <ol className="my-5 list-decimal space-y-2 pl-6 text-[1.0625rem] leading-8 text-foreground/85 marker:font-semibold marker:text-moss-strong">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 [&>p]:my-0">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-foreground/90 italic">{children}</em>,
  blockquote: ({ children }) => (
    <aside className="my-8 flex gap-4 rounded-2xl border border-moss/25 bg-moss-soft p-5 dark:bg-moss/10">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-moss text-white">
        <Lightbulb className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 [&_p]:my-0 [&_p]:text-base [&_p]:leading-7 [&_p]:text-foreground/85">{children}</div>
    </aside>
  ),
  hr: () => (
    <div className="my-10 flex justify-center gap-2 text-wood" aria-hidden>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </div>
  ),
  code: ({ children }) => <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>,
  pre: ({ children }) => <pre className="my-6 overflow-x-auto rounded-xl bg-[#1b221d] p-4 font-mono text-sm text-[#e6e0d4]">{children}</pre>,
  table: ({ children }) => (
    <div className="my-8 overflow-x-auto rounded-2xl border border-border">
      <table className="w-full border-collapse text-[0.95rem]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-wood-soft/70 dark:bg-wood/10">{children}</thead>,
  th: ({ children }) => <th className="border-b border-border px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-wood-strong uppercase">{children}</th>,
  td: ({ children }) => <td className="border-b border-border/70 px-4 py-2.5 align-top text-foreground/85">{children}</td>,
  tr: ({ children }) => <tr className="even:bg-muted/30 last:[&>td]:border-b-0">{children}</tr>,
};

/**
 * @param resolveUrl – volitelné přemapování URL (editor: `upload:abc` → náhled nahrané fotky).
 */
export function BlogProse({
  markdown,
  className,
  resolveUrl,
}: {
  markdown: string;
  className?: string;
  resolveUrl?: (url: string) => string | undefined;
}) {
  return (
    <div className={cn("min-w-0 [&>:first-child]:mt-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) => resolveUrl?.(url) ?? defaultUrlTransform(url)}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
