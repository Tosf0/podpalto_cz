/**
 * Blog ↔ Supabase (projekt „Podpalto“, tabulka `blog_posts`, bucket `blog-images`).
 *
 * - Čtení publikovaných článků běží na serveru čistým `fetch` přes REST (PostgREST) s veřejným klíčem –
 *   RLS vrací anonymům jen `status = 'published'`. Používá `src/lib/api/blog.ts` (cache `blog`).
 * - Zápis (editor) běží v prohlížeči přihlášeného redaktora (`profiles.role` editor/admin):
 *   `saveBlogPost` + `uploadBlogImage`, potom server action `revalidateBlog()`.
 */
import type { BlogCategory, BlogPost, BlogPostStatus } from "@/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";

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

/** Nahraje fotku do bucketu `blog-images` a vrátí její veřejnou URL (jen redaktor). */
export async function uploadBlogImage(file: File): Promise<string> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase není nakonfigurovaný.");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return blogImageUrl(path);
}

/** Data článku k uložení (bez generovaných sloupců). */
export type BlogPostInput = Omit<BlogRow, "id" | "updated_at"> & { id?: string; author_id: string | null };

/** Vloží nebo upraví článek a vrátí jeho ID (jen redaktor – jinak RLS zápis odmítne). */
export async function saveBlogPost(post: BlogPostInput): Promise<string> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase není nakonfigurovaný.");
  const { id, ...row } = post;
  const query = id
    ? supabase.from("blog_posts").update(row).eq("id", id).select("id").single()
    : supabase.from("blog_posts").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}
