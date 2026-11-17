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
 * Editor blogu – vyžaduje přihlášení (hlídá proxy). Ukládat do databáze a publikovat smí jen redaktor
 * (`profiles.role` = editor / admin); ostatním se koncept uloží jen v prohlížeči.
 */
async function EditorWithPosts() {
  if (!SUPABASE_ENABLED) return <BlogEditor drafts={await getBlogDrafts()} canPublish={false} />;

  const account = await getServerAccount();
  const canPublish = account?.role === "editor" || account?.role === "admin";
  let posts: BlogPost[] = [];
  if (canPublish) {
    const supabase = await getSupabaseServer();
    const { data } = (await supabase?.from("blog_posts").select("*").order("updated_at", { ascending: false }).limit(50)) ?? {};
    posts = ((data as BlogRow[] | null) ?? []).map(rowToPost);
  }
  return <BlogEditor drafts={posts} canPublish={canPublish} />;
}

export default function NewBlogPostPage() {
  return (
    <Suspense fallback={null}>
      <EditorWithPosts />
    </Suspense>
  );
}
