import { Suspense } from "react";
import { SellerDetail } from "@/components/sellers/seller-detail";
import { ListSkeleton } from "@/components/common";
import { getMockSellerSlugs } from "@/lib/api/sellers";

export async function generateStaticParams() {
  return getMockSellerSlugs().map((slug) => ({ slug }));
}

export const metadata = { title: "Profil prodejce" };

export default function ProdejceDetailPage({ params }: PageProps<"/prodejci/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ListSkeleton count={3} />
        </div>
      }
    >
      {params.then(({ slug }) => (
        <SellerDetail slug={slug} />
      ))}
    </Suspense>
  );
}
