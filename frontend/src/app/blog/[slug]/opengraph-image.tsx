import { getBlogPost, getBlogSlugs } from "@/lib/api/blog";
import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

const CATEGORY = { rady: "Rady a návody", trh: "Ceny a trh", pruvodce: "Průvodce" } as const;

export const alt = "Článek na blogu podpalto.cz";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  return (await getBlogSlugs()).map(({ slug }) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  return ogImage({
    eyebrow: post ? `Blog · ${CATEGORY[post.category]}` : "Blog",
    title: post?.title ?? "Blog podpalto.cz",
    subtitle: post ? `${post.reading_minutes} min čtení · ${post.author.name}` : undefined,
  });
}
