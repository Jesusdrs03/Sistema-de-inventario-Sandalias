"use client";
import { Trash2, Wand2 } from "lucide-react";
import { useApp } from "./providers";
import { PAYMENT_METHODS, VE_BANKS } from "@/lib/constants";
import { fmtBs, fmtUSD, parseNum } from "@/lib/format";
import { toUSD } from "@/lib/services";
import type { Payment, PaymentMethod } from "@/lib/types";
import { cx } from "./ui";

export interface DraftPayment {
  key: number;
  method: PaymentMethod;
  amount: string;
  reference: string;
  bank: string;
}

export const draftToPayment = (d: DraftPayment, rate: number): Payment => {
  const meta = PAYMENT_METHODS[d.method];
  const amount = parseNum(d.amount);
  return {
    method: d.method,
    currency: meta.currency,
    amount,
    amountUSD: toUSD(amount, meta.currency, rate),
    rate,
    reference: d.reference.trim() || undefined,
    bank: d.bank || undefined,
  };
};

export function MethodButtons({ onPick }: { onPick: (m: PaymentMethod) => void }) {
  const { settings } = useApp();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {settings.enabledMethods.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onPick(m)}
          className="flex flex-col items-start rounded-xl border-2 border-transparent bg-slate-50 px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-900/20"
        >
          <span className="mb-1 h-1.5 w-6 rounded-full" style={{ background: PAYMENT_METHODS[m].color }} />
          <span className="text-sm font-medium">{PAYMENT_METHODS[m].label}</span>
          <span className="text-[11px] text-slate-500">{PAYMENT_METHODS[m].currency === "VES" ? "Bolívares" : PAYMENT_METHODS[m].currency}</span>
        </button>
      ))}
    </div>
  );
}

export function PaymentRow({
  d,
  rate,
  onChange,
  onRemove,
  onFill,
}: {
  d: DraftPayment;
  rate: number;
  onChange: (d: DraftPayment) => void;
  onRemove: () => void;
  onFill: () => void;
}) {
  const { settings } = useApp();
  const meta = PAYMENT_METHODS[d.method];
  const amount = parseNum(d.amount);
  const receive =
    d.method === "pago_movil" && settings.pagoMovil.phone
      ? `${settings.pagoMovil.bank} · ${settings.pagoMovil.phone} · ${settings.pagoMovil.docId}`
      : d.method === "transferencia" && settings.transferencia.account
        ? `${settings.transferencia.bank} · ${settings.transferencia.account} · ${settings.transferencia.holder}`
        : d.method === "zelle" && settings.zelleEmail
          ? `Zelle: ${settings.zelleEmail}`
          : d.method === "binance" && settings.binanceId
            ? `Binance Pay: ${settings.binanceId}`
            : "";
  const showBank = d.method === "pago_movil" || d.method === "transferencia";
  return (
    <div className="rounded-xl border p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <button type="button" className="btn-icon btn-ghost text-red-500" onClick={onRemove} aria-label="Quitar pago">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {receive && <p className="mb-2 rounded-lg bg-sky-50 px-2 py-1 text-[11px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">Datos para recibir: {receive}</p>}
      <div className={cx("grid gap-2", showBank ? "sm:grid-cols-3" : meta.needsRef ? "sm:grid-cols-2" : "")}>
        <div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
              {meta.currency === "VES" ? "Bs" : meta.currency === "USDT" ? "₮" : "$"}
            </span>
            <input
              className="input pl-9 pr-9 text-right font-semibold"
              inputMode="decimal"
              placeholder="0,00"
              value={d.amount}
              onChange={(e) => onChange({ ...d, amount: e.target.value })}
              autoFocus
            />
            <button type="button" onClick={onFill} title="Completar el resto" className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-500 hover:text-brand-700">
              <Wand2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-right text-[11px] text-slate-500">
            {meta.currency === "VES" ? `≈ ${fmtUSD(toUSD(amount, "VES", rate))}` : `≈ ${fmtBs(amount * rate)}`}
          </p>
        </div>
        {meta.needsRef && (
          <input
            className="input"
            placeholder={d.method === "zelle" ? "Confirmación / titular" : d.method === "binance" ? "ID de orden" : "N° referencia"}
            value={d.reference}
            onChange={(e) => onChange({ ...d, reference: e.target.value })}
          />
        )}
        {showBank && (
          <select className="input" value={d.bank} onChange={(e) => onChange({ ...d, bank: e.target.value })}>
            <option value="">Banco emisor…</option>
            {VE_BANKS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
