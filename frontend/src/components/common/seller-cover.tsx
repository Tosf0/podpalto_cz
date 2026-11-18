"use client";

import type { FuelCategory, Seller } from "@/types";
import { useI18n } from "@/lib/i18n";
import { USES_DB } from "@/lib/api/db";
import { genericSellerPhoto } from "@/lib/generic-photos";
import { cn } from "@/lib/utils";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Hromada polen – čela špalků s letokruhy. */
function LogPile({ x, y }: { x: number; y: number }) {
  const rows = [
    [0, 1, 2, 3, 4],
    [0.5, 1.5, 2.5, 3.5],
    [1, 2, 3],
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      {rows.map((row, r) =>
        row.map((c) => {
          const cx = c * 30;
          const cy = -r * 26;
          return (
            <g key={`${r}-${c}`}>
              <circle cx={cx} cy={cy} r={14} fill="#c9a97e" stroke="#7a5a43" strokeWidth={3} />
              <circle cx={cx} cy={cy} r={8} fill="none" stroke="#a27b52" strokeWidth={1.4} />
              <circle cx={cx} cy={cy} r={3} fill="#a27b52" />
            </g>
          );
        }),
      )}
    </g>
  );
}

/** Pytle s peletami. */
function Sacks({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 40} ${i === 1 ? -6 : 0})`}>
          <path d="M0 0 C-4 -34 4 -50 14 -54 L22 -54 C32 -50 40 -34 36 0 Z" fill="#e8dcc6" stroke="#a27b52" strokeWidth={2} />
          <path d="M10 -54 L26 -54 L24 -60 L12 -60 Z" fill="#a27b52" />
          <rect x={6} y={-32} width={24} height={14} rx={3} fill="#6f8f69" />
        </g>
      ))}
    </g>
  );
}

/** Hromada uhlí / briket. */
function Heap({ x, y, color, edge }: { x: number; y: number; color: string; edge: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C20 -46 50 -62 76 -62 C104 -62 132 -44 150 0 Z" fill={color} />
      {[
        [30, -20],
        [56, -38],
        [86, -44],
        [110, -24],
        [70, -16],
      ].map(([cx, cy], i) => (
        <rect key={i} x={cx} y={cy} width={14} height={10} rx={2} fill={edge} opacity={0.6} transform={`rotate(${i * 23} ${cx} ${cy})`} />
      ))}
    </g>
  );
}

/** Jednoduchý smrk. */
function Spruce({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={-8} width={6} height={10} fill="#6b4f37" />
      <path d="M0 -70 L18 -38 L9 -38 L24 -14 L12 -14 L28 -6 L-28 -6 L-12 -14 L-24 -14 L-9 -38 L-18 -38 Z" fill={color} />
    </g>
  );
}

const MAIN_FUEL_ORDER: FuelCategory[] = ["wood", "pellets", "briquettes", "coal"];

/**
 * Fotka prodejce. Pořadí: vlastní fotka (`seller.photoUrl` – API ji posílá jen v režimu „fotky z webů
 * prodejců“, viz administrace → Nastavení) → obecná fotka podle hlavního paliva (volná licence) →
 * v offline režimu kreslená ilustrace (krajina + sortiment). Výběr je deterministický podle ID.
 */
export function SellerCover({ seller, fuel, className }: { seller: Seller; fuel?: FuelCategory; className?: string }) {
  const { t } = useI18n();
  if (seller.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- externí fotky od prodejců (libovolná doména)
      <img src={seller.photoUrl} alt={`Fotografie: ${seller.name}`} className={cn("h-full w-full object-cover", className)} />
    );
  }
  const h = hash(seller.id);
  const main = fuel ?? MAIN_FUEL_ORDER.find((c) => seller.categories.includes(c)) ?? "wood";
  const generic = USES_DB ? genericSellerPhoto(main, h) : undefined;
  if (generic) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- statický soubor z /public
      <img src={generic} alt={t("map.ui.illustration", { name: seller.name })} loading="lazy" className={cn("h-full w-full object-cover", className)} />
    );
  }
  const shift = (h % 60) - 30;
  const trees = Array.from({ length: 7 }, (_, i) => ({
    x: 30 + i * 95 + ((h >> (i * 3)) % 30),
    s: 0.75 + (((h >> (i * 2)) % 40) / 100),
  }));

  return (
    <svg viewBox="0 0 640 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label={t("map.ui.illustration", { name: seller.name })} className={cn("h-full w-full", className)}>
      <defs>
        <linearGradient id={`sky-${seller.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2ea" />
          <stop offset="1" stopColor="#f7f1e6" />
        </linearGradient>
      </defs>
      <rect width="640" height="260" fill={`url(#sky-${seller.id})`} />
      <circle cx={520 + shift} cy={62} r={26} fill="#f1dfbf" />
      {/* vzdálené kopce */}
      <path d={`M0 170 C120 ${120 + shift / 2} 220 ${150 - shift / 3} 330 132 C440 114 540 ${150 + shift / 3} 640 128 L640 260 L0 260 Z`} fill="#c7d4bd" />
      {trees.map((t, i) => (
        <Spruce key={i} x={t.x} y={178 + (i % 2) * 6} s={t.s} color={i % 2 ? "#6f8f69" : "#4e6e50"} />
      ))}
      {/* blízký kopec */}
      <path d={`M0 210 C160 ${186 + shift / 4} 360 200 640 ${190 - shift / 4} L640 260 L0 260 Z`} fill="#a9bc9b" />
      <path d="M0 236 L640 228 L640 260 L0 260 Z" fill="#8fa382" />
      {/* sortiment */}
      {main === "wood" && <LogPile x={250} y={222} />}
      {main === "pellets" && <Sacks x={262} y={232} />}
      {main === "briquettes" && <Heap x={244} y={234} color="#8a6a4f" edge="#c9a97e" />}
      {main === "coal" && <Heap x={244} y={234} color="#3b3936" edge="#6e6a63" />}
    </svg>
  );
}
