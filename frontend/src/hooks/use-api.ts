"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface ApiState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

interface Result<T> {
  token: object | null;
  data?: T;
  error?: Error;
}

/**
 * Jednoduchý data-fetching hook nad servisní vrstvou `@/lib/api`.
 * Při změně `deps` (nebo `reload()`) se spustí nový požadavek; předchozí data zůstávají
 * k dispozici, dokud nedorazí nová (`loading` je odvozené – žádný setState v těle efektu).
 * @example const { data: sellers, loading } = useApi(() => getSellers(), []);
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: React.DependencyList): ApiState<T> {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T>>({ token: null });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // nový token = nový požadavek (generický hook – deps předává volající, proto ne literál)
  // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  const token = useMemo(() => ({}), [...deps, tick]);

  useEffect(() => {
    let cancelled = false;
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setResult({ token, data });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setResult((prev) => ({ token, data: prev.data, error: e instanceof Error ? e : new Error(String(e)) }));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = result.token !== token;
  return { data: result.data, error: loading ? undefined : result.error, loading, reload };
}
