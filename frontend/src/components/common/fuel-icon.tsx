import type { SVGProps } from "react";
import type { FuelCategory } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Jednoduché ikony paliv (24×24, barva `currentColor`) – jedna jasná silueta na palivo:
 * polínko (Phosphor), kus uhlí (Hugeicons), pytel pelet (Tabler), stoh briket (MingCute) – obrysy.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * Palivové dřevo – polínko z boku.
 * Ikona „log“ z Phosphor Icons (MIT, https://phosphoricons.com) – obrys zakreslený výplní.
 */
export function WoodIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
      <path d="M212 136a12 12 0 1 1-12-12a12 12 0 0 1 12 12m36 0c0 40.37-21.08 72-48 72H56c-26.92 0-48-31.63-48-72s21.08-72 48-72h36.69l37.65-37.66A8 8 0 0 1 136 24h32a8 8 0 0 1 0 16h-28.69l-24 24H200c26.92 0 48 31.63 48 72M56 192h113.51a73.5 73.5 0 0 1-12.67-24H80a8 8 0 0 1 0-16h73.16a111 111 0 0 1-1.16-16c0-22.86 6.76-42.9 17.51-56H56c-12.47 0-23.55 13.26-28.8 32H104a8 8 0 0 1 0 16H24.35q-.34 3.93-.35 8c0 30.36 14.65 56 32 56m176-56c0-30.36-14.65-56-32-56s-32 25.64-32 56s14.65 56 32 56s32-25.64 32-56" />
    </svg>
  );
}

/**
 * Uhlí – obrysový kus s ploškami.
 * Tvar podle ikony „stone“ z Hugeicons (MIT, https://hugeicons.com).
 */
export function CoalIcon(props: IconProps) {
  return (
    <Base strokeWidth={1.6} {...props}>
      <path d="m10.719 20.866.517-8.93m7.762 7.166-2.07-7.167M5.023 8.352l4.76 2.746c.72.416 1.081.624 1.48.73.397.107.814.107 1.649.107h.69c1.627 0 2.44 0 3.127-.364.686-.363 1.137-1.032 2.04-2.371l1.261-1.872" />
      <path d="m20.86 12.548-.58-4.017c-.115-.799-.173-1.198-.329-1.564a3 3 0 0 0-.087-.185c-.18-.355-.45-.658-.99-1.263-.611-.686-.917-1.03-1.302-1.267a3 3 0 0 0-.202-.114c-.402-.208-.855-.296-1.764-.472L13.91 3.34c-1.564-.302-2.346-.453-3.078-.237-.732.215-1.302.765-2.444 1.864L5.551 7.698c-.556.536-.834.804-1.036 1.127s-.319.69-.553 1.421l-.194.608c-.642 2.006-.963 3.01-.661 3.941.302.932 1.153 1.563 2.855 2.826l2.75 2.04c.99.734 1.486 1.102 2.069 1.255s1.197.077 2.426-.075l1.907-.235c1.888-.234 2.832-.35 3.525-.913.694-.562.995-1.455 1.596-3.24l.369-1.094c.23-.685.346-1.027.379-1.383.032-.357-.02-.714-.123-1.428Z" />
    </Base>
  );
}

/**
 * Pelety – papírový pytel.
 * Ikona „paper-bag“ z Tabler Icons (MIT, https://tabler.io/icons).
 */
export function PelletsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 3h8a2 2 0 0 1 2 2v1.82a5 5 0 0 0 .528 2.236l.944 1.888A5 5 0 0 1 20 13.18V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5.82a5 5 0 0 1 .528-2.236L6 8V5a2 2 0 0 1 2-2" />
      <path d="M12 15a2 2 0 1 0 4 0a2 2 0 1 0-4 0m-6 6a2 2 0 0 0 2-2v-5.82a5 5 0 0 0-.528-2.236L6 8m5-1h2" />
    </Base>
  );
}

/**
 * Brikety – stoh briket.
 * Ikona „bricks-line“ z MingCute (Apache 2.0, https://www.mingcute.com) – obrys zakreslený výplní.
 */
export function BriquettesIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21.496 14.656a2.03 2.03 0 0 1-.953 1.652l-9.171 5.301q-.944.465-1.887.001l-6.031-3.482a2.03 2.03 0 0 1-.954-1.653V9.524l.039-.368c.117-.548.451-.983.914-1.284l9.172-5.302a2.03 2.03 0 0 1 1.886-.001l6.031 3.482c.586.381.917.955.954 1.653ZM4.505 16.419l4.923 2.849v-1.691L4.5 14.727Zm14.991-3.505l-8.068 4.663v1.69l8.063-4.667Zm-8.068.663v1.69l8.068-4.663v-1.69ZM4.5 12.417l4.928 2.849v-1.689L4.5 10.727Zm1.003-3.42l4.925 2.848l8.07-4.664l-4.93-2.837Z" />
    </svg>
  );
}

const ICONS: Record<FuelCategory, (p: IconProps) => React.ReactElement> = {
  wood: WoodIcon,
  pellets: PelletsIcon,
  briquettes: BriquettesIcon,
  coal: CoalIcon,
};

/** Ikona paliva (dekorativní – popisek nese vedlejší text nebo FuelBadge). */
export function FuelIcon({ category, className }: { category: FuelCategory; className?: string }) {
  const Icon = ICONS[category];
  return <Icon aria-hidden="true" className={cn("size-4 shrink-0", className)} />;
}
