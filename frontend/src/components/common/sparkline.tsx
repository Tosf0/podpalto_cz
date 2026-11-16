"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** Malá čárová řada bez os (inline SVG) s jemnou plochou pod křivkou. */
export function Sparkline({
  data,
  color = "currentColor",
  width = 96,
  height = 28,
  className,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `spark-${uid}`;

  if (data.length < 2) return null;

  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = max === min ? height / 2 : pad + (1 - (v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const line = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const last = points[points.length - 1];

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ stroke: color }}
      />
      <circle cx={last.x} cy={last.y} r={2.25} style={{ fill: color }} />
    </svg>
  );
}
