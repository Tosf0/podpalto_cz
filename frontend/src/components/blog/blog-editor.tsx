"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Columns2,
  Eye,
  FilePen,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  RotateCcw,
  Save,
  Send,
  Table2,
  Trash2,
  Clock,
  X,
  FilePlus2,
  type LucideIcon,
} from "lucide-react";
import type { BlogCategory, BlogPost, BlogPostStatus } from "@/types";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { estimateReadingMinutes, plainText, slugify } from "@/lib/blog/utils";
import { deleteBlogPost, fetchEditorPosts, saveBlogPost, uploadBlogImage } from "@/lib/blog/supabase";
import { USES_DB } from "@/lib/api/db";
import { useAuth } from "@/components/providers/auth-provider";
import { revalidateBlog } from "@/app/blog/actions";
import { formatDate, formatNumber } from "@/lib/format";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BlogCover, CategoryBadge } from "./blog-parts";
import { BlogProse } from "./blog-prose";

/**
 * Editor článku. Koncept se průběžně drží v localStorage. Přihlášený uživatel ho ukládá do Supabase
 * (`blog_posts`) jako koncept nebo ho odešle ke schválení; publikuje redaktor/admin (i v administraci
 * /admin/kontrola → Blog).
 *
 * Fotky: vložená fotka se v textu objeví jako `![popis](upload:<id> "popisek")` a náhled ji zobrazí
 * z mapy `images`. Při uložení do databáze se soubor nahraje do bucketu `blog-images`
 * a `upload:<id>` se nahradí veřejnou URL.
 */

const STORAGE_KEY = "podpalto:blog-draft:v1";
const CATEGORIES: BlogCategory[] = ["rady", "trh", "pruvodce"];

interface Draft {
  /** ID článku v databázi (po prvním uložení). */
  id?: string;
  /** Původní autor – při úpravě cizího článku adminem se nepřepisuje. */
  authorId?: string | null;
  authorName?: string;
  authorRole?: string | null;
  reviewNote?: string | null;
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  category: BlogCategory;
  tags: string;
  cover: { url: string; alt: string; credit?: string } | null;
  content: string;
  status: BlogPostStatus;
  publishDate: string;
  seoTitle: string;
  seoDescription: string;
  /** id → data URL nahraných fotek (jen náhled, po napojení URL ze Supabase Storage). */
  images: Record<string, string>;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Adresa editoru: uložený článek má `?id=…`, nový článek čistou `/blog/novy` (bez přenačtení stránky). */
function setEditorUrl(id?: string) {
  try {
    window.history.replaceState(window.history.state, "", id ? `/blog/novy?id=${id}` : "/blog/novy");
  } catch {
    /* ignorovat */
  }
}

const EMPTY: Draft = {
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  category: "rady",
  tags: "",
  cover: null,
  content: "",
  status: "draft",
  publishDate: today(),
  seoTitle: "",
  seoDescription: "",
  images: {},
};

function fromPost(p: BlogPost): Draft {
  return {
    ...EMPTY,
    id: USES_DB ? p.id : undefined,
    authorId: p.author_id ?? null,
    authorName: p.author.name,
    authorRole: p.author.role ?? null,
    reviewNote: p.review_note ?? null,
    title: p.title,
    slug: p.slug,
    slugTouched: true,
    excerpt: p.excerpt,
    category: p.category,
    tags: p.tags.join(", "),
    cover: p.cover ? { url: p.cover.url, alt: p.cover.alt, credit: p.cover.credit ?? "" } : null,
    content: p.content,
    status: p.status,
    publishDate: (p.published_at ?? new Date().toISOString()).slice(0, 10),
    seoTitle: p.seo_title ?? "",
    seoDescription: p.seo_description ?? "",
  };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

type Mode = "write" | "split" | "preview";

function ToolButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4 rounded-2xl border border-border bg-card p-5", className)}>
      {title && <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>}
      {children}
    </section>
  );
}

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const splitTags = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** Štítky jako pilulky: Enter nebo čárka přidá, × / Backspace odebere, návrhy z existujících štítků. */
function TagInput({ value, onChange, suggestions }: { value: string; onChange: (v: string) => void; suggestions: string[] }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const tags = splitTags(value);
  const lower = new Set(tags.map((x) => x.toLocaleLowerCase("cs")));
  const add = (raw: string) => {
    const tag = raw.replace(/,/g, " ").trim().slice(0, 40);
    if (!tag || lower.has(tag.toLocaleLowerCase("cs"))) return;
    onChange([...tags, tag].join(", "));
  };
  const remove = (tag: string) => onChange(tags.filter((x) => x !== tag).join(", "));
  const q = text.trim().toLocaleLowerCase("cs");
  const offer = suggestions.filter((s) => !lower.has(s.toLocaleLowerCase("cs")) && (!q || s.toLocaleLowerCase("cs").includes(q))).slice(0, 14);

  return (
    <div className="space-y-2">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-xl border border-input px-2 py-1.5 focus-within:ring-3 focus-within:ring-ring/30">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-xs font-medium text-secondary-foreground">
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={t("blog.editor.fields.tagRemove", { tag })}
              className="flex size-4 items-center justify-center rounded-full hover:bg-foreground/10"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id="post-tags"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) {
              v.split(",").slice(0, -1).forEach(add);
              setText(v.split(",").at(-1) ?? "");
            } else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
              setText("");
            } else if (e.key === "Backspace" && !text && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          onBlur={() => {
            if (text.trim()) {
              add(text);
              setText("");
            }
          }}
          placeholder={tags.length ? "" : t("blog.editor.fields.tagsPlaceholder")}
          className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      {offer.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("blog.editor.fields.tagsSuggest")}:</span>
          {offer.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlogEditor({
  drafts: initialDrafts,
  canPublish,
  initialId,
}: {
  drafts: BlogPost[];
  canPublish: boolean;
  initialId?: string;
}) {
  /** Články v postranním panelu – po uložení se načtou znovu. */
  const [drafts, setDrafts] = useState<BlogPost[]>(initialDrafts);
  const { t } = useI18n();
  const { user, profile, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  /** Soubory vybrané v tomto sezení – nahrají se do Storage při uložení (id → File, "cover" → obálka). */
  const filesRef = useRef(new Map<string, File>());
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [mode, setMode] = useState<Mode>("split");
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Při otevření: `?id=…` otevře uložený článek; bez něj se obnoví jen NEULOŽENÝ rozepsaný koncept
  // z prohlížeče (bez id). Uložený článek se do „Nového článku“ nikdy nenačte – jinak by se přepsal.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const fromLink = initialId ? initialDrafts.find((p) => p.id === initialId) : undefined;
      const raw = localStorage.getItem(STORAGE_KEY);
      const local = raw ? (JSON.parse(raw) as Partial<Draft>) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- načtení až po hydrataci
      if (fromLink) setDraft(fromPost(fromLink));
      else if (local && !local.id) setDraft({ ...EMPTY, ...local });
      else if (initialId) setEditorUrl();
    } catch {
      /* localStorage nedostupné */
    }
    setLoaded(true);
  }, [initialId, initialDrafts]);

  /** Znovu načíst seznam článků v panelu (po uložení / smazání). */
  const refreshDrafts = useCallback(async () => {
    if (!USES_DB || !user) return;
    try {
      setDrafts(await fetchEditorPosts(canPublish ? undefined : user.id));
    } catch {
      /* seznam zůstane, jak byl */
    }
  }, [canPublish, user]);

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === "title" && !d.slugTouched) next.slug = slugify(String(value));
      return next;
    });
  }, []);

  /* --------------------------- vkládání do textu --------------------------- */

  const replaceSelection = useCallback((build: (selected: string) => { text: string; selectFrom: number; selectTo: number }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const { text, selectFrom, selectTo } = build(value.slice(s, e));
    const next = value.slice(0, s) + text + value.slice(e);
    setDraft((d) => ({ ...d, content: next }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + selectFrom, s + selectTo);
    });
  }, []);

  const wrap = (before: string, after: string, placeholder: string) =>
    replaceSelection((sel) => {
      const inner = sel || placeholder;
      return { text: `${before}${inner}${after}`, selectFrom: before.length, selectTo: before.length + inner.length };
    });

  /** Prefix na začátek každého vybraného řádku (nadpisy, seznamy, citace). */
  const prefixLines = (prefix: (i: number) => string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const lineStart = ta.value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    ta.setSelectionRange(lineStart, ta.selectionEnd);
    replaceSelection((sel) => {
      const lines = (sel || placeholder).split("\n");
      const text = lines.map((l, i) => `${prefix(i)}${l.replace(/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s?)/, "")}`).join("\n");
      return { text, selectFrom: 0, selectTo: text.length };
    });
  };

  const insertBlock = (block: string) =>
    replaceSelection(() => {
      const text = `\n\n${block}\n\n`;
      return { text, selectFrom: text.length, selectTo: text.length };
    });

  const onImagePicked = async (file: File | undefined) => {
    if (!file) return;
    const id = Math.random().toString(36).slice(2, 8);
    const dataUrl = await readFile(file);
    filesRef.current.set(id, file);
    setDraft((d) => ({ ...d, images: { ...d.images, [id]: dataUrl } }));
    insertBlock(`![${t("blog.editor.snippets.imageAlt")}](upload:${id} "${t("blog.editor.snippets.imageCaption")}")`);
  };

  const onCoverPicked = async (file: File | undefined) => {
    if (!file) return;
    const url = await readFile(file);
    filesRef.current.set("cover", file);
    setDraft((d) => ({ ...d, cover: { url, alt: d.cover?.alt ?? "" } }));
  };

  const resolveUrl = useCallback(
    (url: string) => (url.startsWith("upload:") ? draft.images[url.slice(7)] : url.startsWith("data:image/") ? url : undefined),
    [draft.images],
  );

  /* ------------------------------ akce ------------------------------ */

  const saveLocal = (d: Draft, quiet = false) => {
    // uložený článek (s id) žije v databázi – v prohlížeči držíme jen neuložený rozepsaný koncept
    if (d.id && USES_DB) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignorovat */
      }
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {
      // příliš velké fotky pro localStorage – uložit aspoň text
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...d, images: {}, cover: null }));
    }
    if (!quiet) toast.success(t("blog.editor.actions.saved"));
  };

  /** Nahraje nové fotky do Storage a nahradí `upload:<id>` / data URL obálky veřejnými URL. */
  const uploadPending = async (d: Draft, userId: string): Promise<Draft> => {
    let content = d.content;
    const images = { ...d.images };
    for (const [id, file] of filesRef.current) {
      if (id === "cover" || !content.includes(`upload:${id}`)) continue;
      const url = await uploadBlogImage(file, userId);
      content = content.split(`upload:${id}`).join(url);
      delete images[id];
      filesRef.current.delete(id);
    }
    let cover = d.cover;
    const coverFile = filesRef.current.get("cover");
    if (cover?.url.startsWith("data:") && coverFile) {
      cover = { ...cover, url: await uploadBlogImage(coverFile, userId) };
      filesRef.current.delete("cover");
    }
    return { ...d, content, images, cover };
  };

  /** Uloží článek do databáze. Bez práv redaktora se „publikovat“ mění na „odeslat ke schválení“. */
  const save = async (requested: BlogPostStatus = draft.status) => {
    const status: BlogPostStatus =
      USES_DB && !canPublish && (requested === "published" || requested === "rejected") ? "pending" : requested;
    if (!draft.title.trim()) {
      toast.error(t("blog.editor.actions.missingTitle"));
      return;
    }
    const base = { ...draft, status };
    if (!USES_DB) {
      saveLocal(base);
      if (status === "published") toast(t("blog.editor.actions.publishToast"), { description: t("blog.editor.actions.publishToastDesc") });
      return;
    }
    if (!user) {
      saveLocal(base, true);
      toast(t("account.editor.noRights"));
      return;
    }
    if (!canPublish && draft.id && draft.status === "published") {
      toast.error(t("account.editor.publishedLocked"));
      return;
    }
    setSaving(true);
    try {
      if (filesRef.current.size > 0) toast(t("account.editor.uploading"));
      const ready = await uploadPending(base, user.id);
      const publishedAt = status === "published" ? new Date(`${ready.publishDate}T08:00:00`).toISOString() : null;
      const id = await saveBlogPost({
        id: ready.id,
        slug: ready.slug || slugify(ready.title),
        title: ready.title.trim(),
        excerpt: ready.excerpt.trim(),
        content: ready.content,
        cover_url: ready.cover?.url ?? null,
        cover_alt: ready.cover?.alt ?? null,
        cover_credit: ready.cover?.credit?.trim() || null,
        category: ready.category,
        tags: ready.tags.split(",").map((x) => x.trim()).filter(Boolean),
        // při úpravě existujícího článku (třeba adminem) zůstává původní autor
        author_id: ready.id ? (ready.authorId ?? user.id) : user.id,
        // editor/admin může jméno a roli autora nastavit ručně (podpis článku)
        author_name:
          (canPublish && ready.authorName?.trim()) ||
          (ready.id && ready.authorName ? ready.authorName : profile?.full_name?.trim() || t("account.editor.anonymousAuthor")),
        author_role: canPublish ? ready.authorRole?.trim() || null : ready.id ? (ready.authorRole ?? null) : null,
        author_avatar_url: ready.id ? null : (profile?.avatar_url ?? null),
        status,
        published_at: publishedAt,
        reading_minutes: estimateReadingMinutes(ready.content),
        seo_title: ready.seoTitle.trim() || null,
        seo_description: ready.seoDescription.trim() || null,
      });
      const saved = { ...ready, id, authorId: ready.authorId ?? user.id };
      setDraft(saved);
      saveLocal(saved, true);
      setEditorUrl(id);
      void refreshDrafts();
      await revalidateBlog();
      if (status === "pending") toast.success(t("account.editor.submitted"), { description: t("account.editor.submittedDesc") });
      else toast.success(status === "published" ? t("account.editor.published") : t("account.editor.saved"));
    } catch (err) {
      saveLocal(base, true);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(/blog_posts_slug_key|duplicate key/.test(message) ? t("account.editor.slugTaken") : t("account.editor.failed", { message }));
    } finally {
      setSaving(false);
    }
  };

  const contributor = USES_DB && !canPublish;
  const publish = () => void save(contributor ? "pending" : "published");
  const publishLabel = contributor ? t("account.editor.submit") : t("blog.editor.actions.publish");

  /** Smaže uložený článek z databáze i s jeho fotkami v úložišti. */
  const removeSaved = async () => {
    if (!draft.id || !USES_DB) return;
    if (!window.confirm(t("account.editor.deleteConfirm"))) return;
    const stored = drafts.find((p) => p.id === draft.id);
    setSaving(true);
    try {
      await deleteBlogPost(
        stored ?? ({ id: draft.id, content: draft.content, cover: draft.cover ? { url: draft.cover.url, alt: draft.cover.alt } : null } as BlogPost),
      );
      await revalidateBlog();
      toast.success(t("account.editor.deleted"));
      setDraft({ ...EMPTY, publishDate: today() });
      setEditorUrl();
      void refreshDrafts();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignorovat */
      }
    } catch (err) {
      toast.error(t("account.editor.failed", { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setSaving(false);
    }
  };

  /** Zahodit neuložené změny: uložený článek se vrátí do uložené podoby, nový se vyčistí. */
  const reset = () => {
    const stored = draft.id ? drafts.find((p) => p.id === draft.id) : undefined;
    filesRef.current.clear();
    if (stored) {
      setDraft(fromPost(stored));
    } else {
      setDraft({ ...EMPTY, publishDate: today() });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignorovat */
      }
    }
    toast(t("blog.editor.actions.resetDone"));
  };

  /** Začít nový článek – uložené články zůstávají v databázi beze změny. */
  const newPost = () => {
    filesRef.current.clear();
    setDraft({ ...EMPTY, publishDate: today() });
    setEditorUrl();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorovat */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ------------------------------ odvozené ------------------------------ */

  /** Štítky, které už na blogu jsou (seřazené podle četnosti) – návrhy pro TagInput. */
  const knownTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of drafts) for (const tag of p.tags) count.set(tag, (count.get(tag) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "cs")).map(([tag]) => tag);
  }, [drafts]);

  const words = useMemo(() => plainText(draft.content).split(" ").filter(Boolean).length, [draft.content]);
  const minutes = estimateReadingMinutes(draft.content);
  const seoTitle = draft.seoTitle || draft.title;
  const seoDescription = draft.seoDescription || draft.excerpt;

  type ToolAction = "h2" | "h3" | "bold" | "italic" | "link" | "ul" | "ol" | "quote" | "image" | "table" | "hr";

  function runTool(action: ToolAction) {
    switch (action) {
      case "h2":
        return prefixLines(() => "## ", t("blog.editor.snippets.h2"));
      case "h3":
        return prefixLines(() => "### ", t("blog.editor.snippets.h3"));
      case "bold":
        return wrap("**", "**", t("blog.editor.snippets.bold"));
      case "italic":
        return wrap("*", "*", t("blog.editor.snippets.italic"));
      case "link":
        return wrap("[", "](https://)", t("blog.editor.snippets.linkText"));
      case "ul":
        return prefixLines(() => "- ", t("blog.editor.snippets.li"));
      case "ol":
        return prefixLines((i) => `${i + 1}. `, t("blog.editor.snippets.li"));
      case "quote":
        return prefixLines(() => "> ", t("blog.editor.snippets.quote"));
      case "image":
        return imageInputRef.current?.click();
      case "table":
        return insertBlock(t("blog.editor.snippets.table"));
      case "hr":
        return insertBlock("---");
    }
  }

  const toolbar: { icon: LucideIcon; action: ToolAction }[] = [
    { icon: Heading2, action: "h2" },
    { icon: Heading3, action: "h3" },
    { icon: Bold, action: "bold" },
    { icon: Italic, action: "italic" },
    { icon: Link2, action: "link" },
    { icon: List, action: "ul" },
    { icon: ListOrdered, action: "ol" },
    { icon: Quote, action: "quote" },
    { icon: ImagePlus, action: "image" },
    { icon: Table2, action: "table" },
    { icon: Minus, action: "hr" },
  ];

  const modes: { value: Mode; icon: LucideIcon; key: MessageKey }[] = [
    { value: "write", icon: PenLine, key: "blog.editor.tabs.write" },
    { value: "split", icon: Columns2, key: "blog.editor.tabs.split" },
    { value: "preview", icon: Eye, key: "blog.editor.tabs.preview" },
  ];

  const preview = (
    <article className="min-w-0 rounded-2xl border border-border bg-background p-5 sm:p-8">
      {draft.title || draft.content ? (
        <>
          <CategoryBadge category={draft.category} />
          <h1 className="mt-4 font-heading text-3xl leading-tight font-semibold text-balance">{draft.title || t("blog.editor.untitled")}</h1>
          {draft.excerpt && <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{draft.excerpt}</p>}
          {draft.cover && (
            <BlogCover
              image={{ url: draft.cover.url, alt: draft.cover.alt }}
              className="mt-6 aspect-[1200/630] w-full rounded-2xl border border-border"
            />
          )}
          <BlogProse markdown={draft.content} resolveUrl={resolveUrl} className="mt-6" />
        </>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("blog.editor.emptyPreview")}</p>
      )}
    </article>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t("blog.article.back")}
      </Link>

      <PageHeader
        icon={<FilePen />}
        eyebrow={t("blog.editor.eyebrow")}
        title={draft.title || t("blog.editor.title")}
        description={t("blog.editor.description")}
        actions={
          <>
            {USES_DB && draft.id && (
              <Button variant="ghost" onClick={newPost} disabled={saving}>
                <FilePlus2 /> {t("account.editor.newPost")}
              </Button>
            )}
            <Button variant="outline" onClick={() => void save()} disabled={!loaded || saving}>
              <Save /> {t("blog.editor.actions.saveDraft")}
            </Button>
            <Button onClick={publish} disabled={!loaded || saving}>
              <Send /> {publishLabel}
            </Button>
          </>
        }
      />

      {USES_DB && draft.id && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
          <FilePen className="size-4 shrink-0 text-primary" aria-hidden />
          <span>{t("account.editor.editingSaved")}</span>
          <button type="button" onClick={newPost} className="font-medium text-primary underline-offset-2 hover:underline">
            {t("account.editor.newPost")}
          </button>
        </p>
      )}

      {!USES_DB ? (
        <p className="flex items-center gap-2 rounded-xl bg-wood-soft px-4 py-2.5 text-sm text-wood-strong dark:bg-wood/10">
          <Info className="size-4 shrink-0" aria-hidden /> {t("blog.editor.notConnected")}
        </p>
      ) : draft.status === "pending" ? (
        <p className="flex items-center gap-2 rounded-xl bg-wood-soft px-4 py-2.5 text-sm text-wood-strong dark:bg-wood/10">
          <Clock className="size-4 shrink-0" aria-hidden /> {t("account.editor.pendingBanner")}
        </p>
      ) : draft.status === "rejected" ? (
        <div className="rounded-xl bg-clay-soft px-4 py-2.5 text-sm text-clay-strong">
          <p className="font-medium">{t("account.editor.rejectedBanner")}</p>
          {draft.reviewNote && <p className="mt-1">{t("account.editor.reviewNote", { note: draft.reviewNote })}</p>}
        </div>
      ) : contributor ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden /> {t("account.editor.contributorInfo")}
        </p>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Hlavička článku */}
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label={t("blog.editor.fields.title")} htmlFor="post-title">
                  <Input
                    id="post-title"
                    value={draft.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder={t("blog.editor.fields.titlePlaceholder")}
                    className="h-11 rounded-xl font-heading text-lg"
                  />
                </Field>
              </div>
              <Field label={t("blog.editor.fields.slug")} htmlFor="post-slug">
                <div className="flex h-9 items-center overflow-hidden rounded-xl border border-input bg-transparent focus-within:ring-3 focus-within:ring-ring/30">
                  <span className="shrink-0 border-r border-input bg-muted px-2.5 py-2 text-xs text-muted-foreground">/blog/</span>
                  <input
                    id="post-slug"
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value), slugTouched: true }))}
                    className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-mono text-sm outline-none"
                  />
                </div>
              </Field>
              <div>
                <Field label={t("blog.editor.fields.category")}>
                  <Select value={draft.category} onValueChange={(v) => update("category", v as BlogCategory)}>
                    <SelectTrigger className="h-9 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`blog.categories.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label={t("blog.editor.fields.tags")} htmlFor="post-tags" hint={t("blog.editor.fields.tagsHint")}>
                  <TagInput value={draft.tags} onChange={(v) => update("tags", v)} suggestions={knownTags} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label={t("blog.editor.fields.excerpt")} htmlFor="post-excerpt">
                  <Textarea
                    id="post-excerpt"
                    value={draft.excerpt}
                    onChange={(e) => update("excerpt", e.target.value)}
                    placeholder={t("blog.editor.fields.excerptPlaceholder")}
                    rows={2}
                    className="rounded-xl"
                  />
                </Field>
              </div>
            </div>
          </Card>

          {/* Úvodní fotka */}
          <Card title={t("blog.editor.fields.cover")}>
            <div className="grid gap-4 md:grid-cols-[280px_1fr]">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="group relative aspect-[1200/630] overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 transition-colors hover:border-primary/50"
              >
                {draft.cover ? (
                  <BlogCover image={{ url: draft.cover.url, alt: draft.cover.alt }} className="size-full" />
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ImagePlus className="size-6" aria-hidden />
                    {t("blog.editor.fields.coverPick")}
                  </span>
                )}
              </button>
              <div className="space-y-3">
                <Field label={t("blog.editor.fields.coverAlt")} htmlFor="cover-alt" hint={t("blog.editor.fields.coverHint")}>
                  <Input
                    id="cover-alt"
                    value={draft.cover?.alt ?? ""}
                    disabled={!draft.cover}
                    onChange={(e) => setDraft((d) => (d.cover ? { ...d, cover: { ...d.cover, alt: e.target.value } } : d))}
                    placeholder={t("blog.editor.fields.coverAltPlaceholder")}
                    className="h-9 rounded-xl"
                  />
                </Field>
                <Field label={t("blog.editor.fields.coverCredit")} htmlFor="cover-credit">
                  <Input
                    id="cover-credit"
                    value={draft.cover?.credit ?? ""}
                    disabled={!draft.cover}
                    onChange={(e) => setDraft((d) => (d.cover ? { ...d, cover: { ...d.cover, credit: e.target.value } } : d))}
                    placeholder={t("blog.editor.fields.coverCreditPlaceholder")}
                    className="h-9 rounded-xl"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                    <ImagePlus /> {draft.cover ? t("blog.editor.fields.coverChange") : t("blog.editor.fields.coverPick")}
                  </Button>
                  {draft.cover && (
                    <Button variant="ghost" size="sm" onClick={() => update("cover", null)}>
                      <Trash2 /> {t("blog.editor.fields.coverRemove")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void onCoverPicked(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </Card>

          {/* Text článku */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{t("blog.editor.fields.content")}</h2>
              <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
                {modes.map(({ value, icon: Icon, key }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={mode === value}
                    onClick={() => setMode(value)}
                    className={cn(
                      "flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                      value === "split" && "hidden lg:flex",
                      mode === value ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden /> {t(key)}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("grid gap-4", mode === "split" && "lg:grid-cols-2")}>
              {mode !== "preview" && (
                <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card focus-within:border-primary/40">
                  <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
                    {toolbar.map(({ icon, action }, i) => (
                      <span key={action} className="flex items-center">
                        {(i === 2 || i === 5 || i === 8) && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
                        <ToolButton icon={icon} label={t(`blog.editor.toolbar.${action}`)} onClick={() => runTool(action)} />
                      </span>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={draft.content}
                    onChange={(e) => update("content", e.target.value)}
                    placeholder={t("blog.editor.fields.contentPlaceholder")}
                    aria-label={t("blog.editor.fields.content")}
                    spellCheck
                    className="min-h-[520px] flex-1 resize-y bg-transparent p-4 font-mono text-sm leading-7 outline-none placeholder:text-muted-foreground/70"
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void onImagePicked(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
              {mode !== "write" && <div className={cn("min-w-0", mode === "split" && "lg:max-h-[640px] lg:overflow-y-auto")}>{preview}</div>}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("blog.editor.side.stats", { words: formatNumber(words), minutes })}
            </p>
          </section>
        </div>

        {/* Postranní panel */}
        <aside className="grid items-start gap-4 md:grid-cols-3 2xl:sticky 2xl:top-6 2xl:grid-cols-1 2xl:self-start">
          <Card title={t("blog.editor.side.publish")}>
            {contributor ? (
              <Field label={t("blog.editor.side.status")}>
                <p className="text-sm font-medium">{t(`blog.editor.side.${draft.status}`)}</p>
              </Field>
            ) : (
            <Field label={t("blog.editor.side.status")}>
              <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                {(["draft", "published"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={draft.status === s}
                    onClick={() => update("status", s)}
                    className={cn(
                      "h-8 rounded-full text-xs font-medium transition-colors",
                      draft.status === s ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`blog.editor.side.${s}`)}
                  </button>
                ))}
              </div>
            </Field>
            )}
            {!contributor && USES_DB && (
              <>
                <Field label={t("blog.editor.side.author")} htmlFor="post-author">
                  <Input
                    id="post-author"
                    value={draft.authorName ?? ""}
                    onChange={(e) => update("authorName", e.target.value)}
                    placeholder={profile?.full_name ?? ""}
                    className="h-9 rounded-xl"
                  />
                </Field>
                <Field label={t("blog.editor.side.authorRole")} htmlFor="post-author-role">
                  <Input
                    id="post-author-role"
                    value={draft.authorRole ?? ""}
                    onChange={(e) => update("authorRole", e.target.value)}
                    placeholder={t("blog.editor.side.authorRolePlaceholder")}
                    className="h-9 rounded-xl"
                  />
                </Field>
              </>
            )}
            {!contributor && (
              <Field label={t("blog.editor.side.date")} htmlFor="post-date">
                <Input
                  id="post-date"
                  type="date"
                  value={draft.publishDate}
                  onChange={(e) => update("publishDate", e.target.value)}
                  className="h-9 rounded-xl"
                />
              </Field>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={publish} disabled={!loaded || saving}>
                <Send /> {publishLabel}
              </Button>
              <Button variant="outline" onClick={() => void save()} disabled={!loaded || saving}>
                <Save /> {t("blog.editor.actions.saveDraft")}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                <RotateCcw /> {t("blog.editor.actions.reset")}
              </Button>
              {/* mazat: admin cokoli, ostatní (i editor) jen svůj nepublikovaný článek */}
              {USES_DB && draft.id && (isAdmin || (draft.status !== "published" && (!draft.authorId || draft.authorId === user?.id))) && (
                <Button variant="ghost" size="sm" onClick={() => void removeSaved()} disabled={saving} className="text-destructive">
                  <Trash2 /> {t("account.editor.deleteDraft")}
                </Button>
              )}
            </div>
          </Card>

          <Card title={t("blog.editor.side.seo")}>
            <div className="space-y-1 rounded-xl border border-border bg-background p-3.5">
              <p className="truncate text-xs text-muted-foreground">podpalto.cz › blog › {draft.slug || "…"}</p>
              <p className="line-clamp-2 text-base leading-snug font-medium text-[#1a4fb5] dark:text-[#8ab4f8]">
                {seoTitle || t("blog.editor.untitled")} | podpalto.cz
              </p>
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {draft.publishDate && <span>{formatDate(draft.publishDate)} — </span>}
                {seoDescription || "…"}
              </p>
            </div>
            <Field
              label={t("blog.editor.side.seoTitle")}
              htmlFor="seo-title"
              hint={t("blog.editor.side.seoTitleHint", { count: seoTitle.length })}
            >
              <Input
                id="seo-title"
                value={draft.seoTitle}
                onChange={(e) => update("seoTitle", e.target.value)}
                placeholder={draft.title}
                aria-invalid={seoTitle.length > 60 || undefined}
                className="h-9 rounded-xl"
              />
            </Field>
            <Field
              label={t("blog.editor.side.seoDescription")}
              htmlFor="seo-desc"
              hint={t("blog.editor.side.seoDescriptionHint", { count: seoDescription.length })}
            >
              <Textarea
                id="seo-desc"
                value={draft.seoDescription}
                onChange={(e) => update("seoDescription", e.target.value)}
                placeholder={draft.excerpt}
                rows={3}
                aria-invalid={seoDescription.length > 160 || undefined}
                className="rounded-xl text-sm"
              />
            </Field>
          </Card>

          <Card title={contributor ? t("account.editor.myPosts") : t("blog.editor.side.drafts")}>
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("blog.editor.side.noDrafts")}</p>
            ) : (
              <ul className="space-y-2">
                {drafts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        filesRef.current.clear();
                        setDraft(fromPost(p));
                        setEditorUrl(p.id);
                      }}
                      aria-current={draft.id === p.id ? "true" : undefined}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted",
                        draft.id === p.id ? "border-primary bg-accent" : "border-border",
                      )}
                    >
                      <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(`blog.editor.side.${p.status}`)} · {formatDate(p.updated_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
