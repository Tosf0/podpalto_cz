/**
 * Blog ↔ Supabase (projekt „Podpalto“, tabulka `blog_posts`, bucket `blog-images`).
 *
 * - Čtení publikovaných článků běží na serveru čistým `fetch` přes REST (PostgREST) s veřejným klíčem –
 *   RLS vrací anonymům jen `status = 'published'`. Používá `src/lib/api/blog.ts` (cache `blog`).
 * - Zápis běží v prohlížeči přihlášeného uživatele: `saveBlogPost` + `uploadBlogImage`, potom server
 *   action `revalidateBlog()`. Kdokoli přihlášený smí uložit koncept nebo poslat článek ke schválení
 *   (`pending`); publikovat a zamítat smí jen redaktor/admin (hlídá RLS + trigger `blog_posts_guard`).
 * - Fotky: bucket `blog-images`, cesta `<uid autora>/<rok-měsíc>/<uuid>.<ext>`. Při smazání nebo
 *   zamítnutí článku se jeho fotky z bucketu mažou (`removePostImages`).
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
  author_id?: string | null;
  submitted_at?: string | null;
  review_note?: string | null;
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
    author_id: row.author_id ?? null,
    submitted_at: row.submitted_at ?? null,
    review_note: row.review_note ?? null,
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

/** Nahraje fotku do složky autora v bucketu `blog-images` a vrátí její veřejnou URL. */
export async function uploadBlogImage(file: File, userId: string): Promise<string> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase není nakonfigurovaný.");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return blogImageUrl(path);
}

/** Data článku k uložení (bez generovaných sloupců). */
export type BlogPostInput = Omit<BlogRow, "id" | "updated_at"> & { id?: string; author_id: string | null };

/** Cesty fotek z bucketu `blog-images`, na které článek odkazuje (obálka + obrázky v textu). */
export function postImagePaths(post: Pick<BlogPost, "content" | "cover">): string[] {
  const prefix = `/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/`;
  const urls = [post.cover?.url ?? "", ...(post.content.match(/https?:\/\/[^\s)"']+/g) ?? [])];
  const paths = urls
    .map((u) => (u.includes(prefix) ? decodeURIComponent(u.slice(u.indexOf(prefix) + prefix.length).split(/[?#]/)[0]) : null))
    .filter((p): p is string => !!p);
  return [...new Set(paths)];
}

/** Smaže fotky z bucketu (redaktor kdekoli, autor jen ve své složce). Chyby jen hlásí – článek už je pryč. */
export async function removeBlogImages(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;
  const supabase = getSupabaseBrowser();
  if (!supabase) return 0;
  const { data, error } = await supabase.storage.from(BLOG_IMAGES_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/** Smaže článek i jeho fotky. */
export async function deleteBlogPost(post: BlogPost): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase není nakonfigurovaný.");
  const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
  if (error) throw new Error(error.message);
  await removeBlogImages(postImagePaths(post));
}

/** Odstraní z Markdownu obrázky z bucketu (po smazání fotek by zůstaly rozbité odkazy). */
function stripBucketImages(markdown: string): string {
  return markdown.replace(/!\[[^\]]*\]\(https?:\/\/[^)]*\/blog-images\/[^)]*\)\n?/g, "");
}

/** Admin: publikuje článek (datum = teď, pokud není zadané). */
export async function publishBlogPost(id: string, publishedAt = new Date().toISOString()): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase není nakonfigurovaný.");
  const { error } = await supabase.from("blog_posts").update({ status: "published", published_at: publishedAt, review_note: null }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Admin: stáhne článek z webu zpět do konceptů. */
export async function unpublishBlogPost(id: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase není nakonfigurovaný.");
  const { error } = await supabase.from("blog_posts").update({ status: "draft", published_at: null }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Admin: zamítne článek s poznámkou pro autora; fotky smaže z bucketu, aby nezabíraly místo. */
export async function rejectBlogPost(post: BlogPost, note: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Supabase není nakonfigurovaný.");
  const paths = postImagePaths(post);
  const { error } = await supabase
    .from("blog_posts")
    .update({
      status: "rejected",
      published_at: null,
      review_note: note.trim() || null,
      cover_url: post.cover?.url.includes(`/${BLOG_IMAGES_BUCKET}/`) ? null : (post.cover?.url ?? null),
      content: stripBucketImages(post.content),
    })
    .eq("id", post.id);
  if (error) throw new Error(error.message);
  await removeBlogImages(paths);
}

/** Admin: všechny články (koncepty, ke schválení, publikované, zamítnuté). */
export async function fetchAllPosts(): Promise<BlogPost[]> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase.from("blog_posts").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as BlogRow[]) ?? []).map(rowToPost);
}

/** Admin: fotky v bucketu, na které žádný článek neodkazuje (starší než den). */
export async function fetchOrphanImages(): Promise<{ name: string; size: number }[]> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("blog_orphan_images");
  if (error) throw new Error(error.message);
  return (data as { name: string; size: number }[]) ?? [];
}

/** Vloží nebo upraví článek a vrátí jeho ID (stav published/rejected smí nastavit jen redaktor – hlídá DB). */
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
