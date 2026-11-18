"use client";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAgentsPanel } from "./admin-agents-panel";
import { AdminBlogPanel } from "./admin-blog-panel";
import { AdminClaimsPanel } from "./admin-claims-panel";
import { AdminSettingsPanel } from "./admin-settings-panel";
import { ReviewQueuePage } from "./review-queue-page";

/**
 * Administrace (/admin/kontrola). Admin: blog, kontrola dat od agentů, převzetí profilů,
 * plán jobů agentů (CrewAI) a nastavení.
 * Editor: jen správa blogu (bez mazání článků). Interní – jen česky.
 */
export function AdminPage({
  role,
  initialTab = "blog",
}: {
  role: "admin" | "editor";
  initialTab?: "blog" | "data" | "prevzeti" | "agenti" | "nastaveni";
}) {
  if (role === "editor") {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          icon={<ShieldCheck />}
          eyebrow="Administrace"
          title="Správa blogu"
          description="Všechny články: psaní, úpravy, schvalování, publikace a skrytí."
        />
        <AdminBlogPanel canDelete={false} />
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        icon={<ShieldCheck />}
        eyebrow="Administrace"
        title="Správa a kontrola"
        description="Schvalování článků na blogu, ruční kontrola cen a prodejců od agentů, spouštění agentů a nastavení aplikace."
      />
      <Tabs defaultValue={initialTab} className="gap-6">
        <TabsList>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="data">Data od agentů</TabsTrigger>
          <TabsTrigger value="prevzeti">Převzetí profilů</TabsTrigger>
          <TabsTrigger value="agenti">Agenti</TabsTrigger>
          <TabsTrigger value="nastaveni">Nastavení</TabsTrigger>
        </TabsList>
        <TabsContent value="blog">
          <AdminBlogPanel canDelete />
        </TabsContent>
        <TabsContent value="data">
          <ReviewQueuePage embedded />
        </TabsContent>
        <TabsContent value="prevzeti">
          <AdminClaimsPanel />
        </TabsContent>
        <TabsContent value="agenti">
          <AdminAgentsPanel />
        </TabsContent>
        <TabsContent value="nastaveni">
          <AdminSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
