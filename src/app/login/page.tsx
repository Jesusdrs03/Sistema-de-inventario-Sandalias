"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Lock, Mail, User, ShieldCheck, DollarSign, Factory, ShoppingCart } from "lucide-react";
import { authApi, authError } from "@/lib/auth";
import { useApp, useToast } from "@/components/providers";
import { Spinner } from "@/components/ui";
import { DEMO_ACCOUNTS } from "@/lib/seed";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/lib/types";

export default function LoginPage() {
  const { user, authLoading, authError: sessionErr, mode } = useApp();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [setup, setSetup] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    authApi.needsSetup().then(setSetup).catch(() => setSetup(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (setup) {
        if (!name.trim()) throw new Error("Escribe tu nombre");
        await authApi.setupAdmin(name.trim(), email, password);
        toast("Administrador creado. ¡Bienvenido!");
      } else {
        await authApi.login(email, password);
      }
    } catch (e) {
      setErr(authError(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) return setErr("Escribe tu correo para recuperar la contraseña");
    try {
      await authApi.resetPassword(email);
      toast("Te enviamos un correo para restablecer la contraseña", "info");
    } catch (e) {
      setErr(authError(e));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-rose-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <Footprints className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold">MR Calzados</span>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Fábrica y tienda de sandalias,
            <br /> todo en un solo lugar.
          </h2>
          <ul className="space-y-4 text-white/90">
            {[
              [ShoppingCart, "Punto de venta con pagos mixtos: Pago Móvil, Zelle, Binance, divisas y más"],
              [DollarSign, "Tasa oficial BCV actualizada automáticamente"],
              [Factory, "Control de producción, materia prima e inventario por talla"],
              [ShieldCheck, "Roles y permisos para cada empleado"],
            ].map(([Icon, t], i) => {
              const I = Icon as typeof ShoppingCart;
              return (
                <li key={i} className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/15 p-2">
                    <I className="h-5 w-5" />
                  </div>
                  {t as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">Hecho para Venezuela 🇻🇪</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="rounded-2xl bg-brand-600 p-3 text-white">
              <Footprints className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">MR Calzados</span>
          </div>
          <h1 className="text-2xl font-bold">{setup ? "Configuración inicial" : "Iniciar sesión"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {setup ? "Crea la cuenta del administrador principal del sistema." : "Ingresa con tu correo y contraseña."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {setup && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                type="email"
                placeholder="correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={setup ? "new-password" : "current-password"}
              />
            </div>
            {(err || sessionErr) && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{err || sessionErr}</p>
            )}
            <button className="btn-primary w-full py-2.5" disabled={busy || authLoading}>
              {busy && <Spinner className="h-4 w-4 text-white" />}
              {setup ? "Crear administrador" : "Entrar"}
            </button>
            {!setup && mode === "firebase" && (
              <button type="button" onClick={forgot} className="w-full text-center text-sm text-brand-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </form>

          {mode === "demo" && (
            <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-900/20">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Modo demostración</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Los datos se guardan en este navegador. Toca un rol para entrar (contraseña: demo123):
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    className="btn-secondary btn-sm justify-start"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                    }}
                  >
                    {ROLE_LABELS[a.role as Role].split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
