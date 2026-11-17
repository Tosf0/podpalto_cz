"use client";

import Link from "next/link";
import { CalendarDays, Clock, Newspaper } from "lucide-react";
import type { BlogCategory, BlogImage, BlogPostSummary } from "@/types";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CATEGORY_TONE: Record<BlogCategory, string> = {
  rady: "bg-moss-soft text-moss-strong dark:bg-moss/15",
  trh: "bg-wood-soft text-wood-strong dark:bg-wood/15",
  pruvodce: "bg-pine-soft text-pine dark:bg-pine/30 dark:text-pine-soft",
};

export function CategoryBadge({ category, className }: { category: BlogCategory; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold tracking-wide uppercase",
        CATEGORY_TONE[category],
        className,
      )}
    >
      {t(`blog.categories.${category}`)}
    </span>
  );
}

/** Úvodní obrázek; bez fotky zobrazí decentní dřevěnou plochu s ikonou. */
export function BlogCover({ image, className, priority }: { image: BlogImage | null; className?: string; priority?: boolean }) {
  if (!image) {
    return (
      <div className={cn("flex items-center justify-center bg-wood-soft text-wood dark:bg-wood/10", className)} aria-hidden>
        <Newspaper className="size-10" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL z Supabase Storage / /public, libovolný rozměr
    <img
      src={image.url}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("bg-muted object-cover", className)}
    />
  );
}

export function PostMeta({ post, className }: { post: Pick<BlogPostSummary, "published_at" | "reading_minutes">; className?: string }) {
  const { t } = useI18n();
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      {post.published_at && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden />
          <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5" aria-hidden />
        {t("blog.meta.minutes", { count: post.reading_minutes })}
      </span>
    </p>
  );
}

export function AuthorAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Karta článku do mřížky. */
export function PostCard({ post, className }: { post: BlogPostSummary; className?: string }) {
  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="aspect-[1200/630] overflow-hidden">
        <BlogCover image={post.cover} className="size-full transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <CategoryBadge category={post.category} className="self-start" />
        <h3 className="font-heading text-lg leading-snug font-semibold text-balance text-foreground">
          <Link href={`/blog/${post.slug}`} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <PostMeta post={post} className="mt-auto pt-1" />
      </div>
    </article>
  );
}
