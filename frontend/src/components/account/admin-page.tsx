"use client";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminBlogPanel } from "./admin-blog-panel";
import { AdminSettingsPanel } from "./admin-settings-panel";
import { ReviewQueuePage } from "./review-queue-page";

/** Administrace (/admin/kontrola): správa blogu a kontrola dat od agentů. Interní – jen česky. */
export function AdminPage({ initialTab = "blog" }: { initialTab?: "blog" | "data" | "nastaveni" }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={<ShieldCheck />}
        eyebrow="Administrace"
        title="Správa a kontrola"
        description="Schvalování článků na blogu, ruční kontrola cen a prodejců od agentů a nastavení aplikace."
      />
      <Tabs defaultValue={initialTab} className="gap-6">
        <TabsList>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="data">Data od agentů</TabsTrigger>
          <TabsTrigger value="nastaveni">Nastavení</TabsTrigger>
        </TabsList>
        <TabsContent value="blog">
          <AdminBlogPanel />
        </TabsContent>
        <TabsContent value="data">
          <ReviewQueuePage embedded />
        </TabsContent>
        <TabsContent value="nastaveni">
          <AdminSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
