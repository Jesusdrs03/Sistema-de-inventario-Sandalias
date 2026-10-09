"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { localDay } from "@/lib/format";
import type { AppUser, RateRecord, Settings } from "@/lib/types";
import { CheckCircle2, XCircle, Info } from "lucide-react";

/* ------------------------------ Toasts ------------------------------ */
type Toast = { id: number; type: "ok" | "error" | "info"; msg: string };
const ToastCtx = createContext<(msg: string, type?: Toast["type"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, type: Toast["type"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg animate-in dark:border-slate-700 dark:bg-slate-800"
          >
            {t.type === "ok" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
            {t.type === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
            {t.type === "info" && <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------ App ------------------------------ */
export interface RateState {
  rate: number;
  eur?: number;
  source: string;
  date?: string;
  fetchedAt?: string;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

interface AppState {
  user: AppUser | null;
  authLoading: boolean;
  authError?: string;
  settings: Settings;
  rate: RateState;
  mode: "firebase" | "demo";
}

const AppCtx = createContext<AppState | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp fuera de AppProvider");
  return c;
};

const RATE_REFRESH_MS = 30 * 60 * 1000;

function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authErr, setAuthErr] = useState<string>();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [live, setLive] = useState<{ rate: number; eur?: number; source: string; date?: string; fetchedAt?: string }>({
    rate: 0,
    source: "",
  });
  const [stored, setStored] = useState<RateRecord | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState<string>();
  const userRef = useRef<AppUser | null>(null);
  userRef.current = user;

  useEffect(
    () =>
      authApi.onChange((u, err) => {
        setUser(u);
        setAuthErr(err);
        setAuthLoading(false);
      }),
    [],
  );

  // Configuración y última tasa guardada (solo con sesión iniciada)
  useEffect(() => {
    if (!user) return;
    const a = db.subscribeDoc<Settings>("meta", "settings", (s) =>
      setSettings({ ...DEFAULT_SETTINGS, ...(s ?? {}) }),
    );
    const b = db.subscribe<RateRecord>("rates", (r) => setStored(r[0] ?? null), { orderBy: "date", desc: true, limit: 1 });
    return () => {
      a();
      b();
    };
  }, [user]);

  const refresh = useCallback(async () => {
    setRateLoading(true);
    try {
      const r = await fetch("/api/bcv", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error("No se pudo consultar el BCV");
      setLive({ rate: j.usd, eur: j.eur, source: j.source, date: j.date, fetchedAt: j.fetchedAt });
      setRateError(undefined);
      // Guarda la tasa del día en el historial
      if (userRef.current) {
        const day = localDay();
        const prev = await db.getDoc<RateRecord>("rates", day).catch(() => null);
        if (!prev || prev.rate !== j.usd) {
          await db
            .set("rates", day, { rate: j.usd, eur: j.eur ?? null, source: j.source, date: day, fetchedAt: j.fetchedAt })
            .catch(() => {});
        }
      }
    } catch (e) {
      setRateError((e as Error).message);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const t = setInterval(refresh, RATE_REFRESH_MS);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, refresh]);

  const rate: RateState = useMemo(() => {
    if (settings.rateMode === "manual" && settings.manualRate > 0) {
      return { rate: settings.manualRate, source: "Manual", loading: false, refresh };
    }
    if (live.rate) return { ...live, loading: rateLoading, refresh };
    if (stored)
      return {
        rate: stored.rate,
        source: `${stored.source} (último guardado)`,
        date: stored.date,
        fetchedAt: stored.fetchedAt,
        loading: rateLoading,
        error: rateError,
        refresh,
      };
    return { rate: 0, source: "Sin tasa", loading: rateLoading, error: rateError, refresh };
  }, [settings.rateMode, settings.manualRate, live, stored, rateLoading, rateError, refresh]);

  const value = useMemo<AppState>(
    () => ({ user, authLoading, authError: authErr, settings, rate, mode: db.mode }),
    [user, authLoading, authErr, settings, rate],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppProvider>{children}</AppProvider>
    </ToastProvider>
  );
}
