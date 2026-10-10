"use client";
import { Printer, MessageCircle } from "lucide-react";
import { useApp } from "./providers";
import { Modal } from "./ui";
import { PAYMENT_METHODS } from "@/lib/constants";
import { fmtBs, fmtDateTime, fmtMoney, fmtNum, fmtUSD, pad } from "@/lib/format";
import type { Sale } from "@/lib/types";

export function Receipt({ sale }: { sale: Sale }) {
  const { settings } = useApp();
  const line = "border-t border-dashed border-slate-400 my-2";
  return (
    <div className="print-area mx-auto w-full max-w-[320px] bg-white p-4 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{settings.businessName}</p>
        <p>RIF: {settings.rif}</p>
        {settings.address && <p>{settings.address}</p>}
        {settings.phone && <p>Tel: {settings.phone}</p>}
      </div>
      <div className={line} />
      <p>NOTA DE ENTREGA N° {pad(sale.number)}</p>
      <p>Fecha: {fmtDateTime(sale.date)}</p>
      <p>Cliente: {sale.clientName}</p>
      {sale.clientDoc && <p>C.I./RIF: {sale.clientDoc}</p>}
      <p>Vendedor: {sale.sellerName}</p>
      {sale.status === "anulada" && <p className="mt-1 text-center font-bold">*** ANULADA ***</p>}
      <div className={line} />
      {sale.items.map((i, k) => (
        <div key={k} className="mb-1">
          <p>{i.name}</p>
          <div className="flex justify-between">
            <span>
              T{i.size} · {i.qty} x {fmtNum(i.priceUSD)}
            </span>
            <span>{fmtNum(i.subtotalUSD)}</span>
          </div>
        </div>
      ))}
      <div className={line} />
      <Row k="Subtotal" v={fmtUSD(sale.subtotalUSD)} />
      {sale.discountUSD > 0 && <Row k="Descuento" v={`- ${fmtUSD(sale.discountUSD)}`} />}
      {sale.ivaUSD > 0 && <Row k={`IVA (${settings.ivaPct}%)`} v={fmtUSD(sale.ivaUSD)} />}
      {sale.igtfUSD > 0 && <Row k={`IGTF (${settings.igtfPct}%)`} v={fmtUSD(sale.igtfUSD)} />}
      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL USD</span>
        <span>{fmtUSD(sale.totalUSD)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>TOTAL Bs</span>
        <span>{fmtBs(sale.totalBs)}</span>
      </div>
      <p className="text-[11px]">Tasa BCV: Bs {fmtNum(sale.rate)}</p>
      <div className={line} />
      <p className="font-bold">Pagos:</p>
      {sale.payments.map((p, k) => (
        <div key={k}>
          <Row k={PAYMENT_METHODS[p.method]?.label ?? p.method} v={fmtMoney(p.amount, p.currency)} />
          {p.reference && <p className="text-[11px]">Ref: {p.reference}</p>}
        </div>
      ))}
      {sale.changeUSD > 0 && <Row k="Vuelto" v={`${fmtUSD(sale.changeUSD)} / ${fmtBs(sale.changeBs)}`} />}
      {sale.balanceUSD > 0 && <Row k="SALDO PENDIENTE" v={fmtUSD(sale.balanceUSD)} />}
      <div className={line} />
      <p className="text-center">{settings.receiptFooter}</p>
      <p className="mt-1 text-center text-[10px] font-bold">*** DOCUMENTO NO FISCAL ***</p>
      <p className="text-center text-[10px]">Solicite su factura fiscal. Términos y privacidad: {typeof window !== "undefined" ? window.location.host : ""}/terminos</p>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-2">
    <span>{k}</span>
    <span className="text-right">{v}</span>
  </div>
);

export function ReceiptModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { settings } = useApp();
  if (!sale) return null;
  const share = () => {
    const lines = [
      `*${settings.businessName}*`,
      `Nota de entrega N° ${pad(sale.number)} - ${fmtDateTime(sale.date)}`,
      ...sale.items.map((i) => `• ${i.name} T${i.size} x${i.qty}: ${fmtUSD(i.subtotalUSD)}`),
      `*Total: ${fmtUSD(sale.totalUSD)} / ${fmtBs(sale.totalBs)}*`,
      `Tasa BCV: Bs ${fmtNum(sale.rate)}`,
      sale.balanceUSD > 0 ? `Saldo pendiente: ${fmtUSD(sale.balanceUSD)}` : "¡Gracias por su compra!",
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };
  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Venta #${sale.number}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={share}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button className="btn-primary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </>
        }
      >
        <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
          <Receipt sale={sale} />
        </div>
      </Modal>
      {/* Copia para impresión (los modales se ocultan al imprimir) */}
      <div className="print-only">
        <Receipt sale={sale} />
      </div>
    </>
  );
}
