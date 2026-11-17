import type { Metadata } from "next";
import { BlogEditor } from "@/components/blog/blog-editor";
import { getBlogDrafts } from "@/lib/api/blog";

export const metadata: Metadata = {
  title: "Nový článek – editor blogu",
  robots: { index: false, follow: false },
};

/** Editor blogu. Po napojení Supabase sem patří kontrola přihlášení redaktora (tabulka blog_editors). */
export default async function NewBlogPostPage() {
  const drafts = await getBlogDrafts();
  return <BlogEditor drafts={drafts} />;
}
