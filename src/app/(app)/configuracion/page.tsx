"use client";
import { useEffect, useState } from "react";
import { Save, RefreshCw, Building2, Percent, DollarSign, CreditCard, Receipt, Database, RotateCcw } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { ConfirmModal, Field, PageHeader, Spinner } from "@/components/ui";
import { ALL_METHODS, PAYMENT_METHODS, VE_BANKS } from "@/lib/constants";
import { fmtDateTime, fmtNum, localDay, parseNum } from "@/lib/format";
import { db, resetDemoData } from "@/lib/db";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const { settings, rate, mode } = useApp();
  const toast = useToast();
  const [f, setF] = useState<Settings>(settings);
  const [sizes, setSizes] = useState(settings.sizesDefault.join(", "));
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);

  useEffect(() => {
    setF(settings);
    setSizes(settings.sizesDefault.join(", "));
  }, [settings]);

  const save = async () => {
    setBusy(true);
    try {
      await db.set("meta", "settings", {
        ...f,
        ivaPct: parseNum(f.ivaPct),
        igtfPct: parseNum(f.igtfPct),
        manualRate: parseNum(f.manualRate),
        sizesDefault: sizes.split(",").map((s) => s.trim()).filter(Boolean),
      });
      // Datos públicos para las páginas legales (visibles sin iniciar sesión)
      await db.set("meta", "public", {
        businessName: f.businessName, rif: f.rif, address: f.address, phone: f.phone, email: f.email,
        updatedAt: new Date().toISOString(),
      });
      if (f.rateMode === "manual" && parseNum(f.manualRate) > 0) {
        await db.set("rates", localDay(), { rate: parseNum(f.manualRate), source: "Manual", date: localDay(), fetchedAt: new Date().toISOString() });
      }
      toast("Configuración guardada");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleMethod = (m: (typeof ALL_METHODS)[number]) =>
    setF({ ...f, enabledMethods: f.enabledMethods.includes(m) ? f.enabledMethods.filter((x) => x !== m) : [...f.enabledMethods, m] });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Datos de la empresa, impuestos, tasa de cambio y métodos de pago"
        actions={<button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />} Guardar cambios</button>}
      />

      <Section icon={Building2} title="Datos de la empresa">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razón social"><input className="input" value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></Field>
          <Field label="RIF"><input className="input" value={f.rif} onChange={(e) => setF({ ...f, rif: e.target.value })} /></Field>
          <Field label="Dirección"><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="Teléfono"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Correo de contacto (aparece en Términos y Privacidad)"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        </div>
      </Section>

      <Section icon={DollarSign} title="Tasa de cambio (Dólar BCV)">
        <div className="mb-4 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Tasa en uso</p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">Bs {fmtNum(rate.rate)}</p>
              <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                Fuente: {rate.source} {rate.fetchedAt && `· ${fmtDateTime(rate.fetchedAt)}`}
                {rate.eur ? ` · Euro BCV: Bs ${fmtNum(rate.eur)}` : ""}
              </p>
              {rate.error && <p className="mt-1 text-xs text-amber-600">No se pudo consultar el BCV en este momento: {rate.error}</p>}
            </div>
            <button className="btn-secondary" onClick={() => rate.refresh()}>
              <RefreshCw className={`h-4 w-4 ${rate.loading ? "animate-spin" : ""}`} /> Consultar BCV ahora
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modo">
            <select className="input" value={f.rateMode} onChange={(e) => setF({ ...f, rateMode: e.target.value as Settings["rateMode"] })}>
              <option value="auto">Automático (BCV, se actualiza cada 30 min)</option>
              <option value="manual">Manual (fijar tasa)</option>
            </select>
          </Field>
          {f.rateMode === "manual" && (
            <Field label="Tasa manual (Bs por USD)">
              <input className="input" inputMode="decimal" value={f.manualRate || ""} onChange={(e) => setF({ ...f, manualRate: e.target.value as unknown as number })} />
            </Field>
          )}
        </div>
      </Section>

      <Section icon={Percent} title="Impuestos">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4 dark:border-slate-700">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={f.ivaEnabled} onChange={(e) => setF({ ...f, ivaEnabled: e.target.checked })} /> Cobrar IVA sobre el precio</label>
            <p className="mb-2 mt-1 text-xs text-slate-500">Desactívalo si tus precios ya incluyen IVA.</p>
            <input className="input" inputMode="decimal" value={f.ivaPct} onChange={(e) => setF({ ...f, ivaPct: e.target.value as unknown as number })} disabled={!f.ivaEnabled} />
          </div>
          <div className="rounded-xl border p-4 dark:border-slate-700">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={f.igtfEnabled} onChange={(e) => setF({ ...f, igtfEnabled: e.target.checked })} /> Cobrar IGTF en pagos con divisas</label>
            <p className="mb-2 mt-1 text-xs text-slate-500">Aplica a efectivo en dólares, Zelle y Binance.</p>
            <input className="input" inputMode="decimal" value={f.igtfPct} onChange={(e) => setF({ ...f, igtfPct: e.target.value as unknown as number })} disabled={!f.igtfEnabled} />
          </div>
        </div>
      </Section>

      <Section icon={CreditCard} title="Métodos de pago">
        <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_METHODS.map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm dark:border-slate-700">
              <input type="checkbox" checked={f.enabledMethods.includes(m)} onChange={() => toggleMethod(m)} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_METHODS[m].color }} />
              {PAYMENT_METHODS[m].label}
            </label>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border p-4 dark:border-slate-700">
            <p className="font-medium">Datos de Pago Móvil</p>
            <select className="input" value={f.pagoMovil.bank} onChange={(e) => setF({ ...f, pagoMovil: { ...f.pagoMovil, bank: e.target.value } })}>
              {VE_BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
            <input className="input" placeholder="Teléfono" value={f.pagoMovil.phone} onChange={(e) => setF({ ...f, pagoMovil: { ...f.pagoMovil, phone: e.target.value } })} />
            <input className="input" placeholder="Cédula / RIF" value={f.pagoMovil.docId} onChange={(e) => setF({ ...f, pagoMovil: { ...f.pagoMovil, docId: e.target.value } })} />
          </div>
          <div className="space-y-3 rounded-xl border p-4 dark:border-slate-700">
            <p className="font-medium">Datos para transferencia</p>
            <select className="input" value={f.transferencia.bank} onChange={(e) => setF({ ...f, transferencia: { ...f.transferencia, bank: e.target.value } })}>
              {VE_BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
            <input className="input" placeholder="N° de cuenta (20 dígitos)" value={f.transferencia.account} onChange={(e) => setF({ ...f, transferencia: { ...f.transferencia, account: e.target.value } })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Titular" value={f.transferencia.holder} onChange={(e) => setF({ ...f, transferencia: { ...f.transferencia, holder: e.target.value } })} />
              <input className="input" placeholder="Cédula / RIF" value={f.transferencia.docId} onChange={(e) => setF({ ...f, transferencia: { ...f.transferencia, docId: e.target.value } })} />
            </div>
          </div>
          <Field label="Correo Zelle"><input className="input" value={f.zelleEmail} onChange={(e) => setF({ ...f, zelleEmail: e.target.value })} /></Field>
          <Field label="Binance Pay ID / correo"><input className="input" value={f.binanceId} onChange={(e) => setF({ ...f, binanceId: e.target.value })} /></Field>
        </div>
      </Section>

      <Section icon={Receipt} title="Ventas y productos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mensaje al pie del ticket"><input className="input" value={f.receiptFooter} onChange={(e) => setF({ ...f, receiptFooter: e.target.value })} /></Field>
          <Field label="Tallas por defecto para productos nuevos (separadas por coma)"><input className="input" value={sizes} onChange={(e) => setSizes(e.target.value)} /></Field>
        </div>
      </Section>

      <Section icon={Database} title="Base de datos">
        {mode === "firebase" ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">✅ Conectado a <b>Firebase Firestore</b> (proyecto {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}). Los datos se sincronizan en tiempo real entre todos los equipos.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600 dark:text-slate-300">
              ⚠️ Estás en <b>modo demostración</b>: los datos se guardan solo en este navegador. Para usar el sistema en producción configura las variables de Firebase (ver README).
            </p>
            <button className="btn-danger" onClick={() => setReset(true)}><RotateCcw className="h-4 w-4" /> Restablecer datos de demostración</button>
          </div>
        )}
      </Section>

      <ConfirmModal open={reset} title="Restablecer demo" message="Se borrarán todos los datos de este navegador y se cargarán los datos de ejemplo." danger confirmText="Restablecer" onConfirm={resetDemoData} onClose={() => setReset(false)} />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Save; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-brand-600" /> {title}</h3>
      {children}
    </section>
  );
}
