import { Suspense } from "react";
import type { Metadata } from "next";
import type { BlogPost } from "@/types";
import { BlogEditor } from "@/components/blog/blog-editor";
import { getBlogDrafts } from "@/lib/api/blog";
import { rowToPost, type BlogRow } from "@/lib/blog/supabase";
import { getServerAccount, getSupabaseServer } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Nový článek – editor blogu",
  robots: { index: false, follow: false },
};

/**
 * Editor blogu – vyžaduje přihlášení (hlídá proxy). Psát smí kdokoli přihlášený: běžný uživatel
 * článek uloží jako koncept nebo odešle ke schválení, redaktor/admin rovnou publikuje.
 * `?id=<uuid>` otevře konkrétní článek (odkaz „Upravit“ z administrace).
 */
async function EditorWithPosts({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  if (!SUPABASE_ENABLED) return <BlogEditor drafts={await getBlogDrafts()} canPublish={false} />;

  const [account, params] = await Promise.all([getServerAccount(), searchParams]);
  const initialId = typeof params.id === "string" ? params.id : undefined;
  const canPublish = account?.role === "editor" || account?.role === "admin";
  let posts: BlogPost[] = [];
  const supabase = await getSupabaseServer();
  if (supabase && account) {
    // redaktor vidí všechny články, ostatní jen své (RLS by vrátila i cizí publikované)
    let query = supabase.from("blog_posts").select("*").order("updated_at", { ascending: false }).limit(100);
    if (!canPublish) query = query.eq("author_id", account.userId);
    const { data } = await query;
    posts = ((data as BlogRow[] | null) ?? []).map(rowToPost);
  }
  return <BlogEditor drafts={posts} canPublish={canPublish} initialId={initialId} />;
}

export default function NewBlogPostPage({ searchParams }: PageProps<"/blog/novy">) {
  return (
    <Suspense fallback={null}>
      <EditorWithPosts searchParams={searchParams} />
    </Suspense>
  );
}
