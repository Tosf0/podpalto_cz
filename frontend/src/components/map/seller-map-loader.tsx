"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./map-skeleton";
import type { SellerMapProps } from "./types";

const SellerMapInner = dynamic(() => import("./seller-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

/** Mapa prodejců – Leaflet se načítá až v prohlížeči. */
export function SellerMap(props: SellerMapProps) {
  return <SellerMapInner {...props} />;
}
