"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Receipt, Package, Boxes, Factory, Layers, Users, Truck, HandCoins,
  Wallet, Calculator, BarChart3, UserCog, Settings, LogOut, Menu, X, Moon, Sun, RefreshCw, Footprints,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp, useToast } from "./providers";
import { authApi } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS, type Module } from "@/lib/constants";
import { fmtNum, fmtDateTime } from "@/lib/format";
import { cx, Spinner } from "./ui";
import { LegalLinks } from "./legal";

export const NAV: { module: Module; href: string; label: string; icon: LucideIcon; group: string }[] = [
  { module: "dashboard", href: "/", label: "Inicio", icon: LayoutDashboard, group: "General" },
  { module: "pos", href: "/pos", label: "Punto de venta", icon: ShoppingCart, group: "Ventas" },
  { module: "ventas", href: "/ventas", label: "Historial de ventas", icon: Receipt, group: "Ventas" },
  { module: "cobranzas", href: "/cobranzas", label: "Cuentas por cobrar", icon: HandCoins, group: "Ventas" },
  { module: "clientes", href: "/clientes", label: "Clientes", icon: Users, group: "Ventas" },
  { module: "caja", href: "/caja", label: "Cierre de caja", icon: Calculator, group: "Ventas" },
  { module: "productos", href: "/productos", label: "Productos", icon: Package, group: "Inventario" },
  { module: "inventario", href: "/inventario", label: "Inventario y kardex", icon: Boxes, group: "Inventario" },
  { module: "produccion", href: "/produccion", label: "Producción", icon: Factory, group: "Fábrica" },
  { module: "materiales", href: "/materiales", label: "Materia prima", icon: Layers, group: "Fábrica" },
  { module: "proveedores", href: "/proveedores", label: "Proveedores", icon: Truck, group: "Fábrica" },
  { module: "gastos", href: "/gastos", label: "Gastos", icon: Wallet, group: "Administración" },
  { module: "reportes", href: "/reportes", label: "Reportes", icon: BarChart3, group: "Administración" },
  { module: "usuarios", href: "/usuarios", label: "Usuarios y roles", icon: UserCog, group: "Administración" },
  { module: "configuracion", href: "/configuracion", label: "Configuración", icon: Settings, group: "Administración" },
];

export function moduleForPath(path: string): Module | undefined {
  if (path === "/") return "dashboard";
  return NAV.find((n) => n.href !== "/" && path.startsWith(n.href))?.module;
}

function RateWidget() {
  const { rate } = useApp();
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-900 dark:bg-emerald-900/20">
      <span className="hidden text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:inline">Dólar BCV</span>
      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300" title={`${rate.source} · ${fmtDateTime(rate.fetchedAt)}`}>
        {rate.rate ? `Bs ${fmtNum(rate.rate)}` : "—"}
      </span>
      {rate.error && !rate.rate && <AlertTriangle className="h-4 w-4 text-amber-500" />}
      <button onClick={() => rate.refresh()} className="text-emerald-600 hover:text-emerald-800" title="Actualizar tasa" aria-label="Actualizar tasa">
        <RefreshCw className={cx("h-3.5 w-3.5", rate.loading && "animate-spin")} />
      </button>
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try {
      localStorage.setItem("theme", d ? "dark" : "light");
    } catch {}
  };
  return (
    <button className="btn-icon btn-ghost" onClick={toggle} aria-label="Cambiar tema">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

/** Cierra la sesión tras IDLE_MINUTES sin actividad (también si la pestaña quedó en segundo plano) */
const IDLE_MINUTES = 15;
function useIdleLogout(active: boolean) {
  const toast = useToast();
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const touch = () => (last = Date.now());
    const check = () => {
      if (Date.now() - last > IDLE_MINUTES * 60_000) {
        authApi.logout();
        toast(`Sesión cerrada por ${IDLE_MINUTES} minutos de inactividad`, "info");
      }
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(check, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
  }, [active, toast]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, authLoading, mode } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);
  useEffect(() => setOpen(false), [path]);
  useIdleLogout(!!user);

  if (authLoading || !user)
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );

  const allowed = PERMISSIONS[user.role];
  const items = NAV.filter((n) => allowed.includes(n.module));
  const groups = [...new Set(items.map((i) => i.group))];
  const current = moduleForPath(path);
  const forbidden = current && !allowed.includes(current);

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="rounded-xl bg-gradient-to-br from-brand-500 to-rose-600 p-2 text-white shadow">
          <Footprints className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold leading-tight">MR Calzados</p>
          <p className="truncate text-xs text-slate-500">Inventario y ventas</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    className={cx(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    <i.icon className="h-[18px] w-[18px]" />
                    {i.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </div>
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <button className="btn-icon btn-ghost" onClick={() => authApi.logout()} title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <LegalLinks className="px-2 pt-1 text-[11px]" />
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white dark:bg-slate-900 lg:block">{sidebar}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="animate-in absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-slate-900">
            <button className="btn-icon btn-ghost absolute right-2 top-4" onClick={() => setOpen(false)} aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur dark:bg-slate-900/80 sm:px-6">
          <button className="btn-icon btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {mode === "demo" && <span className="badge hidden bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 sm:inline-flex">Modo demo</span>}
          <RateWidget />
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          {forbidden ? (
            <div className="card flex flex-col items-center gap-3 p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <h2 className="text-lg font-semibold">Acceso restringido</h2>
              <p className="text-sm text-slate-500">Tu rol ({ROLE_LABELS[user.role]}) no tiene permiso para este módulo.</p>
              <Link href="/" className="btn-primary">Volver al inicio</Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
