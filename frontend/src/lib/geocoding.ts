/**
 * Vyhledávání adres a míst pro našeptávač nad mapou.
 *
 * 1. Lokální shody (okamžitě, offline): PSČ, okresní města z tabulky PSČ, přednastavené lokality.
 * 2. Vzdálený geokodér (výchozí Photon / komoot – otevřený, nad daty OpenStreetMap, určený
 *    pro „search-as-you-type“), omezený na území ČR.
 *
 * Pro produkci doporučeno vlastní instance Photonu nebo komerční API (např. Mapy.cz Suggest);
 * přepíná se proměnnou `NEXT_PUBLIC_GEOCODER_URL` (prázdná = Photon, „off“ = jen lokální shody).
 */
import type { RegionCode } from "@/types";
import { LOCATION_PRESETS, ZIP_PREFIX_LOCATIONS } from "@/lib/constants";

export type PlaceKind = "address" | "street" | "city" | "zip" | "place";

export interface PlaceSuggestion {
  id: string;
  /** Hlavní řádek, např. „Masarykova 12“. */
  label: string;
  /** Doplňující řádek, např. „602 00 Brno · okres Brno-město“. */
  detail: string;
  lat: number;
  lng: number;
  kind: PlaceKind;
  zip?: string;
  region?: RegionCode;
}

const GEOCODER_URL = process.env.NEXT_PUBLIC_GEOCODER_URL || "https://photon.komoot.io/api/";
const CZ_BBOX = "12.09,48.55,18.86,51.06";

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function prettyZip(digits: string): string {
  return digits.length === 5 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
}

/** Okamžité lokální shody (bez sítě). */
export function localPlaces(query: string): PlaceSuggestion[] {
  const q = strip(query.trim());
  if (!q) return [];
  const out: PlaceSuggestion[] = [];

  const digits = query.replace(/\D/g, "");
  if (/^\d{3}\s?\d{0,2}$/.test(query.trim())) {
    const hit = ZIP_PREFIX_LOCATIONS[digits.slice(0, 2)];
    if (hit) {
      out.push({
        id: `zip-${digits}`,
        label: `PSČ ${prettyZip(digits)}`,
        detail: `${hit.city} a okolí`,
        lat: hit.lat,
        lng: hit.lng,
        kind: "zip",
        zip: prettyZip(digits),
        region: hit.region,
      });
    }
  }

  const seen = new Set<string>();
  for (const p of LOCATION_PRESETS) {
    if (strip(p.label).includes(q) && !seen.has(p.label)) {
      seen.add(p.label);
      out.push({ id: `preset-${p.label}`, label: p.label, detail: p.zip ?? "", lat: p.lat, lng: p.lng, kind: "city", region: p.region, zip: p.zip });
    }
  }
  for (const [prefix, c] of Object.entries(ZIP_PREFIX_LOCATIONS)) {
    if (strip(c.city).startsWith(q) && !seen.has(c.city)) {
      seen.add(c.city);
      out.push({ id: `city-${prefix}`, label: c.city, detail: "Město", lat: c.lat, lng: c.lng, kind: "city", region: c.region });
    }
  }
  return out.slice(0, 5);
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    countrycode?: string;
  };
}

function fromPhoton(f: PhotonFeature, i: number): PlaceSuggestion | null {
  const p = f.properties;
  if (p.countrycode && p.countrycode !== "CZ") return null;
  const [lng, lat] = f.geometry.coordinates;
  const streetLine = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}` : undefined;
  const label = p.type === "house" && streetLine ? streetLine : (p.name ?? streetLine ?? p.city ?? "");
  if (!label) return null;
  const place = [p.postcode, p.city ?? p.district].filter(Boolean).join(" ");
  const detail = [place, p.county].filter(Boolean).join(" · ");
  const kind: PlaceKind =
    p.type === "house" ? "address" : p.type === "street" ? "street" : p.type === "city" || p.type === "district" ? "city" : "place";
  return { id: `ph-${p.osm_id ?? i}-${i}`, label, detail, lat, lng, kind, zip: p.postcode };
}

/** Vzdálené shody (Photon). Při chybě vrací prázdný seznam – lokální shody fungují dál. */
export async function remotePlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  if (!GEOCODER_URL || GEOCODER_URL === "off" || query.trim().length < 3) return [];
  try {
    const url = `${GEOCODER_URL}?q=${encodeURIComponent(query.trim())}&limit=7&bbox=${CZ_BBOX}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: PhotonFeature[] };
    const out: PlaceSuggestion[] = [];
    const seen = new Set<string>();
    (json.features ?? []).forEach((f, i) => {
      const s = fromPhoton(f, i);
      const key = s ? `${s.label}|${s.detail}` : "";
      if (s && !seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
    });
    return out.slice(0, 6);
  } catch {
    return [];
  }
}
