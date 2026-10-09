"use client";
import { useEffect, useState } from "react";
import { db, type QueryOpts } from "./db";

export function useCollection<T>(col: string, opts?: QueryOpts, enabled = true) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(opts ?? {});
  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    return db.subscribe<T>(
      col,
      (r) => {
        setRows(r);
        setLoading(false);
      },
      opts,
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col, key, enabled]);
  return { rows, loading, error };
}

export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
