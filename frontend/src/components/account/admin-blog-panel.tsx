"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, EyeOff, ExternalLink, ImageOff, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { BlogPost, BlogPostStatus } from "@/types";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { revalidateBlog } from "@/app/blog/actions";
import {
  deleteBlogPost,
  fetchAllPosts,
  fetchOrphanImages,
  postImagePaths,
  publishBlogPost,
  rejectBlogPost,
  removeBlogImages,
  unpublishBlogPost,
} from "@/lib/blog/supabase";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Popisky stavů (interní stránka – jen česky). */
const STATUS_LABEL: Record<BlogPostStatus, string> = {
  pending: "Čeká na schválení",
  draft: "Koncept",
  published: "Publikováno",
  rejected: "Zamítnuto",
};

const STATUS_CLASS: Record<BlogPostStatus, string> = {
  pending: "bg-wood-soft text-wood-strong",
  draft: "bg-muted text-muted-foreground",
  published: "bg-pine-soft text-pine",
  rejected: "bg-clay-soft text-clay-strong",
};

const FILTERS: { value: BlogPostStatus | "all"; label: string }[] = [
  { value: "pending", label: "Ke schválení" },
  { value: "published", label: "Publikované" },
  { value: "draft", label: "Koncepty" },
  { value: "rejected", label: "Zamítnuté" },
  { value: "all", label: "Vše" },
];

type Busy = { id: string; action: string } | null;

/**
 * Správa blogu v administraci (role editor/admin): schvalování článků od uživatelů, publikace,
 * stažení z webu, úprava v editoru, mazání. Fotky smazaných a zamítnutých článků se mažou
 * z bucketu `blog-images`; tlačítko „Uklidit fotky“ smaže fotky, na které nic neodkazuje.
 */
export function AdminBlogPanel() {
  const { data, loading, error, reload } = useApi(() => fetchAllPosts(), []);
  const [filter, setFilter] = useState<BlogPostStatus | "all">("pending");
  const [busy, setBusy] = useState<Busy>(null);
  const [rejecting, setRejecting] = useState<BlogPost | null>(null);
  const [note, setNote] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length ?? 0 };
    for (const p of data ?? []) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [data]);

  const posts = useMemo(() => {
    const list = (data ?? []).filter((p) => filter === "all" || p.status === filter);
    // ve frontě nejdřív nejstarší odeslané
    return filter === "pending"
      ? [...list].sort((a, b) => (a.submitted_at ?? a.updated_at).localeCompare(b.submitted_at ?? b.updated_at))
      : list;
  }, [data, filter]);

  const run = async (post: BlogPost, action: string, fn: () => Promise<void>, done: string) => {
    setBusy({ id: post.id, action });
    try {
      await fn();
      await revalidateBlog();
      toast.success(done);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    const post = rejecting;
    setRejecting(null);
    await run(post, "reject", () => rejectBlogPost(post, note), "Článek zamítnut, jeho fotky jsou smazané");
    setNote("");
  };

  const remove = (post: BlogPost) => {
    const photos = postImagePaths(post).length;
    const msg = `Smazat článek „${post.title}“${photos ? ` a ${photos} fotek z úložiště` : ""}? Tuto akci nelze vrátit.`;
    if (!window.confirm(msg)) return;
    void run(post, "delete", () => deleteBlogPost(post), "Článek smazán");
  };

  const cleanOrphans = async () => {
    try {
      const orphans = await fetchOrphanImages();
      if (orphans.length === 0) {
        toast.success("Žádné nepoužité fotky – úložiště je čisté.");
        return;
      }
      const mb = orphans.reduce((s, o) => s + (o.size ?? 0), 0) / 1024 / 1024;
      if (!window.confirm(`Smazat ${orphans.length} fotek (${mb.toFixed(1)} MB), na které neodkazuje žádný článek?`)) return;
      const removed = await removeBlogImages(orphans.map((o) => o.name));
      toast.success(`Smazáno ${removed} nepoužitých fotek.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const isBusy = (post: BlogPost, action: string) => busy?.id === post.id && busy.action === action;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filtr stavu článků" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
            >
              {f.label} <span className="num opacity-70">{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void cleanOrphans()}>
            <ImageOff /> Uklidit fotky
          </Button>
          <Button size="sm" asChild>
            <Link href="/blog/novy">
              <Pencil /> Nový článek
            </Link>
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : error ? (
        <EmptyState title="Články se nepodařilo načíst" description={error.message} action={<Button onClick={reload}>Zkusit znovu</Button>} />
      ) : posts.length === 0 ? (
        <EmptyState
          title={filter === "pending" ? "Nic ke schválení" : "Žádné články"}
          description={filter === "pending" ? "Všechny články od uživatelů jsou vyřízené." : "V tomto stavu teď žádný článek není."}
        />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS_CLASS[p.status])}>{STATUS_LABEL[p.status]}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.author.name}
                    {p.status === "pending" && p.submitted_at && ` · odesláno ${formatDate(p.submitted_at)}`}
                    {p.status === "published" && p.published_at && ` · publikováno ${formatDate(p.published_at)}`}
                    {` · změna ${formatDate(p.updated_at)}`}
                  </span>
                </div>
                <p className="font-semibold">{p.title}</p>
                {p.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>}
                <p className="text-xs text-muted-foreground">
                  /blog/{p.slug} · {p.reading_minutes} min čtení · {postImagePaths(p).length} fotek v úložišti
                </p>
                {p.review_note && <p className="text-xs text-clay-strong">Poznámka k zamítnutí: {p.review_note}</p>}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {p.status !== "published" && (
                  <Button size="sm" onClick={() => void run(p, "publish", () => publishBlogPost(p.id), "Článek je publikovaný")} disabled={!!busy}>
                    {isBusy(p, "publish") ? <Loader2 className="animate-spin" /> : <Check />} Publikovat
                  </Button>
                )}
                {p.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => setRejecting(p)} disabled={!!busy}>
                    <X /> Zamítnout
                  </Button>
                )}
                {p.status === "published" && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink /> Zobrazit
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void run(p, "unpublish", () => unpublishBlogPost(p.id), "Článek stažen z webu")} disabled={!!busy}>
                      {isBusy(p, "unpublish") ? <Loader2 className="animate-spin" /> : <EyeOff />} Stáhnout z webu
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/blog/novy?id=${p.id}`}>
                    <Pencil /> Upravit
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p)} disabled={!!busy}>
                  {isBusy(p, "delete") ? <Loader2 className="animate-spin" /> : <Trash2 />} Smazat
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zamítnout článek</DialogTitle>
            <DialogDescription>
              Autor uvidí poznámku v editoru a může článek upravit a poslat znovu. Fotky článku se z úložiště smažou.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Co je potřeba upravit (nepovinné)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Zrušit
            </Button>
            <Button onClick={() => void confirmReject()}>
              <X /> Zamítnout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
