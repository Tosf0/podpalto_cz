"use client";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminBlogPanel } from "./admin-blog-panel";
import { ReviewQueuePage } from "./review-queue-page";

/** Administrace (/admin/kontrola): správa blogu a kontrola dat od agentů. Interní – jen česky. */
export function AdminPage({ initialTab = "blog" }: { initialTab?: "blog" | "data" }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={<ShieldCheck />}
        eyebrow="Administrace"
        title="Správa a kontrola"
        description="Schvalování článků na blogu a ruční kontrola cen a prodejců od agentů."
      />
      <Tabs defaultValue={initialTab} className="gap-6">
        <TabsList>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="data">Data od agentů</TabsTrigger>
        </TabsList>
        <TabsContent value="blog">
          <AdminBlogPanel />
        </TabsContent>
        <TabsContent value="data">
          <ReviewQueuePage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
