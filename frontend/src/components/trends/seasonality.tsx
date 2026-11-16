import { Snowflake, Sprout } from "lucide-react";
import type { CommodityKey, PriceTrendPoint } from "@/types";
import { COMMODITY_META } from "@/lib/constants";
import { formatCzk, formatPct } from "@/lib/format";
import { Section } from "./chart-parts";

const KEYS: CommodityKey[] = ["hardWoodPrms", "softWoodPrms", "pelletsT", "briquettesT", "coalT"];
const WINTER = [12, 1, 2];
const SPRING = [3, 4, 5];

function avgFor(trends: PriceTrendPoint[], months: number[], key: CommodityKey): number | null {
  const vals = trends.filter((t) => months.includes(Number(t.month.split("-")[1]))).map((t) => t[key]);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Sezónnost: průměrná cena na jaře (březen–květen) vs. v zimě (prosinec–únor). */
export function Seasonality({ trends }: { trends: PriceTrendPoint[] }) {
  const rows = KEYS.map((k) => {
    const winter = avgFor(trends, WINTER, k);
    const spring = avgFor(trends, SPRING, k);
    if (winter === null || spring === null) return null;
    return { key: k, winter, spring, diffPct: ((spring - winter) / winter) * 100 };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;
  const best = rows.reduce((a, b) => (a.diffPct < b.diffPct ? a : b));

  return (
    <Section
      id="sezonnost"
      title="Sezónnost"
      description={
        best.diffPct < 0
          ? `Na jaře bývá nakupování výhodnější. Nejvíc se to projevuje u položky ${COMMODITY_META[best.key].label.toLowerCase()} (${formatPct(best.diffPct)} oproti zimě).`
          : "V posledních měsících jsme zatím nezaznamenali výraznější jarní pokles cen."
      }
    >
      <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((r) => {
          const meta = COMMODITY_META[r.key];
          const down = r.diffPct < 0;
          return (
            <li key={r.key} className="h-full space-y-2 rounded-xl border border-border bg-secondary/40 p-3 sm:last:col-span-2 lg:last:col-span-1">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </p>
              <p className={`num text-xl font-semibold ${down ? "text-moss-strong" : "text-clay-strong"}`}>
                {formatPct(r.diffPct)}
              </p>
              <dl className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <dt className="inline-flex items-center gap-1">
                    <Snowflake aria-hidden="true" className="size-3" /> Zima
                  </dt>
                  <dd className="num">{formatCzk(r.winter)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="inline-flex items-center gap-1">
                    <Sprout aria-hidden="true" className="size-3" /> Jaro
                  </dt>
                  <dd className="num">{formatCzk(r.spring)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Průměr za prosinec–únor vs. březen–květen v období, které graf zobrazuje. Orientační údaj, ne předpověď.
      </p>
    </Section>
  );
}
