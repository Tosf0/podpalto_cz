import { MOCK_LATENCY_MS } from "./config";

/** Vrátí hodnotu po umělé latenci (offline režim). Klonuje data, aby je UI nemohlo zmutovat. */
export function mockResolve<T>(value: T, latency = MOCK_LATENCY_MS): Promise<T> {
  const copy = structuredClone(value);
  return new Promise((resolve) => setTimeout(() => resolve(copy), latency));
}
