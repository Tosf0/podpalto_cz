import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/** Kostra právní stránky: nadpis, datum účinnosti, obsah s kotvami a sekce. */
export function LegalPage({
  title,
  intro,
  sections,
  other,
}: {
  title: string;
  intro: React.ReactNode;
  sections: { id: string; title: string; body: React.ReactNode }[];
  other: { href: string; label: string };
}) {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">{LEGAL.brand}</p>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Účinné od {LEGAL.effectiveFrom}</p>
        <div className="leading-relaxed text-muted-foreground">{intro}</div>
      </header>

      <nav aria-label="Obsah" className="rounded-2xl border border-border bg-card p-4">
        <ol className="grid list-decimal gap-1 pl-5 text-sm sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline-offset-2 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-24 space-y-3">
          <h2 className="font-heading text-xl font-semibold">
            {i + 1}. {s.title}
          </h2>
          <div className="space-y-3 leading-relaxed [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">{s.body}</div>
        </section>
      ))}

      <p className="border-t border-border pt-6 text-sm text-muted-foreground">
        Viz také{" "}
        <Link href={other.href} className="underline">
          {other.label}
        </Link>
        . Dotazy posílejte na{" "}
        <a href={`mailto:${LEGAL.email}`} className="underline">
          {LEGAL.email}
        </a>
        .
      </p>
    </article>
  );
}
