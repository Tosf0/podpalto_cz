import type L from "leaflet";
import type { CommodityKey, PriceMode, RegionStats, UserLocation } from "@/types";
import type { SellerMatch } from "@/lib/filters";

/** Požadavek na přelet mapy (vybraná adresa, prodejce…). `nonce` umožní opakovat stejný cíl. */
export interface MapFocus {
  lat: number;
  lng: number;
  zoom: number;
  nonce: number;
}

export interface SellerMapProps {
  matches: SellerMatch[];
  location: UserLocation;
  /** Zobrazit polohu uživatele (po zadání adresy). */
  showLocation: boolean;
  radiusKm: number;
  /** Okruh se aplikuje (jinak mapa ukazuje celou ČR). */
  radiusActive: boolean;
  priceMode: PriceMode;
  hoveredId: string | null;
  selectedId: string | null;
  focus: MapFocus | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  regionStats: RegionStats[];
  /** Komodita pro popisky krajů; `null` = jen index. */
  regionMetric: CommodityKey | null;
  showRegions: boolean;
  /** Odsazení výřezu od překryvných widgetů (px). */
  fitPadding?: { top: number; bottom: number; left: number; right: number };
  onMapReady?: (map: L.Map) => void;
  className?: string;
}
