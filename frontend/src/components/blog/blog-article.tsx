"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Link2, ListTree, Map as MapIcon, Share2, Tag } from "lucide-react";
import type { BlogPostSummary } from "@/types";
import type { TocItem } from "@/lib/blog/utils";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthorAvatar, BlogCover, CategoryBadge, PostCard, PostMeta } from "./blog-parts";

/** Zvýrazní v obsahu nadpis, který je právě na obrazovce. */
function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (ids.length === 0) return;
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function TableOfContents({ items }: { items: TocItem[] }) {
  const { t } = useI18n();
  const active = useActiveHeading(items.map((i) => i.id));
  if (items.length < 2) return null;
  return (
    <nav aria-label={t("blog.article.toc")} className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        <ListTree className="size-4" aria-hidden /> {t("blog.article.toc")}
      </p>
      <ol className="space-y-0.5 border-l border-border">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={cn(
                "-ml-px block border-l-2 py-1.5 text-sm leading-snug transition-colors",
                it.level === 3 ? "pl-6" : "pl-3.5",
                active === it.id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ShareBox({ title }: { title: string }) {
  const { t } = useI18n();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("blog.article.copied"));
    } catch {
      toast.error(t("blog.article.copyFailed"));
    }
  };
  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: window.location.href });
      } catch {
        /* uživatel sdílení zrušil */
      }
    } else void copy();
  };
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={() => void copy()}>
        <Link2 /> {t("blog.article.copyLink")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => void share()} aria-label={t("blog.article.share")}>
        <Share2 />
      </Button>
    </div>
  );
}

/**
 * Kostra článku. Tělo (`children`) se renderuje na serveru (BlogProse), zde je jen „chrome“:
 * hlavička, obal, obsah článku, sdílení, štítky a související články – v jazyce uživatele.
 */
export function BlogArticle({
  post,
  toc,
  related,
  children,
}: {
  post: BlogPostSummary;
  toc: TocItem[];
  related: BlogPostSummary[];
  children: ReactNode;
}) {
  const { t } = useI18n();
  const updated = post.published_at && post.updated_at.slice(0, 10) > post.published_at.slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label={t("blog.article.breadcrumb")} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/blog" className="inline-flex items-center gap-1.5 font-medium hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {t("blog.article.back")}
        </Link>
        <ChevronRight className="size-3.5 opacity-50" aria-hidden />
        <span className="truncate">{t(`blog.categories.${post.category}`)}</span>
      </nav>

      <header className="max-w-3xl space-y-5">
        <CategoryBadge category={post.category} />
        <h1 className="font-heading text-3xl leading-tight font-semibold text-balance sm:text-4xl lg:text-[2.75rem]">{post.title}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">{post.excerpt}</p>
        <div className="flex items-center gap-3">
          <AuthorAvatar name={post.author.name} className="size-11" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {post.author.name}
              {post.author.role && <span className="font-normal text-muted-foreground"> · {post.author.role}</span>}
            </p>
            <PostMeta post={post} />
          </div>
        </div>
      </header>

      {post.cover && (
        <figure className="mt-8">
          <BlogCover image={post.cover} priority className="aspect-[1200/630] w-full rounded-3xl border border-border" />
          {post.cover.credit && <figcaption className="mt-2 text-right text-xs text-muted-foreground">{post.cover.credit}</figcaption>}
        </figure>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-16">
        <div className="min-w-0">
          <div className="max-w-[44rem]">{children}</div>

          {updated && (
            <p className="mt-10 text-sm text-muted-foreground">{t("blog.meta.updated", { date: formatDate(post.updated_at) })}</p>
          )}

          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
              <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Tag className="size-4" aria-hidden /> {t("blog.article.tags")}
              </span>
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground/80">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
            <AuthorAvatar name={post.author.name} className="size-12 text-base" />
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("blog.meta.by")}</p>
              <p className="font-heading text-lg font-semibold">{post.author.name}</p>
              {post.author.role && <p className="text-sm text-muted-foreground">{post.author.role}</p>}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <TableOfContents items={toc} />
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("blog.article.share")}</p>
            <ShareBox title={post.title} />
          </div>
          <div className="space-y-3 rounded-2xl bg-sidebar p-5 text-sidebar-foreground">
            <p className="font-heading text-lg leading-snug font-semibold">{t("blog.index.ctaTitle")}</p>
            <p className="text-sm text-sidebar-foreground/70">{t("blog.index.ctaText")}</p>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link href="/">
                <MapIcon /> {t("blog.index.ctaButton")}
              </Link>
            </Button>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="mb-6 font-heading text-2xl font-semibold">{t("blog.article.related")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
