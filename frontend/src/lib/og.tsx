/**
 * Společná šablona náhledových obrázků (Open Graph, 1200×630) pro sdílení na sociálních sítích
 * a v chatech. Výchozí písmo `next/og` (Geist) umí české znaky.
 */
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const FLAME =
  "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

export function ogImage({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #1f2e22 0%, #2f4632 55%, #4e6e50 100%)",
          color: "#f8f6f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="f" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <path d={FLAME} stroke="url(#f)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 40, fontWeight: 700, letterSpacing: 2 }}>
            PODPALTO
            <span style={{ fontSize: 28, color: "#fbbf24", marginLeft: 2 }}>.cz</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow ? (
            <div style={{ fontSize: 26, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 3 }}>{eyebrow}</div>
          ) : null}
          <div style={{ fontSize: title.length > 60 ? 56 : 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 1050 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 30, color: "#d7e0d3", maxWidth: 1000, lineHeight: 1.35 }}>{subtitle}</div> : null}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
