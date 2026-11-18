import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { BlogProse } from "@/components/blog/blog-prose";
import { ListSkeleton } from "@/components/common";
import { getBlogPost, getBlogSlugs, getRelatedPosts } from "@/lib/api/blog";
import { SITE_URL, extractToc } from "@/lib/blog/utils";
import { breadcrumbJsonLd, jsonLd } from "@/lib/seo";

export async function generateStaticParams() {
  return (await getBlogSlugs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Článek nenalezen" };
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;
  return {
    title,
    description,
    keywords: post.tags,
    authors: [{ name: post.author.name }],
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author.name],
      tags: post.tags,
    },
    // Náhledový obrázek dodává opengraph-image.tsx (obálky jsou SVG, které sociální sítě nezobrazí).
    twitter: { card: "summary_large_image", title, description },
  };
}

async function Article({ slug }: { slug: string }) {
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const related = await getRelatedPosts(post);
  const { content, ...summary } = post;

  const isOrg = post.author.name.startsWith("Redakce");
  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description || post.excerpt,
    image: `${SITE_URL}/blog/${post.slug}/opengraph-image`,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: isOrg
      ? { "@type": "Organization", name: post.author.name, url: SITE_URL }
      : { "@type": "Person", name: post.author.name },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    keywords: post.tags.join(", "),
    inLanguage: "cs-CZ",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            article,
            breadcrumbJsonLd([
              { name: "Blog", path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ]),
        }}
      />
      <BlogArticle post={summary} toc={extractToc(content)} related={related}>
        <BlogProse markdown={content} />
      </BlogArticle>
    </>
  );
}

export default function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ListSkeleton count={3} />
        </div>
      }
    >
      {params.then(({ slug }) => (
        <Article slug={slug} />
      ))}
    </Suspense>
  );
}
