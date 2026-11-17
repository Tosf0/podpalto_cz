import { API_URL, MOCK_LATENCY_MS } from "./config";
import { t } from "@/lib/i18n/translate";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Tenký wrapper nad fetch pro REST API na Railway. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    throw new ApiError(t("ci.api.error", { status: res.status, statusText: res.statusText, path }), res.status, body);
  }
  return (await res.json()) as T;
}

/** Sestaví query string z definovaných hodnot. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Vrátí hodnotu po umělé latenci (mock režim). Klonuje data, aby je UI nemohlo zmutovat. */
export function mockResolve<T>(value: T, latency = MOCK_LATENCY_MS): Promise<T> {
  const copy = structuredClone(value);
  return new Promise((resolve) => setTimeout(() => resolve(copy), latency));
}
