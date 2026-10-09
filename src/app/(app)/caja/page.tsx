"use client";
import { useMemo, useState } from "react";
import { Printer, Calculator, DollarSign, Receipt, HandCoins, Wallet } from "lucide-react";
import { useApp } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Empty, Loading, PageHeader, Stat } from "@/components/ui";
import { ALL_METHODS, PAYMENT_METHODS, PERMISSIONS, can } from "@/lib/constants";
import { endOfDay, fmtBs, fmtDateTime, fmtMoney, fmtNum, fmtUSD, localDay, round2, startOfDay } from "@/lib/format";
import type { AppUser, CashEntry, Expense, Sale } from "@/lib/types";

export default function CashClosePage() {
  const { user, settings, rate } = useApp();
  const [day, setDay] = useState(localDay());
  const all = can.seeAllSales(user?.role);
  const [seller, setSeller] = useState(all ? "todos" : user!.id);
  const range = { where: [["date", ">=", startOfDay(day)], ["date", "<=", endOfDay(day)]] as [string, ">=" | "<=", string][] };
  const { rows: cash, loading } = useCollection<CashEntry>("cashflow", range);
  const { rows: sales } = useCollection<Sale>("sales", range);
  const { rows: expenses } = useCollection<Expense>("expenses", range, PERMISSIONS[user!.role].includes("gastos"));
  const { rows: users } = useCollection<AppUser>("users", undefined, user!.role === "admin");

  const flt = <T extends { userId?: string; sellerId?: string }>(r: T) => seller === "todos" || (r.userId ?? r.sellerId) === seller;
  const entries = cash.filter(flt);
  const daySales = sales.filter(flt).filter((s) => s.status !== "anulada");
  const cancelled = sales.filter(flt).filter((s) => s.status === "anulada");

  const byMethod = useMemo(() => {
    return ALL_METHODS.map((m) => {
      const e = entries.filter((x) => x.method === m);
      return {
        method: m,
        count: e.filter((x) => x.kind !== "anulacion").length,
        amount: round2(e.reduce((a, b) => a + b.amount, 0)),
        usd: round2(e.reduce((a, b) => a + b.amountUSD, 0)),
      };
    }).filter((r) => r.count || r.amount);
  }, [entries]);

  const totalUSD = round2(byMethod.reduce((a, b) => a + b.usd, 0));
  const abonos = round2(entries.filter((e) => e.kind === "abono").reduce((a, b) => a + b.amountUSD, 0));
  const change = round2(daySales.reduce((a, b) => a + (b.changeUSD || 0), 0));
  const expUSD = round2(expenses.reduce((a, b) => a + b.amountUSD, 0));
  const igtf = round2(daySales.reduce((a, b) => a + b.igtfUSD, 0));
  const iva = round2(daySales.reduce((a, b) => a + b.ivaUSD, 0));
  const vesTotal = round2(byMethod.filter((m) => PAYMENT_METHODS[m.method].currency === "VES").reduce((a, b) => a + b.amount, 0));
  const usdCash = byMethod.find((m) => m.method === "efectivo_usd")?.amount ?? 0;
  const sellerName = seller === "todos" ? "Todos" : users.find((u) => u.id === seller)?.name ?? user!.name;

  const sellerOptions = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => m.set(u.id, u.name));
    cash.forEach((c) => m.set(c.userId, c.userName));
    return [...m.entries()];
  }, [users, cash]);

  return (
    <div>
      <PageHeader
        title="Cierre de caja"
        subtitle="Cuadre diario por método de pago"
        actions={
          <>
            <input type="date" className="input w-auto" value={day} onChange={(e) => setDay(e.target.value)} />
            {all && (
              <select className="input w-auto" value={seller} onChange={(e) => setSeller(e.target.value)}>
                <option value="todos">Todos los cajeros</option>
                {sellerOptions.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
            )}
            <button className="btn-primary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total recaudado" value={fmtUSD(totalUSD)} sub={fmtBs(totalUSD * rate.rate)} icon={DollarSign} tone="green" />
        <Stat label="Ventas del día" value={daySales.length} sub={`${fmtUSD(daySales.reduce((a, b) => a + b.totalUSD, 0))} facturado`} icon={Receipt} tone="brand" />
        <Stat label="Abonos cobrados" value={fmtUSD(abonos)} icon={HandCoins} tone="violet" />
        <Stat label="Gastos del día" value={fmtUSD(expUSD)} icon={Wallet} tone="red" />
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="card overflow-hidden">
            <div className="border-b px-5 py-4">
              <h3 className="font-semibold">Recaudación por método de pago</h3>
            </div>
            {byMethod.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th className="text-center">Operaciones</th>
                    <th className="text-right">Monto (moneda original)</th>
                    <th className="text-right">Equivalente USD</th>
                  </tr>
                </thead>
                <tbody>
                  {byMethod.map((m) => (
                    <tr key={m.method}>
                      <td>
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_METHODS[m.method].color }} />
                          {PAYMENT_METHODS[m.method].label}
                        </span>
                      </td>
                      <td className="text-center">{m.count}</td>
                      <td className="text-right font-semibold">{fmtMoney(m.amount, PAYMENT_METHODS[m.method].currency)}</td>
                      <td className="text-right">{fmtUSD(m.usd)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold dark:bg-slate-800/50">
                    <td colSpan={3}>TOTAL</td>
                    <td className="text-right">{fmtUSD(totalUSD)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <Empty text="Sin movimientos de caja en esta fecha" icon={Calculator} />
            )}
          </div>

          <div className="card space-y-3 p-5 text-sm">
            <h3 className="font-semibold">Resumen para cuadre</h3>
            <Row k="Total en bolívares (todos los métodos Bs)" v={fmtBs(vesTotal)} />
            <Row k="Efectivo en divisas" v={fmtUSD(usdCash)} />
            <Row k="Vueltos entregados" v={`- ${fmtUSD(change)}`} />
            <Row k="IGTF recaudado" v={fmtUSD(igtf)} />
            {iva > 0 && <Row k="IVA" v={fmtUSD(iva)} />}
            <Row k="Ventas anuladas" v={String(cancelled.length)} />
            <Row k="Tasa BCV actual" v={`Bs ${fmtNum(rate.rate)}`} />
            <p className="pt-2 text-xs text-slate-500">
              Los montos en Bs se reportan a la tasa de cada operación. Los vueltos se descuentan del efectivo entregado.
            </p>
          </div>
        </div>
      )}

      {/* Formato de impresión */}
      <div className="print-only">
        <div className="print-area p-6 font-mono text-xs text-black">
          <p className="text-center text-sm font-bold">{settings.businessName}</p>
          <p className="text-center">CIERRE DE CAJA · {day}</p>
          <p className="text-center">Cajero: {sellerName} · Impreso: {fmtDateTime(new Date().toISOString())}</p>
          <hr className="my-2 border-dashed border-black" />
          {byMethod.map((m) => (
            <div key={m.method} className="flex justify-between">
              <span>{PAYMENT_METHODS[m.method].label} ({m.count})</span>
              <span>{fmtMoney(m.amount, PAYMENT_METHODS[m.method].currency)}</span>
            </div>
          ))}
          <hr className="my-2 border-dashed border-black" />
          <div className="flex justify-between font-bold"><span>TOTAL USD</span><span>{fmtUSD(totalUSD)}</span></div>
          <div className="flex justify-between"><span>Ventas</span><span>{daySales.length}</span></div>
          <div className="flex justify-between"><span>Abonos</span><span>{fmtUSD(abonos)}</span></div>
          <div className="flex justify-between"><span>Vueltos</span><span>{fmtUSD(change)}</span></div>
          <div className="flex justify-between"><span>IGTF</span><span>{fmtUSD(igtf)}</span></div>
          <div className="flex justify-between"><span>Gastos</span><span>{fmtUSD(expUSD)}</span></div>
          <div className="mt-10 flex justify-between">
            <span>______________<br />Cajero</span>
            <span>______________<br />Supervisor</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-2 border-b border-dashed pb-2 dark:border-slate-700">
    <span className="text-slate-500">{k}</span>
    <span className="font-semibold">{v}</span>
  </div>
);
