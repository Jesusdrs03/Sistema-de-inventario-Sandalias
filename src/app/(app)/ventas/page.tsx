"use client";
import { useMemo, useState } from "react";
import { Download, Eye, Ban, Search } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, ConfirmModal, Empty, Loading, PageHeader, Stat } from "@/components/ui";
import { ReceiptModal } from "@/components/receipt";
import { PAYMENT_METHODS, can } from "@/lib/constants";
import { downloadCSV, endOfDay, fmtBs, fmtDateTime, fmtUSD, localDay, round2, startOfDay } from "@/lib/format";
import { cancelSale } from "@/lib/services";
import type { PaymentMethod, Sale } from "@/lib/types";
import { DollarSign, Receipt as ReceiptIcon, TrendingUp, XCircle } from "lucide-react";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDay(d);
};

export default function SalesPage() {
  const { user } = useApp();
  const toast = useToast();
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(localDay());
  const [status, setStatus] = useState("todas");
  const [method, setMethod] = useState("todos");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Sale | null>(null);
  const [cancel, setCancel] = useState<Sale | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { rows, loading } = useCollection<Sale>("sales", {
    where: [["date", ">=", startOfDay(from)], ["date", "<=", endOfDay(to)]],
    orderBy: "date",
    desc: true,
  });

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (can.seeAllSales(user?.role) || r.sellerId === user?.id) &&
        (status === "todas" || r.status === status) &&
        (method === "todos" || r.payments.some((p) => p.method === method)) &&
        (!s || `${r.number} ${r.clientName} ${r.clientDoc ?? ""} ${r.sellerName}`.toLowerCase().includes(s)),
    );
  }, [rows, q, status, method, user]);

  const valid = list.filter((s) => s.status !== "anulada");
  const total = round2(valid.reduce((a, b) => a + b.totalUSD, 0));
  const totalBs = round2(valid.reduce((a, b) => a + b.totalBs, 0));

  const exportCSV = () =>
    downloadCSV(`ventas_${from}_${to}.csv`, [
      ["N°", "Fecha", "Cliente", "Documento", "Vendedor", "Pares", "Subtotal $", "Descuento $", "IVA $", "IGTF $", "Total $", "Tasa", "Total Bs", "Métodos", "Saldo $", "Estado"],
      ...list.map((s) => [
        s.number, fmtDateTime(s.date), s.clientName, s.clientDoc ?? "", s.sellerName,
        s.items.reduce((a, b) => a + b.qty, 0), s.subtotalUSD, s.discountUSD, s.ivaUSD, s.igtfUSD, s.totalUSD, s.rate, s.totalBs,
        s.payments.map((p) => `${PAYMENT_METHODS[p.method]?.label}: ${p.amount} ${p.currency}`).join(" | "), s.balanceUSD, s.status,
      ]),
    ]);

  const doCancel = async () => {
    if (!cancel || !reason.trim()) return toast("Indica el motivo de la anulación", "error");
    setBusy(true);
    try {
      await cancelSale(cancel.id, reason.trim(), user!);
      toast(`Venta #${cancel.number} anulada y stock restaurado`);
      setCancel(null);
      setReason("");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Historial de ventas"
        subtitle="Consulta, reimprime o anula ventas"
        actions={
          <button className="btn-secondary" onClick={exportCSV} disabled={!list.length}>
            <Download className="h-4 w-4" /> Exportar Excel (CSV)
          </button>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total vendido" value={fmtUSD(total)} sub={fmtBs(totalBs)} icon={DollarSign} tone="green" />
        <Stat label="N° de ventas" value={valid.length} icon={ReceiptIcon} tone="brand" />
        <Stat label="Ticket promedio" value={fmtUSD(valid.length ? total / valid.length : 0)} icon={TrendingUp} tone="blue" />
        <Stat label="Anuladas" value={list.length - valid.length} icon={XCircle} tone="red" />
      </div>

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="N°, cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todas">Todos los estados</option>
          <option value="pagada">Pagadas</option>
          <option value="credito">Crédito</option>
          <option value="anulada">Anuladas</option>
        </select>
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="todos">Todos los métodos</option>
          {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>{PAYMENT_METHODS[m].label}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loading />
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Pago</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className={s.status === "anulada" ? "opacity-60" : ""}>
                    <td className="font-mono text-xs">#{s.number}</td>
                    <td className="whitespace-nowrap">{fmtDateTime(s.date)}</td>
                    <td>
                      <p className="font-medium">{s.clientName}</p>
                      {s.clientDoc && <p className="text-xs text-slate-500">{s.clientDoc}</p>}
                    </td>
                    <td>{s.sellerName}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(s.payments.map((p) => p.method))].map((m) => (
                          <span key={m} className="badge text-white" style={{ background: PAYMENT_METHODS[m]?.color }}>
                            {PAYMENT_METHODS[m]?.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <p className="font-semibold">{fmtUSD(s.totalUSD)}</p>
                      <p className="text-xs text-slate-500">{fmtBs(s.totalBs)}</p>
                    </td>
                    <td>
                      {s.status === "pagada" && <Badge tone="green">Pagada</Badge>}
                      {s.status === "credito" && <Badge tone="violet">Debe {fmtUSD(s.balanceUSD)}</Badge>}
                      {s.status === "anulada" && <Badge tone="red">Anulada</Badge>}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon btn-ghost" onClick={() => setView(s)} title="Ver / imprimir" aria-label="Ver">
                          <Eye className="h-4 w-4" />
                        </button>
                        {can.cancelSale(user?.role) && s.status !== "anulada" && (
                          <button className="btn-icon btn-ghost text-red-500" onClick={() => setCancel(s)} title="Anular" aria-label="Anular">
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No hay ventas en este período" />
        )}
      </div>

      <ReceiptModal sale={view} onClose={() => setView(null)} />
      <ConfirmModal
        open={!!cancel}
        title={`Anular venta #${cancel?.number}`}
        message="El stock de los productos será devuelto al inventario. Esta acción no se puede deshacer."
        confirmText="Anular venta"
        danger
        busy={busy}
        onConfirm={doCancel}
        onClose={() => setCancel(null)}
      >
        <textarea className="input mt-3" rows={2} placeholder="Motivo de la anulación *" value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmModal>
    </div>
  );
}
