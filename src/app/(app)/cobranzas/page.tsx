"use client";
import { useMemo, useState } from "react";
import { HandCoins, Search, Eye, MessageCircle, Users, AlertTriangle } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { useCollection } from "@/lib/hooks";
import { Badge, Empty, Loading, Modal, PageHeader, Spinner, Stat } from "@/components/ui";
import { ReceiptModal } from "@/components/receipt";
import { MethodButtons, PaymentRow, draftToPayment, type DraftPayment } from "@/components/payment-editor";
import { PAYMENT_METHODS } from "@/lib/constants";
import { fmtBs, fmtDate, fmtUSD, round2, waLink } from "@/lib/format";
import { addSalePayment } from "@/lib/services";
import type { Client, Sale } from "@/lib/types";

export default function ReceivablesPage() {
  const { rate, settings } = useApp();
  const { rows, loading } = useCollection<Sale>("sales", { where: [["status", "==", "credito"]] });
  const { rows: clients } = useCollection<Client>("clients");
  const [q, setQ] = useState("");
  const [pay, setPay] = useState<Sale | null>(null);
  const [view, setView] = useState<Sale | null>(null);

  const list = useMemo(
    () =>
      rows
        .filter((s) => !q || `${s.number} ${s.clientName} ${s.clientDoc ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [rows, q],
  );
  const total = round2(rows.reduce((a, b) => a + b.balanceUSD, 0));
  const debtors = new Set(rows.map((r) => r.clientId)).size;
  const old = rows.filter((s) => Date.now() - new Date(s.date).getTime() > 30 * 86400000).length;
  const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

  const remind = (s: Sale) => {
    const c = clients.find((x) => x.id === s.clientId);
    const link = waLink(c?.phone);
    if (!link) return;
    const msg = `Hola ${s.clientName}, le saluda ${settings.businessName}. Le recordamos su saldo pendiente de ${fmtUSD(s.balanceUSD)} (${fmtBs(s.balanceUSD * rate.rate)} a tasa BCV) de la nota N° ${s.number}. ¡Gracias!`;
    window.open(`${link}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div>
      <PageHeader title="Cuentas por cobrar" subtitle="Ventas a crédito y abonos de clientes" />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Total por cobrar" value={fmtUSD(total)} sub={fmtBs(total * rate.rate)} icon={HandCoins} tone="violet" />
        <Stat label="Clientes con deuda" value={debtors} icon={Users} tone="blue" />
        <Stat label="Vencidas (+30 días)" value={old} icon={AlertTriangle} tone="red" />
      </div>
      <div className="card mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar cliente o N° de venta…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
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
                  <th className="text-right">Total</th>
                  <th className="text-right">Abonado</th>
                  <th className="text-right">Saldo</th>
                  <th>Antigüedad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">#{s.number}</td>
                    <td>{fmtDate(s.date)}</td>
                    <td>
                      <p className="font-medium">{s.clientName}</p>
                      <p className="text-xs text-slate-500">{s.clientDoc}</p>
                    </td>
                    <td className="text-right">{fmtUSD(s.totalUSD)}</td>
                    <td className="text-right text-emerald-600">{fmtUSD(s.paidUSD)}</td>
                    <td className="text-right">
                      <p className="font-bold text-red-600">{fmtUSD(s.balanceUSD)}</p>
                      <p className="text-xs text-slate-500">{fmtBs(s.balanceUSD * rate.rate)}</p>
                    </td>
                    <td><Badge tone={days(s.date) > 30 ? "red" : days(s.date) > 15 ? "amber" : "slate"}>{days(s.date)} días</Badge></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-icon btn-ghost" onClick={() => setView(s)} aria-label="Ver"><Eye className="h-4 w-4" /></button>
                        <button className="btn-icon btn-ghost text-emerald-600" onClick={() => remind(s)} title="Recordatorio por WhatsApp" aria-label="Recordar"><MessageCircle className="h-4 w-4" /></button>
                        <button className="btn-primary btn-sm" onClick={() => setPay(s)}>Abonar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No hay cuentas por cobrar 🎉" icon={HandCoins} />
        )}
      </div>
      {pay && <PayModal sale={pay} onClose={() => setPay(null)} />}
      <ReceiptModal sale={view} onClose={() => setView(null)} />
    </div>
  );
}

function PayModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { rate, user } = useApp();
  const toast = useToast();
  const [d, setD] = useState<DraftPayment | null>(null);
  const [busy, setBusy] = useState(false);
  const fillFor = (m: DraftPayment["method"]) => String(PAYMENT_METHODS[m].currency === "VES" ? round2(sale.balanceUSD * rate.rate) : sale.balanceUSD);

  const save = async () => {
    if (!d) return;
    const p = draftToPayment(d, rate.rate);
    if (PAYMENT_METHODS[d.method].needsRef && !d.reference.trim()) return toast("Indica la referencia", "error");
    setBusy(true);
    try {
      await addSalePayment(sale.id, p, user!);
      toast("Abono registrado");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Abono a venta #${sale.number}`}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-success" onClick={save} disabled={!d || busy}>{busy && <Spinner className="h-4 w-4 text-white" />} Registrar abono</button>
        </>
      }
    >
      <div className="mb-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
        <p className="text-sm">{sale.clientName}</p>
        <p className="text-2xl font-bold text-red-600">{fmtUSD(sale.balanceUSD)}</p>
        <p className="text-sm text-slate-500">{fmtBs(sale.balanceUSD * rate.rate)} a tasa BCV del día</p>
      </div>
      {d ? (
        <PaymentRow d={d} rate={rate.rate} onChange={setD} onRemove={() => setD(null)} onFill={() => setD({ ...d, amount: fillFor(d.method) })} />
      ) : (
        <MethodButtons onPick={(m) => setD({ key: Date.now(), method: m, amount: fillFor(m), reference: "", bank: "" })} />
      )}
    </Modal>
  );
}
