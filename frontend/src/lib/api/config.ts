/**
 * Konfigurace API vrstvy.
 *
 * - `NEXT_PUBLIC_API_URL` nastavené → volá se reálný backend (FastAPI + CrewAI na Railway).
 * - nenastavené → všechny funkce vrací lokální mock data ze `src/data/` (výchozí stav).
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export const IS_MOCK = API_URL === "";

/** Umělá latence mocků v ms (ukáže skeletony jako u reálného API). */
export const MOCK_LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 150);
