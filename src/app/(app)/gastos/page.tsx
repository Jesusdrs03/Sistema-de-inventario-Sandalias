"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Wallet, Download } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { ConfirmModal, Empty, Field, Loading, Modal, PageHeader, Spinner, Stat } from "@/components/ui";
import { ALL_METHODS, EXPENSE_CATEGORIES, PAYMENT_METHODS, can } from "@/lib/constants";
import { downloadCSV, endOfDay, fmtDate, fmtMoney, fmtUSD, localDay, parseNum, round2, startOfDay } from "@/lib/format";
import { toUSD } from "@/lib/services";
import { db } from "@/lib/db";
import type { Expense, PaymentMethod } from "@/lib/types";

export default function ExpensesPage() {
  const { user } = useApp();
  const toast = useToast();
  const first = new Date();
  first.setDate(1);
  const [from, setFrom] = useState(localDay(first));
  const [to, setTo] = useState(localDay());
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Expense | null>(null);
  const { rows, loading } = useCollection<Expense>("expenses", {
    where: [["date", ">=", startOfDay(from)], ["date", "<=", endOfDay(to)]],
    orderBy: "date",
    desc: true,
  });
  const total = round2(rows.reduce((a, b) => a + b.amountUSD, 0));
  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.category] = (m[r.category] ?? 0) + r.amountUSD));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Gastos"
        subtitle="Registro de egresos operativos"
        actions={
          <>
            <button className="btn-secondary" onClick={() => downloadCSV(`gastos_${from}_${to}.csv`, [["Fecha", "Concepto", "Categoría", "Monto", "Moneda", "USD", "Tasa", "Método", "Usuario"], ...rows.map((r) => [fmtDate(r.date), r.concept, r.category, r.amount, r.currency, r.amountUSD, r.rate, PAYMENT_METHODS[r.method]?.label, r.userName])])}>
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Registrar gasto</button>
          </>
        }
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Stat label="Total gastos del período" value={fmtUSD(total)} sub={`${rows.length} registros`} icon={Wallet} tone="red" />
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold">Por categoría</h3>
            {byCat.length ? (
              <ul className="space-y-2 text-sm">
                {byCat.map(([c, v]) => (
                  <li key={c}>
                    <div className="flex justify-between"><span>{c}</span><span className="font-medium">{fmtUSD(v)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(v / total) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Sin datos</p>
            )}
          </div>
        </div>
        <div>
          <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2">
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="card overflow-hidden">
            {loading ? (
              <Loading />
            ) : rows.length ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Método</th><th className="text-right">Monto</th><th></th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>{fmtDate(r.date)}</td>
                        <td><p className="font-medium">{r.concept}</p><p className="text-xs text-slate-500">{r.userName}</p></td>
                        <td>{r.category}</td>
                        <td>{PAYMENT_METHODS[r.method]?.label}</td>
                        <td className="text-right"><p className="font-semibold">{fmtMoney(r.amount, r.currency)}</p>{r.currency === "VES" && <p className="text-xs text-slate-500">{fmtUSD(r.amountUSD)}</p>}</td>
                        <td>{can.deleteRecords(user?.role) && <button className="btn-icon btn-ghost text-red-500" onClick={() => setDel(r)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="Sin gastos en el período" icon={Wallet} />
            )}
          </div>
        </div>
      </div>
      {open && <ExpenseForm onClose={() => setOpen(false)} />}
      <ConfirmModal open={!!del} title="Eliminar gasto" message={`¿Eliminar "${del?.concept}"?`} danger confirmText="Eliminar" onClose={() => setDel(null)} onConfirm={async () => { await db.remove("expenses", del!.id).catch((e) => toast(e.message, "error")); toast("Gasto eliminado"); setDel(null); }} />
    </div>
  );
}

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { user, rate } = useApp();
  const toast = useToast();
  const [f, setF] = useState({ date: localDay(), concept: "", category: EXPENSE_CATEGORIES[0], amount: "", method: "efectivo_usd" as PaymentMethod });
  const [busy, setBusy] = useState(false);
  const currency = PAYMENT_METHODS[f.method].currency;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const amount = parseNum(f.amount);
      if (amount <= 0) throw new Error("Monto inválido");
      const now = new Date();
      const date = f.date === localDay(now) ? now.toISOString() : new Date(`${f.date}T12:00:00`).toISOString();
      await db.add("expenses", {
        date, concept: f.concept.trim(), category: f.category, amount, currency, amountUSD: toUSD(amount, currency, rate.rate),
        rate: rate.rate, method: f.method, userName: user!.name,
      });
      toast("Gasto registrado");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Registrar gasto">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Concepto *" className="sm:col-span-2"><input className="input" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} required autoFocus /></Field>
        <Field label="Fecha"><input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Categoría">
          <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Método de pago">
          <select className="input" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PaymentMethod })}>
            {ALL_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHODS[m].label}</option>)}
          </select>
        </Field>
        <Field label={`Monto (${currency === "VES" ? "Bs" : currency})`}>
          <input className="input" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4 text-white" />} Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
