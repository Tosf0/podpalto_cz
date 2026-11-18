"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map as MapIcon, Newspaper, PenLine, Search, X } from "lucide-react";
import type { BlogCategory, BlogPostSummary } from "@/types";
import { EmptyState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AuthorAvatar, BlogCover, CategoryBadge, PostCard, PostMeta } from "./blog-parts";

const CATEGORIES: BlogCategory[] = ["rady", "trh", "pruvodce"];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function FeaturedPost({ post }: { post: BlogPostSummary }) {
  const { t } = useI18n();
  return (
    <article className="group relative grid overflow-hidden rounded-3xl border border-border bg-card shadow-soft lg:grid-cols-[1.3fr_1fr]">
      <div className="aspect-[1200/630] overflow-hidden lg:aspect-auto lg:min-h-[320px]">
        <BlogCover
          image={post.cover}
          priority
          sizes="(min-width: 1280px) 720px, (min-width: 1024px) 56vw, 100vw"
          className="size-full transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
            {t("blog.index.featured")}
          </span>
          <CategoryBadge category={post.category} />
        </div>
        <h2 className="font-heading text-2xl leading-tight font-semibold text-balance xl:text-[1.85rem]">
          <Link href={`/blog/${post.slug}`} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {post.title}
          </Link>
        </h2>
        <p className="line-clamp-3 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <div className="flex items-center gap-3 pt-1">
          <AuthorAvatar name={post.author.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{post.author.name}</p>
            <PostMeta post={post} />
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {t("blog.index.readMore")}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </article>
  );
}

/** Výpis blogu: doporučený článek, rubriky, hledání a mřížka článků. */
export function BlogIndex({ posts }: { posts: BlogPostSummary[] }) {
  const { t } = useI18n();
  const [category, setCategory] = useState<BlogCategory | "all">("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length };
    for (const p of posts) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [posts]);

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return posts.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || normalize(`${p.title} ${p.excerpt} ${p.tags.join(" ")}`).includes(q)),
    );
  }, [posts, category, deferredQuery]);

  const showFeatured = category === "all" && !deferredQuery.trim() && filtered.length > 0;
  const featured = showFeatured ? filtered[0] : null;
  const rest = showFeatured ? filtered.slice(1) : filtered;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        icon={<Newspaper />}
        eyebrow={t("blog.index.eyebrow")}
        title={t("blog.index.title")}
        description={t("blog.index.description")}
        actions={
          <Button asChild>
            <Link href="/blog/novy">
              <PenLine /> {t("blog.index.write")}
            </Link>
          </Button>
        }
      />

      {featured && <FeaturedPost post={featured} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={t("blog.index.filterAria")} className="flex flex-wrap gap-1.5">
          {(["all", ...CATEGORIES] as const).map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/80 hover:bg-muted hover:text-foreground",
                )}
              >
                {t(`blog.categories.${c}`)}
                <span className={cn("num text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{counts[c] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <label className="relative flex h-10 w-full items-center sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("blog.index.search")}
            aria-label={t("blog.index.search")}
            className="h-10 w-full rounded-full border border-border bg-card pr-9 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("common.actions.clearAll")}
              className="absolute right-2 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("blog.index.count", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={<Search />} title={t("blog.index.emptyTitle")} description={t("blog.index.emptyText")} />
      ) : (
        rest.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )
      )}

      <section className="flex flex-col items-start gap-4 rounded-3xl bg-sidebar p-6 text-sidebar-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-semibold">{t("blog.index.ctaTitle")}</h2>
          <p className="text-sm text-sidebar-foreground/70">{t("blog.index.ctaText")}</p>
        </div>
        <Button asChild variant="secondary" className="shrink-0">
          <Link href="/">
            <MapIcon /> {t("blog.index.ctaButton")}
          </Link>
        </Button>
      </section>
    </div>
  );
}
