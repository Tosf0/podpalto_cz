import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/blog-index";
import { getBlogPosts } from "@/lib/api/blog";
import { SITE_URL } from "@/lib/blog/utils";

export const metadata: Metadata = {
  title: "Blog – rady a ceny palivového dřeva",
  description:
    "Rady, jak vybrat, skladovat a levně nakoupit palivové dřevo, pelety a brikety. Přehled cen tuhých paliv v ČR a průvodce jednotkami.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Blog podpalto.cz",
    description: "Rady, ceny a příběhy od kamen pro všechny, kdo topí dřevem.",
    url: `${SITE_URL}/blog`,
  },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog podpalto.cz",
    url: `${SITE_URL}/blog`,
    inLanguage: "cs-CZ",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.published_at,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BlogIndex posts={posts} />
    </>
  );
}
