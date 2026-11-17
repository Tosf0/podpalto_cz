/**
 * Blog – čtení článků NA SERVERU (stránky /blog a /blog/[slug] se renderují na serveru kvůli SEO).
 *
 * Zdroj dat:
 * - výchozí: dummy články ze `src/data/blog.ts`,
 * - po vyplnění NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: tabulka `blog_posts` v Supabase.
 *
 * Výsledky jsou cachované (`"use cache"`, tag `blog`). Po uložení článku v editoru stačí zavolat
 * `revalidateTag("blog")` (server action), aby se změna projevila.
 *
 * Neimportovat z klientských komponent – data předávejte jako props.
 */
import { cacheLife, cacheTag } from "next/cache";
import type { BlogPost, BlogPostSummary } from "@/types";
import { BLOG_POSTS } from "@/data/blog";
import { BLOG_USES_SUPABASE, fetchPublishedPosts } from "@/lib/blog/supabase";

function toSummary(post: BlogPost): BlogPostSummary {
  const { content: _content, ...rest } = post;
  void _content;
  return rest;
}

/** Všechny publikované články, nejnovější první. */
async function publishedPosts(): Promise<BlogPost[]> {
  "use cache";
  cacheTag("blog");
  cacheLife("hours");
  const all = BLOG_USES_SUPABASE ? await fetchPublishedPosts() : BLOG_POSTS;
  return all
    .filter((p) => p.status === "published" && p.published_at)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
}

/** Výpis článků (bez těla). */
export async function getBlogPosts(): Promise<BlogPostSummary[]> {
  return (await publishedPosts()).map(toSummary);
}

/** Jeden publikovaný článek podle slugu (null = neexistuje / koncept). */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return (await publishedPosts()).find((p) => p.slug === slug) ?? null;
}

/** Slugy pro generateStaticParams a sitemapu. */
export async function getBlogSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  return (await publishedPosts()).map((p) => ({ slug: p.slug, updated_at: p.updated_at }));
}

/** Související články: stejná rubrika nebo společný štítek, doplněno nejnovějšími. */
export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPostSummary[]> {
  const others = (await publishedPosts()).filter((p) => p.id !== post.id);
  const score = (p: BlogPost) =>
    (p.category === post.category ? 2 : 0) + p.tags.filter((tag) => post.tags.includes(tag)).length;
  return others
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map(({ p }) => toSummary(p));
}

/** Dummy koncepty pro editor (v Supabase: dotaz přihlášeného redaktora i na `status = 'draft'`). */
export async function getBlogDrafts(): Promise<BlogPost[]> {
  "use cache";
  cacheTag("blog");
  return BLOG_POSTS.filter((p) => p.status === "draft");
}
