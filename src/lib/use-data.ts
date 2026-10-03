"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { data } from "@/lib/data";

/** Loads a value from the data layer and reloads it whenever the data layer reports a change. */
export function useData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(() => {
    let cancelled = false;
    loadRef
      .current()
      .then((v) => {
        if (cancelled) return;
        setValue(v);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    let cancel = run();
    const unsubscribe = data.subscribe(() => {
      cancel();
      cancel = run();
    });
    return () => {
      cancel();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { value, error, loading };
}
