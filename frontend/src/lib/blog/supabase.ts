/**
 * Příprava napojení blogu na Supabase (ZATÍM NEPOUŽITO – blog běží na dummy datech).
 *
 * Postup napojení:
 * 1. V Supabase spustit migraci `supabase/migrations/20261117000000_blog.sql`
 *    (tabulka `blog_posts`, RLS, bucket `blog-images`).
 * 2. Do `.env.local` / Vercelu doplnit `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 *    Jakmile jsou vyplněné, `src/lib/api/blog.ts` začne číst publikované články odsud přes REST (PostgREST).
 * 3. Pro editor (zápis, nahrávání fotek, přihlášení redaktorů) doinstalovat `@supabase/supabase-js`
 *    a `@supabase/ssr` a implementovat `saveBlogPost` / `uploadBlogImage` níže.
 *
 * Čtení je napsané čistým `fetch`, aby nebyla potřeba žádná závislost. Nebylo testováno proti
 * reálnému projektu – po napojení ověřit.
 */
import type { BlogCategory, BlogPost, BlogPostStatus } from "@/types";

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Blog čte ze Supabase, jen když jsou vyplněné obě proměnné. */
export const BLOG_USES_SUPABASE = SUPABASE_URL !== "" && SUPABASE_KEY !== "";

/** Bucket ve Supabase Storage pro obrázky článků (veřejné čtení). */
export const BLOG_IMAGES_BUCKET = "blog-images";

/** Řádek tabulky `blog_posts` (snake_case, plochá struktura). */
export interface BlogRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string | null;
  cover_alt: string | null;
  cover_credit: string | null;
  category: BlogCategory;
  tags: string[];
  author_name: string;
  author_role: string | null;
  author_avatar_url: string | null;
  status: BlogPostStatus;
  published_at: string | null;
  updated_at: string;
  reading_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
}

export function rowToPost(row: BlogRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    cover: row.cover_url ? { url: row.cover_url, alt: row.cover_alt ?? "", credit: row.cover_credit ?? undefined } : null,
    category: row.category,
    tags: row.tags ?? [],
    author: {
      name: row.author_name,
      role: row.author_role ?? undefined,
      avatar_url: row.author_avatar_url ?? undefined,
    },
    status: row.status,
    published_at: row.published_at,
    updated_at: row.updated_at,
    reading_minutes: row.reading_minutes,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
  };
}

export function postToRow(post: BlogPost): BlogRow {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    cover_url: post.cover?.url ?? null,
    cover_alt: post.cover?.alt ?? null,
    cover_credit: post.cover?.credit ?? null,
    category: post.category,
    tags: post.tags,
    author_name: post.author.name,
    author_role: post.author.role ?? null,
    author_avatar_url: post.author.avatar_url ?? null,
    status: post.status,
    published_at: post.published_at,
    updated_at: post.updated_at,
    reading_minutes: post.reading_minutes,
    seo_title: post.seo_title ?? null,
    seo_description: post.seo_description ?? null,
  };
}

/** Publikované články ze Supabase (REST). RLS vrací anonymům jen `status = 'published'`. */
export async function fetchPublishedPosts(): Promise<BlogPost[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?select=*&status=eq.published&order=published_at.desc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  if (!res.ok) throw new Error(`Supabase blog_posts: ${res.status} ${res.statusText}`);
  return ((await res.json()) as BlogRow[]).map(rowToPost);
}

/** Veřejná URL obrázku v bucketu `blog-images`. */
export function blogImageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/${path.replace(/^\/+/, "")}`;
}

/*
 * TODO po napojení (vyžaduje @supabase/supabase-js a přihlášeného redaktora):
 *
 * export async function saveBlogPost(post: BlogPost) {
 *   const { error } = await supabase.from("blog_posts").upsert(postToRow(post));
 *   if (error) throw error;
 *   // revalidateTag("blog") v server action, aby se změna hned projevila na webu
 * }
 *
 * export async function uploadBlogImage(file: File): Promise<string> {
 *   const path = `${crypto.randomUUID()}-${file.name}`;
 *   const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).upload(path, file);
 *   if (error) throw error;
 *   return blogImageUrl(path);
 * }
 */
